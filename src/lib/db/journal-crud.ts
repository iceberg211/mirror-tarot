import type { ParsedReading, SelectedCard, SpreadType } from '../tarot/types';
import { supabase } from '../supabaseClient';
import type { ActionSeed, ChatMessage, JournalEntry } from './types';
import {
  CHECKIN_STORAGE_KEY,
  getActiveUserId,
  getDeviceId,
  getLocalDateString,
  getScopedStorageKey,
  LOCAL_STORAGE_KEY,
  MONTHLY_REPORT_KEY,
  setMonthlyReportForKey,
  writeJsonArray,
} from './local-storage';
import { filterActiveReadings, normalizeJournalEntry } from './sync/merge';

export function extractActionSeed(actionAdvice: string): string {
  if (!actionAdvice) return '';
  const cleanText = actionAdvice.replace(/[#*`_-]/g, '').trim();
  const match = cleanText.match(/[^。？！.?!]+[。？！.?!]?/);
  const firstSentence = match ? match[0] : cleanText;
  return firstSentence.length > 40 ? firstSentence.slice(0, 40) + '...' : firstSentence;
}

function nowIso(): string {
  return new Date().toISOString();
}

function withRevisionBump(entry: JournalEntry, patch: Partial<JournalEntry> = {}): JournalEntry {
  const base = normalizeJournalEntry(entry);
  return {
    ...base,
    ...patch,
    revision: base.revision + 1,
    updatedAt: nowIso(),
    syncStatus: 'pending',
    clientId: base.clientId || getDeviceId() || undefined,
  };
}

function toCloudRow(entry: JournalEntry, userId: string, deviceId: string) {
  const normalized = normalizeJournalEntry(entry);
  return {
    id: normalized.id,
    user_id: userId,
    device_id: deviceId,
    question: normalized.question,
    mood: normalized.mood,
    spread_type: normalized.spreadType,
    cards: normalized.cards,
    reading: {
      ...normalized.reading,
      _chatHistory: normalized.chatHistory,
      _isStarred: normalized.isStarred,
      _actionSeed: normalized.actionSeed,
      _userNotes: normalized.userNotes,
      _readingStyle: normalized.readingStyle,
      _dreamContext: normalized.dreamContext,
      _recentMoodState: normalized.recentMoodState,
      _isZen: normalized.isZen,
      _zenScore: normalized.zenScore,
    },
    created_at: normalized.createdAt,
    updated_at: normalized.updatedAt,
    deleted_at: normalized.deletedAt || null,
    revision: normalized.revision,
    client_id: normalized.clientId || deviceId,
    is_dream: normalized.isDream || false,
  };
}

/** 含墓碑的全量本地记录（同步用） */
export function getAllLocalReadings(): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(getScopedStorageKey(LOCAL_STORAGE_KEY));
    const raw = data ? (JSON.parse(data) as JournalEntry[]) : [];
    return raw.map(normalizeJournalEntry);
  } catch (e) {
    console.error('Failed to read local readings:', e);
    return [];
  }
}

/** 列表/业务默认：过滤已软删除 */
export function getLocalReadings(): JournalEntry[] {
  return filterActiveReadings(getAllLocalReadings());
}

export function getLocalReadingById(id: string): JournalEntry | undefined {
  return getAllLocalReadings().find((r) => r.id === id && !r.deletedAt);
}

export function getLocalCheckIns(): import('./types').CheckInEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(getScopedStorageKey(CHECKIN_STORAGE_KEY));
    return data ? (JSON.parse(data) as import('./types').CheckInEntry[]) : [];
  } catch (e) {
    console.error('Failed to read local checkins:', e);
    return [];
  }
}

export function getLocalMonthlyReport(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(getScopedStorageKey(MONTHLY_REPORT_KEY)) || '';
  } catch (e) {
    console.error('Failed to read monthly report:', e);
    return '';
  }
}

export function saveAndSyncEntry(entry: JournalEntry, readings: JournalEntry[]): void {
  if (typeof window === 'undefined') return;
  const normalizedList = readings.map(normalizeJournalEntry);
  writeJsonArray(getScopedStorageKey(LOCAL_STORAGE_KEY), normalizedList);

  const userId = getActiveUserId();
  const deviceId = getDeviceId();
  if (userId && deviceId && supabase) {
    supabase
      .from('readings')
      .upsert(toCloudRow(entry, userId, deviceId), { onConflict: 'id' })
      .then(({ error }) => {
        if (error) console.error('Failed to sync entry to Supabase:', error);
      });
  }
}

