export type ModelTier = 'fast' | 'deep' | 'fallback';
export type AIProvider = 'qwen' | 'deepseek';

export interface AIUsageReport {
  provider: string;
  modelName: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCostCny: number | null;
  outputCostCny: number | null;
  totalCostCny: number | null;
  pricingVersion: string | null;
}

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseURL: string;
  modelName: string;
  tier: ModelTier;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIRequestOptions {
  temperature?: number;
  timeoutMs?: number;
  requestName?: string;
  promptVersion?: string;
  modelTier?: ModelTier;
  maxTokens?: number;
  onUsage?: (report: AIUsageReport) => void;
}

export const AI_OUTPUT_TOKEN_LIMITS = {
  readingSummary: 320,
  readingDetailBase: 420,
  readingDetailPerCard: 150,
  readingDetailMaximum: 1_800,
  readingFull: 1_900,
  dailyWhisper: 900,
  followUp: 500,
  dream: 450,
  monthlyReport: 1_400,
} as const;

export function getReadingDetailOutputLimit(cardCount: number): number {
  const count = Math.max(1, Math.min(10, Math.floor(cardCount)));
  return Math.min(
    AI_OUTPUT_TOKEN_LIMITS.readingDetailMaximum,
    AI_OUTPUT_TOKEN_LIMITS.readingDetailBase +
      count * AI_OUTPUT_TOKEN_LIMITS.readingDetailPerCard
  );
}

function parseProvider(value: string | undefined): AIProvider {
  return value?.trim().toLowerCase() === 'deepseek' ? 'deepseek' : 'qwen';
}

function getProviderForTier(tier: ModelTier): AIProvider {
  const tierKey = `AI_PROVIDER_${tier.toUpperCase()}`;
  return parseProvider(process.env[tierKey] || process.env.AI_PROVIDER);
}

/**
 * 获取统一的大模型环境变量配置，防止路径双斜杠等错误。
 */
export function getAIConfig(tier: ModelTier = 'deep'): AIConfig {
  const provider = getProviderForTier(tier);

  if (provider === 'deepseek') {
    const deep = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';
    const fast = process.env.DEEPSEEK_MODEL_FAST || 'deepseek-v4-flash';
    const fallback = process.env.DEEPSEEK_MODEL_FALLBACK || fast;
    const modelName = tier === 'fast' ? fast : tier === 'fallback' ? fallback : deep;

    return {
      provider,
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseURL: (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, ''),
      modelName,
      tier,
    };
  }

  const deep = process.env.QWEN_MODEL || 'qwen-plus';
  const fast = process.env.QWEN_MODEL_FAST || 'qwen-turbo';
  const fallback = process.env.QWEN_MODEL_FALLBACK || fast;
  const modelName = tier === 'fast' ? fast : tier === 'fallback' ? fallback : deep;

  return {
    provider,
    apiKey: process.env.DASHSCOPE_API_KEY || '',
    baseURL: (process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, ''),
    modelName,
    tier,
  };
}

export function isTwoPhaseEnabled(): boolean {
  return process.env.AI_TWO_PHASE !== '0';
}
