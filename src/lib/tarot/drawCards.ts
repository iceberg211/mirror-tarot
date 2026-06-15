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
  const shuffled = [...tarotCards].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  return selected.map((card, index) => {
    const orientation = Math.random() > 0.5 ? 'upright' : 'reversed';
    return {
      ...card,
      orientation,
      positionName: spread.positions[index],
      positionOrder: index + 1,
    };
  });
}
