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

export async function POST(req: Request) {
  let idempotencyKey: string | undefined;

  try {
    const rate = enforceRateLimit(req, 'followUp');
    const body = await parseJsonBody(req, followUpRequestSchema);
    idempotencyKey = body.idempotencyKey;
    assertIdempotency(idempotencyKey, 'follow-up');

    const spreadType = body.spreadType || 'three_cards';
    const { spreadName: resolvedSpreadName, cardsWithMeanings } = resolveCardsForSpread(
      spreadType,
      body.cards
    );

    const spreadName =
      body.spreadName ||
      getSpreadByType(spreadType)?.name ||
      resolvedSpreadName;

    const previousReadingText = formatPreviousReadingForPrompt(body.previousReading);
    const cards = cardsWithMeanings.map((item) => item.card);

    const systemPrompt = await buildFollowUpSystemPrompt(body.style);
    const userPrompt = await buildFollowUpUserPrompt(
      body.question,
      body.mood,
      spreadName,
      cards,
      previousReadingText,
      body.chatHistory,
      body.newQuestion,
      '' // 不接受客户端 historyContext
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
      }
    );

    completeIdempotentRequest(idempotencyKey);
    return withRateLimitHeaders(response, rate);
  } catch (error) {
    releaseIdempotentRequest(idempotencyKey);
    return handleRouteError(error, 'API /api/reading/follow-up');
  }
}
