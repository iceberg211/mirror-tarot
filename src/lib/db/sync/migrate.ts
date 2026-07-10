import type { StorageSnapshot } from '../types';
import {
  clearGuestStorage,
  getGuestStorageSnapshot,
  getUserStorageSnapshot,
  setActiveUserId,
  writeUserStorageSnapshot,
  IMPORT_BACKUP_STORAGE_KEY,
} from '../local-storage';
import { mergeCheckIns, mergeReadings } from './merge';
import { syncJournalData } from './sync-engine';

/**
 * 将游客本地数据合并到登录用户作用域，并尝试云同步。
 * 仅在 sync 明确成功后才清理游客数据；失败时保留游客快照。
 */
export async function migrateGuestDataToUser(userId: string): Promise<boolean> {
  if (typeof window === 'undefined' || !userId) return false;

  const guestSnapshot = getGuestStorageSnapshot();
  const userSnapshot = getUserStorageSnapshot(userId);

  // 迁移前保留游客快照，防止误清
  try {
    localStorage.setItem(
      `${IMPORT_BACKUP_STORAGE_KEY}:guest-migrate:${userId}`,
      JSON.stringify({
        ...guestSnapshot,
        savedAt: new Date().toISOString(),
      })
    );
  } catch (e) {
    console.error('Failed to snapshot guest data before migrate:', e);
  }

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
  } else {
    console.warn('Guest migration sync failed; guest local data retained.');
  }

  return syncOk;
}
