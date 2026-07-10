import type { ParsedReading, SelectedCard } from '../tarot/types';
import type { AIResultCacheEntry } from './types';
import { CACHE_STORAGE_KEY } from './local-storage';

const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export function generateCacheKey(
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
  return `${promptVersion}|${question.trim()}|${mood}|${spreadType}|${cardStr}`;
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
