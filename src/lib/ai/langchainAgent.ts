import { AIMessage, AIMessageChunk, HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { AIConfig, AIRequestOptions, ChatMessage, getAIConfig } from './config';

export interface LangChainAgentMeta {
  requestId: string;
  modelName: string;
  promptVersion?: string;
}

export interface LangChainJsonResult<T> {
  data: T;
  rawContent: string;
  meta: LangChainAgentMeta;
}

class LangChainRequestError extends Error {
  constructor(
    message: string,
    public readonly requestId: string
  ) {
    super(message);
    this.name = 'LangChainRequestError';
  }
}

class LangChainResponseFormatError extends Error {
  constructor(
    message: string,
    public readonly requestId: string,
    public readonly rawContent: string
  ) {
    super(message);
    this.name = 'LangChainResponseFormatError';
  }
}

function assertAIConfig(tier: AIRequestOptions['modelTier'] = 'deep'): AIConfig {
  const config = getAIConfig(tier || 'deep');

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
      modelTier: 'deep',
    };
  }

  return {
    temperature: options?.temperature ?? 0.7,
    timeoutMs: options?.timeoutMs ?? getDefaultTimeoutMs(),
    requestName: options?.requestName ?? 'qwen',
    promptVersion: options?.promptVersion ?? '',
    modelTier: options?.modelTier ?? 'deep',
  };
}

function createAIRequestId(requestName: string): string {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${requestName}-${suffix}`;
}

function createModel(config: AIConfig, options: Required<AIRequestOptions>) {
  return new ChatOpenAI({
    apiKey: config.apiKey,
    model: config.modelName,
    temperature: options.temperature,
    timeout: options.timeoutMs,
    configuration: {
      baseURL: config.baseURL,
    },
  });
}

function toLangChainMessages(messages: ChatMessage[]): BaseMessage[] {
  return messages.map((message) => {
    if (message.role === 'system') return new SystemMessage(message.content);
    if (message.role === 'assistant') return new AIMessage(message.content);
    return new HumanMessage(message.content);
  });
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === 'string' ? text : '';
        }
        return '';
      })
      .join('');
  }

  return '';
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

function buildMetaHeaders(options: Required<AIRequestOptions>, requestId: string, modelName: string): HeadersInit {
  return {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Mirror-AI-Request-Id': requestId,
    'X-Mirror-AI-Model': modelName,
    'X-Mirror-AI-Provider': 'langchain-chat-openai',
    ...(options.promptVersion ? { 'X-Mirror-AI-Prompt-Version': options.promptVersion } : {}),
  };
}

/**
 * 直接使用 ChatOpenAI 流式生成（无 Agent 循环、无 tools）。
 */
async function streamModelText(
  model: ChatOpenAI,
  messages: BaseMessage[],
  onToken: (token: string) => void
): Promise<void> {
  const stream = await model.stream(messages);
  for await (const chunk of stream) {
    const token = extractTextContent(chunk.content);
    if (token) onToken(token);
  }
}

export async function createLangChainChatStream(
  inputMessages: ChatMessage[],
  optionsInput: number | AIRequestOptions = 0.7
): Promise<Response> {
  const options = normalizeOptions(optionsInput);
  const requestId = createAIRequestId(options.requestName);
  const config = assertAIConfig(options.modelTier);
  const model = createModel(config, options);
  const lcMessages = toLangChainMessages(inputMessages);
  const encoder = new TextEncoder();

  const textStream = new ReadableStream({
    async start(controller) {
      try {
        await streamModelText(model, lcMessages, (token) => {
          controller.enqueue(encoder.encode(token));
        });
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.error(new LangChainRequestError(message, requestId));
      }
    },
  });

  return new Response(textStream, {
    headers: buildMetaHeaders(options, requestId, config.modelName),
  });
}

/**
 * 两阶段流：fast 先产出 SUMMARY/ACTION/REMINDER，deep 再产出逐牌与分析。
 * 客户端仍按文本标记解析，无需改协议即可改善 TTFT。
 */
export async function createTwoPhaseReadingStream(params: {
  phase1Messages: ChatMessage[];
  phase2Messages: ChatMessage[];
  options?: AIRequestOptions;
}): Promise<Response> {
  const baseOptions = normalizeOptions(params.options);
  const requestId = createAIRequestId(baseOptions.requestName || 'reading');
  const fastConfig = assertAIConfig('fast');
  const deepConfig = assertAIConfig('deep');
  const fastModel = createModel(fastConfig, { ...baseOptions, modelTier: 'fast' });
  const deepModel = createModel(deepConfig, { ...baseOptions, modelTier: 'deep' });
  const encoder = new TextEncoder();

  const textStream = new ReadableStream({
    async start(controller) {
      try {
        await streamModelText(fastModel, toLangChainMessages(params.phase1Messages), (token) => {
          controller.enqueue(encoder.encode(token));
        });
        controller.enqueue(encoder.encode('\n\n'));
        await streamModelText(deepModel, toLangChainMessages(params.phase2Messages), (token) => {
          controller.enqueue(encoder.encode(token));
        });
        controller.close();
      } catch (error) {
        // 瞬时错误时尝试 fallback 整段 deep
        try {
          const fallbackConfig = assertAIConfig('fallback');
          const fallbackModel = createModel(fallbackConfig, {
            ...baseOptions,
            modelTier: 'fallback',
          });
          await streamModelText(
            fallbackModel,
            toLangChainMessages([...params.phase1Messages.slice(0, 1), params.phase2Messages[params.phase2Messages.length - 1]]),
            (token) => controller.enqueue(encoder.encode(token))
          );
          controller.close();
        } catch {
          const message = error instanceof Error ? error.message : String(error);
          controller.error(new LangChainRequestError(message, requestId));
        }
      }
    },
  });

  return new Response(textStream, {
    headers: {
      ...buildMetaHeaders(
        { ...baseOptions, promptVersion: baseOptions.promptVersion },
        requestId,
        `${fastConfig.modelName}+${deepConfig.modelName}`
      ),
      'X-Mirror-AI-Two-Phase': '1',
    },
  });
}

export async function createLangChainJsonCompletion<T>(
  inputMessages: ChatMessage[],
  optionsInput: AIRequestOptions & {
    validate?: (value: unknown) => value is T;
  } = {}
): Promise<LangChainJsonResult<T>> {
  const options = normalizeOptions(optionsInput);
  const requestId = createAIRequestId(options.requestName);
  const config = assertAIConfig(options.modelTier);
  const model = createModel(config, options);
  const lcMessages = toLangChainMessages(inputMessages);

  try {
    const result = await model.invoke(lcMessages);
    const rawContent = extractTextContent(result.content);
    const cleanedContent = stripJsonMarkdown(rawContent);
    let parsed: unknown;

    try {
      parsed = JSON.parse(cleanedContent);
    } catch {
      throw new LangChainResponseFormatError('AI 返回的数据不是合法 JSON', requestId, cleanedContent);
    }

    if (optionsInput.validate && !optionsInput.validate(parsed)) {
      throw new LangChainResponseFormatError('AI JSON 结构不符合预期', requestId, cleanedContent);
    }

    return {
      data: parsed as T,
      rawContent: cleanedContent,
      meta: {
        requestId,
        modelName: config.modelName,
        promptVersion: options.promptVersion || undefined,
      },
    };
  } catch (error) {
    if (error instanceof LangChainResponseFormatError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new LangChainRequestError(message, requestId);
  }
}

export function isAIMessageChunk(value: unknown): value is AIMessageChunk {
  return value instanceof AIMessageChunk;
}

export { LangChainRequestError, LangChainResponseFormatError };
