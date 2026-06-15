import { createOpenAI } from '@ai-sdk/openai';

// 检查并确保环境变量有 fallback 默认值
const apiKey = process.env.DASHSCOPE_API_KEY || '';
const baseURL = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export const qwenProvider = createOpenAI({
  apiKey,
  baseURL,
});

export const qwenModel = qwenProvider(process.env.QWEN_MODEL || 'qwen-plus');
