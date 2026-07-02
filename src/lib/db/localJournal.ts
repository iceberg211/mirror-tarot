import { SelectedCard, ParsedReading, SpreadType } from '../tarot/types';
import { supabase } from '../supabaseClient';
import { moodConfigs } from '../tarot/moods';
import { getCardElement } from '../tarot/utils';

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface ActionSeed {
  seedText: string;
  status: 'completed' | 'failed' | 'dismissed' | 'pending';
  date: string;
}

export interface JournalEntry {
  id: string;
  question: string;
  mood: string;
  spreadType: SpreadType;
  cards: SelectedCard[];
  reading: ParsedReading;
  createdAt: string;
  isDream?: boolean;
  chatHistory?: ChatMessage[];
  isStarred?: boolean;
  actionSeed?: ActionSeed;
  userNotes?: string;
  readingStyle?: string;
  dreamContext?: {
    analysis: string;
    metaphor: string;
    sourceQuestion: string;
  };
}


const LOCAL_STORAGE_KEY = 'mirror_tarot_journal';
const DEVICE_ID_KEY = 'mirror_tarot_device_id';
const ACTIVE_USER_ID_KEY = 'mirror_tarot_active_user_id';
const IMPORT_BACKUP_STORAGE_KEY = 'mirror_tarot_import_backup';
const SUPPORTED_BACKUP_VERSION = '1.0';
const spreadTypes: SpreadType[] = ['one_card', 'three_cards', 'relationship', 'career', 'shadow', 'choice', 'mirror_cross', 'custom'];

interface JournalBackupData {
  version: string;
  readings: JournalEntry[];
  checkins: CheckInEntry[];
  monthlyReport: string;
  exportedAt?: string;
}

interface CloudReadingRow {
  id: string;
  user_id?: string | null;
  question: string;
  mood: string;
  spread_type: SpreadType;
  cards: SelectedCard[];
  reading: CloudReadingPayload;
  created_at: string;
  is_dream?: boolean;
}

interface CloudReadingPayload extends ParsedReading {
  _chatHistory?: ChatMessage[];
  _isStarred?: boolean;
  _actionSeed?: ActionSeed;
  _userNotes?: string;
  _readingStyle?: string;
  _dreamContext?: {
    analysis: string;
    metaphor: string;
    sourceQuestion: string;
  };
}

interface CloudCheckInRow {
  user_id?: string | null;
  device_id: string;
  date: string;
  mood: string;
}

interface CloudMonthlyReportRow {
  report?: string | null;
}

interface StorageSnapshot {
  readings: JournalEntry[];
  checkins: CheckInEntry[];
  monthlyReport: string;
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

function getScopedStorageKey(baseKey: string, userId = getActiveUserId()): string {
  return userId ? `${baseKey}:${userId}` : baseKey;
}

function readJsonArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error(`Failed to read localStorage key ${key}:`, e);
    return [];
  }
}

function writeJsonArray<T>(key: string, value: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function getReadingsFromKey(key: string): JournalEntry[] {
  return readJsonArray<JournalEntry>(key);
}

function getCheckInsFromKey(key: string): CheckInEntry[] {
  return readJsonArray<CheckInEntry>(key);
}

function getMonthlyReportFromKey(key: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(key) || '';
  } catch (e) {
    console.error(`Failed to read localStorage key ${key}:`, e);
    return '';
  }
}

function setMonthlyReportForKey(key: string, reportText: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, reportText);
}

function getGuestStorageSnapshot(): StorageSnapshot {
  return {
    readings: getReadingsFromKey(LOCAL_STORAGE_KEY),
    checkins: getCheckInsFromKey(CHECKIN_STORAGE_KEY),
    monthlyReport: getMonthlyReportFromKey(MONTHLY_REPORT_KEY),
  };
}

