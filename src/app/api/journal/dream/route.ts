import { NextResponse } from 'next/server';
import { createAIJsonCompletion } from '@/lib/ai/client';
import { AI_PROMPT_VERSIONS, buildDreamSystemPrompt, buildDreamUserPrompt } from '@/lib/ai/prompts';
import { LangChainResponseFormatError } from '@/lib/ai/langchainAgent';
import {
  assertIdempotency,
  completeIdempotentRequest,
  enforceRateLimit,
  parseJsonBody,
  releaseIdempotentRequest,
  withRateLimitHeaders,
} from '@/server/ai/http';
import { handleRouteError, jsonError } from '@/server/ai/errors';
import { dreamRequestSchema } from '@/server/ai/schemas/requests';
import { classifySafety, logSafetyAudit } from '@/server/ai/safety/classify';
import { DEFAULT_SUPPORT_RESOURCES } from '@/server/ai/safety/resources';
import { resolveUserIdFromRequest } from '@/server/ai/auth';
import { hashInput, recordAiGeneration } from '@/server/ai/telemetry/log';

interface DreamAnalysisResult {
  dreamAnalysis: string;
  tarotMetaphor: string;
  questionForSubconscious: string;
  dreamColors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeDreamAnalysisResult(value: unknown): DreamAnalysisResult | null {
  if (!isRecord(value)) return null;

  const dreamAnalysis = typeof value.dreamAnalysis === 'string' ? value.dreamAnalysis.trim() : '';
  const tarotMetaphor = typeof value.tarotMetaphor === 'string' ? value.tarotMetaphor.trim() : '';
  const questionForSubconscious = typeof value.questionForSubconscious === 'string'
    ? value.questionForSubconscious.trim()
    : '';

  if (!dreamAnalysis || !tarotMetaphor || !questionForSubconscious) {
    return null;
  }

  const dreamColors = Array.isArray(value.dreamColors)
    ? value.dreamColors.filter(isHexColor).slice(0, 3)
    : [];

  return {
    dreamAnalysis,
    tarotMetaphor,
    questionForSubconscious,
    dreamColors: dreamColors.length === 3 ? dreamColors : ['#2A2540', '#4B3F72', '#A68A64'],
  };
}

function isDreamAnalysisResult(value: unknown): value is DreamAnalysisResult {
  return normalizeDreamAnalysisResult(value) !== null;
}

export async function POST(req: Request) {
  let idempotencyKey: string | undefined;
  const startedAt = Date.now();

  try {
    const rate = enforceRateLimit(req, 'dream');
    const body = await parseJsonBody(req, dreamRequestSchema);
    idempotencyKey = body.idempotencyKey;
    assertIdempotency(idempotencyKey, 'dream');

    const userId = await resolveUserIdFromRequest(req);
    const requestId = `dream-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now()}`;
    const inputHash = hashInput([body.dreamText.trim().toLowerCase()]);
    const safety = classifySafety(body.dreamText);
    logSafetyAudit({
      requestId,
      route: 'dream',
      level: safety.level,
      ruleIds: safety.ruleIds,
    });

    if (safety.blocked) {
      completeIdempotentRequest(idempotencyKey);
      await recordAiGeneration({
        requestId,
        route: 'dream',
        status: 'blocked',
        userId,
        safetyLevel: safety.level,
        durationMs: Date.now() - startedAt,
        inputHash,
        model: 'safety-gate',
        readingId: `dream:${inputHash.slice(0, 16)}`,
      });
      const resources = DEFAULT_SUPPORT_RESOURCES.map((r) => `${r.name} ${r.contact}`).join('；');
      const response = NextResponse.json({
        success: true,
        dreamAnalysis:
          '梦境内容触及需要现实支持的敏感主题。此刻更重要的是你的安全与感受，而不是象征解读。',
        tarotMetaphor: '请把注意力从“解释梦”转向“照顾自己”。',
        questionForSubconscious: '此刻谁可以在现实中陪我、支持我？',
        dreamColors: ['#2A2540', '#4B3F72', '#A68A64'],
        safety: { level: safety.level, resources },
        meta: { requestId, modelName: 'safety-gate' },
      });
      return withRateLimitHeaders(response, rate);
    }

    const systemPrompt = await buildDreamSystemPrompt();
    const userPrompt = await buildDreamUserPrompt(body.dreamText);

    const result = await createAIJsonCompletion<DreamAnalysisResult>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.7,
        requestName: 'dream',
        promptVersion: AI_PROMPT_VERSIONS.dream,
        modelTier: 'fast',
        validate: isDreamAnalysisResult,
      }
    );

    const normalized = normalizeDreamAnalysisResult(result.data);
    if (!normalized) {
      releaseIdempotentRequest(idempotencyKey);
      await recordAiGeneration({
        requestId: result.meta.requestId,
        route: 'dream',
        status: 'error',
        errorCode: 'AI_FORMAT_ERROR',
        userId,
        durationMs: Date.now() - startedAt,
        inputHash,
        model: result.meta.modelName,
        readingId: `dream:${inputHash.slice(0, 16)}`,
      });
      return withRateLimitHeaders(
        jsonError('AI_FORMAT_ERROR', 'AI 返回的数据结构不正确，请重新尝试', 500, {
          requestId: result.meta.requestId,
        }),
        rate
      );
    }

    completeIdempotentRequest(idempotencyKey);
    await recordAiGeneration({
      requestId: result.meta.requestId,
      route: 'dream',
      status: 'success',
      userId,
      safetyLevel: safety.level,
      durationMs: Date.now() - startedAt,
      inputHash,
      model: result.meta.modelName,
      promptVersion: AI_PROMPT_VERSIONS.dream,
      readingId: `dream:${inputHash.slice(0, 16)}`,
      outputSummary: { hasColors: true },
    });
    const response = NextResponse.json({
      success: true,
      ...normalized,
      meta: result.meta,
    });
    return withRateLimitHeaders(response, rate);
  } catch (error) {
    releaseIdempotentRequest(idempotencyKey);
    if (error instanceof LangChainResponseFormatError) {
      return jsonError('AI_FORMAT_ERROR', 'AI 返回格式错误，请重新尝试', 500, {
        requestId: error.requestId,
      });
    }
    return handleRouteError(error, 'API /api/journal/dream');
  }
}
