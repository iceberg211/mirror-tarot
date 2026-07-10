import { describe, expect, it } from 'vitest';
import { mergeCheckIns, mergeReadings } from '@/lib/db/sync/merge';
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

function makeEntry(id: string, createdAt: string, question: string): JournalEntry {
  return {
    id,
    question,
    mood: '平静',
    spreadType: 'one_card',
    cards: [],
    reading: emptyReading,
    createdAt,
  };
}

describe('mergeReadings', () => {
  it('keeps the entry with later createdAt for the same id', () => {
    const older = makeEntry('a', '2026-01-01T00:00:00.000Z', 'old');
    const newer = makeEntry('a', '2026-02-01T00:00:00.000Z', 'new');

    const merged = mergeReadings([older], [newer]);
    expect(merged).toHaveLength(1);
    expect(merged[0].question).toBe('new');
  });
});

describe('mergeCheckIns', () => {
  it('dedupes by date with last write wins', () => {
    const merged = mergeCheckIns(
      [{ date: '2026-01-01', mood: '焦虑' }],
      [{ date: '2026-01-01', mood: '平静' }, { date: '2026-01-02', mood: '开心' }]
    );

    expect(merged).toHaveLength(2);
    expect(merged.find((c) => c.date === '2026-01-01')?.mood).toBe('平静');
  });
});
