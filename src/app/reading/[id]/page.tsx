'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, MessageSquare, Trash2, Calendar, Send } from 'lucide-react';
import TarotCard from '@/components/tarot/TarotCard';
import ReadingResult from '@/components/tarot/ReadingResult';
import BottomNav from '@/components/layout/BottomNav';
import { getLocalReadingById, deleteLocalReading, updateLocalReading, JournalEntry, syncJournalData } from '@/lib/db/localJournal';
import { getSpreadByType } from '@/lib/tarot/spreads';
import SharePoster from '@/components/tarot/SharePoster';
import { useAudio } from '@/hooks/useAudio';
import BreathingZen from '@/components/tarot/BreathingZen';
import { SelectedCard, ParsedReading } from '@/lib/tarot/types';

const defaultSuggestions = [
  '结合我的感情问题解释',
  '结合我的职业问题解释',
  '我是不是在自欺欺人？',
  '给我一个更现实的建议',
  '这组牌的反面提醒是什么？',
];

function parseStreamingReading(text: string, cards: SelectedCard[]): ParsedReading {
  const sections = {
    questionSummary: '',
    intuitiveSummary: '',
    contradiction: '',
    overlookedFactor: '',
    actionAdvice: '',
    gentleReminder: '',
  };
  const cardReadings = Array(cards.length).fill('');

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
      if (idx >= 0 && idx < cards.length) {
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
    cardReadings: cardReadings.map((body, index) => ({
      positionName: cards[index]?.positionName || '',
      cardName: cards[index]?.name || '',
      cardZhName: cards[index]?.zhName || '',
      orientation: cards[index]?.orientation || 'upright',
      interpretation: body,
    })),
    followUpSuggestions: defaultSuggestions,
  };
}

const spreadPositionsConfig: Record<string, { left: number; top: number }[]> = {
  one_card: [
    { left: 50, top: 50 }
  ],
  three_cards: [
    { left: 19, top: 50 },
    { left: 50, top: 50 },
    { left: 81, top: 50 }
  ],
  relationship: [
    { left: 18, top: 50 }, // 自我 (左)
    { left: 82, top: 50 }, // 对方 (右)
    { left: 50, top: 76 }, // 现状 (下)
    { left: 50, top: 24 }  // 未来 (上)
  ],
  career: [
    { left: 19, top: 62 }, // 机会 (左下)
    { left: 81, top: 62 }, // 风险 (右下)
    { left: 50, top: 28 }  // 建议 (上)
  ],
  shadow: [
    { left: 50, top: 22 }, // 显意识 (上)
    { left: 50, top: 53 }, // 潜意识 (中)
    { left: 50, top: 84 }  // 出路 (下)
  ],
  choice: [
    { left: 50, top: 78 }, // 现状 (下)
    { left: 18, top: 46 }, // 选项 A (左)
    { left: 82, top: 46 }, // 选项 B (右)
    { left: 50, top: 16 }  // 建议与抉择 (上)
  ],
  mirror_cross: [
    { left: 18, top: 52 }, // 核心现状 (左)
    { left: 47, top: 52 }, // 横向阻碍 (中偏左)
    { left: 50, top: 16 }, // 理智冠冕 (上)
    { left: 50, top: 86 }, // 真实根基 (下)
    { left: 82, top: 52 }  // 觉察出路 (右)
  ]
};

const spreadConnectionsConfig: Record<string, { from: number; to: number }[]> = {
  three_cards: [
    { from: 0, to: 1 },
    { from: 1, to: 2 }
  ],
  relationship: [
    { from: 0, to: 2 }, // 自我 -> 现状
    { from: 1, to: 2 }, // 对方 -> 现状
    { from: 2, to: 3 }  // 现状 -> 未来
  ],
  career: [
    { from: 0, to: 2 }, // 机会 -> 建议
    { from: 1, to: 2 }  // 风险 -> 建议
  ],
  shadow: [
    { from: 0, to: 1 }, // 显意识 -> 潜意识
    { from: 1, to: 2 }  // 潜意识 -> 出路
  ],
  choice: [
    { from: 0, to: 1 }, // 现状 -> 选项A
    { from: 0, to: 2 }, // 现状 -> 选项B
    { from: 1, to: 3 }, // 选项A -> 建议
    { from: 2, to: 3 }  // 选项B -> 建议
  ],
  mirror_cross: [
    { from: 3, to: 0 }, // 根基 -> 现状
    { from: 0, to: 1 }, // 现状 -> 阻碍
    { from: 1, to: 4 }, // 阻碍 -> 出路
    { from: 2, to: 4 }  // 冠冕 -> 出路
  ]
};

