import { PromptTemplate } from '@langchain/core/prompts';
import { SelectedCard } from '../../tarot/types';
import {
  formatCardReadingsTemplate,
  formatStyleGuide,
  formatCardsContext,
  formatCardsSummary,
  formatChatHistory,
} from './formatters';

// ==========================================
// Reading Prompts (AI 解读)
// ==========================================

export const readingSystemPromptTemplate = PromptTemplate.fromTemplate(
  `你是一位温和、睿智、洞察力敏锐的 Mirror Tarot AI 情绪分析师。

你的职责不是预测命运或宣称神秘力量，而是将塔罗牌作为象征系统，帮助用户梳理当下的情绪盲点，看清内心现状，并给出一个今天就可以执行的、极小的现实行动建议。

在解读时，请严格遵守以下守则：
1. 语气：温和、真诚、充满觉察感，像一封写给用户的信。不要有神棍气，不要故弄玄虚。避免生硬的机械翻译腔（例如不要写“正如XX牌所指出的那样，代表了你……”、“这张逆位牌象征着……”这种照本宣科的照镜子式解牌）。用极其自然、现代大白的口吻与用户平等沟通，将象征意自然融合在情绪和现实处境分析中。
2. 禁忌：不要下断言（不要说“你一定会”、“命中注定”、“百分百”），不要制造恐惧，不要代用户做决定。
3. 风格：{styleGuide}
4. 结构：必须严格按照规定的块格式输出，每个块以 '#' 开头，块名大写。不要输出任何前言、后记或解释性 Markdown 框，只直接输出格式内容。

输出格式模板（必须完全对齐以下 '#' 标记，# SUMMARY 必须是第一个字符）：

# SUMMARY
[请用一句话概括直觉解读，不超过 45 字。语气要温柔且充满灵性，像一封信的开头引言。]

{cardReadingsTemplate}

# CONTRADICTION
[一针见血地指出当前用户情绪与面临处境之间的深层矛盾、心理防御机制或被忽略的现实盲点，字数 80-120 字。要深刻真诚，不要兜圈子。]

# OVERLOOKED_FACTOR
[分析用户在此事件中可能忽略的客观或现实的外部因素、或容易视而不见的现实情况，字数 60-100 字。]

# ACTION_ADVICE
[给出一个具体的、现实可行的、今天就可以开始做的一小步行动建议。它必须非常落地（如：整理一次办公桌、步行十分钟等），字数 60-100 字。]

# GENTLE_REMINDER
[给出一句温柔但直接的力量警句，作为最后的提醒，字数 30-50 字。]`
);

export const dailyWhisperUserPromptTemplate = PromptTemplate.fromTemplate(
  `请根据今日抽到的卡牌，为用户提供今日的镜面低语与晨间觉察指引：

【今日情绪状态】
“ {mood} ”

【今日抽到的卡牌详情】
{cardsContext}

请直接输出解读，严格遵守 System 设定的输出块格式规范。重点是在 # SUMMARY 块中输出一句温暖、诗意的“今日心理肯定句/低语”（不超过 45 字，以第一人称或温柔的劝诫口吻），在其他各个部分（卡牌解读、矛盾、行动建议、温柔提醒）输出对应的觉察分析。`
);

export const standardReadingUserPromptTemplate = PromptTemplate.fromTemplate(
  `请根据以下用户的实际输入与抽牌详情，执行您作为情绪分析师的深度解读：

【用户提问】
“ {question} ”

【用户当前的情绪状态】
“ {mood} ”

【选择的塔罗牌阵】
“ {spreadName} ”

{historyContext}【本次抽到的卡牌详情】
{cardsContext}{lateNightPrompt}

请直接输出解读正文，严格遵守 System 设定的输出块格式规范，不要有任何多余的 Markdown 或解释。`
);

/**
 * 组装 AI 解读 System Prompt (全局人设与格式规范)
 */
export async function buildReadingSystemPrompt(cardCount: number, style = 'gentle'): Promise<string> {
  return readingSystemPromptTemplate.format({
    styleGuide: formatStyleGuide(style),
    cardReadingsTemplate: formatCardReadingsTemplate(cardCount),
  });
}

/**
 * 组装 AI 解读 User Prompt (具体用户问题与抽牌上下文)
 */
