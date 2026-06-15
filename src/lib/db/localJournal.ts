import { SelectedCard, ParsedReading, SpreadType } from '../tarot/types';

export interface JournalEntry {
  id: string;
  question: string;
  mood: string;
  spreadType: SpreadType;
  cards: SelectedCard[];
  reading: ParsedReading;
  createdAt: string;
}

const LOCAL_STORAGE_KEY = 'mirror_tarot_journal';

export function saveLocalReading(
  question: string,
  mood: string,
  spreadType: SpreadType,
  cards: SelectedCard[],
  reading: ParsedReading
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
  };

  try {
    const existing = getLocalReadings();
    const updated = [newEntry, ...existing];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

    // 自动触发当日情绪打卡签到
    saveLocalCheckIn(mood);

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
    return true;
  } catch (e) {
    console.error('Failed to delete reading from localStorage:', e);
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
    return true;
  } catch (e) {
    console.error('Failed to save checkin to localStorage:', e);
    return false;
  }
}

