import { describe, expect, it } from 'vitest';
import {
  classifyQuestionTheme,
  formatCardsContext,
} from '@/lib/ai/prompts/formatters';
import type { SelectedCard } from '@/lib/tarot/types';

const mockCard = {
  id: 'major-00-the-fool',
  name: 'The Fool',
  zhName: '愚人',
  orientation: 'upright',
  positionName: '现状',
  positionOrder: 1,
  keywords: { upright: ['开始'], reversed: ['鲁莽'] },
  arcana: 'major',
  image: '/x.jpg',
  number: 0,
} as SelectedCard;

const meaning = {
  general: '通用释义内容',
  love: '感情分析内容',
  career: '职业关联内容',
  advice: '行动指引内容',
};

describe('classifyQuestionTheme', () => {
  it('detects career theme', () => {
    expect(classifyQuestionTheme('我该不该跳槽换工作', 'three_cards')).toBe('career');
  });

  it('detects love theme from spread', () => {
    expect(classifyQuestionTheme('他怎么看我', 'relationship')).toBe('love');
  });
});

describe('formatCardsContext', () => {
  it('omits love meaning for career theme', () => {
    const text = formatCardsContext([{ card: mockCard, meaning }], 'career');
    expect(text).toContain('职业关联内容');
    expect(text).toContain('行动指引内容');
    expect(text).not.toContain('感情分析内容');
  });

  it('includes love but not career full for love theme', () => {
    const text = formatCardsContext([{ card: mockCard, meaning }], 'love');
    expect(text).toContain('感情分析内容');
    expect(text).not.toContain('职业关联内容');
  });
});