function getUserStorageSnapshot(userId: string): StorageSnapshot {
  return {
    readings: getReadingsFromKey(getScopedStorageKey(LOCAL_STORAGE_KEY, userId)),
    checkins: getCheckInsFromKey(getScopedStorageKey(CHECKIN_STORAGE_KEY, userId)),
    monthlyReport: getMonthlyReportFromKey(getScopedStorageKey(MONTHLY_REPORT_KEY, userId)),
  };
}

function writeUserStorageSnapshot(userId: string, snapshot: StorageSnapshot): void {
  writeJsonArray(getScopedStorageKey(LOCAL_STORAGE_KEY, userId), snapshot.readings);
  writeJsonArray(getScopedStorageKey(CHECKIN_STORAGE_KEY, userId), snapshot.checkins);
  if (snapshot.monthlyReport) {
    setMonthlyReportForKey(getScopedStorageKey(MONTHLY_REPORT_KEY, userId), snapshot.monthlyReport);
  }
}

function mergeReadings(current: JournalEntry[], incoming: JournalEntry[]): JournalEntry[] {
  const readingsMap = new Map<string, JournalEntry>();
  [...current, ...incoming].forEach((entry) => {
    const existing = readingsMap.get(entry.id);
    if (!existing || new Date(entry.createdAt) >= new Date(existing.createdAt)) {
      readingsMap.set(entry.id, entry);
    }
  });

  return Array.from(readingsMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function mergeCheckIns(current: CheckInEntry[], incoming: CheckInEntry[]): CheckInEntry[] {
  const checkinsMap = new Map<string, CheckInEntry>();
  [...current, ...incoming].forEach((entry) => checkinsMap.set(entry.date, entry));
  return Array.from(checkinsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function clearGuestStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  localStorage.removeItem(CHECKIN_STORAGE_KEY);
  localStorage.removeItem(MONTHLY_REPORT_KEY);
}

export function getActiveUserId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(ACTIVE_USER_ID_KEY) || '';
}

export function setActiveUserId(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_USER_ID_KEY, userId);
}

export function clearActiveUserId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_USER_ID_KEY);
}

export function clearUserLocalCache(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  localStorage.removeItem(getScopedStorageKey(LOCAL_STORAGE_KEY, userId));
  localStorage.removeItem(getScopedStorageKey(CHECKIN_STORAGE_KEY, userId));
  localStorage.removeItem(getScopedStorageKey(MONTHLY_REPORT_KEY, userId));
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

export function extractActionSeed(actionAdvice: string): string {
  if (!actionAdvice) return '';
  const cleanText = actionAdvice.replace(/[#*`_-]/g, '').trim();
  const match = cleanText.match(/[^。？！.?!]+[。？！.?!]?/);
  const firstSentence = match ? match[0] : cleanText;
  return firstSentence.length > 40 ? firstSentence.slice(0, 40) + '...' : firstSentence;
}

function saveAndSyncEntry(entry: JournalEntry, readings: JournalEntry[]): void {
  if (typeof window === 'undefined') return;
  writeJsonArray(getScopedStorageKey(LOCAL_STORAGE_KEY), readings);
  
  const userId = getActiveUserId();
  const deviceId = getDeviceId();
  if (userId && deviceId && supabase) {
    supabase.from('readings')
      .upsert({
        id: entry.id,
        user_id: userId,
        device_id: deviceId,
        question: entry.question,
        mood: entry.mood,
        spread_type: entry.spreadType,
        cards: entry.cards,
        reading: {
          ...entry.reading,
          _chatHistory: entry.chatHistory,
          _isStarred: entry.isStarred,
          _actionSeed: entry.actionSeed,
          _userNotes: entry.userNotes,
          _readingStyle: entry.readingStyle,
          _dreamContext: entry.dreamContext,
        },
        created_at: entry.createdAt,
        is_dream: entry.isDream || false
      }, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) console.error('Failed to sync entry to Supabase:', error);
      });
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
  }
): string {
  if (typeof window === 'undefined') return '';

  const id = `local-${crypto.randomUUID()}`;
  let actionSeed: ActionSeed | undefined = undefined;
  
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
    createdAt: new Date().toISOString(),
    isDream,
    actionSeed,
    userNotes: '',
    readingStyle,
    dreamContext,
  };

  try {
    const existing = getLocalReadings();
    const updated = [newEntry, ...existing];
    
    // 自动触发当日情绪打卡签到
    saveLocalCheckIn(mood);
    
    // 同步到本地和云端
    saveAndSyncEntry(newEntry, updated);

    return id;
  } catch (e) {
    console.error('Failed to save reading to localStorage:', e);
    return '';
  }
}

