import { SelectedCard, ParsedReading } from './types';

export function getCardElement(card: SelectedCard): 'water' | 'fire' | 'wind' | 'earth' {
  if (card.arcana === 'minor' && card.suit) {
    if (card.suit === 'wands') return 'fire';
    if (card.suit === 'cups') return 'water';
    if (card.suit === 'swords') return 'wind';
    if (card.suit === 'pentacles') return 'earth';
  }
  const num = card.number ?? 0;
  if ([2, 3, 12, 13, 18, 20].includes(num)) return 'water';
  if ([1, 7, 10, 16, 19].includes(num)) return 'fire';
  if ([0, 6, 11, 14, 17].includes(num)) return 'wind';
  return 'earth';
}

export const defaultSuggestions = [
  '结合我的感情问题解释',
  '结合我的职业问题解释',
  '我是不是在自欺欺人？',
  '给我一个更现实的建议',
  '这组牌的反面提醒是什么？',
];

function uniqueSuggestions(items: string[]): string[] {
  const result: string[] = [];
  items.forEach((item) => {
    if (item && !result.includes(item)) result.push(item);
  });
  return result.slice(0, 5);
}

export function buildFollowUpSuggestions(input: {
  question: string;
  spreadType?: string;
  cards: SelectedCard[];
  reading?: ParsedReading;
}): string[] {
  const question = input.question.toLowerCase();
  const mainCard = input.cards[0];
  const mainCardName = mainCard?.zhName || '主牌';
  const orientationText = mainCard?.orientation === 'reversed' ? '逆位' : '正位';
  const actionAdvice = input.reading?.actionAdvice?.trim();

  const suggestions: string[] = [];

  if (question.includes('梦') || input.spreadType === 'shadow') {
    suggestions.push(
      `这个梦和「${mainCardName}」有什么关系？`,
      '梦里最值得留意的情绪是什么？'
    );
  }

  if (question.includes('关系') || question.includes('感情') || input.spreadType === 'relationship') {
    suggestions.push(
      `这张${orientationText}的「${mainCardName}」在关系里提醒什么？`,
      '我应该主动靠近，还是先观察？'
    );
  }

  if (question.includes('工作') || question.includes('职业') || question.includes('项目') || input.spreadType === 'career') {
    suggestions.push(
      `「${mainCardName}」对我的工作选择有什么提醒？`,
      '现在最该先处理哪一步？'
    );
  }

  if (question.includes('选择') || question.includes('抉择') || input.spreadType === 'choice') {
    suggestions.push(
      '如果我选择 A，最需要注意什么？',
      '如果我选择 B，最需要注意什么？'
    );
  }

  suggestions.push(
    `为什么这次会抽到「${mainCardName}」？`,
    actionAdvice ? '把行动建议拆成今天能做的一步' : '给我一个今天能做的小行动',
    '这组牌最现实的提醒是什么？'
  );

  return uniqueSuggestions([...suggestions, ...defaultSuggestions]);
}

export function parseStreamingReading(
  text: string,
  cardCountOrCards: number | SelectedCard[]
): ParsedReading {
  const sections = {
    questionSummary: '',
    intuitiveSummary: '',
    contradiction: '',
    overlookedFactor: '',
    actionAdvice: '',
    gentleReminder: '',
  };

  const isArray = Array.isArray(cardCountOrCards);
  const cardCount = isArray ? cardCountOrCards.length : cardCountOrCards;
  const cards = isArray ? cardCountOrCards : [];

  const cardReadings = Array(cardCount).fill('');

  const parts = text.split('# ');
  parts.forEach((part) => {
    const lines = part.split('\n');
    const title = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();

    if (title.startsWith('SUMMARY')) {
      sections.intuitiveSummary = body;
      sections.questionSummary = body.slice(0, 15) + '...';
    } else if (title.startsWith('CARD_READING_')) {
      const idx = parseInt(title.replace('CARD_READING_', ''), 10) - 1;
      if (idx >= 0 && idx < cardCount) {
        cardReadings[idx] = body;
      }
    } else if (title.startsWith('CONTRADICTION')) {
      sections.contradiction = body;
    } else if (title.startsWith('OVERLOOKED_FACTOR')) {
      sections.overlookedFactor = body;
    } else if (title.startsWith('ACTION_ADVICE')) {
      sections.actionAdvice = body;
    } else if (title.startsWith('GENTLE_REMINDER')) {
      sections.gentleReminder = body;
    }
  });

  return {
    ...sections,
    cardReadings: cardReadings.map((body, index) => ({
      positionName: cards[index]?.positionName || '今日运势',
      cardName: cards[index]?.name || '',
      cardZhName: cards[index]?.zhName || '',
      orientation: cards[index]?.orientation || 'upright',
      interpretation: body,
    })),
    followUpSuggestions: isArray
      ? buildFollowUpSuggestions({
          question: '',
          cards,
          reading: {
            ...sections,
            cardReadings: [],
            followUpSuggestions: [],
          },
        })
      : [],
  };
}