function getLayoutConfig(spreadType: string, cardCount: number) {
  if (spreadType === 'custom') {
    if (cardCount === 1) {
      return {
        positions: spreadPositionsConfig.one_card,
        connections: []
      };
    }
    if (cardCount === 2) {
      return {
        positions: [
          { left: 28, top: 50 },
          { left: 72, top: 50 }
        ],
        connections: [{ from: 0, to: 1 }]
      };
    }
    return {
      positions: spreadPositionsConfig.three_cards,
      connections: spreadConnectionsConfig.three_cards
    };
  }

  return {
    positions: spreadPositionsConfig[spreadType] || spreadPositionsConfig.three_cards,
    connections: spreadConnectionsConfig[spreadType] || []
  };
}

function getCardElement(card: SelectedCard): 'water' | 'fire' | 'wind' | 'earth' {
  if (card.arcana === 'minor' && card.suit) {
    if (card.suit === 'wands') return 'fire';
    if (card.suit === 'cups') return 'water';
    if (card.suit === 'swords') return 'wind';
    if (card.suit === 'pentacles') return 'earth';
  }
  const num = card.number ?? 0;
  if ([2, 3, 12, 13, 18, 20].includes(num)) return 'water';
  if ([1, 7, 10, 16, 19].includes(num)) return 'fire';
  if ([0, 6, 11, 14, 17].includes(num)) return 'wind';
  return 'earth';
}

function isReadingEmpty(reading: ParsedReading): boolean {
  if (!reading) return true;
  const cardInterpretationsEmpty = reading.cardReadings?.every(
    (c) => !c.interpretation || c.interpretation.trim() === '等待解读开始...' || !c.interpretation.trim()
  );
  return !reading.intuitiveSummary && cardInterpretationsEmpty;
}

function ReadingDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const id = params.id as string;
  const trigger = searchParams.get('trigger') === 'true';

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

  const handleDelete = () => {
    if (confirm('确定要删除这篇情绪日记吗？删除后将不可找回。')) {
      deleteLocalReading(id);
      router.push('/journal');
    }
  };

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
    return undefined;
  }, [entry, generating, handleRegenerate, loading, readingError, readingText, trigger]);

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

      // 先插入一条空的 assistant 消息
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

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

      if (!response.body) throw new Error('流式读取器未就绪 (ReadableStream not supported)');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        const chunk = decoder.decode(value, { stream: !done });

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

  // 元素底色映射
  const elementMainBgs = {
    water: 'bg-[#050912]',
    fire: 'bg-[#0C0604]',
    wind: 'bg-[#07090C]',
    earth: 'bg-[#040805]',
  };

  const parsedReading = generating 
    ? parseStreamingReading(readingText, entry.cards) 
    : entry.reading;

  // 计算当前大模型流式解读正聚焦在第几张卡牌的索引上
  const activeFocusIndex = (() => {
    if (!generating) return -1;
    const readings = parsedReading.cardReadings;
    if (readings[2]?.interpretation && readings[2].interpretation.trim() !== '' && readings[2].interpretation.trim() !== '等待解读开始...') return 2;
    if (readings[1]?.interpretation && readings[1].interpretation.trim() !== '' && readings[1].interpretation.trim() !== '等待解读开始...') return 1;
    if (readings[0]?.interpretation && readings[0].interpretation.trim() !== '' && readings[0].interpretation.trim() !== '等待解读开始...') return 0;
    return -1;
  })();

  return (
    <main className={`flex-grow min-h-screen pb-28 flex flex-col items-center text-foreground relative overflow-y-auto transition-colors duration-1000 ${
      activeElement ? elementMainBgs[activeElement] : 'bg-[#07090F]'
    }`}>
      {/* 四元素专属能量场背景发光圈 */}
      <div className={`absolute inset-0 pointer-events-none transition-all duration-[1500ms] z-0 ${
        activeElement === 'water' ? 'bg-radial-gradient from-blue-950/15 via-transparent to-transparent shadow-[inset_0_0_80px_rgba(29,78,216,0.06)]' :
        activeElement === 'fire' ? 'bg-radial-gradient from-amber-950/15 via-transparent to-transparent shadow-[inset_0_0_80px_rgba(217,119,6,0.06)]' :
        activeElement === 'wind' ? 'bg-radial-gradient from-slate-900/15 via-transparent to-transparent shadow-[inset_0_0_80px_rgba(100,116,139,0.06)]' :
        activeElement === 'earth' ? 'bg-radial-gradient from-emerald-950/15 via-transparent to-transparent shadow-[inset_0_0_80px_rgba(16,185,129,0.06)]' :
        'bg-radial-gradient from-gold/5 via-transparent to-transparent'
      }`} />
      
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

      <div className="w-full max-w-md px-6 flex-1 flex flex-col justify-start items-center my-4 z-10">
        
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

        {/* 2D 几何空间星图牌阵排布与能量有向流光连线 */}
        {(() => {
          const layout = getLayoutConfig(entry.spreadType, entry.cards.length);
          const hasConnections = layout.connections.length > 0;
          return (
            <div className="w-full h-[280px] md:h-[310px] relative mt-2 mb-6 border border-gold/5 bg-gradient-to-b from-[#0B0D14]/20 to-transparent rounded-2xl overflow-hidden shadow-gold-glow flex items-center justify-center">
              
              {/* 底层 SVG 能量流动虚线 */}
              {hasConnections && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  <defs>
                    {/* 金光流溢滤镜 */}
                    <filter id="gold-glow-line" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="1.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    {/* 有向线段的端点箭头 */}
                    <marker
                      id="arrow-head"
                      viewBox="0 0 10 10"
                      refX="18" // 让箭头稍微偏离卡牌中心，避开完全遮挡
                      refY="5"
                      markerWidth="4"
                      markerHeight="4"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 9 5 L 0 9 z" fill="#C9A76A" fillOpacity="0.75" />
                    </marker>
                  </defs>

                  {layout.connections.map((conn, cIdx) => {
                    const fromPos = layout.positions[conn.from];
                    const toPos = layout.positions[conn.to];
                    if (!fromPos || !toPos) return null;

                    return (
                      <g key={cIdx}>
                        {/* 流光能量线 */}
                        <line
                          x1={`${fromPos.left}%`}
                          y1={`${fromPos.top}%`}
                          x2={`${toPos.left}%`}
                          y2={`${toPos.top}%`}
                          stroke="#C9A76A"
                          strokeWidth="1.2"
                          strokeOpacity="0.55"
                          strokeDasharray="4 5"
                          filter="url(#gold-glow-line)"
                          markerEnd="url(#arrow-head)"
                        >
                          <animate
                            attributeName="stroke-dashoffset"
                            values="180;0"
                            dur="5s"
                            repeatCount="indefinite"
                          />
                        </line>
                        
                        {/* 连线中点的交互圆点 ✦ */}
                        <g 
                          transform={`translate(${(fromPos.left + toPos.left) / 2}, ${(fromPos.top + toPos.top) / 2})`}
                          className="cursor-help pointer-events-auto"
                        >
                          <circle cx="0" cy="0" r="4" className="fill-[#0C0E15] stroke-gold stroke-[0.8] animate-pulse" />
                          <text x="0" y="2.5" className="fill-gold text-[6px] font-serif font-bold text-center" textAnchor="middle">✦</text>
                          <title>心智水流由此传递</title>
                        </g>
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* 顶层卡牌绝对定位 */}
              {entry.cards.map((card, idx) => {
                const pos = layout.positions[idx] || { left: 50, top: 50 };
                const isFocused = activeFocusIndex === idx;
                const isSomeFocused = activeFocusIndex !== -1;

                return (
                  <div
                    key={card.id}
                    className="absolute z-10 transition-all duration-700 select-none"
                    style={{
                      left: `${pos.left}%`,
                      top: `${pos.top}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div
                      className={`flex flex-col items-center transition-all duration-700 ${
                        isFocused
                          ? 'scale-100 filter drop-shadow-[0_0_15px_rgba(201,167,106,0.55)]'
                          : isSomeFocused
                            ? 'scale-[0.78] opacity-35 blur-[0.5px]'
                            : 'scale-90 opacity-90'
                      }`}
                    >
                      {/* 为了在空间排布中防止溢出容器，将 TarotCard 设置为 sm 且稍微按比例缩小 */}
                      <TarotCard card={card} revealed={true} size="sm" interactive={false} />
                      <span
                        className={`text-[8px] mt-1 font-serif tracking-widest text-center whitespace-nowrap px-1.5 py-0.5 rounded bg-[#090B11]/60 border transition-colors duration-500 max-w-[80px] truncate ${
                          isFocused
                            ? 'text-gold font-semibold border-gold/30 bg-[#151720]/80'
                            : 'text-gold-muted/50 border-transparent'
                        }`}
                      >
                        {card.positionName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* AI 解读结果 */}
        <ReadingResult
          parsedReading={parsedReading}
          cards={entry.cards}
          generating={generating}
          activeFocusIndex={activeFocusIndex}
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
              onClick={() => handleRegenerate()}
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
              onClick={() => handleRegenerate()}
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
                type="button"
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
        <BreathingZen element={activeElement} onClose={() => setShowZen(false)} />
      )}

      <BottomNav />
    </main>
  );
}

export default function ReadingDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#07090F] flex items-center justify-center text-gold/50 font-serif text-sm animate-pulse">
        ✦ 加载中 ✦
      </div>
    }>
      <ReadingDetailContent />
    </Suspense>
  );
}
