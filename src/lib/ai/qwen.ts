import { createOpenAI } from '@ai-sdk/openai';

/**
 * 动态获取通义千问大模型实例
 * 避开 Next.js 模块顶层加载环境变量的时序 Bug，确保在请求执行时才读取 process.env
 */
export function getQwenModel() {
  const apiKey = process.env.DASHSCOPE_API_KEY || '';
  const baseURL = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const modelName = process.env.QWEN_MODEL || 'qwen-plus';

  const provider = createOpenAI({
    apiKey,
    baseURL,
  });

  return provider(modelName);
}
