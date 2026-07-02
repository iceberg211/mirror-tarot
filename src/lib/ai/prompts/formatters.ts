import { SelectedCard } from '../../tarot/types';

/**
 * 将抽中的卡牌列表格式化为 System Prompt 所需的占位模板
 */
export function formatCardReadingsTemplate(cardCount: number): string {
  return Array.from({ length: cardCount })
    .map((_, idx) => `# CARD_READING_${idx + 1}
[位置位置名] ✦ [卡牌中文名] ([正位/逆位])
[深度解读象征意与当前情绪、处境的折射，字数控制在 80-120 字。语气要温暖、客观，避开套话。]`)
    .join('\n\n');
}

/**
 * 格式化风格指南说明
 */
export function formatStyleGuide(style: string, isFollowUp = false): string {
  if (isFollowUp) {
    return style === 'direct'
      ? '回答可以更直接，但必须保留尊重和选择空间。'
      : style === 'deep'
        ? '回答可以更深入地解释心理机制，但不要变成长篇课程。'
        : '回答要温和、清楚、接地气。';
  }
  return style === 'direct'
    ? '表达更直接，先说清判断，再给温和解释；不要尖锐，不要压迫用户。'
    : style === 'deep'
      ? '表达更深入，允许多一点心理机制分析，但仍要自然、克制、好懂。'
      : '表达温和清楚，把复杂感受说成人能马上理解的话。';
}

/**
 * 将带释义的卡牌详情转化为文本上下文
 */
export function formatCardsContext(
  cardsWithMeanings: { card: SelectedCard; meaning: { general: string; love: string; career: string; advice: string } }[]
): string {
  return cardsWithMeanings
    .map((item, idx) => {
      const c = item.card;
      const m = item.meaning;
      return `【位置 ${idx + 1}】：${c.positionName}
卡牌名：${c.zhName} (${c.name})
位置正逆：${c.orientation === 'upright' ? '正位' : '逆位'}
牌面关键字：${c.orientation === 'upright' ? c.keywords.upright.join(', ') : c.keywords.reversed.join(', ')}
牌义参考背景：
- 通用释义：${m.general}
- 感情分析：${m.love}
- 职业关联：${m.career}
- 行动指引：${m.advice}`;
    })
    .join('\n\n');
}

/**
 * 格式化追问场景中的卡牌摘要
 */
export function formatCardsSummary(cards: SelectedCard[]): string {
  return cards
    .map((c) => `${c.positionName}: ${c.zhName} (${c.orientation === 'upright' ? '正位' : '逆位'})`)
    .join(', ');
}

/**
 * 格式化之前的聊天历史
 */
export function formatChatHistory(
  chatHistory: { role: 'user' | 'assistant'; content: string }[]
): string {
  const historyStr = chatHistory
    .map((msg) => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
    .join('\n');
  return historyStr || '（无历史对话）';
}
