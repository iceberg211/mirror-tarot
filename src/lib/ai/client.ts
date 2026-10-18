import {
  createLangChainChatStream,
  createLangChainJsonCompletion,
  createTwoPhaseReadingStream,
  LangChainJsonResult,
} from './langchainAgent';
import {
  AIConfig,
  AIRequestOptions,
  AIUsageReport,
  ChatMessage,
  getAIConfig,
  ModelTier,
} from './config';

export type {
  AIConfig,
  AIRequestOptions,
  AIUsageReport,
  ChatMessage,
  ModelTier,
};

export interface AICompletionMeta {
  requestId: string;
  provider: string;
  modelName: string;
  promptVersion?: string;
  usage?: AIUsageReport;
}

export type AIJsonCompletionResult<T> = LangChainJsonResult<T>;

export function getAIModelConfig(tier: ModelTier = 'deep'): AIConfig {
  return getAIConfig(tier);
}

export async function createAIChatStream(
  messages: ChatMessage[],
  optionsInput: number | AIRequestOptions = 0.7
): Promise<Response> {
  return createLangChainChatStream(messages, optionsInput);
}

export async function createAITwoPhaseReadingStream(params: {
  phase1Messages: ChatMessage[];
  phase2Messages: ChatMessage[];
  options?: AIRequestOptions;
  phase1MaxTokens?: number;
  phase2MaxTokens?: number;
  fallbackMaxTokens?: number;
}): Promise<Response> {
  return createTwoPhaseReadingStream(params);
}

export async function createAIJsonCompletion<T>(
  messages: ChatMessage[],
  optionsInput: AIRequestOptions & {
    validate?: (value: unknown) => value is T;
  } = {}
): Promise<AIJsonCompletionResult<T>> {
  return createLangChainJsonCompletion<T>(messages, optionsInput);
}
