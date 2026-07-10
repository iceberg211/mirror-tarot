import { createHash } from 'node:crypto';
import { insertGeneration, type GenerationStatus } from '@/server/db/repositories/generations';

export interface AiTelemetryEvent {
  requestId: string;
  route: string;
  model?: string;
  promptVersion?: string;
  durationMs?: number;
  ttftMs?: number | null;
  safetyLevel?: string;
  status: GenerationStatus | 'started';
  errorCode?: string | null;
  inputHash?: string;
  userId?: string | null;
  readingId?: string | null;
  generationNo?: number;
  /** 截断后的结构化摘要，禁止塞完整问题/日记 */
  outputSummary?: Record<string, unknown>;
}

export function hashUserId(userId: string | null | undefined): string | undefined {
  if (!userId) return undefined;
  return createHash('sha256').update(userId).digest('hex').slice(0, 16);
}

export function hashInput(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex');
}

/**
 * 脱敏 AI 事件日志。默认不记录完整 question / diary。
 */
export function logAiEvent(event: AiTelemetryEvent): void {
  const payload = {
    type: 'ai_telemetry',
    requestId: event.requestId,
    route: event.route,
    model: event.model,
    promptVersion: event.promptVersion,
    durationMs: event.durationMs,
    ttftMs: event.ttftMs ?? undefined,
    safetyLevel: event.safetyLevel,
    status: event.status,
    errorCode: event.errorCode ?? undefined,
    inputHash: event.inputHash,
    userIdHash: hashUserId(event.userId),
    readingId: event.readingId ?? undefined,
    generationNo: event.generationNo,
  };

  console.info(JSON.stringify(payload));
}

/**
 * 日志 + 可选 generation 落库（需 service role + userId）。
 */
export async function recordAiGeneration(event: AiTelemetryEvent): Promise<void> {
  logAiEvent(event);

  if (!event.readingId || !event.userId) return;
  if (event.status === 'started') return;

  const status: GenerationStatus = event.status;

  await insertGeneration({
    readingId: event.readingId,
    userId: event.userId,
    generationNo: event.generationNo ?? 1,
    model: event.model,
    promptVersion: event.promptVersion,
    inputHash: event.inputHash,
    output: event.outputSummary ?? {},
    status,
    safetyLabels: event.safetyLevel ? [event.safetyLevel] : [],
    ttftMs: event.ttftMs,
    durationMs: event.durationMs,
    errorCode: event.errorCode,
    requestId: event.requestId,
  });
}
