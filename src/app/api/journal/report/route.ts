import {
  createAIChatStream,
  type AIUsageReport,
} from '@/lib/ai/client';
import { AI_OUTPUT_TOKEN_LIMITS } from '@/lib/ai/config';
import { AI_PROMPT_VERSIONS, buildMonthlyReportPrompt } from '@/lib/ai/prompts';
import {
  assertIdempotency,
  completeIdempotentRequest,
  enforceRateLimit,
  parseJsonBody,
  releaseIdempotentRequest,
  withRateLimitHeaders,
} from '@/server/ai/http';
import { handleRouteError } from '@/server/ai/errors';
import { reportRequestSchema } from '@/server/ai/schemas/requests';
import { resolveUserIdFromRequest } from '@/server/ai/auth';
import {
  hashInput,
  recordAiGeneration,
  toAiUsageTelemetry,
} from '@/server/ai/telemetry/log';
import { instrumentStreamResponse } from '@/server/ai/workflows/reading-graph';

export async function POST(req: Request) {
  let idempotencyKey: string | undefined;
  const startedAt = Date.now();

  try {
    const rate = enforceRateLimit(req, 'report');
    const body = await parseJsonBody(req, reportRequestSchema);
    idempotencyKey = body.idempotencyKey;
    assertIdempotency(idempotencyKey, 'monthly-report');
    const userId = await resolveUserIdFromRequest(req);
    const inputHash = hashInput([
      String(body.checkins.length),
      String(body.readings.length),
      ...body.topCards.slice(0, 5).map((card) => `${card.zhName}:${card.count}`),
    ]);

    const promptText = await buildMonthlyReportPrompt({
      checkins: body.checkins,
      readings: body.readings,
      topCards: body.topCards,
    });
    let usageReport: AIUsageReport | undefined;

    const response = await createAIChatStream([{ role: 'user', content: promptText }], {
      temperature: 0.8,
      requestName: 'monthly-report',
      promptVersion: AI_PROMPT_VERSIONS.monthlyReport,
      modelTier: 'deep',
      maxTokens: AI_OUTPUT_TOKEN_LIMITS.monthlyReport,
      onUsage: (report) => {
        usageReport = report;
      },
    });

    const headers = new Headers(response.headers);
    headers.set('X-Mirror-Input-Hash', inputHash);
    const headed = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    const instrumented = instrumentStreamResponse(
      headed,
      ({ durationMs }) => {
        void recordAiGeneration({
          requestId:
            headers.get('X-Mirror-AI-Request-Id') || `monthly-report-${Date.now()}`,
          route: 'monthly-report',
          status: 'success',
          userId,
          readingId: `monthly-report:${inputHash.slice(0, 16)}`,
          durationMs,
          inputHash,
          model: headers.get('X-Mirror-AI-Model') || 'deep',
          promptVersion: AI_PROMPT_VERSIONS.monthlyReport,
          outputSummary: {
            stream: true,
            checkinCount: body.checkins.length,
            readingCount: body.readings.length,
          },
          ...toAiUsageTelemetry(usageReport),
        });
      },
      startedAt
    );

    completeIdempotentRequest(idempotencyKey);
    return withRateLimitHeaders(instrumented, rate);
  } catch (error) {
    releaseIdempotentRequest(idempotencyKey);
    return handleRouteError(error, 'API /api/journal/report');
  }
}
