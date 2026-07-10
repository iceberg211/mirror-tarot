import { getCardById } from '@/lib/tarot/cards';
import { getCardMeaning } from '@/lib/tarot/meanings';
import { getSpreadByType } from '@/lib/tarot/spreads';
import type { CardMeaning, SelectedCard, SpreadType } from '@/lib/tarot/types';
import { ApiError } from '@/server/ai/errors';

export interface CardRef {
  id: string;
  orientation: 'upright' | 'reversed';
}

export interface ResolvedCardContext {
  card: SelectedCard;
  meaning: CardMeaning;
}

/**
 * 仅信任 cardId + orientation + 服务端牌阵位置。
 * 客户端传入的牌名、关键字、牌义一律丢弃，由服务端仓库重建。
 */
export function resolveCardsForSpread(
  spreadType: SpreadType | string,
  cardRefs: CardRef[]
): { spreadName: string; cardsWithMeanings: ResolvedCardContext[] } {
  const spread = getSpreadByType(spreadType);
  if (!spread) {
    throw new ApiError('VALIDATION_ERROR', `未知牌阵类型: ${spreadType}`, 400);
  }

  if (spread.type !== 'custom' && spread.positions.length > 0 && cardRefs.length !== spread.positions.length) {
    throw new ApiError(
      'VALIDATION_ERROR',
      `牌阵「${spread.name}」需要 ${spread.positions.length} 张牌，实际收到 ${cardRefs.length} 张`,
      400
    );
  }

  if (spread.type === 'custom' && cardRefs.length < 1) {
    throw new ApiError('VALIDATION_ERROR', '自定义牌阵至少需要 1 张牌', 400);
  }

  const cardsWithMeanings: ResolvedCardContext[] = cardRefs.map((ref, index) => {
    const base = getCardById(ref.id);
    if (!base) {
      throw new ApiError('VALIDATION_ERROR', `未知卡牌 ID: ${ref.id}`, 400);
    }

    const positionName =
      spread.positions[index] ||
      (spread.type === 'custom' ? `位置 ${index + 1}` : spread.positions[0] || `位置 ${index + 1}`);

    const card: SelectedCard = {
      ...base,
      orientation: ref.orientation,
      positionName,
      positionOrder: index + 1,
    };

    return {
      card,
      meaning: getCardMeaning(card.id, card.orientation),
    };
  });

  return {
    spreadName: spread.name,
    cardsWithMeanings,
  };
}

export function formatPreviousReadingForPrompt(previous: {
  intuitiveSummary?: string;
  cardReadings?: { interpretation: string }[];
  contradiction?: string;
  overlookedFactor?: string;
  actionAdvice?: string;
  gentleReminder?: string;
}): string {
  const cardBlocks = (previous.cardReadings || [])
    .map((item, idx) => `# CARD_READING_${idx + 1}\n${item.interpretation}`)
    .join('\n\n');

  return [
    `# SUMMARY\n${previous.intuitiveSummary || ''}`,
    cardBlocks,
    `# CONTRADICTION\n${previous.contradiction || ''}`,
    `# OVERLOOKED_FACTOR\n${previous.overlookedFactor || ''}`,
    `# ACTION_ADVICE\n${previous.actionAdvice || ''}`,
    `# GENTLE_REMINDER\n${previous.gentleReminder || ''}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}
