import { TarotCard } from './types';

// 大阿卡纳 (Major Arcana) 基础数据
const majorArcanaData: { name: string; zhName: string; uprightKeys: string[]; reversedKeys: string[] }[] = [
  { name: "The Fool", zhName: "愚人", uprightKeys: ["开始", "自由", "冒险", "纯真"], reversedKeys: ["鲁莽", "逃避", "愚蠢", "漂泊"] },
  { name: "The Magician", zhName: "魔术师", uprightKeys: ["创造力", "行动力", "专注", "潜能"], reversedKeys: ["幻觉", "欺骗", "能力不足", "缺乏方向"] },
  { name: "The High Priestess", zhName: "女祭司", uprightKeys: ["直觉", "潜意识", "智慧", "静止"], reversedKeys: ["隐藏动机", "忽视直觉", "肤浅", "冷漠"] },
  { name: "The Empress", zhName: "女皇", uprightKeys: ["丰饶", "自然", "母性", "创造力"], reversedKeys: ["缺乏生机", "依赖", "过度保护", "创造力受阻"] },
  { name: "The Emperor", zhName: "皇帝", uprightKeys: ["权威", "秩序", "稳定", "保护"], reversedKeys: ["专制", "软弱", "混乱", "掌控欲过强"] },
  { name: "The Hierophant", zhName: "教皇", uprightKeys: ["传统", "信仰", "仪式", "引导"], reversedKeys: ["叛逆", "教条", "打破常规", "盲目听从"] },
  { name: "The Lovers", zhName: "恋人", uprightKeys: ["选择", "和谐", "结合", "价值观对齐"], reversedKeys: ["失衡", "不合", "逃避选择", "关系危机"] },
  { name: "The Chariot", zhName: "战车", uprightKeys: ["意志力", "胜利", "自律", "行动"], reversedKeys: ["失控", "方向错误", "好胜心切", "阻碍重重"] },
  { name: "Strength", zhName: "力量", uprightKeys: ["勇气", "耐力", "温柔的掌控", "同理心"], reversedKeys: ["自负", "软弱", "情绪失控", "无力感"] },
  { name: "The Hermit", zhName: "隐士", uprightKeys: ["内省", "孤独", "寻求真理", "向内看"], reversedKeys: ["孤立", "偏执", "社交焦虑", "拒绝面对自我"] },
  { name: "Wheel of Fortune", zhName: "命运之轮", uprightKeys: ["转折点", "运气", "命运", "变化"], reversedKeys: ["坏运气", "抗拒改变", "外在失控", "恶性循环"] },
  { name: "Justice", zhName: "正义", uprightKeys: ["公平", "诚实", "因果", "决策"], reversedKeys: ["偏见", "不公", "逃避责任", "严苛的审判"] },
  { name: "The Hanged Man", zhName: "倒吊人", uprightKeys: ["换位思考", "牺牲", "放手", "等待"], reversedKeys: ["无谓牺牲", "拖延", "逃避现实", "停滞不前"] },
  { name: "Death", zhName: "死神", uprightKeys: ["结束", "转变", "新生", "告别过去"], reversedKeys: ["抗拒改变", "沉溺过去", "恐惧结束", "死灰复燃"] },
  { name: "Temperance", zhName: "节制", uprightKeys: ["平衡", "融合", "耐心", "自愈"], reversedKeys: ["失衡", "过度", "冲突", "缺乏沟通"] },
  { name: "The Devil", zhName: "恶魔", uprightKeys: ["束缚", "欲望", "物质主义", "成瘾"], reversedKeys: ["觉醒", "释放", "挣脱束缚", "自我救赎"] },
  { name: "The Tower", zhName: "高塔", uprightKeys: ["剧变", "破灭", "启示", "突发事件"], reversedKeys: ["幸免于难", "抗拒重组", "余震未消", "逃避真相"] },
  { name: "The Star", zhName: "星星", uprightKeys: ["希望", "灵感", "疗愈", "宁静"], reversedKeys: ["失望", "悲观", "失去信心", "灵感枯竭"] },
  { name: "The Moon", zhName: "月亮", uprightKeys: ["不安", "幻觉", "直觉", "迷茫"], reversedKeys: ["真相大白", "恐惧消退", "自我欺骗", "情绪平复"] },
  { name: "The Sun", zhName: "太阳", uprightKeys: ["活力", "成功", "喜悦", "清晰"], reversedKeys: ["短暂挫折", "虚荣", "过度乐观", "失去活力"] },
  { name: "Judgement", zhName: "审判", uprightKeys: ["觉醒", "反省", "重大决定", "召唤"], reversedKeys: ["自我怀疑", "逃避反思", "优柔寡断", "抱憾"] },
  { name: "The World", zhName: "世界", uprightKeys: ["圆满", "集成", "成就", "旅行"], reversedKeys: ["未完成", "差临门一脚", "停滞", "缺乏满足感"] }
];

