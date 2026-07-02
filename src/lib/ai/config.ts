export interface AIConfig {
  apiKey: string;
  baseURL: string;
  modelName: string;
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
}

/**
 * 获取统一的大模型环境变量配置，防止路径双斜杠等错误。
 */
export function getAIConfig(): AIConfig {
  const apiKey = process.env.DASHSCOPE_API_KEY || '';
  const baseURL = (process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '');
  const modelName = process.env.QWEN_MODEL || 'qwen-plus';

  return {
    apiKey,
    baseURL,
    modelName,
  };
}
