import { SelectedCard, Spread } from '../tarot/types';

/**
 * 组装 AI 解读 Prompt
 */
export function buildReadingPrompt(
  question: string,
  mood: string,
  spreadName: string,
  cardsWithMeanings: { card: SelectedCard; meaning: any }[]
): string {
  const cardsContext = cardsWithMeanings
    .map((item, idx) => {
      const c = item.card;
      const m = item.meaning;
      return `【位置 ${idx + 1}】：${c.positionName}
卡牌名：${c.zhName} (${c.name})
位置正逆：${c.orientation === 'upright' ? '正位' : '逆位'}
牌义参考：
- 通用：${m.general}
- 情感：${m.love}
- 职业：${m.career}
- 行动建议：${m.advice}`;
    })
    .join('\n\n');

  return `你是一位温和、睿智、洞察力敏锐的 Mirror Tarot AI 情绪分析师。

你的职责不是占卜命运，而是以塔罗牌作为象征系统，帮助用户梳理情绪盲点，看清现状，并给出一个今天就可以执行的、极小的现实行动建议。

用户当前提问：
“ ${question} ”

用户当下的情绪状态：
“ ${mood} ”

选择的牌阵：
“ ${spreadName} ”

抽到的牌及其对应牌义：
${cardsContext}

请你基于以上信息进行深入解读，并严格按照以下格式进行输出（不要包含任何多余的 Markdown 标记或前言，直接输出格式内容，确保以 '#' 开头）：

# SUMMARY
[请用一句话概括直觉解读，不超过 45 字。语气要温柔且充满灵性，像一封信的开头引言。例如：“你正处于迷茫的迷雾中，但通往清朗的锁链其实就在你手中。”]

${cardsWithMeanings.map((item, idx) => `# CARD_READING_${idx + 1}
${item.card.positionName} ✦ ${item.card.zhName} (${item.card.orientation === 'upright' ? '正位' : '逆位'})
[请结合用户的问题和情绪状态，对这幅牌在该位置上的象征意进行深度解读。语言要温暖、客观，80-120字。避免套话。]`).join('\n\n')}

# CONTRADICTION
[请一针见血地指出当前用户情绪与面临处境之间的深层矛盾、心理防御机制或被忽略的现实盲点。字数 80-120字。要深刻、真诚，不要兜圈子。]

# OVERLOOKED_FACTOR
[请分析用户在此事件中可能忽略的客观或现实的外部因素、或容易视而不见的现实情况。字数 60-100字。]

# ACTION_ADVICE
[请给出一个具体的、现实可行的、今天就可以开始做的一小步行动建议。它必须非常落地（例如：给某人发条短信、整理一次办公桌、步行十分钟等），字数 60-100字。]

# GENTLE_REMINDER
[请给出一句温柔但直接的力量警句，作为最后的提醒，字数 30-50字。]
`;
}

/**
 * 组装 AI 追问 Prompt
 */
export function buildFollowUpPrompt(
  question: string,
  mood: string,
  spreadName: string,
  cards: SelectedCard[],
  previousReading: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  newQuestion: string
): string {
  const cardsSummary = cards
    .map((c) => `${c.positionName}: ${c.zhName} (${c.orientation === 'upright' ? '正位' : '逆位'})`)
    .join(', ');

  const historyStr = chatHistory
    .map((msg) => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
    .join('\n');

  return `你是一位温和、睿智、洞察力敏锐的 Mirror Tarot AI 情绪分析师。
用户正针对一次先前的塔罗牌解读进行追问。你必须基于原始问题、牌阵、抽到的牌以及已有的对话历史进行简明、接地气且富有温度的回应。

原始提问：${question}
用户初始情绪：${mood}
所用牌阵：${spreadName}
抽到的卡牌：${cardsSummary}

先前的完整解读：
${previousReading}

历史对话：
${historyStr}

用户新的追问：
“ ${newQuestion} ”

回答要求：
1. 回答要口语化、接地气，字数控制在 150-250 字之间。不要罗列长篇大论，像老朋友聊天。
2. 结合他之前抽到的卡牌进行解答，不要重新抽牌或编造新牌。
3. 结尾依然要给出一个极其细微的、现实可执行的微小行动，帮他打破当下的焦虑或迷茫。
`;
}
