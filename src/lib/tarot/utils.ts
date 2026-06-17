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
    followUpSuggestions: isArray ? defaultSuggestions : [],
  };
}
