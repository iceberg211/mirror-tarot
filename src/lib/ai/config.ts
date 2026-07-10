export type ModelTier = 'fast' | 'deep' | 'fallback';

export interface AIConfig {
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
}

/**
 * 获取统一的大模型环境变量配置，防止路径双斜杠等错误。
 */
export function getAIConfig(tier: ModelTier = 'deep'): AIConfig {
  const apiKey = process.env.DASHSCOPE_API_KEY || '';
  const baseURL = (process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '');

  const deep = process.env.QWEN_MODEL || 'qwen-plus';
  const fast = process.env.QWEN_MODEL_FAST || 'qwen-turbo';
  const fallback = process.env.QWEN_MODEL_FALLBACK || deep;

  const modelName = tier === 'fast' ? fast : tier === 'fallback' ? fallback : deep;

  return {
    apiKey,
    baseURL,
    modelName,
    tier,
  };
}

export function isTwoPhaseEnabled(): boolean {
  return process.env.AI_TWO_PHASE !== '0';
}
