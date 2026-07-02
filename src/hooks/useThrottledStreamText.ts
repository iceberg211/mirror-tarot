'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useThrottledStreamText(intervalMs = 80) {
  const [text, setText] = useState('');
  const bufferRef = useRef('');
  const timerRef = useRef<number | null>(null);

  const clearPendingFlush = useCallback(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const flush = useCallback(() => {
    clearPendingFlush();
    setText(bufferRef.current);
  }, [clearPendingFlush]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current !== null) return;

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setText(bufferRef.current);
    }, intervalMs);
  }, [intervalMs]);

  const reset = useCallback((nextText = '') => {
    bufferRef.current = nextText;
    clearPendingFlush();
    setText(nextText);
  }, [clearPendingFlush]);

  const append = useCallback((chunk: string) => {
    if (!chunk) return;
    bufferRef.current += chunk;
    scheduleFlush();
  }, [scheduleFlush]);

  const setImmediateText = useCallback((nextText: string) => {
    bufferRef.current = nextText;
    flush();
  }, [flush]);

  const getBufferedText = useCallback(() => bufferRef.current, []);

  useEffect(() => clearPendingFlush, [clearPendingFlush]);

  return {
    text,
    reset,
    append,
    flush,
    setImmediateText,
    getBufferedText,
  };
}
