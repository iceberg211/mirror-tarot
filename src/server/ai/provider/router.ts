import type { ModelTier } from '@/lib/ai/config';

export function isTransientAIError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|ETIMEDOUT|ECONNRESET|429|rate limit|5\d\d|overloaded|temporar|unavailable|AbortError/i.test(
    message
  );
}

export function nextRetryDelayMs(attempt: number): number {
  const base = 300 * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 200);
  return base + jitter;
}

export async function withModelFallback<T>(
  run: (tier: ModelTier) => Promise<T>,
  primary: ModelTier = 'deep',
  maxAttempts = 2
): Promise<T> {
  let lastError: unknown;
  const tiers: ModelTier[] = primary === 'fast' ? ['fast', 'fallback'] : ['deep', 'fallback'];

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const tier = tiers[Math.min(attempt, tiers.length - 1)];
    try {
      return await run(tier);
    } catch (error) {
      lastError = error;
      if (!isTransientAIError(error) || attempt >= maxAttempts - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, nextRetryDelayMs(attempt)));
    }
  }

  throw lastError;
}
