import type { SelectedCard, SpreadType } from '../tarot/types';
import type { CheckInEntry, JournalBackupData, JournalEntry } from './types';
import {
  CHECKIN_STORAGE_KEY,
  getScopedStorageKey,
  IMPORT_BACKUP_STORAGE_KEY,
  LOCAL_STORAGE_KEY,
  MONTHLY_REPORT_KEY,
  setMonthlyReportForKey,
  SUPPORTED_BACKUP_VERSION,
  writeJsonArray,
} from './local-storage';
import {
  getLocalCheckIns,
  getLocalMonthlyReport,
  getLocalReadings,
} from './journal-crud';
import { syncJournalData } from './sync/sync-engine';

const spreadTypes: SpreadType[] = [
  'one_card',
  'three_cards',
  'relationship',
  'career',
  'shadow',
  'choice',
  'mirror_cross',
  'custom',
];

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

function isParsedReading(value: unknown): boolean {
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
    // revision / updatedAt 可选，normalize 时补齐
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

    const mergedCheckins = Array.from(checkinsMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    writeJsonArray(getScopedStorageKey(LOCAL_STORAGE_KEY), mergedReadings);
    writeJsonArray(getScopedStorageKey(CHECKIN_STORAGE_KEY), mergedCheckins);
    if (parsed.monthlyReport) {
      setMonthlyReportForKey(getScopedStorageKey(MONTHLY_REPORT_KEY), parsed.monthlyReport);
    }

    syncJournalData().catch((err) => {
      console.error('Failed to sync after import:', err);
    });

    return true;
  } catch (e) {
    console.error('Failed to import journal data:', e);
    return false;
  }
}
