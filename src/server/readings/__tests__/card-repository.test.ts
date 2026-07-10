import { describe, expect, it } from 'vitest';
import { ApiError } from '@/server/ai/errors';
import {
  formatPreviousReadingForPrompt,
  resolveCardsForSpread,
} from '@/server/readings/card-repository';

describe('resolveCardsForSpread', () => {
  it('rebuilds selected cards from id + orientation using server data', () => {
    const { spreadName, cardsWithMeanings } = resolveCardsForSpread('one_card', [
      { id: 'major-00-the-fool', orientation: 'upright' },
    ]);

    expect(spreadName).toBe('今日一张牌');
    expect(cardsWithMeanings).toHaveLength(1);
    expect(cardsWithMeanings[0].card.zhName).toBe('愚人');
    expect(cardsWithMeanings[0].card.positionName).toBe('今日提示');
    expect(cardsWithMeanings[0].meaning.general.length).toBeGreaterThan(0);
  });

  it('rejects unknown card ids', () => {
    expect(() =>
      resolveCardsForSpread('one_card', [{ id: 'not-a-real-card', orientation: 'reversed' }])
    ).toThrow(ApiError);
  });

  it('rejects wrong card count for fixed spreads', () => {
    expect(() =>
      resolveCardsForSpread('three_cards', [
        { id: 'major-00-the-fool', orientation: 'upright' },
      ])
    ).toThrow(/需要 3 张牌/);
  });
});

describe('formatPreviousReadingForPrompt', () => {
  it('formats structured previous reading without free-form injection surface', () => {
    const text = formatPreviousReadingForPrompt({
      intuitiveSummary: '今天需要放慢节奏',
      cardReadings: [{ interpretation: '愚人提醒你重新开始' }],
      contradiction: '想要控制却渴望自由',
      overlookedFactor: '身体疲劳',
      actionAdvice: '散步十分钟',
      gentleReminder: '你可以慢一点',
    });

    expect(text).toContain('# SUMMARY');
    expect(text).toContain('今天需要放慢节奏');
    expect(text).toContain('# CARD_READING_1');
    expect(text).toContain('# ACTION_ADVICE');
  });
});
