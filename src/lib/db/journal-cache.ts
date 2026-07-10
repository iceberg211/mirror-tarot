import type { ParsedReading, SelectedCard } from '../tarot/types';
import type { AIResultCacheEntry } from './types';
import { CACHE_STORAGE_KEY } from './local-storage';

const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 对规范化输入做 SHA-256，避免在 localStorage 中以明文 question 作 key。
 * 浏览器使用 Web Crypto；不可用时回退到简单 hash（仅开发兜底）。
 */
export async function hashCachePayload(payload: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return toHex(digest);
  }

  // Node / 极老环境兜底
  let hash = 0;
  for (let i = 0; i < payload.length; i += 1) {
    hash = (hash * 31 + payload.charCodeAt(i)) >>> 0;
  }
  return `fallback-${hash.toString(16)}`;
}

export function buildCachePayload(
  promptVersion: string,
  question: string,
  mood: string,
  spreadType: string,
  cards: SelectedCard[]
): string {
  const cardStr = [...cards]
    .sort((a, b) => a.positionOrder - b.positionOrder)
    .map((c) => `${c.id}:${c.orientation}`)
    .join(',');
  return JSON.stringify({
    v: promptVersion,
    q: question.trim().toLowerCase(),
    m: mood.trim(),
    s: spreadType,
    c: cardStr,
  });
}

/** 同步版 key：用于已缓存查找时的稳定标识（async hash 预计算后传入） */
export function generateCacheKeyFromHash(hash: string): string {
  return `sha256:${hash}`;
}

/**
 * @deprecated 优先使用 generateCacheKeyAsync；保留同步签名供过渡。
 * 同步路径使用确定性但非加密的 fallback，真实浏览器会在 async 路径用 SHA-256。
 */
export function generateCacheKey(
  promptVersion: string,
  question: string,
  mood: string,
  spreadType: string,
  cards: SelectedCard[]
): string {
  const payload = buildCachePayload(promptVersion, question, mood, spreadType, cards);
  // 同步 fallback：不把完整 question 直接当 key 前缀暴露
  let hash = 0;
  for (let i = 0; i < payload.length; i += 1) {
    hash = (hash * 31 + payload.charCodeAt(i)) >>> 0;
  }
  return generateCacheKeyFromHash(hash.toString(16).padStart(8, '0'));
}

export async function generateCacheKeyAsync(
  promptVersion: string,
  question: string,
  mood: string,
  spreadType: string,
  cards: SelectedCard[]
): Promise<string> {
  const payload = buildCachePayload(promptVersion, question, mood, spreadType, cards);
  const hash = await hashCachePayload(payload);
  return generateCacheKeyFromHash(hash);
}

export function getCachedReading(key: string): ParsedReading | null {
  if (typeof window === 'undefined') return null;
  try {
    const cacheDataStr = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!cacheDataStr) return null;
    const cache: Record<string, AIResultCacheEntry> = JSON.parse(cacheDataStr);
    const entry = cache[key];
    if (!entry) return null;

    if (new Date().getTime() > new Date(entry.expiresAt).getTime()) {
      delete cache[key];
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
      return null;
    }
    return entry.parsedReading;
  } catch (e) {
    console.error('Failed to get cached reading:', e);
    return null;
  }
}

export function getCachedRawText(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const cacheDataStr = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!cacheDataStr) return null;
    const cache: Record<string, AIResultCacheEntry> = JSON.parse(cacheDataStr);
    const entry = cache[key];
    if (!entry) return null;

    if (new Date().getTime() > new Date(entry.expiresAt).getTime()) {
      return null;
    }
    return entry.rawText;
  } catch {
    return null;
  }
}

export function setCachedReading(
  key: string,
  promptVersion: string,
  rawText: string,
  parsedReading: ParsedReading
): void {
  if (typeof window === 'undefined') return;
  try {
    const cacheDataStr = localStorage.getItem(CACHE_STORAGE_KEY) || '{}';
    const cache: Record<string, AIResultCacheEntry> = JSON.parse(cacheDataStr);

    const nowMs = new Date().getTime();
    Object.keys(cache).forEach((k) => {
      if (nowMs > new Date(cache[k].expiresAt).getTime()) {
        delete cache[k];
      }
    });

    cache[key] = {
      cacheKey: key,
      promptVersion,
      rawText,
      parsedReading,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(nowMs + CACHE_EXPIRY_MS).toISOString(),
    };

    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to set cached reading:', e);
  }
}
