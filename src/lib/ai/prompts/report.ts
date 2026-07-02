import { PromptTemplate } from '@langchain/core/prompts';

// ==========================================
// Monthly Report Prompts (月度报告)
// ==========================================

export interface ReportPromptInput {
  checkins: {
    date: string;
    mood: string;
  }[];
  readings: {
    question: string;
    mood: string;
    cards: {
      zhName: string;
      orientation: 'upright' | 'reversed';
    }[];
  }[];
  topCards: {
    zhName: string;
    count: number;
  }[];
}

export const monthlyReportPromptTemplate = PromptTemplate.fromTemplate(
  `你是一位融合了经典塔罗神秘学、潜意识释梦、以及人本主义心理咨询的深度心理学导师。
今天，有一位名为 "Mirror Tarot" 的用户向你呈递了他过去 30 天的意识活动轨迹与潜意识卡牌镜像，希望得到你的深度梳理：

下面是该用户最近 30 天的真实记录：
---
1. 【每日情绪签到轨迹】：
{checkinText}

2. 【塔罗测算与情绪日记列表】：
{readingsText}

3. 【频繁浮现的潜意识星卡 (Top 3)】：
{topCardsText}
---

请撰写一份高度疗愈、深刻且充满诗性与抚慰感的《月度镜面潜意识反射信札》。
请遵循以下排版锚点格式（必须严格包含以下标题锚点，以便前端提取解析渲染，且直接以 "#" 开头，不要输出任何额外的废话或包裹标记）：

# SUMMARY
用一段极为温柔、富有同理心且优美的语言（150字左右），总结他这一个月的灵魂状态和情绪脉搏，像一封信的开头，照亮他的镜中倒影。

# EMOTION_WATER
结合情绪轨迹和测算问题，深度解构他这一个月的“情绪水位起伏线”。探讨他是从纠结走向平静，还是频繁陷入焦虑？情绪背后代表了什么样的精神饥渴或安全感漏洞？

# SUB_SHADOW
重点剖析那几张“频繁浮现的潜意识星卡”。告诉他为什么这几张牌在不断敲击他的心智之镜？它们代表了他刻意逃避的什么“阴影 (Shadow)”，或是他体内被压抑却呼之欲出的强大“阿尼玛/阿尼姆斯”力量？

# THERAPY_SOUL
给用户开出 2~3 条极为切实、充满仪式感且温和的“灵性处方”（例如冥想方式、生活细节微调、或者自我接纳的练习），并以一小段充满希望的宇宙祝福语结束这封信。

请直接输出内容，语气要像对待一位在深夜里探寻方向的旅人，真诚、温润、深刻。`
);

/**
 * 组装月度报告 Prompt
 */
export async function buildMonthlyReportPrompt({
  checkins,
  readings,
  topCards,
}: ReportPromptInput): Promise<string> {
  const checkinText = checkins.length > 0
    ? checkins.map((c) => `* ${c.date}: ${c.mood}`).join('\n')
    : '无打卡历史';

  const readingsText = readings.length > 0
    ? readings.map((r) => `* 问题: "${r.question}" | 情绪: ${r.mood} | 卡牌: ${r.cards.map((c) => `${c.zhName}(${c.orientation === 'reversed' ? '逆位' : '正位'})`).join(', ')}`).join('\n')
    : '无塔罗占卜记录';

  const topCardsText = topCards.length > 0
    ? topCards.map((tc, i) => `${i + 1}. ${tc.zhName} (出现 ${tc.count} 次)`).join('\n')
    : '暂无高频卡牌';

  return monthlyReportPromptTemplate.format({
    checkinText,
    readingsText,
    topCardsText,
  });
}
