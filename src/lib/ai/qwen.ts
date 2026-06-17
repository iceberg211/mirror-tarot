import { createOpenAI } from '@ai-sdk/openai';

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

export interface AICompletionMeta {
  requestId: string;
  modelName: string;
  promptVersion?: string;
}

export interface AIJsonCompletionResult<T> {
  data: T;
  rawContent: string;
  meta: AICompletionMeta;
}

class AIRequestError extends Error {
  constructor(
    message: string,
    public readonly requestId: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'AIRequestError';
  }
}

class AIResponseFormatError extends Error {
  constructor(
    message: string,
    public readonly requestId: string,
    public readonly rawContent: string
  ) {
    super(message);
    this.name = 'AIResponseFormatError';
  }
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

function assertAIConfig(): AIConfig {
  const config = getAIConfig();

  if (!config.apiKey) {
    throw new Error('DASHSCOPE_API_KEY is not configured');
  }

  return config;
}

function getDefaultTimeoutMs(): number {
  const raw = process.env.AI_REQUEST_TIMEOUT_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 45_000;
}

function normalizeOptions(options?: number | AIRequestOptions): Required<AIRequestOptions> {
  if (typeof options === 'number') {
    return {
      temperature: options,
      timeoutMs: getDefaultTimeoutMs(),
      requestName: 'qwen',
      promptVersion: '',
    };
  }

  return {
    temperature: options?.temperature ?? 0.7,
    timeoutMs: options?.timeoutMs ?? getDefaultTimeoutMs(),
    requestName: options?.requestName ?? 'qwen',
    promptVersion: options?.promptVersion ?? '',
  };
}

function createAIRequestId(requestName: string): string {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${requestName}-${suffix}`;
}

async function readErrorText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 1200);
  } catch {
    return '无法读取模型错误响应';
  }
}

function createTimeoutController(timeoutMs: number): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

async function requestQwenChatCompletion(
  messages: ChatMessage[],
  options: Required<AIRequestOptions>,
  stream: boolean
): Promise<{
  response: Response;
  meta: AICompletionMeta;
}> {
  const { apiKey, baseURL, modelName } = assertAIConfig();
  const requestId = createAIRequestId(options.requestName);
  const { signal, cleanup } = createTimeoutController(options.timeoutMs);

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Mirror-AI-Request-Id': requestId,
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: options.temperature,
        stream,
      }),
      signal,
    });

    cleanup();

    if (!response.ok) {
      const errText = await readErrorText(response);
      throw new AIRequestError(
        `LLM Endpoint error (status ${response.status}): ${errText}`,
        requestId,
        response.status
      );
    }

    return {
      response,
      meta: {
        requestId,
        modelName,
        promptVersion: options.promptVersion || undefined,
      },
    };
  } catch (error) {
    cleanup();

    if (error instanceof AIRequestError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AIRequestError(
        `LLM request timeout after ${options.timeoutMs}ms`,
        requestId
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new AIRequestError(message, requestId);
  }
}

function extractAssistantContent(value: unknown): string {
  if (!value || typeof value !== 'object') return '';

  const root = value as {
    choices?: {
      message?: {
        content?: unknown;
      };
    }[];
  };

  const content = root.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : '';
}

function stripJsonMarkdown(content: string): string {
  let cleanedContent = content.trim();

  if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/i, '')
      .trim();
  }

  return cleanedContent;
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

/**
 * 集中管理大模型流式请求与自定义 SSE 纯文本转换器 ReadableStream
 */
export async function createQwenChatStream(
  messages: ChatMessage[],
  optionsInput: number | AIRequestOptions = 0.7
): Promise<Response> {
  const options = normalizeOptions(optionsInput);
  const { response, meta } = await requestQwenChatCompletion(messages, options, true);

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
              } catch {
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
      'X-Mirror-AI-Request-Id': meta.requestId,
      'X-Mirror-AI-Model': meta.modelName,
      ...(meta.promptVersion ? { 'X-Mirror-AI-Prompt-Version': meta.promptVersion } : {}),
    },
  });
}

/**
 * 非流式 JSON 请求，适合梦境解析这类必须结构化返回的任务
 */
export async function createQwenJsonCompletion<T>(
  messages: ChatMessage[],
  optionsInput: AIRequestOptions & {
    validate?: (value: unknown) => value is T;
  } = {}
): Promise<AIJsonCompletionResult<T>> {
  const options = normalizeOptions(optionsInput);
  const { response, meta } = await requestQwenChatCompletion(messages, options, false);
  const payload: unknown = await response.json();
  const rawContent = extractAssistantContent(payload);
  const cleanedContent = stripJsonMarkdown(rawContent);

  try {
    const parsed: unknown = JSON.parse(cleanedContent);

    if (optionsInput.validate && !optionsInput.validate(parsed)) {
      throw new AIResponseFormatError('AI JSON 结构不符合预期', meta.requestId, cleanedContent);
    }

    return {
      data: parsed as T,
      rawContent: cleanedContent,
      meta,
    };
  } catch (error) {
    if (error instanceof AIResponseFormatError) {
      throw error;
    }

    throw new AIResponseFormatError('AI 返回的数据不是合法 JSON', meta.requestId, cleanedContent);
  }
}