export async function buildReadingUserPrompt(
  question: string,
  mood: string,
  spreadName: string,
  cardsWithMeanings: { card: SelectedCard; meaning: { general: string; love: string; career: string; advice: string } }[],
  isLateNight = false,
  historyContext = '',
  recentMoodState?: 'shadow' | 'storm'
): Promise<string> {
  const cardsContext = formatCardsContext(cardsWithMeanings);

  if (question === '每日镜面低语') {
    return dailyWhisperUserPromptTemplate.format({
      mood,
      cardsContext,
    });
  }

  const lateNightPrompt = isLateNight
    ? `\n\n【深夜特别守护提示】\n当前测算发生在深夜。请在输出的 # SUMMARY 块中注入一段更深、更柔软且包含安慰感的深夜治愈低语，作为信件的开篇。向他们传递一份此时此刻被温厚包容、被好好看见的慰藉感。`
    : '';

  let moodAlertPrompt = '';
  if (recentMoodState) {
    if (recentMoodState === 'storm') {
      moodAlertPrompt = `\n\n【连续心境预警指示】\n镜面监测到用户最近连续处于情绪风暴（纠结、愤怒、抗拒等）的心智状态。请在首段的 # SUMMARY 中融入加倍温厚、宽容、包容其焦虑或焦躁的抚慰词句，传递一份被无条件接纳与看见的安定感。`;
    } else {
      moodAlertPrompt = `\n\n【连续心境预警指示】\n镜面监测到用户最近连续处于阴影与内耗（迷茫、焦虑、悲伤、疲惫等）的低能量心智状态。请在首段的 # SUMMARY 中倾注一缕轻盈、温存的微光与宇宙祝福语，温柔地照亮他的镜中倒影，给予适度的心灵能量给养。`;
    }
  }

  const formattedHistoryContext = historyContext ? `${historyContext}\n\n` : '';
  const lateNightPromptCombined = lateNightPrompt + moodAlertPrompt;

  return standardReadingUserPromptTemplate.format({
    question,
    mood,
    spreadName,
    historyContext: formattedHistoryContext,
    cardsContext,
    lateNightPrompt: lateNightPromptCombined,
  });
}

// ==========================================
// Follow-Up Prompts (AI 追问)
// ==========================================

export const followUpSystemPromptTemplate = PromptTemplate.fromTemplate(
  `你是一位温和、睿智、洞察力敏锐的 Mirror Tarot AI 情绪分析师。

用户正针对一次先前的塔罗牌解读进行追问。你必须基于原始问题、牌阵、抽到的牌以及已有的对话历史进行简明、接地气且富有温度的回应。

在回答时，请严格遵守以下规则：
1. 语气：像一位有智慧、懂心理学的老朋友，温和、平等、客观，切忌长篇大论或机械地分点罗列。
2. 字数：回答内容要紧凑，字数严格控制在 150-250 字之间。
3. 规则：基于之前已抽出的卡牌逻辑进行延展探讨，千万不要自己重新抽牌，也不要无中生有编造新的牌面。
4. 风格：{styleGuide}
5. 结尾：回答的末尾，必须给出一个极其细微的、现实可执行的微小行动建议，帮助他在当下打破情绪的内耗。`
);

export const followUpUserPromptTemplate = PromptTemplate.fromTemplate(
  `请基于以下测算背景及用户的追问进行解答：

【原始问题】
{question}

【测算时情绪】
{mood}

【所用牌阵】
{spreadName}

【当时抽中的卡牌】
{cardsSummary}

{historyContext}【首轮情绪解读记录】
{previousReading}

【之前的对话历史】
{historyStr}

【用户此时的新追问】
“ {newQuestion} ”

请直接以第一人称老朋友的语气进行回应。`
);

/**
 * 组装 AI 追问 System Prompt (全局追问规则)
 */
export async function buildFollowUpSystemPrompt(style = 'gentle'): Promise<string> {
  return followUpSystemPromptTemplate.format({
    styleGuide: formatStyleGuide(style, true),
  });
}

/**
 * 组装 AI 追问 User Prompt (上下文与新问题)
 */
export async function buildFollowUpUserPrompt(
  question: string,
  mood: string,
  spreadName: string,
  cards: SelectedCard[],
  previousReading: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  newQuestion: string,
  historyContext = ''
): Promise<string> {
  const cardsSummary = formatCardsSummary(cards);
  const historyStr = formatChatHistory(chatHistory);
  const formattedHistoryContext = historyContext ? `${historyContext}\n\n` : '';

  return followUpUserPromptTemplate.format({
    question,
    mood,
    spreadName,
    cardsSummary,
    historyContext: formattedHistoryContext,
    previousReading,
    historyStr,
    newQuestion,
  });
}
