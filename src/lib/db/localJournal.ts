import { SelectedCard, ParsedReading, SpreadType } from '../tarot/types';
import { supabase } from '../supabaseClient';
import { moodConfigs } from '../tarot/moods';

export interface JournalEntry {
  id: string;
  question: string;
  mood: string;
  spreadType: SpreadType;
  cards: SelectedCard[];
  reading: ParsedReading;
  createdAt: string;
  isDream?: boolean;
}

const LOCAL_STORAGE_KEY = 'mirror_tarot_journal';
const DEVICE_ID_KEY = 'mirror_tarot_device_id';
const IMPORT_BACKUP_STORAGE_KEY = 'mirror_tarot_import_backup';
const SUPPORTED_BACKUP_VERSION = '1.0';
const spreadTypes: SpreadType[] = ['one_card', 'three_cards', 'relationship', 'career', 'shadow', 'choice'];

interface JournalBackupData {
  version: string;
  readings: JournalEntry[];
  checkins: CheckInEntry[];
  monthlyReport: string;
  exportedAt?: string;
}

interface CloudReadingRow {
  id: string;
  question: string;
  mood: string;
  spread_type: SpreadType;
  cards: SelectedCard[];
  reading: ParsedReading;
  created_at: string;
  is_dream?: boolean;
}

interface CloudCheckInRow {
  device_id: string;
  date: string;
  mood: string;
}

interface CloudMonthlyReportRow {
  report?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSpreadType(value: unknown): value is SpreadType {
  return typeof value === 'string' && spreadTypes.includes(value as SpreadType);
}

function isOrientation(value: unknown): value is 'upright' | 'reversed' {
  return value === 'upright' || value === 'reversed';
}

function isSelectedCard(value: unknown): value is SelectedCard {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.zhName === 'string' &&
    typeof value.image === 'string' &&
    typeof value.positionName === 'string' &&
    typeof value.positionOrder === 'number' &&
    isOrientation(value.orientation)
  );
}

function isParsedReading(value: unknown): value is ParsedReading {
  if (!isRecord(value)) return false;
  return (
    typeof value.questionSummary === 'string' &&
    typeof value.intuitiveSummary === 'string' &&
    Array.isArray(value.cardReadings) &&
    typeof value.contradiction === 'string' &&
    typeof value.overlookedFactor === 'string' &&
    typeof value.actionAdvice === 'string' &&
    typeof value.gentleReminder === 'string' &&
    Array.isArray(value.followUpSuggestions)
  );
}

function isJournalEntry(value: unknown): value is JournalEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.question === 'string' &&
    typeof value.mood === 'string' &&
    isSpreadType(value.spreadType) &&
    Array.isArray(value.cards) &&
    value.cards.every(isSelectedCard) &&
    isParsedReading(value.reading) &&
    typeof value.createdAt === 'string' &&
    !Number.isNaN(new Date(value.createdAt).getTime())
  );
}

function isCheckInEntry(value: unknown): value is CheckInEntry {
  if (!isRecord(value)) return false;
  return typeof value.date === 'string' && typeof value.mood === 'string';
}

function parseJournalBackup(jsonStr: string): JournalBackupData | null {
  const parsed: unknown = JSON.parse(jsonStr);
  if (!isRecord(parsed)) return null;
  if (parsed.version !== SUPPORTED_BACKUP_VERSION) return null;
  if (!Array.isArray(parsed.readings) || !Array.isArray(parsed.checkins)) return null;
  if (!parsed.readings.every(isJournalEntry)) return null;
  if (!parsed.checkins.every(isCheckInEntry)) return null;

  return {
    version: SUPPORTED_BACKUP_VERSION,
    readings: parsed.readings,
    checkins: parsed.checkins,
    monthlyReport: typeof parsed.monthlyReport === 'string' ? parsed.monthlyReport : '',
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
  };
}

function getCurrentBackupData(): JournalBackupData {
  return {
    version: SUPPORTED_BACKUP_VERSION,
    readings: getLocalReadings(),
    checkins: getLocalCheckIns(),
    monthlyReport: getLocalMonthlyReport(),
    exportedAt: new Date().toISOString(),
  };
}

