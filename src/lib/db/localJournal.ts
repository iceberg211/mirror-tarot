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
}

export function getJournalAnalytics(): JournalAnalytics {
  const readings = getLocalReadings();
  const checkins = getLocalCheckIns();

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
  const moodScores: Record<string, number> = {
    '平静': 4,
    '期待': 4,
    '纠结': 3,
    '迷茫': 3,
    '焦虑': 2,
    '难过': 1,
  };

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
  
  return {
    topCards,
    moodTrend,
  };
}

export function exportJournalData(): string {
  if (typeof window === 'undefined') return '';
  const data = {
    version: '1.0',
    readings: getLocalReadings(),
    checkins: getLocalCheckIns(),
    monthlyReport: getLocalMonthlyReport()
  };
  return JSON.stringify(data, null, 2);
}

export function importJournalData(jsonStr: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && Array.isArray(parsed.readings) && Array.isArray(parsed.checkins)) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed.readings));
      localStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify(parsed.checkins));
      if (typeof parsed.monthlyReport === 'string') {
        localStorage.setItem(MONTHLY_REPORT_KEY, parsed.monthlyReport);
      }
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to import journal data:', e);
    return false;
  }
}

