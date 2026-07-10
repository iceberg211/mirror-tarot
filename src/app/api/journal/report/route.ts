import { createAIChatStream } from '@/lib/ai/client';
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

export async function POST(req: Request) {
  let idempotencyKey: string | undefined;

  try {
    const rate = enforceRateLimit(req, 'report');
    const body = await parseJsonBody(req, reportRequestSchema);
    idempotencyKey = body.idempotencyKey;
    assertIdempotency(idempotencyKey, 'monthly-report');

    const promptText = await buildMonthlyReportPrompt({
      checkins: body.checkins,
      readings: body.readings,
      topCards: body.topCards,
    });

    const response = await createAIChatStream([{ role: 'user', content: promptText }], {
      temperature: 0.8,
      requestName: 'monthly-report',
      promptVersion: AI_PROMPT_VERSIONS.monthlyReport,
    });

    completeIdempotentRequest(idempotencyKey);
    return withRateLimitHeaders(response, rate);
  } catch (error) {
    releaseIdempotentRequest(idempotencyKey);
    return handleRouteError(error, 'API /api/journal/report');
  }
}
