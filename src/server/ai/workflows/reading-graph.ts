/**
 * 解读工作流（纯 TS 状态机，与 LangGraph 节点语义对齐）。
 *
 * 节点：safety → build_context → ready_to_stream
 * 流式生成仍在 route 层执行，避免为 ReadableStream 硬套 graph。
 * 后续可替换为 @langchain/langgraph StateGraph，接口保持不变。
 */

import { classifyQuestionTheme } from '@/lib/ai/prompts/formatters';
import { classifySafety, logSafetyAudit } from '@/server/ai/safety/classify';
import { buildSupportiveReadingText } from '@/server/ai/safety/resources';
import { resolveCardsForSpread } from '@/server/readings/card-repository';
import {
  buildMemoryContextPrompt,
  listActiveMemory,
} from '@/server/db/repositories/memory';
import { hashInput } from '@/server/ai/telemetry/log';
import type { ReadingWorkflowInput, ReadingWorkflowResult } from './types';

function isLateNightShanghai(): boolean {
  const shanghaiTimeStr = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const localHour = new Date(shanghaiTimeStr).getHours();
  return localHour >= 23 || localHour < 4;
}

/**
 * 执行生成前编排：安全分类 + 卡牌重建 + 记忆上下文。
 */
export async function runReadingWorkflow(
  input: ReadingWorkflowInput
): Promise<ReadingWorkflowResult> {
  const startedAt = Date.now();
  const requestId = input.requestId;

  // 1) safety
  const safety = classifySafety(`${input.question}\n${input.mood}`);
  logSafetyAudit({
    requestId,
    route: 'reading-workflow',
    level: safety.level,
    ruleIds: safety.ruleIds,
  });

  if (safety.blocked) {
    return {
      status: 'blocked',
      safetyLevel: safety.level,
      safetyRuleIds: safety.ruleIds,
      requestId,
      supportText: buildSupportiveReadingText(safety.level),
      startedAt,
    };
  }

  // 2) build_context
  try {
    const { spreadName, cardsWithMeanings } = resolveCardsForSpread(
      input.spreadType,
      input.cardRefs
    );

    const theme = classifyQuestionTheme(input.question, input.spreadType);
    const memoryItems = input.userId ? await listActiveMemory(input.userId) : [];
    const memoryPrompt = buildMemoryContextPrompt(memoryItems);

    const inputHash = hashInput([
      input.question.trim().toLowerCase(),
      input.mood,
      input.spreadType,
      input.style,
      ...input.cardRefs.map((c) => `${c.id}:${c.orientation}`),
      theme,
    ]);

    return {
      status: 'ready_to_stream',
      safetyLevel: safety.level,
      safetyRuleIds: safety.ruleIds,
      requestId,
      startedAt,
      context: {
        spreadName,
        cardsWithMeanings,
        memoryPrompt,
        isLateNight: isLateNightShanghai(),
        theme,
        inputHash,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'error',
      safetyLevel: safety.level,
      safetyRuleIds: safety.ruleIds,
      requestId,
      startedAt,
      errorCode: 'CONTEXT_BUILD_ERROR',
      errorMessage: message,
    };
  }
}

/**
 * 包装流式 Response：在关闭时记录 duration（不缓冲全文，避免隐私）。
 */
export function instrumentStreamResponse(
  response: Response,
  onComplete: (meta: { durationMs: number }) => void,
  startedAt: number
): Response {
  if (!response.body) {
    onComplete({ durationMs: Date.now() - startedAt });
    return response;
  }

  const reader = response.body.getReader();
  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          onComplete({ durationMs: Date.now() - startedAt });
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        onComplete({ durationMs: Date.now() - startedAt });
        controller.error(error);
      }
    },
    cancel(reason) {
      onComplete({ durationMs: Date.now() - startedAt });
      return reader.cancel(reason);
    },
  });

  return new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
