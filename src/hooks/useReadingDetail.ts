'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  getLocalReadingById,
  deleteLocalReading,
  updateLocalReading,
  JournalEntry,
  syncJournalData,
  toggleStarReading,
  updateChatHistory
} from '@/lib/db/localJournal';
import { useAudio } from '@/hooks/useAudio';
import { SelectedCard, ParsedReading } from '@/lib/tarot/types';
import { getCardElement, parseStreamingReading, defaultSuggestions } from '@/lib/tarot/utils';

function isReadingEmpty(reading: ParsedReading): boolean {
  if (!reading) return true;
  const cardInterpretationsEmpty = reading.cardReadings?.every(
    (c) => !c.interpretation || c.interpretation.trim() === '等待解读开始...' || !c.interpretation.trim()
  );
  return !reading.intuitiveSummary && cardInterpretationsEmpty;
}

export function useReadingDetail(id: string, trigger: boolean) {
  const router = useRouter();
  
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);

  // 重新生成相关状态
  const [generating, setGenerating] = useState(false);
  const [readingText, setReadingText] = useState('');
  const [readingError, setReadingError] = useState<string | null>(null);
  const [showZen, setShowZen] = useState(false);
  
  // 引入元素冥想合成器
  const { playAmbient, stopAmbient, playElementAmbient, stopElementAmbient } = useAudio();
  const activeElement = entry?.cards[0] ? getCardElement(entry.cards[0]) : null;

  // 追问对话状态
  const [chatInput, setChatInput] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const generationAbortRef = useRef<AbortController | null>(null);
  const hasAutoTriggeredRef = useRef(false);

  // 1. 加载数据并激活元素音效与云同步
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const localData = getLocalReadingById(id);
      if (!cancelled && localData) {
        setEntry(localData);
      }

      try {
        const synced = await syncJournalData();
        if (!cancelled && synced) {
          const syncedData = getLocalReadingById(id);
          if (syncedData) setEntry(syncedData);
        }
      } catch (err) {
        console.error('Reading page sync error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // 2. 环境音生命周期清理
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

  // 自动滚动聊天到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // 从 entry.chatHistory 加载历史对话
  useEffect(() => {
    if (entry && entry.chatHistory && chatMessages.length === 0) {
      const mapped = entry.chatHistory.map(m => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text
      }));
      setChatMessages(mapped);
    }
  }, [entry, chatMessages.length]);

  const handleDelete = useCallback(() => {
    if (confirm('确定要删除这篇情绪日记吗？删除后将不可找回。')) {
      deleteLocalReading(id);
      router.push('/journal');
    }
  }, [id, router]);

  const handleRegenerate = useCallback(async (signal?: AbortSignal) => {
    if (generating || !entry) return;
    const controller = signal ? null : new AbortController();
    const requestSignal = signal ?? controller?.signal;
    if (controller) {
      generationAbortRef.current = controller;
    }

    setGenerating(true);
    setReadingText('');
    setReadingError(null);
    playAmbient();

    // 提前移除 URL 中的 trigger 参数，防止后续干扰
    if (trigger) {
      router.replace(`/reading/${entry.id}`, { scroll: false });
    }

    try {
      const response = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: entry.question,
          mood: entry.mood,
          spreadType: entry.spreadType,
          cards: entry.cards,
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
          } catch {}
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
        setReadingText(text);
      }

      if (text.trim().length < 30) {
        throw new Error('AI 生成的指引信息过短或不完整，请重试');
      }

      const finalReading = parseStreamingReading(text, entry.cards);
      const ok = updateLocalReading(entry.id, finalReading);
      stopAmbient();
      
      if (ok) {
        setEntry((prev) => (prev ? { ...prev, reading: finalReading } : null));
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
      stopAmbient();
      const errMsg = err instanceof Error ? err.message : String(err);
      setReadingError(errMsg || '重建情绪解读失败');
      setGenerating(false);
      if (controller && generationAbortRef.current === controller) {
        generationAbortRef.current = null;
      }
    }
  }, [entry, generating, playAmbient, router, stopAmbient, trigger]);

  // 3. 页面加载完毕后自动触发流式 AI 解读 (如果要求 trigger 或当前数据空白)
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

  const handleSendFollowUp = useCallback(async (inputText: string) => {
    if (!inputText.trim() || chatLoading || !entry) return;

    const newMsg = { role: 'user' as const, content: inputText.trim() };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      // 先插入一条空的 assistant 消息
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const response = await fetch('/api/reading/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: entry.question,
          mood: entry.mood,
          spreadName: entry.spreadType, // 后端能解开 spreadType
          cards: entry.cards,
          previousReading: `# SUMMARY\n${entry.reading.intuitiveSummary}\n\n` +
            entry.reading.cardReadings.map((c, idx) => `# CARD_READING_${idx + 1}\n${c.interpretation}`).join('\n\n') +
            `\n\n# CONTRADICTION\n${entry.reading.contradiction}\n\n# OVERLOOKED_FACTOR\n${entry.reading.overlookedFactor}\n\n# ACTION_ADVICE\n${entry.reading.actionAdvice}\n\n# GENTLE_REMINDER\n${entry.reading.gentleReminder}`,
          chatHistory: chatMessages,
          newQuestion: inputText.trim(),
        }),
      });

      if (!response.body) throw new Error('流式读取器未就绪 (ReadableStream not supported)');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantContent = '';

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        const chunk = decoder.decode(value, { stream: !done });
        assistantContent += chunk;

        setChatMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          updated[updated.length - 1] = {
            ...lastMsg,
            content: lastMsg.content + chunk
          };
          return updated;
        });
      }

      // 将最新消息持久化保存到本地和云端
      const finalHistory = [
        ...chatMessages,
        newMsg,
        { role: 'assistant' as const, content: assistantContent }
      ];
      const mappedHistory = finalHistory.map(m => ({
        sender: m.role === 'user' ? ('user' as const) : ('ai' as const),
        text: m.content,
        timestamp: new Date().toISOString()
      }));
      updateChatHistory(entry.id, mappedHistory);
      setEntry(prev => prev ? { ...prev, chatHistory: mappedHistory } : null);

    } catch (err) {
      console.error('Follow-up error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setChatMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: `⚠️ 对话遇到异常: ${errMsg || '网络连接失败，请稍后重试。'}`
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [entry, chatLoading, chatMessages]);

  const handleToggleStar = useCallback(() => {
    if (!entry) return;
    const ok = toggleStarReading(entry.id);
    if (ok) {
      setEntry(prev => prev ? { ...prev, isStarred: !prev.isStarred } : null);
    }
  }, [entry]);

  const parsedReading = useMemo(() => {
    if (!entry) return null;
    return generating
      ? parseStreamingReading(readingText, entry.cards)
      : entry.reading;
  }, [entry, generating, readingText]);

  // 计算当前大模型流式解读正聚焦在第几张卡牌的索引上
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
    entry,
    loading,
    generating,
    readingText,
    readingError,
    showZen,
    setShowZen,
    activeElement,
    chatInput,
    setChatInput,
    showShare,
    setShowShare,
    chatMessages,
    chatLoading,
    chatEndRef,
    handleDelete,
    handleRegenerate,
    handleSendFollowUp,
    handleToggleStar,
    isStarred: entry?.isStarred || false,
    parsedReading,
    activeFocusIndex,
    formattedDate,
    isReadingEmpty: entry ? isReadingEmpty(entry.reading) : true,
    defaultSuggestions
  };
}
