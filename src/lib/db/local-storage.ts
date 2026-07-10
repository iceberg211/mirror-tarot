import type { CheckInEntry, JournalEntry, StorageSnapshot } from './types';

export const LOCAL_STORAGE_KEY = 'mirror_tarot_journal';
export const DEVICE_ID_KEY = 'mirror_tarot_device_id';
export const ACTIVE_USER_ID_KEY = 'mirror_tarot_active_user_id';
export const IMPORT_BACKUP_STORAGE_KEY = 'mirror_tarot_import_backup';
export const CHECKIN_STORAGE_KEY = 'mirror_tarot_checkins';
export const MONTHLY_REPORT_KEY = 'mirror_tarot_monthly_report';
export const CACHE_STORAGE_KEY = 'mirror_tarot_ai_cache';
export const SUPPORTED_BACKUP_VERSION = '1.0';

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

export function getScopedStorageKey(baseKey: string, userId = getActiveUserId()): string {
  return userId ? `${baseKey}:${userId}` : baseKey;
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

export function readJsonArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error(`Failed to read localStorage key ${key}:`, e);
    return [];
  }
}

export function writeJsonArray<T>(key: string, value: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getReadingsFromKey(key: string): JournalEntry[] {
  return readJsonArray<JournalEntry>(key);
}

export function getCheckInsFromKey(key: string): CheckInEntry[] {
  return readJsonArray<CheckInEntry>(key);
}

export function getMonthlyReportFromKey(key: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(key) || '';
  } catch (e) {
    console.error(`Failed to read localStorage key ${key}:`, e);
    return '';
  }
}

export function setMonthlyReportForKey(key: string, reportText: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, reportText);
}

export function getGuestStorageSnapshot(): StorageSnapshot {
  return {
    readings: getReadingsFromKey(LOCAL_STORAGE_KEY),
    checkins: getCheckInsFromKey(CHECKIN_STORAGE_KEY),
    monthlyReport: getMonthlyReportFromKey(MONTHLY_REPORT_KEY),
  };
}

export function getUserStorageSnapshot(userId: string): StorageSnapshot {
  return {
    readings: getReadingsFromKey(getScopedStorageKey(LOCAL_STORAGE_KEY, userId)),
    checkins: getCheckInsFromKey(getScopedStorageKey(CHECKIN_STORAGE_KEY, userId)),
    monthlyReport: getMonthlyReportFromKey(getScopedStorageKey(MONTHLY_REPORT_KEY, userId)),
  };
}

export function writeUserStorageSnapshot(userId: string, snapshot: StorageSnapshot): void {
  writeJsonArray(getScopedStorageKey(LOCAL_STORAGE_KEY, userId), snapshot.readings);
  writeJsonArray(getScopedStorageKey(CHECKIN_STORAGE_KEY, userId), snapshot.checkins);
  if (snapshot.monthlyReport) {
    setMonthlyReportForKey(getScopedStorageKey(MONTHLY_REPORT_KEY, userId), snapshot.monthlyReport);
  }
}

export function clearGuestStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  localStorage.removeItem(CHECKIN_STORAGE_KEY);
  localStorage.removeItem(MONTHLY_REPORT_KEY);
}

export function getLocalDateString(dateInput?: Date): string {
  const d = dateInput || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
