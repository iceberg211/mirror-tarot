import { AIMessage, AIMessageChunk } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
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

function splitSystemPrompt(messages: ChatMessage[]): {
  systemPrompt: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
} {
  const systemPrompt = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');

  const agentMessages = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));

  return { systemPrompt, messages: agentMessages };
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

function createMirrorAgent(systemPrompt: string, options: Required<AIRequestOptions>) {
  const config = assertAIConfig();
  const model = createModel(config, options);

  return {
    agent: createAgent({
      model,
      tools: [],
      systemPrompt,
    }),
    modelName: config.modelName,
  };
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

function getLastAIText(messages: unknown): string {
  if (!Array.isArray(messages)) return '';

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message instanceof AIMessage) {
      return extractTextContent(message.content);
    }
    if (message && typeof message === 'object' && 'content' in message) {
      return extractTextContent((message as { content?: unknown }).content);
    }
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

export async function createLangChainChatStream(
  inputMessages: ChatMessage[],
  optionsInput: number | AIRequestOptions = 0.7
): Promise<Response> {
  const options = normalizeOptions(optionsInput);
  const requestId = createAIRequestId(options.requestName);
  const { systemPrompt, messages } = splitSystemPrompt(inputMessages);
  const { agent, modelName } = createMirrorAgent(systemPrompt, options);
  const encoder = new TextEncoder();

  const textStream = new ReadableStream({
    async start(controller) {
      try {
        const run = await agent.streamEvents(
          { messages },
          {
            version: 'v3',
            configurable: {
              thread_id: requestId,
            },
          }
        );

        for await (const message of run.messages) {
          for await (const token of message.text) {
            if (token) {
              controller.enqueue(encoder.encode(token));
            }
          }
        }

        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.error(new LangChainRequestError(message, requestId));
      }
    },
  });

  return new Response(textStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Mirror-AI-Request-Id': requestId,
      'X-Mirror-AI-Model': modelName,
      'X-Mirror-AI-Provider': 'langchain-create-agent',
      ...(options.promptVersion ? { 'X-Mirror-AI-Prompt-Version': options.promptVersion } : {}),
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
  const { systemPrompt, messages } = splitSystemPrompt(inputMessages);
  const { agent, modelName } = createMirrorAgent(systemPrompt, options);

  try {
    const result = await agent.invoke(
      { messages },
      {
        configurable: {
          thread_id: requestId,
        },
      }
    );
    const rawContent = getLastAIText(result.messages);
    const cleanedContent = stripJsonMarkdown(rawContent);
    const parsed: unknown = JSON.parse(cleanedContent);

    if (optionsInput.validate && !optionsInput.validate(parsed)) {
      throw new LangChainResponseFormatError('AI JSON 结构不符合预期', requestId, cleanedContent);
    }

    return {
      data: parsed as T,
      rawContent: cleanedContent,
      meta: {
        requestId,
        modelName,
        promptVersion: options.promptVersion || undefined,
      },
    };
  } catch (error) {
    if (error instanceof LangChainResponseFormatError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new LangChainResponseFormatError('AI 返回的数据不是合法 JSON', requestId, error.message);
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new LangChainRequestError(message, requestId);
  }
}

export function isAIMessageChunk(value: unknown): value is AIMessageChunk {
  return value instanceof AIMessageChunk;
}
