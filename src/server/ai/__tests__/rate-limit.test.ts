import { describe, expect, it, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimitStore } from '@/server/ai/rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it('allows requests within the window limit', () => {
    const first = checkRateLimit({ key: 'test:a', limit: 2, windowMs: 60_000 });
    const second = checkRateLimit({ key: 'test:a', limit: 2, windowMs: 60_000 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it('blocks after exceeding the limit', () => {
    checkRateLimit({ key: 'test:b', limit: 1, windowMs: 60_000 });
    const blocked = checkRateLimit({ key: 'test:b', limit: 1, windowMs: 60_000 });

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});