export function saveLocalCheckIn(mood: string, dateInput?: string): boolean {
  if (typeof window === 'undefined') return false;

  const targetDate = dateInput || getLocalDateString();
  try {
    const existing = getLocalCheckIns();
    const filtered = existing.filter((c) => c.date !== targetDate);
    const updated = [...filtered, { date: targetDate, mood }];

    writeJsonArray(getScopedStorageKey(CHECKIN_STORAGE_KEY), updated);

    const userId = getActiveUserId();
    const deviceId = getDeviceId();
    if (userId && deviceId && supabase) {
      supabase
        .from('checkins')
        .upsert(
          {
            user_id: userId,
            device_id: deviceId,
            date: targetDate,
            mood,
          },
          { onConflict: 'user_id,date' }
        )
        .then(({ error }) => {
          if (error) console.error('Failed to sync checkin to Supabase:', error);
        });
    }

    return true;
  } catch (e) {
    console.error('Failed to save checkin to localStorage:', e);
    return false;
  }
}

export function saveLocalMonthlyReport(reportText: string): void {
  if (typeof window === 'undefined') return;
  try {
    setMonthlyReportForKey(getScopedStorageKey(MONTHLY_REPORT_KEY), reportText);

    const userId = getActiveUserId();
    const deviceId = getDeviceId();
    if (userId && deviceId && supabase) {
      supabase
        .from('monthly_reports')
        .upsert(
          {
            user_id: userId,
            device_id: deviceId,
            report: reportText,
            updated_at: nowIso(),
          },
          { onConflict: 'user_id' }
        )
        .then(({ error }) => {
          if (error) console.error('Failed to sync monthly report to Supabase:', error);
        });
    }
  } catch (e) {
    console.error('Failed to save monthly report to localStorage:', e);
  }
}

export function saveLocalReading(
  question: string,
  mood: string,
  spreadType: SpreadType,
  cards: SelectedCard[],
  reading: ParsedReading,
  isDream?: boolean,
  readingStyle?: string,
  dreamContext?: {
    analysis: string;
    metaphor: string;
    sourceQuestion: string;
  },
  recentMoodState?: 'shadow' | 'storm'
): string {
  if (typeof window === 'undefined') return '';

  const id = `local-${crypto.randomUUID()}`;
  const ts = nowIso();
  let actionSeed: ActionSeed | undefined;

  if (reading.actionAdvice) {
    const seedText = extractActionSeed(reading.actionAdvice);
    if (seedText) {
      actionSeed = {
        seedText,
        status: 'pending',
        date: getLocalDateString(),
      };
    }
  }

  const newEntry: JournalEntry = {
    id,
    question,
    mood,
    spreadType,
    cards,
    reading,
    createdAt: ts,
    updatedAt: ts,
    revision: 1,
    deletedAt: null,
    clientId: getDeviceId() || undefined,
    syncStatus: 'pending',
    isDream,
    actionSeed,
    userNotes: '',
    readingStyle,
    dreamContext,
    recentMoodState,
  };

  try {
    const existing = getAllLocalReadings();
    const updated = [newEntry, ...existing];
    saveLocalCheckIn(mood);
    saveAndSyncEntry(newEntry, updated);
    return id;
  } catch (e) {
    console.error('Failed to save reading to localStorage:', e);
    return '';
  }
}