function isCloudEnabled(): boolean {
  return Boolean(supabase);
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    try {
      id = crypto.randomUUID();
    } catch {
      const values = new Uint32Array(4);
      crypto.getRandomValues(values);
      id = `dev-${Array.from(values).map((value) => value.toString(36)).join('-')}`;
    }
    localStorage.setItem(DEVICE_ID_KEY, id || '');
  }
  return id || '';
}

export function saveLocalReading(
  question: string,
  mood: string,
  spreadType: SpreadType,
  cards: SelectedCard[],
  reading: ParsedReading,
  isDream?: boolean
): string {
  if (typeof window === 'undefined') return '';

  const id = `local-${crypto.randomUUID()}`;
  const newEntry: JournalEntry = {
    id,
    question,
    mood,
    spreadType,
    cards,
    reading,
    createdAt: new Date().toISOString(),
    isDream,
  };

  try {
    const existing = getLocalReadings();
    const updated = [newEntry, ...existing];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

    // 自动触发当日情绪打卡签到
    saveLocalCheckIn(mood);

    // 后台异步云端同步
    const deviceId = getDeviceId();
    if (deviceId && supabase) {
      supabase.from('readings')
        .insert({
          id,
          device_id: deviceId,
          question,
          mood,
          spread_type: spreadType,
          cards,
          reading,
          created_at: newEntry.createdAt,
          is_dream: isDream || false
        })
        .then(({ error }) => {
          if (error) console.error('Failed to sync reading to Supabase:', error);
        });
    }

    return id;
  } catch (e) {
    console.error('Failed to save reading to localStorage:', e);
    return '';
  }
}

export function getLocalReadings(): JournalEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to read localStorage journal:', e);
    return [];
  }
}

export function getLocalReadingById(id: string): JournalEntry | undefined {
  const readings = getLocalReadings();
  return readings.find((r) => r.id === id);
}

export function deleteLocalReading(id: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const readings = getLocalReadings();
    const filtered = readings.filter((r) => r.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));

    // 后台异步云端同步
    const deviceId = getDeviceId();
    if (deviceId && supabase) {
      supabase.from('readings')
        .delete()
        .eq('id', id)
        .eq('device_id', deviceId)
        .then(({ error }) => {
          if (error) console.error('Failed to delete reading from Supabase:', error);
        });
    }

    return true;
  } catch (e) {
    console.error('Failed to delete reading from localStorage:', e);
    return false;
  }
}

export function updateLocalReading(id: string, reading: ParsedReading): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const readings = getLocalReadings();
    const index = readings.findIndex((r) => r.id === id);
    if (index === -1) return false;

    readings[index] = {
      ...readings[index],
      reading,
    };

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(readings));

    // 后台异步云端同步
    const deviceId = getDeviceId();
    if (deviceId && supabase) {
      supabase.from('readings')
        .update({ reading })
        .eq('id', id)
        .eq('device_id', deviceId)
        .then(({ error }) => {
          if (error) console.error('Failed to update reading on Supabase:', error);
        });
    }

    return true;
  } catch (e) {
    console.error('Failed to update reading in localStorage:', e);
    return false;
  }
}

// ==========================================
// 情绪每日签到打卡 (Daily Check-in) 逻辑部分
// ==========================================

export interface CheckInEntry {
  date: string; // 格式: YYYY-MM-DD
  mood: string; // 情绪名称, 如 "迷茫"
}

const CHECKIN_STORAGE_KEY = 'mirror_tarot_checkins';

/**
 * 获取当前当地日期的 YYYY-MM-DD 字符串
 */
export function getLocalDateString(dateInput?: Date): string {
  const d = dateInput || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取全部打卡历史
 */
export function getLocalCheckIns(): CheckInEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(CHECKIN_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to read localStorage checkins:', e);
    return [];
  }
}

/**
 * 保存一次打卡 (若当天已打卡，则更新情绪)
 */
