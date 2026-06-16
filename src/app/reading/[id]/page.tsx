'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MessageSquare, Trash2, Calendar, Compass, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import TarotCard from '@/components/tarot/TarotCard';
import ReadingResult from '@/components/tarot/ReadingResult';
import BottomNav from '@/components/layout/BottomNav';
import { getLocalReadingById, deleteLocalReading, updateLocalReading, JournalEntry } from '@/lib/db/localJournal';
import { getSpreadByType } from '@/lib/tarot/spreads';
import SharePoster from '@/components/tarot/SharePoster';
import { useAudio } from '@/hooks/useAudio';
import BreathingZen from '@/components/tarot/BreathingZen';

const defaultSuggestions = [
  '结合我的感情问题解释',
  '结合我的职业问题解释',
  '我是不是在自欺欺人？',
  '给我一个更现实的建议',
  '这组牌的反面提醒是什么？',
];

function parseStreamingReading(text: string, cardCount: number) {
  const sections = {
    questionSummary: '',
    intuitiveSummary: '',
    contradiction: '',
    overlookedFactor: '',
    actionAdvice: '',
    gentleReminder: '',
  };
  const cardReadings = Array(cardCount).fill('');

  const parts = text.split('# ');
  parts.forEach((part) => {
    const lines = part.split('\n');
    const title = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();

    if (title.startsWith('SUMMARY')) {
      sections.intuitiveSummary = body;
      sections.questionSummary = body.slice(0, 15) + '...';
    } else if (title.startsWith('CARD_READING_')) {
      const idx = parseInt(title.replace('CARD_READING_', ''), 10) - 1;
      if (idx >= 0 && idx < cardCount) {
        cardReadings[idx] = body;
      }
    } else if (title.startsWith('CONTRADICTION')) {
      sections.contradiction = body;
    } else if (title.startsWith('OVERLOOKED_FACTOR')) {
      sections.overlookedFactor = body;
    } else if (title.startsWith('ACTION_ADVICE')) {
      sections.actionAdvice = body;
    } else if (title.startsWith('GENTLE_REMINDER')) {
      sections.gentleReminder = body;
    }
  });

  return {
    ...sections,
    cardReadings: cardReadings.map((body, i) => ({
      positionName: '',
      cardName: '',
      cardZhName: '',
      orientation: 'upright' as const,
      interpretation: body,
    })),
    followUpSuggestions: defaultSuggestions,
  };
}

function isReadingEmpty(reading: any): boolean {
  if (!reading) return true;
  const cardInterpretationsEmpty = reading.cardReadings?.every(
    (c: any) => !c.interpretation || c.interpretation.trim() === '等待解读开始...' || !c.interpretation.trim()
  );
  return !reading.intuitiveSummary && cardInterpretationsEmpty;
}