export function getLocalReadings(): JournalEntry[] {
  return getReadingsFromKey(getScopedStorageKey(LOCAL_STORAGE_KEY));
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
    writeJsonArray(getScopedStorageKey(LOCAL_STORAGE_KEY), filtered);

    // 后台异步云端同步
    const userId = getActiveUserId();
    const deviceId = getDeviceId();
    if (userId && deviceId && supabase) {
      supabase.from('readings')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
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

    readings[index] = {
      ...existingEntry,
      reading,
      actionSeed,
    };

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
    const readings = getLocalReadings();
    const index = readings.findIndex((r) => r.id === id);
    if (index === -1) return false;

    const entry = readings[index];
    entry.isStarred = !entry.isStarred;
    
    saveAndSyncEntry(entry, readings);
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
    const readings = getLocalReadings();
    const index = readings.findIndex((r) => r.id === id);
    if (index === -1) return false;

    const entry = readings[index];
    if (entry.actionSeed) {
      entry.actionSeed = {
        ...entry.actionSeed,
        status,
      };
      saveAndSyncEntry(entry, readings);
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
    const readings = getLocalReadings();
    const index = readings.findIndex((r) => r.id === id);
    if (index === -1) return false;

    const entry = readings[index];
    entry.chatHistory = chatHistory;
    
    saveAndSyncEntry(entry, readings);
    return true;
  } catch (e) {
    console.error('Failed to update chat history:', e);
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
  return getCheckInsFromKey(getScopedStorageKey(CHECKIN_STORAGE_KEY));
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
    
    writeJsonArray(getScopedStorageKey(CHECKIN_STORAGE_KEY), updated);

    // 后台异步云端同步
    const userId = getActiveUserId();
    const deviceId = getDeviceId();
    if (userId && deviceId && supabase) {
      supabase.from('checkins')
        .upsert({
          user_id: userId,
          device_id: deviceId,
          date: targetDate,
          mood
        }, { onConflict: 'user_id,date' })
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
    setMonthlyReportForKey(getScopedStorageKey(MONTHLY_REPORT_KEY), reportText);

    // 后台异步云端同步
    const userId = getActiveUserId();
    const deviceId = getDeviceId();
    if (userId && deviceId && supabase) {
      supabase.from('monthly_reports')
        .upsert({
          user_id: userId,
          device_id: deviceId,
          report: reportText,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        .then(({ error }) => {
          if (error) console.error('Failed to sync monthly report to Supabase:', error);
        });
    }
  } catch (e) {
    console.error('Failed to save monthly report to localStorage:', e);
  }
}

export function getLocalMonthlyReport(): string {
  return getMonthlyReportFromKey(getScopedStorageKey(MONTHLY_REPORT_KEY));
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

    writeJsonArray(getScopedStorageKey(LOCAL_STORAGE_KEY), mergedReadings);
    writeJsonArray(getScopedStorageKey(CHECKIN_STORAGE_KEY), mergedCheckins);
    if (parsed.monthlyReport) {
      setMonthlyReportForKey(getScopedStorageKey(MONTHLY_REPORT_KEY), parsed.monthlyReport);
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

  let userId = getActiveUserId();
  if (!userId) {
    const { data } = await supabase.auth.getSession();
    userId = data.session?.user.id || '';
    if (userId) setActiveUserId(userId);
  }
  if (!userId) return false;

  const deviceId = getDeviceId();
  if (!deviceId) return false;

  try {
    // 1. 获取云端数据
    const [readingsRes, checkinsRes, reportRes] = await Promise.all([
      supabase.from('readings').select('*').eq('user_id', userId),
      supabase.from('checkins').select('*').eq('user_id', userId),
      supabase.from('monthly_reports').select('*').eq('user_id', userId).maybeSingle()
    ]);

    if (readingsRes.error) console.error('Error fetching readings from Supabase:', readingsRes.error);
    if (checkinsRes.error) console.error('Error fetching checkins from Supabase:', checkinsRes.error);
    if (reportRes.error) console.error('Error fetching monthly report from Supabase:', reportRes.error);

    const cloudReadings = (readingsRes.data || []) as CloudReadingRow[];
    const cloudCheckins = (checkinsRes.data || []) as CloudCheckInRow[];
    const cloudReport = reportRes.data as CloudMonthlyReportRow | null;

    // 2. 合并日记 readings
    const cloudMappedReadings = cloudReadings.map((r) => {
      const {
        _chatHistory: chatHistory,
        _isStarred: isStarred,
        _actionSeed: actionSeed,
        _userNotes: userNotes,
        _readingStyle: readingStyle,
        _dreamContext: dreamContext,
        ...cleanReading
      } = r.reading;

      return {
        id: r.id,
        question: r.question,
        mood: r.mood,
        spreadType: r.spread_type as SpreadType,
        cards: r.cards,
        reading: cleanReading,
        createdAt: r.created_at,
        isDream: r.is_dream,
        chatHistory,
        isStarred,
        actionSeed,
        userNotes,
        readingStyle,
        dreamContext,
      };
    });

    const localReadings = getLocalReadings();
    const mergedReadings = mergeReadings(cloudMappedReadings, localReadings);

    // 3. 合并打卡 checkins
    const cloudMappedCheckins = cloudCheckins.map((c) => ({
      date: c.date,
      mood: c.mood,
    }));
    const localCheckins = getLocalCheckIns();
    const mergedCheckins = mergeCheckIns(cloudMappedCheckins, localCheckins);

    // 4. 合并月度报告 monthly_report
    const localReport = getLocalMonthlyReport();
    let mergedReport = localReport;
    if (!localReport && cloudReport?.report) {
      mergedReport = cloudReport.report;
    } else if (localReport && cloudReport?.report) {
      mergedReport = localReport;
    }

    // 5. 将合并后的完整数据写回本地 localStorage
    writeJsonArray(getScopedStorageKey(LOCAL_STORAGE_KEY, userId), mergedReadings);
    writeJsonArray(getScopedStorageKey(CHECKIN_STORAGE_KEY, userId), mergedCheckins);
    if (mergedReport) {
      setMonthlyReportForKey(getScopedStorageKey(MONTHLY_REPORT_KEY, userId), mergedReport);
    }

    // 6. 将本地独有数据同步推送到云端
    const cloudReadingIds = new Set(cloudReadings.map((r) => r.id));
    const readingsToPush = mergedReadings.filter((r) => !cloudReadingIds.has(r.id));

    const cloudCheckinDates = new Set(cloudCheckins.map((c) => c.date));
    const checkinsToPush = mergedCheckins.filter((c) => !cloudCheckinDates.has(c.date));

    const pushPromises: Promise<unknown>[] = [];

    if (readingsToPush.length > 0) {
      const dbReadings = readingsToPush.map((r) => ({
        id: r.id,
        user_id: userId,
        device_id: deviceId,
        question: r.question,
        mood: r.mood,
        spread_type: r.spreadType,
        cards: r.cards,
        reading: {
          ...r.reading,
          _chatHistory: r.chatHistory,
          _isStarred: r.isStarred,
          _actionSeed: r.actionSeed,
          _userNotes: r.userNotes,
          _readingStyle: r.readingStyle,
          _dreamContext: r.dreamContext,
        },
        created_at: r.createdAt,
        is_dream: r.isDream || false,
      }));
      pushPromises.push(Promise.resolve(supabase.from('readings').upsert(dbReadings)));
    }

    if (checkinsToPush.length > 0) {
      const dbCheckins = checkinsToPush.map((c) => ({
        user_id: userId,
        device_id: deviceId,
        date: c.date,
        mood: c.mood,
      }));
      pushPromises.push(Promise.resolve(supabase.from('checkins').upsert(dbCheckins, { onConflict: 'user_id,date' })));
    }

    if (localReport && (!cloudReport || cloudReport.report !== localReport)) {
      pushPromises.push(
        Promise.resolve(
          supabase.from('monthly_reports').upsert({
            user_id: userId,
            device_id: deviceId,
            report: localReport,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
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

export async function migrateGuestDataToUser(userId: string): Promise<boolean> {
  if (typeof window === 'undefined' || !userId) return false;

  const guestSnapshot = getGuestStorageSnapshot();
  const userSnapshot = getUserStorageSnapshot(userId);
  const mergedSnapshot: StorageSnapshot = {
    readings: mergeReadings(userSnapshot.readings, guestSnapshot.readings),
    checkins: mergeCheckIns(userSnapshot.checkins, guestSnapshot.checkins),
    monthlyReport: userSnapshot.monthlyReport || guestSnapshot.monthlyReport,
  };

  setActiveUserId(userId);
  writeUserStorageSnapshot(userId, mergedSnapshot);
  const syncOk = await syncJournalData();
  if (syncOk) {
    clearGuestStorage();
  }

  return syncOk;
}

export function updateJournalUserNotes(id: string, userNotes: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const readings = getLocalReadings();
    const index = readings.findIndex((r) => r.id === id);
    if (index === -1) return false;

    const entry = readings[index];
    entry.userNotes = userNotes;
    
    saveAndSyncEntry(entry, readings);
    return true;
  } catch (e) {
    console.error('Failed to update journal user notes:', e);
    return false;
  }
}

export function getHistoricalContextForAI(currentId?: string): string {
  if (typeof window === 'undefined') return '';

  try {
    const readings = getLocalReadings();
    const filtered = readings.filter(
      (r) => r.id !== currentId && r.reading && r.reading.intuitiveSummary
    );
    
    const recent = filtered.slice(0, 3);
    if (recent.length === 0) return '';

    const lines = recent.map((r) => {
      const dateStr = new Date(r.createdAt).toLocaleDateString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
      });
      const cardsStr = r.cards.map((c) => `${c.zhName}(${c.orientation === 'upright' ? '正位' : '逆位'})`).join('、');
      const seedStr = r.actionSeed ? `，行动建议是：“${r.actionSeed.seedText}”（状态：${r.actionSeed.status}）` : '';
      const notesStr = r.userNotes ? `，用户整理笔记：“${r.userNotes}”` : '';
      
      return `- ${dateStr} 问了：“${r.question}”，抽到：[${cardsStr}]。AI总结：“${r.reading.intuitiveSummary}”${seedStr}${notesStr}`;
    });

    return `【用户近期测算历史与觉察心境】\n${lines.join('\n')}\n（说明：请在本次解读中根据上下文自然地提及用户的近期状态或前情回响，让用户感到长期陪伴的连续性，不要说重复的建议）`;
  } catch (e) {
    console.error('Failed to get historical context for AI:', e);
    return '';
  }
}

// ==========================================
// 个人心智画像与本地 AI 解读缓存 (P5 优化)
// ==========================================

export function getPersonalDataSummary(): string {
  try {
    const readings = getLocalReadings();
    // 仅分析最近 30 天的记录
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentReadings = readings.filter(
      (r) => new Date(r.createdAt) >= thirtyDaysAgo && r.reading && r.reading.intuitiveSummary
    );
    
    if (recentReadings.length < 3) return '';
    
    // 1. 统计高频卡牌
    const cardCounts: Record<string, { name: string; count: number }> = {};
    recentReadings.forEach((r) => {
      r.cards.forEach((c) => {
        if (!cardCounts[c.id]) {
          cardCounts[c.id] = { name: c.zhName, count: 0 };
        }
        cardCounts[c.id].count++;
      });
    });
    
    const topCards = Object.values(cardCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((c) => `『${c.name}』(共出现${c.count}次)`)
      .join('、');
      
    // 2. 统计高频情绪
    const moodCounts: Record<string, number> = {};
    recentReadings.forEach((r) => {
      moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1;
    });
    const topMoods = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map((m) => `「${m[0]}」`)
      .join('、');
      
    // 3. 提取最近的主题
    const recentQuestions = recentReadings
      .slice(0, 3)
      .map((r) => `“${r.question}”`)
      .join('；');
      
    return `# USER_HISTORY_PROFILE
【用户近期心智画像摘要】
- 最近30天测算频次：已累计进行 ${recentReadings.length} 次自我分析与读牌。
- 潜意识高频卡牌：${topCards || '无特殊高频牌'}。
- 常见情绪波动：主要处于 ${topMoods || '平稳'} 心境。
- 最近聚焦的主题议题：${recentQuestions}。
（提示：请结合以上用户的近期画像背景进行本次情绪指引，在本次回复的措辞语气及分析侧重点中，含蓄地呼应TA最近的挣扎或成长趋势，但不要说教，保持深度的倾听同理心）`;
  } catch (e) {
    console.error('Failed to generate personal data summary:', e);
    return '';
  }
}

export interface AIResultCacheEntry {
  cacheKey: string;
  promptVersion: string;
  rawText: string;
  parsedReading: ParsedReading;
  createdAt: string;
  expiresAt: string;
}

const CACHE_STORAGE_KEY = 'mirror_tarot_ai_cache';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateCacheKey(
  promptVersion: string,
  question: string,
  mood: string,
  spreadType: string,
  cards: SelectedCard[]
): string {
  const cardStr = [...cards]
    .sort((a, b) => a.positionOrder - b.positionOrder)
    .map((c) => `${c.id}:${c.orientation}`)
    .join(',');
  return `${promptVersion}|${question.trim()}|${mood}|${spreadType}|${cardStr}`;
}

export function getCachedReading(key: string): ParsedReading | null {
  if (typeof window === 'undefined') return null;
  try {
    const cacheDataStr = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!cacheDataStr) return null;
    const cache: Record<string, AIResultCacheEntry> = JSON.parse(cacheDataStr);
    const entry = cache[key];
    if (!entry) return null;
    
    if (new Date().getTime() > new Date(entry.expiresAt).getTime()) {
      delete cache[key];
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
      return null;
    }
    return entry.parsedReading;
  } catch (e) {
    console.error('Failed to get cached reading:', e);
    return null;
  }
}

export function getCachedRawText(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const cacheDataStr = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!cacheDataStr) return null;
    const cache: Record<string, AIResultCacheEntry> = JSON.parse(cacheDataStr);
    const entry = cache[key];
    if (!entry) return null;
    
    if (new Date().getTime() > new Date(entry.expiresAt).getTime()) {
      return null;
    }
    return entry.rawText;
  } catch {
    return null;
  }
}

export function setCachedReading(
  key: string,
  promptVersion: string,
  rawText: string,
  parsedReading: ParsedReading
): void {
  if (typeof window === 'undefined') return;
  try {
    const cacheDataStr = localStorage.getItem(CACHE_STORAGE_KEY) || '{}';
    const cache: Record<string, AIResultCacheEntry> = JSON.parse(cacheDataStr);
    
    // 清理过期数据以防止溢出
    const nowMs = new Date().getTime();
    Object.keys(cache).forEach((k) => {
      if (nowMs > new Date(cache[k].expiresAt).getTime()) {
        delete cache[k];
      }
    });
    
    cache[key] = {
      cacheKey: key,
      promptVersion,
      rawText,
      parsedReading,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(nowMs + CACHE_EXPIRY_MS).toISOString(),
    };
    
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to set cached reading:', e);
  }
}
