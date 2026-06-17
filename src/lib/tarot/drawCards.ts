import { tarotCards } from './cards';
import { spreads } from './spreads';
import { SelectedCard, SpreadType } from './types';

/**
 * 服务端抽牌算法
 * @param spreadType 牌阵类型
 * @returns 抽取并组装好的 SelectedCard 数组
 */
export function drawCards(spreadType: SpreadType): SelectedCard[] {
  const spread = spreads[spreadType];
  if (!spread) {
    throw new Error(`未知的牌阵类型: ${spreadType}`);
  }

  const count = spread.positions.length;
  const shuffled = shuffleCards(tarotCards);
  const selected = shuffled.slice(0, count);

  return selected.map((card, index) => {
    const orientation = randomInt(2) === 0 ? 'upright' : 'reversed';
    return {
      ...card,
      orientation,
      positionName: spread.positions[index],
      positionOrder: index + 1,
    };
  });
}

function shuffleCards(cards: typeof tarotCards) {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function randomInt(maxExclusive: number) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % maxExclusive;
}
