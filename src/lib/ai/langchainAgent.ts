import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
  type UsageMetadata,
} from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import {
  AIConfig,
  AIRequestOptions,
  AIUsageReport,
  ChatMessage,
  getAIConfig,
} from './config';
import { buildAIUsageReport, combineAIUsageReports } from './usage';

export interface LangChainAgentMeta {
  requestId: string;
  provider: string;
  modelName: string;
  promptVersion?: string;
  usage?: AIUsageReport;
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
    const envName =
      config.provider === 'deepseek' ? 'DEEPSEEK_API_KEY' : 'DASHSCOPE_API_KEY';
    throw new Error(`${envName} is not configured`);
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
      requestName: 'ai',
      promptVersion: '',
      modelTier: 'deep',
      maxTokens: 1_024,
      onUsage: () => undefined,
    };
  }

  return {
    temperature: options?.temperature ?? 0.7,
    timeoutMs: options?.timeoutMs ?? getDefaultTimeoutMs(),
    requestName: options?.requestName ?? 'ai',
    promptVersion: options?.promptVersion ?? '',
    modelTier: options?.modelTier ?? 'deep',
    maxTokens: options?.maxTokens ?? 1_024,
    onUsage: options?.onUsage ?? (() => undefined),
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
    maxTokens: options.maxTokens,
    streamUsage: true,
    __includeRawResponse: true,
    modelKwargs:
      config.provider === 'deepseek'
        ? { thinking: { type: 'disabled' } }
        : undefined,
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

function buildMetaHeaders(
  options: Required<AIRequestOptions>,
  requestId: string,
  modelName: string,
  provider: string
): HeadersInit {
  return {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Mirror-AI-Request-Id': requestId,
    'X-Mirror-AI-Model': modelName,
    'X-Mirror-AI-Provider': provider,
    'X-Mirror-AI-Max-Output-Tokens': String(options.maxTokens),
    ...(options.promptVersion ? { 'X-Mirror-AI-Prompt-Version': options.promptVersion } : {}),
  };
}

function notifyUsage(
  options: Required<AIRequestOptions>,
  report: AIUsageReport
): void {
  try {
    options.onUsage(report);
  } catch (error) {
    console.warn('[ai-usage] callback failed:', error);
  }
}

function enrichProviderUsage(
  usage: UsageMetadata | undefined,
  message: AIMessage | AIMessageChunk
): UsageMetadata | undefined {
  if (!usage) return undefined;

  const responseUsage = message.response_metadata?.usage;
  const rawResponse = message.additional_kwargs?.__raw_response;
  const rawUsage =
    responseUsage && typeof responseUsage === 'object'
      ? responseUsage
      : rawResponse &&
          typeof rawResponse === 'object' &&
          'usage' in rawResponse &&
          rawResponse.usage &&
          typeof rawResponse.usage === 'object'
        ? rawResponse.usage
        : undefined;

  if (!rawUsage || !('prompt_cache_hit_tokens' in rawUsage)) return usage;

  const cacheRead = Number(rawUsage.prompt_cache_hit_tokens);
  if (!Number.isFinite(cacheRead) || cacheRead < 0) return usage;

  return {
    ...usage,
    input_token_details: {
      ...usage.input_token_details,
      cache_read: cacheRead,
    },
  };
}

/**
 * 直接使用 ChatOpenAI 流式生成（无 Agent 循环、无 tools）。
 */
async function streamModelText(
  model: ChatOpenAI,
  messages: BaseMessage[],
  onToken: (token: string) => void
): Promise<UsageMetadata | undefined> {
  let usage: UsageMetadata | undefined;
  const stream = await model.stream(messages);
  for await (const chunk of stream) {
    const token = extractTextContent(chunk.content);
    if (token) onToken(token);
    if (chunk.usage_metadata) {
      usage = enrichProviderUsage(chunk.usage_metadata, chunk);
    }
  }
  return usage;
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
        const usage = await streamModelText(model, lcMessages, (token) => {
          controller.enqueue(encoder.encode(token));
        });
        if (usage) notifyUsage(options, buildAIUsageReport(config, usage));
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.error(new LangChainRequestError(message, requestId));
      }
    },
  });

  return new Response(textStream, {
    headers: buildMetaHeaders(
      options,
      requestId,
      config.modelName,
      config.provider
    ),
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
  phase1MaxTokens?: number;
  phase2MaxTokens?: number;
  fallbackMaxTokens?: number;
}): Promise<Response> {
  const baseOptions = normalizeOptions(params.options);
  const requestId = createAIRequestId(baseOptions.requestName || 'reading');
  const fastConfig = assertAIConfig('fast');
  const deepConfig = assertAIConfig('deep');
  const phase1Options = {
    ...baseOptions,
    modelTier: 'fast' as const,
    maxTokens: params.phase1MaxTokens ?? baseOptions.maxTokens,
  };
  const phase2Options = {
    ...baseOptions,
    modelTier: 'deep' as const,
    maxTokens: params.phase2MaxTokens ?? baseOptions.maxTokens,
  };
  const fastModel = createModel(fastConfig, phase1Options);
  const deepModel = createModel(deepConfig, phase2Options);
  const encoder = new TextEncoder();

  const textStream = new ReadableStream({
    async start(controller) {
      const usageReports: AIUsageReport[] = [];
      try {
        const fastUsage = await streamModelText(
          fastModel,
          toLangChainMessages(params.phase1Messages),
          (token) => {
            controller.enqueue(encoder.encode(token));
          }
        );
        if (fastUsage) {
          usageReports.push(buildAIUsageReport(fastConfig, fastUsage));
        }
        controller.enqueue(encoder.encode('\n\n'));
        const deepUsage = await streamModelText(
          deepModel,
          toLangChainMessages(params.phase2Messages),
          (token) => {
            controller.enqueue(encoder.encode(token));
          }
        );
        if (deepUsage) {
          usageReports.push(buildAIUsageReport(deepConfig, deepUsage));
        }
        if (usageReports.length) {
          notifyUsage(baseOptions, combineAIUsageReports(usageReports));
        }
        controller.close();
      } catch (error) {
        // 瞬时错误时尝试 fallback 整段 deep
        try {
          const fallbackConfig = assertAIConfig('fallback');
          const fallbackModel = createModel(fallbackConfig, {
            ...baseOptions,
            modelTier: 'fallback',
            maxTokens: params.fallbackMaxTokens ?? baseOptions.maxTokens,
          });
          const fallbackUsage = await streamModelText(
            fallbackModel,
            toLangChainMessages([...params.phase1Messages.slice(0, 1), params.phase2Messages[params.phase2Messages.length - 1]]),
            (token) => controller.enqueue(encoder.encode(token))
          );
          if (fallbackUsage) {
            usageReports.push(buildAIUsageReport(fallbackConfig, fallbackUsage));
          }
          if (usageReports.length) {
            notifyUsage(baseOptions, combineAIUsageReports(usageReports));
          }
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
        {
          ...baseOptions,
          promptVersion: baseOptions.promptVersion,
          maxTokens:
            (params.phase1MaxTokens ?? baseOptions.maxTokens) +
            (params.phase2MaxTokens ?? baseOptions.maxTokens),
        },
        requestId,
        `${fastConfig.modelName}+${deepConfig.modelName}`,
        `${fastConfig.provider}+${deepConfig.provider}`
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
        provider: config.provider,
        modelName: config.modelName,
        promptVersion: options.promptVersion || undefined,
        usage: result.usage_metadata
          ? buildAIUsageReport(
              config,
              enrichProviderUsage(result.usage_metadata, result)
            )
          : undefined,
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
