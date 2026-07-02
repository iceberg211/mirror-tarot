import { createLangChainChatStream, createLangChainJsonCompletion, LangChainJsonResult } from './langchainAgent';
import { AIConfig, AIRequestOptions, ChatMessage, getAIConfig } from './config';

export type { AIConfig, AIRequestOptions, ChatMessage };

export interface AICompletionMeta {
  requestId: string;
  modelName: string;
  promptVersion?: string;
}

export interface AIJsonCompletionResult<T> extends LangChainJsonResult<T> {}

/**
 * 兼容旧调用名：实际已迁移到 LangChain createAgent。
 */
export function getQwenModel(): AIConfig {
  return getAIConfig();
}

/**
 * 兼容旧调用名：实际走 LangChain createAgent 的流式输出。
 */
export async function createQwenChatStream(
  messages: ChatMessage[],
  optionsInput: number | AIRequestOptions = 0.7
): Promise<Response> {
  return createLangChainChatStream(messages, optionsInput);
}

/**
 * 兼容旧调用名：实际走 LangChain createAgent 的非流式 JSON 输出。
 */
export async function createQwenJsonCompletion<T>(
  messages: ChatMessage[],
  optionsInput: AIRequestOptions & {
    validate?: (value: unknown) => value is T;
  } = {}
): Promise<AIJsonCompletionResult<T>> {
  return createLangChainJsonCompletion<T>(messages, optionsInput);
}
