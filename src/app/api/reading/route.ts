import {
  createAIChatStream,
  createAITwoPhaseReadingStream,
} from '@/lib/ai/client';
import { isTwoPhaseEnabled } from '@/lib/ai/config';
import {
  AI_PROMPT_VERSIONS,
  buildReadingDetailSystemPrompt,
  buildReadingSummarySystemPrompt,
  buildReadingSystemPrompt,
  buildReadingUserPrompt,
} from '@/lib/ai/prompts';
import {
  assertIdempotency,
  completeIdempotentRequest,
  enforceRateLimit,
  parseJsonBody,
  releaseIdempotentRequest,
  withRateLimitHeaders,
} from '@/server/ai/http';
import { handleRouteError, jsonError } from '@/server/ai/errors';
import { readingRequestSchema } from '@/server/ai/schemas/requests';
import { resolveUserIdFromRequest } from '@/server/ai/auth';
import { recordAiGeneration } from '@/server/ai/telemetry/log';
import {
  instrumentStreamResponse,
  runReadingWorkflow,
} from '@/server/ai/workflows/reading-graph';

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
  const wallStart = Date.now();

  try {
    const rate = enforceRateLimit(req, 'reading');
    const body = await parseJsonBody(req, readingRequestSchema);
    idempotencyKey = body.idempotencyKey;
    assertIdempotency(idempotencyKey, 'reading');

    const userId = await resolveUserIdFromRequest(req);
    const requestId = `reading-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now()}`;

    const workflow = await runReadingWorkflow({
      question: body.question,
      mood: body.mood,
      spreadType: body.spreadType,
      style: body.style,
      cardRefs: body.cards,
      recentMoodState: body.recentMoodState,
      readingId: body.readingId,
      userId,
      requestId,
    });

    if (workflow.status === 'error') {
      releaseIdempotentRequest(idempotencyKey);
      await recordAiGeneration({
        requestId,
        route: 'reading',
        status: 'error',
        errorCode: workflow.errorCode,
        userId,
        readingId: body.readingId,
        safetyLevel: workflow.safetyLevel,
        durationMs: Date.now() - wallStart,
      });
      return jsonError('VALIDATION_ERROR', workflow.errorMessage || '上下文构建失败', 400);
    }

    if (workflow.status === 'blocked') {
      completeIdempotentRequest(idempotencyKey);
      await recordAiGeneration({
        requestId,
        route: 'reading',
        status: 'blocked',
        userId,
        readingId: body.readingId,
        safetyLevel: workflow.safetyLevel,
        durationMs: Date.now() - wallStart,
        inputHash: workflow.context?.inputHash,
        model: 'safety-gate',
      });

      return withRateLimitHeaders(
        createTextStream(workflow.supportText || '', {
          'X-Mirror-AI-Request-Id': requestId,
          'X-Mirror-AI-Safety': 'blocked',
          'X-Mirror-AI-Safety-Level': workflow.safetyLevel,
          'X-Mirror-AI-Provider': 'safety-gate',
        }),
        rate
      );
    }

    const ctx = workflow.context!;
    const historyContext = ctx.memoryPrompt || '';

    const userPrompt = await buildReadingUserPrompt(
      body.question,
      body.mood,
      ctx.spreadName,
      ctx.cardsWithMeanings,
      ctx.isLateNight,
      historyContext,
      body.recentMoodState,
      body.spreadType
    );

    let response: Response;
    let modelLabel = '';
    let promptVersion: string = AI_PROMPT_VERSIONS.reading;

    if (isTwoPhaseEnabled() && body.question !== '每日镜面低语') {
      const summarySystem = await buildReadingSummarySystemPrompt(body.style);
      const detailSystem = await buildReadingDetailSystemPrompt(
        ctx.cardsWithMeanings.length,
        body.style
      );
      promptVersion = `${AI_PROMPT_VERSIONS.readingSummary}+${AI_PROMPT_VERSIONS.readingDetail}`;
      modelLabel = 'fast+deep';

      response = await createAITwoPhaseReadingStream({
        phase1Messages: [
          { role: 'system', content: summarySystem },
          {
            role: 'user',
            content: userPrompt + '\n\n请只输出 SUMMARY、ACTION_ADVICE、GENTLE_REMINDER 三个块。',
          },
        ],
        phase2Messages: [
          { role: 'system', content: detailSystem },
          {
            role: 'user',
            content:
              userPrompt +
              '\n\n请只输出 CARD_READING_*、CONTRADICTION、OVERLOOKED_FACTOR。不要重复 SUMMARY/ACTION/REMINDER。',
          },
        ],
        options: {
          temperature: 0.75,
          requestName: 'reading',
          promptVersion,
        },
      });
    } else {
      const systemPrompt = await buildReadingSystemPrompt(
        ctx.cardsWithMeanings.length,
        body.style
      );
      modelLabel = 'deep';
      response = await createAIChatStream(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.75,
          requestName: 'reading',
          promptVersion,
          modelTier: 'deep',
        }
      );
    }

    const headers = new Headers(response.headers);
    headers.set('X-Mirror-AI-Safety-Level', workflow.safetyLevel);
    headers.set('X-Mirror-Input-Hash', ctx.inputHash);
    if (body.readingId) headers.set('X-Mirror-Reading-Id', body.readingId);
    headers.set('X-Mirror-AI-Request-Id', headers.get('X-Mirror-AI-Request-Id') || requestId);

    const headed = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    const instrumented = instrumentStreamResponse(
      headed,
      ({ durationMs }) => {
        void recordAiGeneration({
          requestId: headers.get('X-Mirror-AI-Request-Id') || requestId,
          route: 'reading',
          status: 'success',
          userId,
          readingId: body.readingId,
          safetyLevel: workflow.safetyLevel,
          durationMs,
          inputHash: ctx.inputHash,
          model: headers.get('X-Mirror-AI-Model') || modelLabel,
          promptVersion,
          outputSummary: { stream: true, theme: ctx.theme },
        });
      },
      workflow.startedAt
    );

    completeIdempotentRequest(idempotencyKey);
    return withRateLimitHeaders(instrumented, rate);
  } catch (error) {
    releaseIdempotentRequest(idempotencyKey);
    return handleRouteError(error, 'API /api/reading');
  }
}
