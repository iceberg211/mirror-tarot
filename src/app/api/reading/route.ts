import { createAIChatStream } from '@/lib/ai/client';
import { AI_PROMPT_VERSIONS, buildReadingSystemPrompt, buildReadingUserPrompt } from '@/lib/ai/prompts';
import {
  assertIdempotency,
  completeIdempotentRequest,
  enforceRateLimit,
  parseJsonBody,
  releaseIdempotentRequest,
  withRateLimitHeaders,
} from '@/server/ai/http';
import { handleRouteError } from '@/server/ai/errors';
import { readingRequestSchema } from '@/server/ai/schemas/requests';
import { resolveCardsForSpread } from '@/server/readings/card-repository';

export async function POST(req: Request) {
  let idempotencyKey: string | undefined;

  try {
    const rate = enforceRateLimit(req, 'reading');
    const body = await parseJsonBody(req, readingRequestSchema);
    idempotencyKey = body.idempotencyKey;
    assertIdempotency(idempotencyKey, 'reading');

    const { spreadName, cardsWithMeanings } = resolveCardsForSpread(body.spreadType, body.cards);

    const shanghaiTimeStr = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const localHour = new Date(shanghaiTimeStr).getHours();
    const isLateNight = localHour >= 23 || localHour < 4;

    // 不接受客户端 historyContext；仅使用服务端可校验的 recentMoodState 枚举
    const systemPrompt = await buildReadingSystemPrompt(cardsWithMeanings.length, body.style);
    const userPrompt = await buildReadingUserPrompt(
      body.question,
      body.mood,
      spreadName,
      cardsWithMeanings,
      isLateNight,
      '',
      body.recentMoodState
    );

    const response = await createAIChatStream(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.75,
        requestName: 'reading',
        promptVersion: AI_PROMPT_VERSIONS.reading,
      }
    );

    completeIdempotentRequest(idempotencyKey);
    return withRateLimitHeaders(response, rate);
  } catch (error) {
    releaseIdempotentRequest(idempotencyKey);
    return handleRouteError(error, 'API /api/reading');
  }
}
