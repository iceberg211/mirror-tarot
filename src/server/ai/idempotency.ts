/**
 * 短窗口幂等缓存（进程内）。
 * 用于防止同一客户端在网络抖动时重复触发昂贵 AI 调用。
 * 当前仅缓存“进行中/最近完成”标记；流式响应本身仍即时返回。
 */

interface IdempotencyEntry {
  createdAt: number;
  status: 'in_flight' | 'completed';
  requestName: string;
}

const store = new Map<string, IdempotencyEntry>();
const DEFAULT_TTL_MS = 2 * 60_000;

function prune(now: number, ttlMs: number): void {
  for (const [key, entry] of store.entries()) {
    if (now - entry.createdAt > ttlMs) {
      store.delete(key);
    }
  }
}

export function beginIdempotentRequest(
  key: string | undefined,
  requestName: string,
  ttlMs = DEFAULT_TTL_MS
): { ok: true } | { ok: false; reason: 'duplicate' } {
  if (!key) return { ok: true };

  const now = Date.now();
  prune(now, ttlMs);

  const existing = store.get(key);
  if (existing && now - existing.createdAt <= ttlMs) {
    return { ok: false, reason: 'duplicate' };
  }

  store.set(key, { createdAt: now, status: 'in_flight', requestName });
  return { ok: true };
}

export function completeIdempotentRequest(key: string | undefined): void {
  if (!key) return;
  const existing = store.get(key);
  if (!existing) return;
  store.set(key, { ...existing, status: 'completed' });
}

export function releaseIdempotentRequest(key: string | undefined): void {
  if (!key) return;
  store.delete(key);
}

export function resetIdempotencyStore(): void {
  store.clear();
}
