/**
 * 进程内固定窗口限流。
 * 注意：在多实例 / serverless 下无法全局共享，仅作基础防护；
 * 生产环境后续可替换为 Redis / 边缘限流。
 */

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

export interface RateLimitOptions {
  /** 唯一桶键，例如 `reading:ip:1.2.3.4` */
  key: string;
  /** 窗口内允许的最大请求数 */
  limit: number;
  /** 窗口长度（毫秒） */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(options.key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + options.windowMs;
    buckets.set(options.key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: options.limit - 1,
      resetAt,
      retryAfterSec: Math.ceil(options.windowMs / 1000),
    };
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  buckets.set(options.key, existing);

  return {
    allowed: true,
    remaining: Math.max(0, options.limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** 测试或本地调试用 */
export function resetRateLimitStore(): void {
  buckets.clear();
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

export const AI_RATE_LIMITS = {
  reading: { limit: 10, windowMs: 60_000 },
  followUp: { limit: 20, windowMs: 60_000 },
  dream: { limit: 8, windowMs: 60_000 },
  report: { limit: 5, windowMs: 60_000 },
  draw: { limit: 60, windowMs: 60_000 },
} as const;
