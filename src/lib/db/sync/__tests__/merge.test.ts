import { describe, expect, it } from 'vitest';
import {
  filterActiveReadings,
  isNewerJournalEntry,
  mergeCheckIns,
  mergeReadings,
  normalizeJournalEntry,
} from '@/lib/db/sync/merge';
import type { JournalEntry } from '@/lib/db/types';
import type { ParsedReading } from '@/lib/tarot/types';

const emptyReading: ParsedReading = {
  questionSummary: '',
  intuitiveSummary: '',
  cardReadings: [],
  contradiction: '',
  overlookedFactor: '',
  actionAdvice: '',
  gentleReminder: '',
  followUpSuggestions: [],
};

function makeEntry(
  id: string,
  createdAt: string,
  question: string,
  extras: Partial<JournalEntry> = {}
): JournalEntry {
  return normalizeJournalEntry({
    id,
    question,
    mood: '平静',
    spreadType: 'one_card',
    cards: [],
    reading: emptyReading,
    createdAt,
    updatedAt: extras.updatedAt || createdAt,
    revision: extras.revision ?? 1,
    deletedAt: extras.deletedAt ?? null,
    ...extras,
  });
}

describe('mergeReadings', () => {
  it('prefers higher revision over older createdAt', () => {
    const olderCreatedButHigherRev = makeEntry('a', '2026-01-01T00:00:00.000Z', 'starred', {
      revision: 3,
      updatedAt: '2026-03-01T00:00:00.000Z',
      isStarred: true,
    });
    const newerCreatedLowerRev = makeEntry('a', '2026-02-01T00:00:00.000Z', 'plain', {
      revision: 1,
      updatedAt: '2026-02-01T00:00:00.000Z',
    });

    const merged = mergeReadings([newerCreatedLowerRev], [olderCreatedButHigherRev]);
    expect(merged).toHaveLength(1);
    expect(merged[0].question).toBe('starred');
    expect(merged[0].revision).toBe(3);
  });

  it('keeps tombstone when it has higher revision', () => {
    const active = makeEntry('a', '2026-01-01T00:00:00.000Z', 'live', { revision: 1 });
    const deleted = makeEntry('a', '2026-01-01T00:00:00.000Z', 'live', {
      revision: 2,
      deletedAt: '2026-01-02T00:00:00.000Z',
    });

    const merged = mergeReadings([active], [deleted]);
    expect(merged[0].deletedAt).toBeTruthy();
    expect(filterActiveReadings(merged)).toHaveLength(0);
  });
});

describe('isNewerJournalEntry', () => {
  it('compares by revision first', () => {
    const a = makeEntry('x', '2026-01-01T00:00:00.000Z', 'a', { revision: 2 });
    const b = makeEntry('x', '2026-06-01T00:00:00.000Z', 'b', { revision: 1 });
    expect(isNewerJournalEntry(a, b)).toBe(true);
  });
});

describe('mergeCheckIns', () => {
  it('dedupes by date with last write wins', () => {
    const merged = mergeCheckIns(
      [{ date: '2026-01-01', mood: '焦虑' }],
      [
        { date: '2026-01-01', mood: '平静' },
        { date: '2026-01-02', mood: '开心' },
      ]
    );

    expect(merged).toHaveLength(2);
    expect(merged.find((c) => c.date === '2026-01-01')?.mood).toBe('平静');
  });
});