export function saveLocalCheckIn(mood: string, dateInput?: string): boolean {
  if (typeof window === 'undefined') return false;

  const targetDate = dateInput || getLocalDateString();
  try {
    const existing = getLocalCheckIns();
    const filtered = existing.filter((c) => c.date !== targetDate);
    const updated = [...filtered, { date: targetDate, mood }];
    
    localStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify(updated));

    // 后台异步云端同步
    const deviceId = getDeviceId();
    if (deviceId && supabase) {
      supabase.from('checkins')
        .upsert({
          device_id: deviceId,
          date: targetDate,
          mood
        }, { onConflict: 'device_id,date' })
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

const MONTHLY_REPORT_KEY = 'mirror_tarot_monthly_report';

export function saveLocalMonthlyReport(reportText: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MONTHLY_REPORT_KEY, reportText);

    // 后台异步云端同步
    const deviceId = getDeviceId();
    if (deviceId && supabase) {
      supabase.from('monthly_reports')
        .upsert({
          device_id: deviceId,
          report: reportText,
          updated_at: new Date().toISOString()
        }, { onConflict: 'device_id' })
        .then(({ error }) => {
          if (error) console.error('Failed to sync monthly report to Supabase:', error);
        });
    }
  } catch (e) {
    console.error('Failed to save monthly report to localStorage:', e);
  }
}

export function getLocalMonthlyReport(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(MONTHLY_REPORT_KEY) || '';
  } catch (e) {
    console.error('Failed to read monthly report from localStorage:', e);
    return '';
  }
}

export interface JournalAnalytics {
  topCards: {
    id: string;
    name: string;
    zhName: string;
    image: string;
    count: number;
  }[];
  moodTrend: {
    date: string;
    score: number;
    mood: string;
  }[];
  elementProportions: {
    water: number;
    fire: number;
    wind: number;
    earth: number;
  };
  dominantArchetype?: {
    zhName: string;
    name: string;
    image: string;
    description: string;
  } | null;
}

export function getCardElement(card: SelectedCard): 'water' | 'fire' | 'wind' | 'earth' {
  if (card.arcana === 'minor' && card.suit) {
    if (card.suit === 'wands') return 'fire';
    if (card.suit === 'cups') return 'water';
    if (card.suit === 'swords') return 'wind';
    if (card.suit === 'pentacles') return 'earth';
  }
  const num = card.number ?? 0;
  if ([2, 3, 12, 13, 18, 20].includes(num)) return 'water';
  if ([1, 7, 10, 16, 19].includes(num)) return 'fire';
  if ([0, 6, 11, 14, 17].includes(num)) return 'wind';
  return 'earth';
}

