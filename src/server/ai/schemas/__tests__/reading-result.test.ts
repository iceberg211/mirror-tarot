import { describe, expect, it } from 'vitest';
import {
  isReadingResult,
  readingResultSchema,
  readingResultToMarkedText,
} from '@/server/ai/schemas/reading-result';

describe('readingResultSchema', () => {
  it('accepts a valid structured reading', () => {
    const parsed = readingResultSchema.parse({
      summary: '先慢下来',
      cardReadings: [
        {
          cardId: 'major-00-the-fool',
          position: '现状',
          interpretation: '新的开始需要一点勇气',
        },
      ],
      contradiction: '想控制又想自由',
      overlookedFactor: '身体疲劳',
      action: '散步十分钟',
      gentleReminder: '你可以慢一点',
    });

    expect(parsed.summary).toBe('先慢下来');
    expect(isReadingResult(parsed)).toBe(true);
  });

  it('rejects empty summary', () => {
    const result = readingResultSchema.safeParse({
      summary: '',
      cardReadings: [],
      action: '做点什么',
      gentleReminder: '慢一点',
    });
    expect(result.success).toBe(false);
  });
});

describe('readingResultToMarkedText', () => {
  it('converts to marker text for stream-compatible UI', () => {
    const text = readingResultToMarkedText({
      summary: '摘要',
      cardReadings: [{ position: '现状', interpretation: '解读' }],
      contradiction: '矛盾',
      overlookedFactor: '因素',
      action: '行动',
      gentleReminder: '提醒',
    });

    expect(text).toContain('# SUMMARY');
    expect(text).toContain('# CARD_READING_1');
    expect(text).toContain('# ACTION_ADVICE');
  });
});