export default function ReadingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);

  // 重新生成相关状态
  const [generating, setGenerating] = useState(false);
  const [readingText, setReadingText] = useState('');
  const [readingError, setReadingError] = useState<string | null>(null);
  const [showZen, setShowZen] = useState(false);
  const { playAmbient, stopAmbient } = useAudio();

  // 追问对话状态
  const [chatInput, setChatInput] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      const data = getLocalReadingById(id);
      if (data) {
        setEntry(data);
      }
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const handleDelete = () => {
    if (confirm('确定要删除这篇情绪日记吗？删除后将不可找回。')) {
      deleteLocalReading(id);
      router.push('/journal');
    }
  };

  const handleRegenerate = async () => {
    if (generating || !entry) return;
    setGenerating(true);
    setReadingText('');
    setReadingError(null);
    playAmbient();

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
      });

      if (!response.ok) {
        let errMsg = `HTTP 错误！状态码: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (_) {
          try {
            const txt = await response.text();
            if (txt) errMsg = txt;
          } catch (_) {}
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

      const finalReading = parseStreamingReading(text, entry.cards.length);
      const ok = updateLocalReading(entry.id, finalReading);
      stopAmbient();
      
      if (ok) {
        setEntry((prev) => (prev ? { ...prev, reading: finalReading } : null));
      } else {
        throw new Error('本地日记更新失败');
      }

      setGenerating(false);
    } catch (err: any) {
      console.error('Regenerate error:', err);
      stopAmbient();
      setReadingError(err.message || '重建情绪解读失败');
      setGenerating(false);
    }
  };

  const handleSendFollowUp = async (inputText: string) => {
    if (!inputText.trim() || chatLoading || !entry) return;

    const newMsg = { role: 'user' as const, content: inputText.trim() };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const spread = getSpreadByType(entry.spreadType);
      
      // 我们在 meanings 里把 cardReadings 拼装出来
      const previousReadingRaw = `# SUMMARY\n${entry.reading.intuitiveSummary}\n\n` +
        entry.reading.cardReadings.map((c, idx) => `# CARD_READING_${idx + 1}\n${c.interpretation}`).join('\n\n') +
        `\n\n# CONTRADICTION\n${entry.reading.contradiction}\n\n# OVERLOOKED_FACTOR\n${entry.reading.overlookedFactor}\n\n# ACTION_ADVICE\n${entry.reading.actionAdvice}\n\n# GENTLE_REMINDER\n${entry.reading.gentleReminder}`;

      const response = await fetch('/api/reading/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: entry.question,
          mood: entry.mood,
          spreadName: spread?.name || '',
          cards: entry.cards,
          previousReading: previousReadingRaw,
          chatHistory: chatMessages,
          newQuestion: inputText.trim(),
        }),
      });

      if (!response.body) throw new Error('No body in response');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let replyText = '';

      setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        const chunk = decoder.decode(value, { stream: !done });
        replyText += chunk;

        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: replyText };
          return updated;
        });
      }
    } catch (err) {
      console.error('Follow-up error:', err);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090F] flex items-center justify-center text-gold/50 font-serif text-sm animate-pulse">
        ✦ 加载中 ✦
      </div>
    );
  }

  if (!entry) {
    return (
      <main className="min-h-screen bg-[#07090F] flex flex-col items-center justify-center text-center p-6 text-foreground">
        <p className="text-sm text-gold-muted/80 font-serif mb-4">抱歉，未找到该篇情绪日记记录</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2 border border-gold/45 text-gold font-serif rounded-lg text-xs hover:bg-gold/5 transition-all"
        >
          返回首页
        </button>
      </main>
    );
  }

  const spread = getSpreadByType(entry.spreadType);
  const formattedDate = new Date(entry.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <main className="flex-grow min-h-screen pb-28 flex flex-col items-center text-foreground relative overflow-y-auto">
      {/* 顶部 Header */}
      <div className="w-full max-w-md px-6 pt-6 flex justify-between items-center z-10">
        <button
          onClick={() => router.push('/journal')}
          className="w-9 h-9 rounded-full border border-gold/15 bg-card/40 flex items-center justify-center text-gold/80 hover:border-gold/35 cursor-pointer transition-all duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-serif text-gold-muted/80 tracking-widest">
          日记详情
        </span>
        <button
          onClick={handleDelete}
          className="w-9 h-9 rounded-full border border-red-950/20 bg-red-950/5 flex items-center justify-center text-red-400/80 hover:border-red-900/40 hover:bg-red-950/25 cursor-pointer transition-all duration-300"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="w-full max-w-md px-6 flex-1 flex flex-col justify-start items-center my-4">
        
        {/* 问题、情绪和时间摘要 */}
        <div className="w-full p-4 rounded-xl border border-gold/15 bg-[#0F1117]/60 flex flex-col gap-2.5 mb-6">
          <div className="flex justify-between items-center text-[10px] text-gold-muted/65 font-serif border-b border-gold/5 pb-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
            <span className="text-gold tracking-widest">
              {spread?.name} ✦ {entry.mood}
            </span>
          </div>
          <p className="text-xs md:text-sm text-foreground/90 font-serif leading-relaxed tracking-wide font-medium">
            “ {entry.question} ”
          </p>
        </div>

        {/* 卡牌平铺展示 */}
        <div className="flex justify-center gap-3 my-6">
          {entry.cards.map((card) => (
            <div key={card.id} className="flex flex-col items-center scale-90">
              <TarotCard card={card} revealed={true} size="sm" interactive={false} />
              <span className="text-[9px] text-gold-muted/50 mt-1.5 font-serif">
                {card.positionName}
              </span>
            </div>
          ))}
        </div>

        {/* AI 解读结果 */}
        <ReadingResult
          parsedReading={generating ? parseStreamingReading(readingText, entry.cards.length) : entry.reading}
          cards={entry.cards}
          generating={generating}
        />

        {/* AI 重新解读报错与重试 */}
        {!generating && readingError && (
          <div className="w-full max-w-sm px-5 py-4 rounded-xl border border-red-950/45 bg-[#170B0B]/50 flex flex-col gap-3.5 mb-6 text-center shadow-lg" style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.1)' }}>
            <span className="text-[11px] text-red-400 font-serif font-bold tracking-widest">
              ✦ 情绪解读重建失败 ✦
            </span>
            <p className="text-[10px] text-red-300/80 font-mono break-all leading-relaxed px-2">
              {readingError}
            </p>
            <button
              onClick={handleRegenerate}
              className="mx-auto px-5 py-2.5 rounded-lg border border-red-800/40 bg-red-950/40 text-[10px] text-red-300 font-serif tracking-widest hover:bg-red-900/40 transition-all duration-300 cursor-pointer"
            >
              ✦ 点击重试重建 ✦
            </button>
          </div>
        )}

        {/* 如果是没有解读内容的损坏日记，展示重建按钮 */}
        {!generating && !readingError && isReadingEmpty(entry.reading) && (
          <div className="w-full max-w-sm px-5 py-4 rounded-xl border border-gold/15 bg-[#11131A]/60 flex flex-col gap-3.5 mb-6 text-center shadow-gold-glow">
            <span className="text-[11px] text-gold font-serif font-semibold tracking-widest">
              ✦ 解读信息缺失 ✦
            </span>
            <p className="text-[10px] text-gold-muted/70 font-serif leading-relaxed px-2">
              检测到此篇情绪日记缺少 AI 情绪解读，可能因为之前大模型接口配置有误或中断。
            </p>
            <button
              onClick={handleRegenerate}
              className="mx-auto px-5 py-2.5 rounded-lg border border-gold/25 bg-gold/5 text-[10px] text-gold font-serif tracking-widest hover:bg-gold/10 transition-all duration-300 cursor-pointer shadow-gold-glow"
            >
              ✦ 重新唤醒 MIRROR 情绪解读 ✦
            </button>
          </div>
        )}

        {/* 生成海报与冥想按钮 */}
        {!generating && !isReadingEmpty(entry.reading) && (
          <div className="w-full flex justify-center gap-3 mb-6">
            <button
              onClick={() => setShowShare(true)}
              className="px-4 py-2 rounded-lg border border-gold/25 bg-gold/5 text-[10px] text-gold font-serif tracking-widest hover:bg-gold/10 transition-all cursor-pointer shadow-gold-glow"
            >
              ✦ 生成分享金句海报 ✦
            </button>
            <button
              onClick={() => setShowZen(true)}
              className="px-4 py-2 rounded-lg border border-gold/25 bg-gold/5 text-[10px] text-gold font-serif tracking-widest hover:bg-gold/10 transition-all cursor-pointer shadow-gold-glow"
            >
              ✦ 进入镜面冥想 ✦
            </button>
          </div>
        )}

        {/* 追问聊天对话区 */}
        {!generating && !isReadingEmpty(entry.reading) && (
          <div className="w-full border-t border-gold/10 pt-6 mt-2 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-gold px-1">
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-serif tracking-widest font-semibold">继续追问</span>
          </div>

          {/* 对话列表 */}
          {chatMessages.length > 0 && (
            <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col gap-1 max-w-[85%] ${
                    msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'
                  }`}
                >
                  <div
                    className={`p-3 rounded-2xl text-xs font-serif leading-relaxed tracking-wide ${
                      msg.role === 'user'
                        ? 'bg-[#1E1C16] border border-gold/20 text-gold rounded-tr-none'
                        : 'bg-card border border-gold/5 text-foreground/90 rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="self-start max-w-[85%] flex flex-col items-start">
                  <div className="p-3 rounded-2xl bg-card border border-gold/5 text-xs font-serif text-gold-muted/40 animate-pulse rounded-tl-none">
                    正在梳理牌面指引...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* 快捷追问建议 (Chips) */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {defaultSuggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                disabled={chatLoading}
                onClick={() => handleSendFollowUp(sug)}
                className="px-3 py-1.5 rounded-full border border-gold/10 bg-[#0E1017]/45 text-[10px] text-gold-muted/80 font-serif tracking-wider whitespace-nowrap hover:border-gold/30 hover:text-gold cursor-pointer transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* 自由输入框 */}
          <div className="relative rounded-xl border border-gold/15 bg-card/65 p-1 flex items-center shadow-gold-glow">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendFollowUp(chatInput)}
              placeholder="结合牌阵，你还有什么想问的？"
              disabled={chatLoading}
              className="flex-1 bg-transparent border-none outline-none text-xs text-foreground/90 font-serif tracking-wide placeholder:text-gold-muted/30 pl-3.5 pr-2 py-2.5 disabled:opacity-50"
            />
            <button
              onClick={() => handleSendFollowUp(chatInput)}
              disabled={!chatInput.trim() || chatLoading}
              className="w-8 h-8 rounded-lg bg-gold/10 text-gold flex items-center justify-center hover:bg-gold/20 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none mr-1"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        )}

      </div>

      {showShare && entry.cards.length > 0 && (
        <SharePoster
          question={entry.question}
          mood={entry.mood}
          mainCard={entry.cards[0]}
          intuitiveSummary={entry.reading.intuitiveSummary}
          onClose={() => setShowShare(false)}
        />
      )}

      {showZen && (
        <BreathingZen onClose={() => setShowZen(false)} />
      )}

      <BottomNav />
    </main>
  );
}