export function getJournalAnalytics(
  readingsInput?: JournalEntry[],
  checkinsInput?: CheckInEntry[]
): JournalAnalytics {
  const readings = readingsInput || getLocalReadings();
  const checkins = checkinsInput || getLocalCheckIns();

  // 1. 统计高频卡牌 Top 3
  const cardCountMap: Record<string, { card: SelectedCard; count: number }> = {};
  
  // 仅分析最近 30 天的日记卡牌
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  readings.forEach((entry) => {
    const entryDate = new Date(entry.createdAt);
    if (entryDate >= thirtyDaysAgo) {
      entry.cards.forEach((card) => {
        if (!cardCountMap[card.id]) {
          cardCountMap[card.id] = { card, count: 0 };
        }
        cardCountMap[card.id].count += 1;
      });
    }
  });

  const topCards = Object.values(cardCountMap)
    .map((item) => ({
      id: item.card.id,
      name: item.card.name,
      zhName: item.card.zhName,
      image: item.card.image,
      count: item.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // 2. 统计最近 15 次有记录（签到或日记）的情绪趋势
  const moodScores: Record<string, number> = {};
  moodConfigs.forEach((m) => {
    moodScores[m.name] = m.score;
  });

  const dateMap: Record<string, { score: number; mood: string }> = {};

  checkins.forEach((c) => {
    const score = moodScores[c.mood] || 3;
    dateMap[c.date] = { score, mood: c.mood };
  });

  readings.forEach((r) => {
    const dateStr = getLocalDateString(new Date(r.createdAt));
    const score = moodScores[r.mood] || 3;
    dateMap[dateStr] = { score, mood: r.mood };
  });

  const moodTrend = Object.entries(dateMap)
    .map(([date, item]) => ({
      date,
      score: item.score,
      mood: item.mood,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-15);

  // 3. 计算近 30 天四大元素比例与大阿尔卡纳原型统计
  const elementCounts = { water: 0, fire: 0, wind: 0, earth: 0 };
  let totalCardsCount = 0;
  const majorArcanaCounts: Record<string, { card: SelectedCard; count: number }> = {};

  readings.forEach((entry) => {
    const entryDate = new Date(entry.createdAt);
    if (entryDate >= thirtyDaysAgo) {
      entry.cards.forEach((card) => {
        const el = getCardElement(card);
        elementCounts[el] += 1;
        totalCardsCount += 1;

        if (card.arcana === 'major') {
          if (!majorArcanaCounts[card.id]) {
            majorArcanaCounts[card.id] = { card, count: 0 };
          }
          majorArcanaCounts[card.id].count += 1;
        }
      });
    }
  });

  const elementProportions = { water: 25, fire: 25, wind: 25, earth: 25 };
  if (totalCardsCount > 0) {
    elementProportions.water = Math.round((elementCounts.water / totalCardsCount) * 100);
    elementProportions.fire = Math.round((elementCounts.fire / totalCardsCount) * 100);
    elementProportions.wind = Math.round((elementCounts.wind / totalCardsCount) * 100);
    elementProportions.earth = Math.round((elementCounts.earth / totalCardsCount) * 100);
  }

  let dominantArchetype = null;
  const sortedMajors = Object.values(majorArcanaCounts).sort((a, b) => b.count - a.count);
  if (sortedMajors.length > 0) {
    const bestMajor = sortedMajors[0].card;
    dominantArchetype = {
      zhName: bestMajor.zhName,
      name: bestMajor.name,
      image: bestMajor.image,
      description: `本月您的心智投射常与「${bestMajor.zhName} (${bestMajor.name})」产生深刻共鸣（累计在近30天日记中出现过 ${sortedMajors[0].count} 次）。`
    };
  }
  
  return {
    topCards,
    moodTrend,
    elementProportions,
    dominantArchetype,
  };
}

export function exportJournalData(): string {
  if (typeof window === 'undefined') return '';
  return JSON.stringify(getCurrentBackupData(), null, 2);
}

export function importJournalData(jsonStr: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const parsed = parseJournalBackup(jsonStr);
    if (!parsed) return false;

    localStorage.setItem(IMPORT_BACKUP_STORAGE_KEY, JSON.stringify(getCurrentBackupData()));

    const readingsMap = new Map<string, JournalEntry>();
    getLocalReadings().forEach((entry) => readingsMap.set(entry.id, entry));
    parsed.readings.forEach((entry) => readingsMap.set(entry.id, entry));

    const checkinsMap = new Map<string, CheckInEntry>();
    getLocalCheckIns().forEach((entry) => checkinsMap.set(entry.date, entry));
    parsed.checkins.forEach((entry) => checkinsMap.set(entry.date, entry));

    const mergedReadings = Array.from(readingsMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const mergedCheckins = Array.from(checkinsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedReadings));
    localStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify(mergedCheckins));
    if (parsed.monthlyReport) {
      localStorage.setItem(MONTHLY_REPORT_KEY, parsed.monthlyReport);
    }

    // 自动触发云端同步
    syncJournalData().catch((err) => {
      console.error('Failed to sync after import:', err);
    });

    return true;
  } catch (e) {
    console.error('Failed to import journal data:', e);
    return false;
  }
}

export async function syncJournalData(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!isCloudEnabled() || !supabase) return false;

  const deviceId = getDeviceId();
  if (!deviceId) return false;

  try {
    // 1. 获取云端数据
    const [readingsRes, checkinsRes, reportRes] = await Promise.all([
      supabase.from('readings').select('*').eq('device_id', deviceId),
      supabase.from('checkins').select('*').eq('device_id', deviceId),
      supabase.from('monthly_reports').select('*').eq('device_id', deviceId).maybeSingle()
    ]);

    if (readingsRes.error) console.error('Error fetching readings from Supabase:', readingsRes.error);
    if (checkinsRes.error) console.error('Error fetching checkins from Supabase:', checkinsRes.error);
    if (reportRes.error) console.error('Error fetching monthly report from Supabase:', reportRes.error);

    const cloudReadings = (readingsRes.data || []) as CloudReadingRow[];
    const cloudCheckins = (checkinsRes.data || []) as CloudCheckInRow[];
    const cloudReport = reportRes.data as CloudMonthlyReportRow | null;

    // 2. 合并日记 readings
    const localReadings = getLocalReadings();
    const readingsMap = new Map<string, JournalEntry>();

    cloudReadings.forEach((r) => {
      readingsMap.set(r.id, {
        id: r.id,
        question: r.question,
        mood: r.mood,
        spreadType: r.spread_type as SpreadType,
        cards: r.cards,
        reading: r.reading,
        createdAt: r.created_at,
        isDream: r.is_dream,
      });
    });

    localReadings.forEach((r) => {
      const existing = readingsMap.get(r.id);
      if (!existing || new Date(r.createdAt) > new Date(existing.createdAt)) {
        readingsMap.set(r.id, r);
      }
    });

    const mergedReadings = Array.from(readingsMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 3. 合并打卡 checkins
    const localCheckins = getLocalCheckIns();
    const checkinsMap = new Map<string, CheckInEntry>();

    cloudCheckins.forEach((c) => {
      checkinsMap.set(c.date, {
        date: c.date,
        mood: c.mood,
      });
    });

    localCheckins.forEach((c) => {
      checkinsMap.set(c.date, c);
    });

    const mergedCheckins = Array.from(checkinsMap.values());

    // 4. 合并月度报告 monthly_report
    const localReport = getLocalMonthlyReport();
    let mergedReport = localReport;
    if (!localReport && cloudReport?.report) {
      mergedReport = cloudReport.report;
    } else if (localReport && cloudReport?.report) {
      mergedReport = localReport;
    }

    // 5. 将合并后的完整数据写回本地 localStorage
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedReadings));
    localStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify(mergedCheckins));
    if (mergedReport) {
      localStorage.setItem(MONTHLY_REPORT_KEY, mergedReport);
    }

    // 6. 将本地独有数据同步推送到云端
    const cloudReadingIds = new Set(cloudReadings.map((r) => r.id));
    const readingsToPush = mergedReadings.filter((r) => !cloudReadingIds.has(r.id));

    const cloudCheckinKeys = new Set(cloudCheckins.map((c) => `${c.device_id}_${c.date}`));
    const checkinsToPush = mergedCheckins.filter((c) => !cloudCheckinKeys.has(`${deviceId}_${c.date}`));

    const pushPromises: Promise<unknown>[] = [];

    if (readingsToPush.length > 0) {
      const dbReadings = readingsToPush.map((r) => ({
        id: r.id,
        device_id: deviceId,
        question: r.question,
        mood: r.mood,
        spread_type: r.spreadType,
        cards: r.cards,
        reading: r.reading,
        created_at: r.createdAt,
        is_dream: r.isDream || false,
      }));
      pushPromises.push(Promise.resolve(supabase.from('readings').upsert(dbReadings)));
    }

    if (checkinsToPush.length > 0) {
      const dbCheckins = checkinsToPush.map((c) => ({
        device_id: deviceId,
        date: c.date,
        mood: c.mood,
      }));
      pushPromises.push(Promise.resolve(supabase.from('checkins').upsert(dbCheckins)));
    }

    if (localReport && (!cloudReport || cloudReport.report !== localReport)) {
      pushPromises.push(
        Promise.resolve(
          supabase.from('monthly_reports').upsert({
            device_id: deviceId,
            report: localReport,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'device_id' })
        )
      );
    }

    if (pushPromises.length > 0) {
      await Promise.all(pushPromises);
    }

    return true;
  } catch (e) {
    console.error('Failed to sync journal data with Supabase:', e);
    return false;
  }
}
