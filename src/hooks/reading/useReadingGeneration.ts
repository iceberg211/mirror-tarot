'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  generateCacheKey,
  getCachedRawText,
  getCachedReading,
  JournalEntry,
  setCachedReading,
  updateLocalReading,
} from '@/lib/db/localJournal';
import { useAudio } from '@/hooks/useAudio';
import { AI_PROMPT_VERSIONS } from '@/lib/ai/prompts';
import { useThrottledStreamText } from '@/hooks/useThrottledStreamText';
import { ParsedReading } from '@/lib/tarot/types';
import { buildFollowUpSuggestions, getCardElement, parseStreamingReading } from '@/lib/tarot/utils';
import { saveUserOnboardingState } from '@/lib/auth/profile';
import { saveLocalOnboardingState, OnboardingState } from '@/lib/product/onboarding';
function isReadingEmpty(reading: ParsedReading): boolean {
  if (!reading) return true;
  const cardInterpretationsEmpty = reading.cardReadings?.every(
    (c) => !c.interpretation || c.interpretation.trim() === '等待解读开始...' || !c.interpretation.trim()
  );
  return !reading.intuitiveSummary && cardInterpretationsEmpty;
}

function toCardRefs(cards: JournalEntry['cards']) {
  return cards.map((c) => ({ id: c.id, orientation: c.orientation as 'upright' | 'reversed' }));
}

