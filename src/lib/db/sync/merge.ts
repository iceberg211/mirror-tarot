import type { CheckInEntry, JournalEntry } from '../types';

export function mergeReadings(current: JournalEntry[], incoming: JournalEntry[]): JournalEntry[] {
  const readingsMap = new Map<string, JournalEntry>();
  [...current, ...incoming].forEach((entry) => {
    const existing = readingsMap.get(entry.id);
    // 阶段 A 保持现有语义；阶段 B 将改为 revision / updatedAt
    if (!existing || new Date(entry.createdAt) >= new Date(existing.createdAt)) {
      readingsMap.set(entry.id, entry);
    }
  });

  return Array.from(readingsMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function mergeCheckIns(current: CheckInEntry[], incoming: CheckInEntry[]): CheckInEntry[] {
  const checkinsMap = new Map<string, CheckInEntry>();
  [...current, ...incoming].forEach((entry) => checkinsMap.set(entry.date, entry));
  return Array.from(checkinsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}
