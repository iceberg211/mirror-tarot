import { NextResponse } from 'next/server';
import { drawCards } from '@/lib/tarot/drawCards';
import { spreadTypeSchema } from '@/server/ai/schemas/requests';
import { enforceRateLimit, withRateLimitHeaders } from '@/server/ai/http';
import { handleRouteError, jsonError } from '@/server/ai/errors';

export async function GET(request: Request) {
  try {
    const rate = enforceRateLimit(request, 'draw');
    const { searchParams } = new URL(request.url);
    const spreadTypeRaw = searchParams.get('spreadType') || 'three_cards';
    const parsedSpread = spreadTypeSchema.safeParse(spreadTypeRaw);

    if (!parsedSpread.success) {
      return withRateLimitHeaders(
        jsonError('VALIDATION_ERROR', `Unknown spread type: ${spreadTypeRaw}`, 400),
        rate
      );
    }

    const customPositionsParam = searchParams.get('customPositions') || '';
    const customPositions = customPositionsParam
      .split(',')
      .map((position) => position.trim())
      .filter(Boolean)
      .slice(0, 10);

    const cards = drawCards(parsedSpread.data, customPositions);
    const response = NextResponse.json({ success: true, cards });
    return withRateLimitHeaders(response, rate);
  } catch (error) {
    return handleRouteError(error, 'API /api/reading/draw');
  }
}
