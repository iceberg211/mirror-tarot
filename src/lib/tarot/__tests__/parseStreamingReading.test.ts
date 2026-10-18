import { describe, expect, it } from 'vitest';
import { parseStreamingReading } from '@/lib/tarot/utils';
import type { SelectedCard } from '@/lib/tarot/types';

const mockCards = [
  {
    id: 'major-00-the-fool',
    name: 'The Fool',
    zhName: '愚人',
    orientation: 'upright',
    positionName: '现状',
    positionOrder: 1,
  },
  {
    id: 'cups-01',
    name: 'Ace of Cups',
    zhName: '圣杯首牌',
    orientation: 'reversed',
    positionName: '阻碍',
    positionOrder: 2,
  },
] as SelectedCard[];

describe('parseStreamingReading', () => {
  it('parses section markers into structured fields', () => {
    const text = `# SUMMARY
一句话摘要

# CARD_READING_1
第一张牌解读

# CARD_READING_2
第二张牌解读

# CONTRADICTION
内在矛盾

# OVERLOOKED_FACTOR
忽略因素

# ACTION_ADVICE
今天散步

# GENTLE_REMINDER
温柔提醒`;

    const parsed = parseStreamingReading(text, mockCards);

    expect(parsed.intuitiveSummary).toContain('一句话摘要');
    expect(parsed.cardReadings[0].interpretation).toContain('第一张牌解读');
    expect(parsed.cardReadings[0].cardZhName).toBe('愚人');
    expect(parsed.cardReadings[1].interpretation).toContain('第二张牌解读');
    expect(parsed.actionAdvice).toContain('今天散步');
    expect(parsed.gentleReminder).toContain('温柔提醒');
  });

  it('tolerates markdown code fences and colon headings', () => {
    const markdownWrapped = `\`\`\`markdown
## SUMMARY:
在关系中保持边界

### CARD_READING_1 (现状):
抽到了愚人，代表重新开始

# ACTION_ADVICE:
今天主动给朋友发个问候
\`\`\``;

    const parsed = parseStreamingReading(markdownWrapped, mockCards);
    expect(parsed.intuitiveSummary).toContain('在关系中保持边界');
    expect(parsed.cardReadings[0].interpretation).toContain('抽到了愚人');
    expect(parsed.actionAdvice).toContain('今天主动给朋友发个问候');
  });

  it('safely handles unsegmented plain text as intuitiveSummary fallback', () => {
    const plainText = '全国心理援助热线：400-161-9995。此刻安全与现实陪伴最重要。';
    const parsed = parseStreamingReading(plainText, mockCards);
    expect(parsed.intuitiveSummary).toContain('全国心理援助热线');
  });
});
