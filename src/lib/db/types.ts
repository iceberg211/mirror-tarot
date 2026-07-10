import type { SelectedCard, ParsedReading, SpreadType } from '../tarot/types';

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

export type SyncStatus = 'synced' | 'pending' | 'conflict';

export interface JournalEntry {
  id: string;
  question: string;
  mood: string;
  spreadType: SpreadType;
  cards: SelectedCard[];
  reading: ParsedReading;
  createdAt: string;
  /** 最后修改时间；缺省时回退 createdAt */
  updatedAt: string;
  /** 单调递增版本；缺省为 1 */
  revision: number;
  /** 软删除墓碑 */
  deletedAt?: string | null;
  clientId?: string;
  syncStatus?: SyncStatus;
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
  recentMoodState?: 'shadow' | 'storm';
  isZen?: boolean;
  zenScore?: number;
}

export interface CheckInEntry {
  date: string;
  mood: string;
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

export interface AIResultCacheEntry {
  cacheKey: string;
  promptVersion: string;
  rawText: string;
  parsedReading: ParsedReading;
  createdAt: string;
  expiresAt: string;
}

export interface JournalBackupData {
  version: string;
  readings: JournalEntry[];
  checkins: CheckInEntry[];
  monthlyReport: string;
  exportedAt?: string;
}

export interface CloudReadingPayload extends ParsedReading {
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
  _recentMoodState?: 'shadow' | 'storm';
  _isZen?: boolean;
  _zenScore?: number;
}

export interface CloudReadingRow {
  id: string;
  user_id?: string | null;
  question: string;
  mood: string;
  spread_type: SpreadType;
  cards: SelectedCard[];
  reading: CloudReadingPayload;
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
  revision?: number | null;
  client_id?: string | null;
  is_dream?: boolean;
}

export interface CloudCheckInRow {
  user_id?: string | null;
  device_id: string;
  date: string;
  mood: string;
}

export interface CloudMonthlyReportRow {
  report?: string | null;
}

export interface StorageSnapshot {
  readings: JournalEntry[];
  checkins: CheckInEntry[];
  monthlyReport: string;
}
