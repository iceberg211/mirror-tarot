import { ZodError, type ZodType } from 'zod';
import { ApiError, jsonError } from './errors';
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  releaseIdempotentRequest,
} from './idempotency';
import { AI_RATE_LIMITS, checkRateLimit, getClientIp, type RateLimitResult } from './rate-limit';
import { MAX_BODY_BYTES } from './schemas/requests';

export async function parseJsonBody<T>(
  req: Request,
  schema: ZodType<T>,
  maxBytes = MAX_BODY_BYTES
): Promise<T> {
  const contentLength = req.headers.get('content-length');
  if (contentLength) {
    const size = Number.parseInt(contentLength, 10);
    if (Number.isFinite(size) && size > maxBytes) {
      throw new ApiError('PAYLOAD_TOO_LARGE', '请求体过大', 413);
    }
  }

  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > maxBytes) {
      throw new ApiError('PAYLOAD_TOO_LARGE', '请求体过大', 413);
    }
    raw = text ? JSON.parse(text) : {};
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('VALIDATION_ERROR', '请求体必须是合法 JSON', 400);
  }

  try {
    return schema.parse(raw);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError('VALIDATION_ERROR', '请求参数校验失败', 400, {
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    throw error;
  }
}

export function enforceRateLimit(
  req: Request,
  route: keyof typeof AI_RATE_LIMITS,
  userKey?: string
): RateLimitResult {
  const ip = getClientIp(req);
  const config = AI_RATE_LIMITS[route];
  const key = userKey ? `${route}:user:${userKey}` : `${route}:ip:${ip}`;
  const result = checkRateLimit({ key, ...config });

  if (!result.allowed) {
    throw new ApiError('RATE_LIMITED', '请求过于频繁，请稍后再试', 429, {
      retryAfterSec: result.retryAfterSec,
    });
  }

  return result;
}

export function withRateLimitHeaders(response: Response, limit: RateLimitResult): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Remaining', String(limit.remaining));
  headers.set('X-RateLimit-Reset', String(Math.floor(limit.resetAt / 1000)));
  if (!limit.allowed) {
    headers.set('Retry-After', String(limit.retryAfterSec));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function assertIdempotency(key: string | undefined, requestName: string): void {
  const result = beginIdempotentRequest(key, requestName);
  if (!result.ok) {
    throw new ApiError('RATE_LIMITED', '重复请求，请稍后再试', 429, {
      reason: 'idempotency',
    });
  }
}

export { completeIdempotentRequest, releaseIdempotentRequest, jsonError };