export function useReadingGeneration(options: {
  entry: JournalEntry | null;
  setEntry: React.Dispatch<React.SetStateAction<JournalEntry | null>>;
  loading: boolean;
  trigger: boolean;
  user: { id: string } | null;
}) {
  const { entry, setEntry, loading, trigger, user } = options;
  const router = useRouter();

  const [generating, setGenerating] = useState(false);
  const {
    text: readingText,
    reset: resetReadingText,
    append: appendReadingText,
    setImmediateText: setReadingTextImmediate,
    flush: flushReadingText,
  } = useThrottledStreamText(80);
  const [readingError, setReadingError] = useState<string | null>(null);
  const [showZen, setShowZen] = useState(false);

  const { playAmbient, stopAmbient, playElementAmbient, stopElementAmbient } = useAudio();
  const activeElement = entry?.cards[0] ? getCardElement(entry.cards[0]) : null;

  const generationAbortRef = useRef<AbortController | null>(null);
  const hasAutoTriggeredRef = useRef(false);

  const markOnboarding = useCallback((nextState: Partial<OnboardingState>) => {
    if (user?.id) {
      saveUserOnboardingState(user.id, nextState).catch((error) => {
        console.error('Failed to save onboarding state:', error);
      });
      return;
    }
    saveLocalOnboardingState(nextState);
  }, [user]);

  useEffect(() => {
    const mainCard = entry?.cards[0];
    if (mainCard) {
      playElementAmbient(getCardElement(mainCard));
    }

    return () => {
      stopElementAmbient();
    };
  }, [entry?.cards, playElementAmbient, stopElementAmbient]);

  useEffect(() => {
    return () => {
      generationAbortRef.current?.abort();
      stopAmbient();
    };
  }, [stopAmbient]);

  const handleRegenerate = useCallback(async (signal?: AbortSignal, forceRegenerate = false) => {
    if (generating || !entry) return;
    const controller = signal ? null : new AbortController();
    const requestSignal = signal ?? controller?.signal;
    if (controller) {
      generationAbortRef.current = controller;
    }

    const cacheKey = generateCacheKey(
      AI_PROMPT_VERSIONS.reading,
      entry.question,
      entry.mood,
      entry.spreadType,
      entry.cards
    );

    const cachedRawText = forceRegenerate ? null : getCachedRawText(cacheKey);
    const cachedReading = forceRegenerate ? null : getCachedReading(cacheKey);

    if (cachedRawText && cachedReading) {
      setGenerating(true);
      resetReadingText();
      setReadingError(null);
      playAmbient();

      if (trigger) {
        router.replace(`/reading/${entry.id}`, { scroll: false });
      }

      let currentIdx = 0;
      const step = Math.max(12, Math.floor(cachedRawText.length / 50));

      const interval = setInterval(() => {
        currentIdx += step;
        if (currentIdx >= cachedRawText.length) {
          clearInterval(interval);
          setReadingTextImmediate(cachedRawText);

          const ok = updateLocalReading(entry.id, cachedReading);
          stopAmbient();
          if (ok) {
            setEntry((prev) => (prev ? { ...prev, reading: cachedReading } : null));
          }
          setGenerating(false);
        } else {
          setReadingTextImmediate(cachedRawText.slice(0, currentIdx));
        }
      }, 25);

      return;
    }

    setGenerating(true);
    resetReadingText();
    setReadingError(null);
    playAmbient();

    if (trigger) {
      router.replace(`/reading/${entry.id}`, { scroll: false });
    }

    try {
      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${entry.id}-${Date.now()}`;

      const response = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          readingId: entry.id,
          question: entry.question,
          mood: entry.mood,
          spreadType: entry.spreadType,
          cards: toCardRefs(entry.cards),
          style: entry.readingStyle || 'gentle',
          recentMoodState: entry.recentMoodState,
          idempotencyKey,
        }),
        signal: requestSignal,
      });

      if (!response.ok) {
        let errMsg = `HTTP 错误！状态码: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch {
          try {
            const txt = await response.text();
            if (txt) errMsg = txt;
          } catch {
            /* ignore */
          }
        }
        throw new Error(errMsg);
      }

      if (!response.body) throw new Error('流式读取器未就绪 (ReadableStream not supported)');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = '';

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        const chunk = decoder.decode(value, { stream: !done });
        text += chunk;
        appendReadingText(chunk);
      }
      setReadingTextImmediate(text);

      if (text.trim().length < 30) {
        throw new Error('AI 生成的指引信息过短或不完整，请重试');
      }

      const parsed = parseStreamingReading(text, entry.cards);
      const finalReading = {
        ...parsed,
        followUpSuggestions: buildFollowUpSuggestions({
          question: entry.question,
          spreadType: entry.spreadType,
          cards: entry.cards,
          reading: parsed,
        }),
      };
      const ok = updateLocalReading(entry.id, finalReading);
      stopAmbient();

      if (ok) {
        setCachedReading(cacheKey, AI_PROMPT_VERSIONS.reading, text, finalReading);
        setEntry((prev) => (prev ? { ...prev, reading: finalReading } : null));
        markOnboarding({ firstReadingCompleted: true });
      } else {
        throw new Error('本地日记更新失败');
      }

      setGenerating(false);
      if (controller && generationAbortRef.current === controller) {
        generationAbortRef.current = null;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        stopAmbient();
        setGenerating(false);
        if (controller && generationAbortRef.current === controller) {
          generationAbortRef.current = null;
        }
        return;
      }
      console.error('Regenerate error:', err);
      flushReadingText();
      stopAmbient();
      const errMsg = err instanceof Error ? err.message : String(err);
      setReadingError(errMsg || '重建情绪解读失败');
      setGenerating(false);
      if (controller && generationAbortRef.current === controller) {
        generationAbortRef.current = null;
      }
    }
  }, [
    appendReadingText,
    entry,
    flushReadingText,
    generating,
    markOnboarding,
    playAmbient,
    resetReadingText,
    router,
    setEntry,
    setReadingTextImmediate,
    stopAmbient,
    trigger,
  ]);

  useEffect(() => {
    if (!loading && entry) {
      const isEmpty = isReadingEmpty(entry.reading);
      if ((trigger || isEmpty) && !generating && !readingText && !readingError && !hasAutoTriggeredRef.current) {
        hasAutoTriggeredRef.current = true;
        const controller = new AbortController();
        generationAbortRef.current = controller;
        Promise.resolve().then(() => {
          handleRegenerate(controller.signal);
        });
      }
    }
  }, [entry, generating, handleRegenerate, loading, readingError, readingText, trigger]);

  const parsedReading = useMemo(() => {
    if (!entry) return null;
    return generating
      ? parseStreamingReading(readingText, entry.cards)
      : entry.reading;
  }, [entry, generating, readingText]);

  const activeFocusIndex = useMemo(() => {
    if (!generating || !parsedReading) return -1;
    const readings = parsedReading.cardReadings;
    if (readings[2]?.interpretation && readings[2].interpretation.trim() !== '' && readings[2].interpretation.trim() !== '等待解读开始...') return 2;
    if (readings[1]?.interpretation && readings[1].interpretation.trim() !== '' && readings[1].interpretation.trim() !== '等待解读开始...') return 1;
    if (readings[0]?.interpretation && readings[0].interpretation.trim() !== '' && readings[0].interpretation.trim() !== '等待解读开始...') return 0;
    return -1;
  }, [generating, parsedReading]);

  const formattedDate = useMemo(() => {
    if (!entry) return '';
    return new Date(entry.createdAt).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [entry]);

  return {
    generating,
    readingText,
    readingError,
    showZen,
    setShowZen,
    activeElement,
    handleRegenerate: () => handleRegenerate(undefined, true),
    parsedReading,
    activeFocusIndex,
    formattedDate,
    isReadingEmpty: entry ? isReadingEmpty(entry.reading) : true,
    markOnboarding,
  };
}