export function saveLocalZenReading(
  mood: string,
  durationSec: number,
  score: number,
  notes: string,
  element: string | null
): string {
  if (typeof window === 'undefined') return '';
  const id = `local-zen-${crypto.randomUUID()}`;
  const ts = nowIso();
  const elementLabel =
    element === 'water'
      ? '水'
      : element === 'fire'
        ? '火'
        : element === 'wind'
          ? '风'
          : element === 'earth'
            ? '土'
            : '静音';

  const emptyReading: ParsedReading = {
    questionSummary: '正念禅修调息',
    intuitiveSummary: `完成了 ${durationSec / 60} 分钟的 ${elementLabel}元素正念禅修调息。状态得到了深层放松与净化。`,
    cardReadings: [],
    contradiction: '',
    overlookedFactor: '',
    actionAdvice: notes ? `禅修感悟：${notes}` : '静心调息，气顺心明。',
    gentleReminder: '尘埃散去，灵明自现。',
    followUpSuggestions: [],
  };

  const newEntry: JournalEntry = {
    id,
    question: `${elementLabel}元素禅修调息`,
    mood,
    spreadType: 'custom',
    cards: [],
    reading: emptyReading,
    createdAt: ts,
    updatedAt: ts,
    revision: 1,
    deletedAt: null,
    clientId: getDeviceId() || undefined,
    syncStatus: 'pending',
    userNotes: notes,
    isZen: true,
    zenScore: score,
  };

  try {
    const existing = getAllLocalReadings();
    const updated = [newEntry, ...existing];
    saveLocalCheckIn(mood);
    saveAndSyncEntry(newEntry, updated);
    return id;
  } catch (e) {
    console.error('Failed to save Zen reading:', e);
    return '';
  }
}

/** 软删除：写墓碑，同步 upsert deleted_at */
export function deleteLocalReading(id: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const readings = getAllLocalReadings();
    const index = readings.findIndex((r) => r.id === id);
    if (index === -1) return false;

    const tombstoned = withRevisionBump(readings[index], {
      deletedAt: nowIso(),
    });
    readings[index] = tombstoned;
    saveAndSyncEntry(tombstoned, readings);
    return true;
  } catch (e) {
    console.error('Failed to delete reading from localStorage:', e);
    return false;
  }
}

export function updateLocalReading(id: string, reading: ParsedReading): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const readings = getAllLocalReadings();
    const index = readings.findIndex((r) => r.id === id && !r.deletedAt);
    if (index === -1) return false;

    const existingEntry = readings[index];
    let actionSeed = existingEntry.actionSeed;

    if (reading.actionAdvice && (!actionSeed || actionSeed.status === 'pending')) {
      const seedText = extractActionSeed(reading.actionAdvice);
      if (seedText && (!actionSeed || actionSeed.seedText !== seedText)) {
        actionSeed = {
          seedText,
          status: 'pending',
          date: getLocalDateString(new Date(existingEntry.createdAt)),
        };
      }
    }

    readings[index] = withRevisionBump(existingEntry, {
      reading,
      actionSeed,
    });

    saveAndSyncEntry(readings[index], readings);
    return true;
  } catch (e) {
    console.error('Failed to update reading in localStorage:', e);
    return false;
  }
}

export function toggleStarReading(id: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const readings = getAllLocalReadings();
    const index = readings.findIndex((r) => r.id === id && !r.deletedAt);
    if (index === -1) return false;

    const entry = readings[index];
    readings[index] = withRevisionBump(entry, {
      isStarred: !entry.isStarred,
    });
    saveAndSyncEntry(readings[index], readings);
    return true;
  } catch (e) {
    console.error('Failed to toggle star reading:', e);
    return false;
  }
}

export function updateActionSeedStatus(
  id: string,
  status: 'completed' | 'failed' | 'dismissed' | 'pending'
): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const readings = getAllLocalReadings();
    const index = readings.findIndex((r) => r.id === id && !r.deletedAt);
    if (index === -1) return false;

    const entry = readings[index];
    if (entry.actionSeed) {
      readings[index] = withRevisionBump(entry, {
        actionSeed: {
          ...entry.actionSeed,
          status,
        },
      });
      saveAndSyncEntry(readings[index], readings);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to update action seed status:', e);
    return false;
  }
}

export function updateChatHistory(id: string, chatHistory: ChatMessage[]): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const readings = getAllLocalReadings();
    const index = readings.findIndex((r) => r.id === id && !r.deletedAt);
    if (index === -1) return false;

    readings[index] = withRevisionBump(readings[index], { chatHistory });
    saveAndSyncEntry(readings[index], readings);
    return true;
  } catch (e) {
    console.error('Failed to update chat history:', e);
    return false;
  }
}

export function updateJournalUserNotes(id: string, userNotes: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const readings = getAllLocalReadings();
    const index = readings.findIndex((r) => r.id === id && !r.deletedAt);
    if (index === -1) return false;

    readings[index] = withRevisionBump(readings[index], { userNotes });
    saveAndSyncEntry(readings[index], readings);
    return true;
  } catch (e) {
    console.error('Failed to update journal user notes:', e);
    return false;
  }
}