const suitEnToZh: Record<string, string> = {
  wands: "权杖",
  cups: "圣杯",
  swords: "宝剑",
  pentacles: "星币"
};

const numberEnToZh: Record<number, string> = {
  1: "Ace", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六", 7: "七", 8: "八", 9: "九", 10: "十",
  11: "侍从", 12: "骑士", 13: "王后", 14: "国王"
};

const numberZhName: Record<number, string> = {
  1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六", 7: "七", 8: "八", 9: "九", 10: "十",
  11: "侍从", 12: "骑士", 13: "王后", 14: "国王"
};

// 小阿卡纳花色的关键字模板，用于动态装配生成
const suitKeywords: Record<string, { upright: string[]; reversed: string[] }> = {
  wands: { upright: ["行动", "能量", "热情", "灵感"], reversed: ["拖延", "精疲力竭", "冲突", "缺乏动力"] },
  cups: { upright: ["情感", "直觉", "关系", "爱"], reversed: ["情感积压", "失恋", "幻想", "冷漠"] },
  swords: { upright: ["智力", "思想", "冲突", "决策"], reversed: ["混乱", "自欺", "逃避", "言语伤害"] },
  pentacles: { upright: ["物质", "财富", "稳定", "丰收"], reversed: ["经济危机", "贪婪", "不稳定", "短视"] }
};

export const tarotCards: TarotCard[] = [];

// 1. 装配大阿卡纳 (00 - 21)
majorArcanaData.forEach((card, index) => {
  const numStr = index.toString().padStart(2, '0');
  const fileId = `${numStr}-${card.name.toLowerCase().replace(/ /g, '-')}`;
  tarotCards.push({
    id: `major-${fileId}`,
    number: index,
    name: card.name,
    zhName: card.zhName,
    arcana: 'major',
    image: `/cards/rws/${fileId}.jpg`,
    keywords: {
      upright: card.uprightKeys,
      reversed: card.reversedKeys
    }
  });
});

// 2. 装配小阿卡纳 (56张)
const suits: ('wands' | 'cups' | 'swords' | 'pentacles')[] = ['wands', 'cups', 'swords', 'pentacles'];
suits.forEach(suit => {
  for (let num = 1; num <= 14; num++) {
    let cardName = "";
    let cardZhName = "";
    
    const suitZh = suitEnToZh[suit];
    const numZh = numberZhName[num];
    
    if (num === 1) {
      cardName = `Ace of ${suit.charAt(0).toUpperCase() + suit.slice(1)}`;
      cardZhName = `${suitZh}首牌`;
    } else if (num <= 10) {
      const numNames = ["", "", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
      cardName = `${numNames[num]} of ${suit.charAt(0).toUpperCase() + suit.slice(1)}`;
      cardZhName = `${suitZh}${numZh}`;
    } else {
      const courtNames = ["", "", "", "", "", "", "", "", "", "", "", "Page", "Knight", "Queen", "King"];
      cardName = `${courtNames[num]} of ${suit.charAt(0).toUpperCase() + suit.slice(1)}`;
      cardZhName = `${suitZh}${numZh}`;
    }

    const fileId = `${suit}-${num.toString().padStart(2, '0')}`;
    
    // 生成独特的微调关键字
    const baseKeys = suitKeywords[suit];
    const itemUpright = [...baseKeys.upright];
    const itemReversed = [...baseKeys.reversed];
    if (num === 1) { itemUpright.unshift("开端"); }
    if (num === 10) { itemUpright.unshift("顶点"); }
    if (num >= 11) { itemUpright.unshift("人物"); }

    tarotCards.push({
      id: `${suit}-${num.toString().padStart(2, '0')}`,
      number: num,
      name: cardName,
      zhName: cardZhName,
      arcana: 'minor',
      suit: suit,
      image: `/cards/rws/${fileId}.jpg`,
      keywords: {
        upright: itemUpright.slice(0, 4),
        reversed: itemReversed.slice(0, 4)
      }
    });
  }
});

// 提供快速按 ID 匹配卡牌的方法
export const getCardById = (id: string): TarotCard | undefined => {
  return tarotCards.find(c => c.id === id);
};
