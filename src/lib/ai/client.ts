import {
  createLangChainChatStream,
  createLangChainJsonCompletion,
  LangChainJsonResult,
} from './langchainAgent';
import { AIConfig, AIRequestOptions, ChatMessage, getAIConfig } from './config';

export type { AIConfig, AIRequestOptions, ChatMessage };

export interface AICompletionMeta {
  requestId: string;
  modelName: string;
  promptVersion?: string;
}

export type AIJsonCompletionResult<T> = LangChainJsonResult<T>;

export function getAIModelConfig(): AIConfig {
  return getAIConfig();
}

export async function createAIChatStream(
  messages: ChatMessage[],
  optionsInput: number | AIRequestOptions = 0.7
): Promise<Response> {
  return createLangChainChatStream(messages, optionsInput);
}

export async function createAIJsonCompletion<T>(
  messages: ChatMessage[],
  optionsInput: AIRequestOptions & {
    validate?: (value: unknown) => value is T;
  } = {}
): Promise<AIJsonCompletionResult<T>> {
  return createLangChainJsonCompletion<T>(messages, optionsInput);
}
