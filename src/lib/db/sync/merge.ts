import type { CheckInEntry, JournalEntry } from '../types';

/** 兼容旧本地数据：补齐 revision / updatedAt */
export function normalizeJournalEntry(entry: JournalEntry): JournalEntry {
  const createdAt = entry.createdAt || new Date(0).toISOString();
  return {
    ...entry,
    createdAt,
    updatedAt: entry.updatedAt || createdAt,
    revision: typeof entry.revision === 'number' && entry.revision > 0 ? entry.revision : 1,
    deletedAt: entry.deletedAt ?? null,
  };
}

function entryVersionScore(entry: JournalEntry): { revision: number; updatedAtMs: number } {
  const normalized = normalizeJournalEntry(entry);
  return {
    revision: normalized.revision,
    updatedAtMs: new Date(normalized.updatedAt).getTime() || 0,
  };
}

/** 返回 true 表示 candidate 应覆盖 existing */
export function isNewerJournalEntry(candidate: JournalEntry, existing: JournalEntry): boolean {
  const a = entryVersionScore(candidate);
  const b = entryVersionScore(existing);
  if (a.revision !== b.revision) return a.revision > b.revision;
  return a.updatedAtMs >= b.updatedAtMs;
}

export function mergeReadings(current: JournalEntry[], incoming: JournalEntry[]): JournalEntry[] {
  const readingsMap = new Map<string, JournalEntry>();

  [...current, ...incoming].forEach((raw) => {
    const entry = normalizeJournalEntry(raw);
    const existing = readingsMap.get(entry.id);
    if (!existing || isNewerJournalEntry(entry, existing)) {
      readingsMap.set(entry.id, entry);
    }
  });

  return Array.from(readingsMap.values()).sort((a, b) => {
    // 活跃记录按 updatedAt 倒序；已删除排在后面
    const aDel = a.deletedAt ? 1 : 0;
    const bDel = b.deletedAt ? 1 : 0;
    if (aDel !== bDel) return aDel - bDel;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

/** 列表展示用：过滤墓碑 */
export function filterActiveReadings(readings: JournalEntry[]): JournalEntry[] {
  return readings.filter((r) => !r.deletedAt);
}

export function mergeCheckIns(current: CheckInEntry[], incoming: CheckInEntry[]): CheckInEntry[] {
  const checkinsMap = new Map<string, CheckInEntry>();
  [...current, ...incoming].forEach((entry) => checkinsMap.set(entry.date, entry));
  return Array.from(checkinsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}
