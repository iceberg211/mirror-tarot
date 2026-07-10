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

  try {
    const rate = enforceRateLimit(req, 'dream');
    const body = await parseJsonBody(req, dreamRequestSchema);
    idempotencyKey = body.idempotencyKey;
    assertIdempotency(idempotencyKey, 'dream');

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
        validate: isDreamAnalysisResult,
      }
    );

    const normalized = normalizeDreamAnalysisResult(result.data);
    if (!normalized) {
      releaseIdempotentRequest(idempotencyKey);
      return withRateLimitHeaders(
        jsonError('AI_FORMAT_ERROR', 'AI 返回的数据结构不正确，请重新尝试', 500, {
          requestId: result.meta.requestId,
        }),
        rate
      );
    }

    completeIdempotentRequest(idempotencyKey);
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
