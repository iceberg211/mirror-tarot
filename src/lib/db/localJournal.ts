/**
 * 兼容层：原 localJournal 单文件已拆分为 types / storage / crud / sync 等模块。
 * 外部请继续从 `@/lib/db/localJournal` 导入，或逐步迁移到具体子模块。
 */

export type {
  ActionSeed,
  AIResultCacheEntry,
  ChatMessage,
  CheckInEntry,
  JournalAnalytics,
  JournalEntry,
} from './types';

export {
  clearActiveUserId,
  clearUserLocalCache,
  getActiveUserId,
  getDeviceId,
  getLocalDateString,
  setActiveUserId,
} from './local-storage';

export {
  deleteLocalReading,
  extractActionSeed,
  getLocalCheckIns,
  getLocalMonthlyReport,
  getLocalReadingById,
  getLocalReadings,
  saveLocalCheckIn,
  saveLocalMonthlyReport,
  saveLocalReading,
  saveLocalZenReading,
  toggleStarReading,
  updateActionSeedStatus,
  updateChatHistory,
  updateJournalUserNotes,
  updateLocalReading,
} from './journal-crud';

export {
  getHistoricalContextForAI,
  getJournalAnalytics,
  getPersonalDataSummary,
  getRecentMoodState,
} from './journal-analytics';

export {
  generateCacheKey,
  generateCacheKeyAsync,
  getCachedRawText,
  getCachedReading,
  setCachedReading,
} from './journal-cache';

export { exportJournalData, importJournalData } from './journal-backup';

export { syncJournalData } from './sync/sync-engine';
export { migrateGuestDataToUser } from './sync/migrate';
