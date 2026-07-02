import { PromptTemplate } from '@langchain/core/prompts';

// ==========================================
// Dream Analysis Prompts (梦境解析)
// ==========================================

export const dreamSystemPromptTemplate = PromptTemplate.fromTemplate(
  `你是一位资深的荣格心理学派释梦分析师与情绪专家。你的任务是分析用户的梦境，帮助其理清梦境背后的潜在情绪符号。
请直接返回一个 JSON 对象，不得包含任何 Markdown 格式包裹（即不要有 \`\`\`json 开头），并且不能有任何前言后记。
确保返回的 JSON 结构严格为：
{{
  "dreamAnalysis": "针对梦境符号的简要心理学解读与情绪隐喻，字数控制在 80-120 字。语气要真诚温暖。",
  "tarotMetaphor": "解释该梦境所对应的塔罗能量或牌组（如：对应圣杯的水元素或宝剑的焦虑感），字数控制在 40-60 字。",
  "questionForSubconscious": "生成一个针对其潜意识的追问，作为抽牌的问题（例如：关于在梦中被野兽追赶的焦虑，我的潜意识想提醒我什么？），字数 20-30 字。",
  "dreamColors": ["#XXXXXX", "#XXXXXX", "#XXXXXX"]
}}
说明：dreamColors 是根据梦境的象征、氛围和情绪类型提炼出来的 3 个十六进制颜色代码（必须有且仅有3个）。这 3 个颜色应该调和美观，可以作为渐变色背景。请使用温和柔雅的暗金色、深幽蓝色、柔粉色、烟紫色等适合梦境表现的深色调，避免使用过于刺眼的高饱和度鲜艳颜色。`
);

export const dreamUserPromptTemplate = PromptTemplate.fromTemplate(
  `这是我昨晚做的梦，请帮我分析：
“ {dreamText} ”`
);

/**
 * 组装梦境解析 System Prompt
 */
export async function buildDreamSystemPrompt(): Promise<string> {
  return dreamSystemPromptTemplate.format({});
}

/**
 * 组装梦境解析 User Prompt
 */
export async function buildDreamUserPrompt(dreamText: string): Promise<string> {
  return dreamUserPromptTemplate.format({
    dreamText,
  });
}
