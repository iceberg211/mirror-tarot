import { createAIChatStream } from '@/lib/ai/client';
import { AI_PROMPT_VERSIONS, buildFollowUpSystemPrompt, buildFollowUpUserPrompt } from '@/lib/ai/prompts';
import { getSpreadByType } from '@/lib/tarot/spreads';
import {
  assertIdempotency,
  completeIdempotentRequest,
  enforceRateLimit,
  parseJsonBody,
  releaseIdempotentRequest,
  withRateLimitHeaders,
} from '@/server/ai/http';
import { handleRouteError } from '@/server/ai/errors';
import { followUpRequestSchema } from '@/server/ai/schemas/requests';
import {
  formatPreviousReadingForPrompt,
  resolveCardsForSpread,
} from '@/server/readings/card-repository';
import { classifySafety, logSafetyAudit } from '@/server/ai/safety/classify';
import { buildSupportiveFollowUpText } from '@/server/ai/safety/resources';
import { resolveUserIdFromRequest } from '@/server/ai/auth';
import { hashInput, recordAiGeneration } from '@/server/ai/telemetry/log';
import { instrumentStreamResponse } from '@/server/ai/workflows/reading-graph';
import {
  buildMemoryContextPrompt,
  listActiveMemory,
} from '@/server/db/repositories/memory';
import { insertReadingMessage } from '@/server/db/repositories/messages';

function createTextStream(text: string, headers: Record<string, string>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      ...headers,
    },
  });
}

export async function POST(req: Request) {
  let idempotencyKey: string | undefined;
  const startedAt = Date.now();

  try {
    const rate = enforceRateLimit(req, 'followUp');
    const body = await parseJsonBody(req, followUpRequestSchema);
    idempotencyKey = body.idempotencyKey;
    assertIdempotency(idempotencyKey, 'follow-up');

    const userId = await resolveUserIdFromRequest(req);
    const requestId = `follow-up-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now()}`;

    const safety = classifySafety(body.newQuestion);
    logSafetyAudit({
      requestId,
      route: 'follow-up',
      level: safety.level,
      ruleIds: safety.ruleIds,
    });

    if (safety.blocked) {
      completeIdempotentRequest(idempotencyKey);
      await recordAiGeneration({
        requestId,
        route: 'follow-up',
        status: 'blocked',
        userId,
        safetyLevel: safety.level,
        durationMs: Date.now() - startedAt,
        model: 'safety-gate',
      });
      return withRateLimitHeaders(
        createTextStream(buildSupportiveFollowUpText(safety.level), {
          'X-Mirror-AI-Request-Id': requestId,
          'X-Mirror-AI-Safety': 'blocked',
          'X-Mirror-AI-Safety-Level': safety.level,
          'X-Mirror-AI-Provider': 'safety-gate',
        }),
        rate
      );
    }

    const spreadType = body.spreadType || 'three_cards';
    const { spreadName: resolvedSpreadName, cardsWithMeanings } = resolveCardsForSpread(
      spreadType,
      body.cards
    );

    const spreadName =
      body.spreadName || getSpreadByType(spreadType)?.name || resolvedSpreadName;

    const previousReadingText = formatPreviousReadingForPrompt(body.previousReading);
    const cards = cardsWithMeanings.map((item) => item.card);

    const memoryItems = userId ? await listActiveMemory(userId) : [];
    const memoryPrompt = buildMemoryContextPrompt(memoryItems);
    const inputHash = hashInput([body.question, body.newQuestion, spreadType]);

    const systemPrompt = await buildFollowUpSystemPrompt(body.style);
    const userPrompt = await buildFollowUpUserPrompt(
      body.question,
      body.mood,
      spreadName,
      cards,
      previousReadingText,
      body.chatHistory,
      body.newQuestion,
      memoryPrompt
    );

    const response = await createAIChatStream(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.7,
        requestName: 'follow-up',
        promptVersion: AI_PROMPT_VERSIONS.followUp,
        modelTier: 'fast',
      }
    );

    const headers = new Headers(response.headers);
    headers.set('X-Mirror-AI-Safety-Level', safety.level);
    headers.set('X-Mirror-Input-Hash', inputHash);
    headers.set('X-Mirror-AI-Request-Id', headers.get('X-Mirror-AI-Request-Id') || requestId);

    const headed = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    // 可选：记录用户追问消息（不记完整历史）
    if (userId && body.question) {
      void insertReadingMessage({
        userId,
        readingId: `follow-up:${inputHash.slice(0, 16)}`,
        role: 'user',
        content: body.newQuestion.slice(0, 500),
      });
    }

    const instrumented = instrumentStreamResponse(
      headed,
      ({ durationMs }) => {
        void recordAiGeneration({
          requestId: headers.get('X-Mirror-AI-Request-Id') || requestId,
          route: 'follow-up',
          status: 'success',
          userId,
          safetyLevel: safety.level,
          durationMs,
          inputHash,
          model: headers.get('X-Mirror-AI-Model') || 'fast',
          promptVersion: AI_PROMPT_VERSIONS.followUp,
          readingId: `follow-up:${inputHash.slice(0, 16)}`,
          outputSummary: { stream: true },
        });
      },
      startedAt
    );

    completeIdempotentRequest(idempotencyKey);
    return withRateLimitHeaders(instrumented, rate);
  } catch (error) {
    releaseIdempotentRequest(idempotencyKey);
    return handleRouteError(error, 'API /api/reading/follow-up');
  }
}
