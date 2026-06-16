import { createOpenAI } from '@ai-sdk/openai';

export interface AIConfig {
  apiKey: string;
  baseURL: string;
  modelName: string;
}

/**
 * 获取统一的大模型环境变量配置，防止路径双斜杠等错误
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

/**
 * 动态获取通义千问大模型实例
 * 避开 Next.js 模块顶层加载环境变量的时序 Bug，确保在请求执行时才读取 process.env
 */
export function getQwenModel() {
  const { apiKey, baseURL, modelName } = getAIConfig();

  const provider = createOpenAI({
    apiKey,
    baseURL,
  });

  return provider(modelName);
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * 集中管理大模型流式请求与自定义 SSE 纯文本转换器 ReadableStream
 */
export async function createQwenChatStream(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<Response> {
  const { apiKey, baseURL, modelName } = getAIConfig();

  if (!apiKey) {
    throw new Error('DASHSCOPE_API_KEY is not configured');
  }

  // 1. 发起原生的 HTTP 请求，强制开启 stream: true
  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      temperature,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM Endpoint error (status ${response.status}): ${errText}`);
  }

  if (!response.body) {
    throw new Error('Empty response body from LLM');
  }

  // 2. 构造转换器 ReadableStream，从百炼 SSE 的 data 块中提取 choices[0].delta.content 文本
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = response.body.getReader();

  const textStream = new ReadableStream({
    async start(controller) {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 缓存不完整的一行

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const jsonStr = trimmed.slice(6);
                const data = JSON.parse(jsonStr);
                const content = data.choices?.[0]?.delta?.content || '';
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch (e) {
                // 忽略解析失败的 JSON 片段
              }
            }
          }
        }
      } catch (streamErr) {
        console.error('Stream processing error in helper:', streamErr);
        controller.error(streamErr);
      }
    },
  });

  return new Response(textStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
