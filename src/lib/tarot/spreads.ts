import { Spread, SpreadType } from './types';

export const spreads: Record<SpreadType, Spread> = {
  one_card: {
    type: 'one_card',
    name: '今日一张牌',
    positions: ['今日提示'],
    description: '适合每天快速开始，也适合处理一个很小的当下问题。'
  },
  three_cards: {
    type: 'three_cards',
    name: '三牌阵',
    positions: ['现状', '阻碍', '建议'],
    description: '用三张牌看清现在发生了什么、卡在哪里、下一步怎么做。'
  },
  relationship: {
    type: 'relationship',
    name: '关系牌阵',
    positions: ['自我状态', '对方状态', '关系现状', '未来发展'],
    description: '适合感情、朋友或合作关系，帮助你看清彼此的位置和关系走向。'
  },
  career: {
    type: 'career',
    name: '职业牌阵',
    positions: ['潜在机会', '未知风险', '行动建议'],
    description: '适合求职、转行、创业或项目选择，重点看机会、风险和行动。'
  },
  shadow: {
    type: 'shadow',
    name: '自我与阴影',
    positions: ['表层想法', '深层抗拒', '可行出口'],
    description: '适合处理反复出现的情绪、抗拒和梦境，把模糊感受说清楚。'
  },
  choice: {
    type: 'choice',
    name: '二选一抉择',
    positions: ['现状', '选项 A 的影响', '选项 B 的影响', '建议'],
    description: '适合两难选择，分别比较两条路会带来的影响。'
  },
  mirror_cross: {
    type: 'mirror_cross',
    name: '镜面十字',
    positions: ['核心现状', '现实阻碍', '理性判断', '真实原因', '下一步'],
    description: '适合比较复杂的问题，帮助你拆开现状、阻碍、原因和行动。'
  },
  custom: {
    type: 'custom',
    name: '自定义牌阵',
    positions: [],
    description: '自己命名每张牌的位置，适合已经很清楚想看哪些角度的时候。'
  }
};

export const getSpreadByType = (type: string): Spread | undefined => {
  return spreads[type as SpreadType];
};
