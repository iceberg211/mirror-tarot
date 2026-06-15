import { Spread, SpreadType } from './types';

export const spreads: Record<SpreadType, Spread> = {
  one_card: {
    type: 'one_card',
    name: '今日一张牌',
    positions: ['今日提示'],
    description: '适合每日清晨或面临特定轻量抉择时使用，成本低，体验轻，给你一整天的灵感启示。'
  },
  three_cards: {
    type: 'three_cards',
    name: '三牌阵',
    positions: ['现状', '阻碍', '建议'],
    description: '最经典的塔罗牌阵之一。分别代表你目前的真实处境、面临的核心困难、以及前行的高效建议。'
  },
  relationship: {
    type: 'relationship',
    name: '关系牌阵',
    positions: ['自我状态', '对方状态', '关系现状', '未来发展'],
    description: '适合剖析感情、朋友、商业合作等双人关系。帮助你看清彼此在关系中的投射与真实纽带。'
  },
  career: {
    type: 'career',
    name: '职业牌阵',
    positions: ['潜在机会', '未知风险', '行动建议'],
    description: '适合求职、转行、创业或重大项目选择。多维度剖析你的事业走向，指明避坑路径与机会。'
  }
};

export const getSpreadByType = (type: string): Spread | undefined => {
  return spreads[type as SpreadType];
};
