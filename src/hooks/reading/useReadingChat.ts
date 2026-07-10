'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { JournalEntry, updateChatHistory } from '@/lib/db/localJournal';
import { OnboardingState } from '@/lib/product/onboarding';

function toCardRefs(cards: JournalEntry['cards']) {
  return cards.map((c) => ({ id: c.id, orientation: c.orientation as 'upright' | 'reversed' }));
}

export function useReadingChat(options: {
  entry: JournalEntry | null;
  setEntry: React.Dispatch<React.SetStateAction<JournalEntry | null>>;
  markOnboarding: (nextState: Partial<OnboardingState>) => void;
}) {
  const { entry, setEntry, markOnboarding } = options;

  const [chatInput, setChatInput] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    if (entry && entry.chatHistory && chatMessages.length === 0) {
      const mapped = entry.chatHistory.map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));
      const timer = window.setTimeout(() => setChatMessages(mapped), 0);
      return () => window.clearTimeout(timer);
    }
  }, [entry, chatMessages.length]);

  const handleSendFollowUp = useCallback(async (inputText: string) => {
    if (!inputText.trim() || chatLoading || !entry) return;

    const newMsg = { role: 'user' as const, content: inputText.trim() };
    let flushTimer: number | null = null;
    let assistantContent = '';

    const flushAssistantMessage = () => {
      if (flushTimer !== null) {
        window.clearTimeout(flushTimer);
        flushTimer = null;
      }

      setChatMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (!lastMsg || lastMsg.role !== 'assistant') return prev;
        updated[updated.length - 1] = {
          ...lastMsg,
          content: assistantContent,
        };
        return updated;
      });
    };

    const scheduleAssistantFlush = () => {
      if (flushTimer !== null) return;
      flushTimer = window.setTimeout(() => {
        flushTimer = null;
        setChatMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (!lastMsg || lastMsg.role !== 'assistant') return prev;
          updated[updated.length - 1] = {
            ...lastMsg,
            content: assistantContent,
          };
          return updated;
        });
      }, 80);
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${entry.id}-fu-${Date.now()}`;

      const response = await fetch('/api/reading/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: entry.question,
          mood: entry.mood,
          spreadType: entry.spreadType,
          cards: toCardRefs(entry.cards),
          previousReading: {
            intuitiveSummary: entry.reading.intuitiveSummary || '',
            cardReadings: (entry.reading.cardReadings || []).map((c) => ({
              positionName: c.positionName,
              cardName: c.cardName,
              cardZhName: c.cardZhName,
              orientation: c.orientation,
              interpretation: c.interpretation || '',
            })),
            contradiction: entry.reading.contradiction || '',
            overlookedFactor: entry.reading.overlookedFactor || '',
            actionAdvice: entry.reading.actionAdvice || '',
            gentleReminder: entry.reading.gentleReminder || '',
          },
          chatHistory: chatMessages.map((m) => ({
            role: m.role,
            content: m.content.slice(0, 1000),
          })),
          newQuestion: inputText.trim(),
          style: entry.readingStyle || 'gentle',
          idempotencyKey,
        }),
      });

      if (!response.ok) {
        let errMsg = `HTTP 错误！状态码: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch {
          /* ignore */
        }
        throw new Error(errMsg);
      }

      if (!response.body) throw new Error('流式读取器未就绪 (ReadableStream not supported)');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        const chunk = decoder.decode(value, { stream: !done });
        assistantContent += chunk;
        scheduleAssistantFlush();
      }
      flushAssistantMessage();

      const finalHistory = [
        ...chatMessages,
        newMsg,
        { role: 'assistant' as const, content: assistantContent },
      ];
      const mappedHistory = finalHistory.map((m) => ({
        sender: m.role === 'user' ? ('user' as const) : ('ai' as const),
        text: m.content,
        timestamp: new Date().toISOString(),
      }));
      updateChatHistory(entry.id, mappedHistory);
      setEntry((prev) => (prev ? { ...prev, chatHistory: mappedHistory } : null));
      markOnboarding({ firstFollowUpCompleted: true });
    } catch (err) {
      if (flushTimer !== null) {
        window.clearTimeout(flushTimer);
      }
      console.error('Follow-up error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setChatMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: `⚠️ 对话遇到异常: ${errMsg || '网络连接失败，请稍后重试。'}`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [entry, chatLoading, chatMessages, markOnboarding, setEntry]);

  return {
    chatInput,
    setChatInput,
    showShare,
    setShowShare,
    chatMessages,
    chatLoading,
    chatEndRef,
    handleSendFollowUp,
  };
}
