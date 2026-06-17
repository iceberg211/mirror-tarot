'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Moon, RefreshCw, MessageSquare, Compass, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CardDeck from '@/components/tarot/CardDeck';
import TarotCard from '@/components/tarot/TarotCard';
import ReadingResult from '@/components/tarot/ReadingResult';
import { SelectedCard, ParsedReading, SpreadType } from '@/lib/tarot/types';
import { getSpreadByType } from '@/lib/tarot/spreads';
import { saveLocalReading } from '@/lib/db/localJournal';
import SharePoster from '@/components/tarot/SharePoster';
import { getTodayMoonPhase, getMoonSvgPath } from '@/lib/tarot/moonPhase';
import { useAudio } from '@/hooks/useAudio';
import BreathingZen from '@/components/tarot/BreathingZen';

// 默认的快捷追问建议
const defaultSuggestions = [
  '结合我的感情问题解释',
  '结合我的职业问题解释',
  '我是不是在自欺欺人？',
  '给我一个更现实的建议',
  '这组牌的反面提醒是什么？',
];

// 神秘学大阿卡纳与小阿卡纳四元素映射
function getCardElement(card: SelectedCard): 'water' | 'fire' | 'wind' | 'earth' {
  if (card.arcana === 'minor' && card.suit) {
    if (card.suit === 'wands') return 'fire';
    if (card.suit === 'cups') return 'water';
    if (card.suit === 'swords') return 'wind';
    if (card.suit === 'pentacles') return 'earth';
  }
  const num = card.number;
  if ([2, 3, 12, 13, 18, 20].includes(num)) return 'water';
  if ([1, 7, 10, 16, 19].includes(num)) return 'fire';
  if ([0, 6, 11, 14, 17].includes(num)) return 'wind';
  return 'earth';
}

// 解析流式带有锚点的 Markdown 文本
function parseStreamingReading(text: string, cardCount: number): ParsedReading {
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
      orientation: 'upright',
      interpretation: body,
    })),
    followUpSuggestions: defaultSuggestions,
  };
}

function ReadingNewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const question = searchParams.get('question') || '';
  const mood = searchParams.get('mood') || '平静';
  const spreadType = (searchParams.get('spreadType') || 'three_cards') as SpreadType;

  const spread = getSpreadByType(spreadType);
  const moonPhase = getTodayMoonPhase();

  // 状态机步骤: 'draw' (抽牌中) | 'reveal' (点击翻开卡片) | 'reading' (AI解读生成中)
  const [step, setStep] = useState<'draw' | 'reveal' | 'reading'>('draw');
  
  // 服务端预抽的真实牌
  const [serverCards, setServerCards] = useState<SelectedCard[]>([]);
  
  // 翻卡状态记录
  const [revealedStates, setRevealedStates] = useState<Record<number, boolean>>({});
  const [allRevealed, setAllRevealed] = useState(false);

  // 擦拭状态记录
  const [scratchedStates, setScratchedStates] = useState<Record<number, boolean>>({});
  const [allScratched, setAllScratched] = useState(false);

  // AI 解读状态
  const [readingText, setReadingText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [savedJournalId, setSavedJournalId] = useState('');
  const [readingError, setReadingError] = useState<string | null>(null);

  // 追问对话状态
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // 引入元素背景音播放和停止
  const { playAmbient, stopAmbient, playElementAmbient, stopElementAmbient } = useAudio();
  const [activeElement, setActiveElement] = useState<'water' | 'fire' | 'wind' | 'earth' | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [showZen, setShowZen] = useState(false);

  // 页面卸载时安全停止元素音效
  useEffect(() => {
    return () => {
      stopElementAmbient();
    };
  }, []);

  // 页面加载时自动静默调用 draw API
  useEffect(() => {
    async function initDraw() {
      try {
        const res = await fetch(`/api/reading/draw?spreadType=${spreadType}`);
        const data = await res.json();
        if (data.success) {
          setServerCards(data.cards);
        }
      } catch (err) {
        console.error('Failed to pre-draw cards:', err);
      }
    }
    initDraw();
  }, [spreadType]);

  // 自动滚动聊天到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // 抽牌完毕回调
  const handleDrawComplete = () => {
    // 延迟 0.8s 切换状态，让发牌飞入动画播放完毕
    setTimeout(() => {
      setStep('reveal');
    }, 800);
  };

  // 点击翻开某张牌
  const handleRevealCard = (index: number) => {
    const newRevealed = { ...revealedStates, [index]: true };
    setRevealedStates(newRevealed);

    // 检查是否全部翻开
    if (Object.keys(newRevealed).length === (spread?.positions.length || 0)) {
      setAllRevealed(true);
    }
  };

  // 擦拭卡牌完成回调
  const handleScratchCard = (index: number) => {
    const newScratched = { ...scratchedStates, [index]: true };
    setScratchedStates(newScratched);

    // 只有当所有卡牌均已被翻开且迷雾完全被擦除后，才能亮起解读按钮
    if (Object.keys(newScratched).length === (spread?.positions.length || 0)) {
      setAllScratched(true);
    }
  };

  // 发起大模型流式解读请求
  const handleStartReading = async () => {
    if (generating) return;
    setStep('reading');
    setGenerating(true);
    setReadingText('');
    setReadingError(null);

    // 根据抽出的第一张牌（代表现状核心牌）获取主导星象元素，并播放对应的环境合成音
    const mainElement = serverCards[0] ? getCardElement(serverCards[0]) : 'water';
    setActiveElement(mainElement);
    playElementAmbient(mainElement);
    
    // 开启文本流式打印的背景白噪声
    playAmbient();

    try {
      const response = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          mood,
          spreadType,
          cards: serverCards,
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

      // 简单防呆：如果拿到的文本太短，判定为无效的流输出，视为出错
      if (text.trim().length < 30) {
        throw new Error('AI 生成的指引信息过短或不完整，请尝试重新请求解读');
      }

      stopAmbient();
      setGenerating(false);

      // 解读完成后，自动保存至本地 localStorage 日记
      const finalReading = parseStreamingReading(text, serverCards.length);
      const journalId = saveLocalReading(question, mood, spreadType, serverCards, finalReading);
      setSavedJournalId(journalId);

    } catch (error: any) {
      console.error('Stream read error:', error);
      stopAmbient();
      setReadingError(error.message || '大模型请求失败，请检查网络或配置');
      setGenerating(false);
    }
  };

  // 发送追问
  const handleSendFollowUp = async (inputText: string) => {
    if (!inputText.trim() || chatLoading || generating) return;
    
    const newMsg = { role: 'user' as const, content: inputText.trim() };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/reading/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          mood,
          spreadName: spread?.name || '',
          cards: serverCards,
          previousReading: readingText,
          chatHistory: chatMessages,
          newQuestion: inputText.trim(),
        }),
      });

      if (!response.body) throw new Error('No body in response');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let replyText = '';

      // 先插入一条空的 assistant 消息
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        const chunk = decoder.decode(value, { stream: !done });
        replyText += chunk;

        // 更新最后一条消息
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

  const parsedReading = parseStreamingReading(readingText, serverCards.length);

  // 元素底色映射
  const elementMainBgs = {
    water: 'bg-[#050912]',
    fire: 'bg-[#0C0604]',
    wind: 'bg-[#07090C]',
    earth: 'bg-[#040805]',
  };

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
      {/* 顶部栏 */}
      <div className="w-full max-w-md px-6 pt-6 flex justify-between items-center z-10">
        <button
          onClick={() => router.push('/')}
          className="w-9 h-9 rounded-full border border-gold/15 bg-card/40 flex items-center justify-center text-gold/80 hover:border-gold/35 cursor-pointer transition-all duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-serif text-gold-muted/80 tracking-widest">
          {spread?.name || '塔罗探索'}
        </span>
        <div className="w-9 h-9 opacity-0" /> {/* 占位保持居中 */}
      </div>

      <div className="w-full max-w-md px-6 flex-1 flex flex-col justify-start items-center my-4">
        
        {/* 1. 状态：抽牌交互中 */}
        {step === 'draw' && (
          <div className="w-full flex-grow flex flex-col justify-center gap-4 my-2">
            {/* 顶部的今日月相小指引 */}
            <div className="w-full p-4 rounded-xl border border-gold/10 bg-[#0F1117]/35 flex items-center gap-3.5 select-none">
              <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#11131E] to-[#08090E] border border-gold/10 flex items-center justify-center relative overflow-hidden flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-6.5 h-6.5 text-gold/85 drop-shadow-[0_0_6px_rgba(201,167,106,0.4)]">
                  <circle cx="50" cy="50" r="38" className="fill-[#1A1F30]/40 stroke-none" />
                  <path
                    d={getMoonSvgPath(moonPhase.iconType, moonPhase.percent)}
                    className="fill-gold stroke-none"
                  />
                </svg>
              </div>
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-[9px] text-gold-muted/65 font-mono tracking-widest uppercase">
                  LUNAR ENERGY ✦ {moonPhase.name}
                </span>
                <p className="text-[9px] text-foreground/80 font-serif leading-relaxed tracking-wide">
                  {moonPhase.advice}
                </p>
              </div>
            </div>

            {spread && (
              <CardDeck
                neededCount={spread.positions.length}
                positions={spread.positions}
                onComplete={handleDrawComplete}
              />
            )}
          </div>
        )}

        {/* 2. 状态：翻开揭示卡牌 */}
        {step === 'reveal' && (
          <div className="w-full flex-grow flex flex-col justify-between items-center py-6">
            <div className="text-center mb-6">
              <h2 className="text-xs text-gold font-serif tracking-widest animate-pulse font-semibold">
                ✦ 依次翻开卡牌，建立心灵映射 ✦
              </h2>
            </div>

            {/* 卡牌平铺展示 */}
            <div className="flex gap-4 flex-wrap justify-center my-6">
              {serverCards.map((card, idx) => {
                const isRevealed = !!revealedStates[idx];
                return (
                  <div key={card.id} className="flex flex-col items-center">
                    <TarotCard
                      card={card}
                      revealed={isRevealed}
                      size="sm"
                      onClick={() => handleRevealCard(idx)}
                      enableScratch={true}
                      onScratchFinished={() => handleScratchCard(idx)}
                      className="shadow-gold-glow-lg animate-fadeIn"
                    />
                    <span className="text-[10px] text-gold-muted/70 mt-2 tracking-widest font-serif font-medium">
                      {card.positionName}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 下方解读触发大按钮 */}
            <div className="w-full px-4 h-16 flex items-center justify-center mt-6">
              <AnimatePresence>
                {allScratched && (
                  <motion.button
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    onClick={handleStartReading}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-[#171610] via-[#2E281C] to-[#171610] border border-gold text-gold text-sm font-serif font-semibold tracking-[0.25em] shadow-gold-glow flex items-center justify-center gap-2 cursor-pointer transition-all hover:brightness-110"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>开启 MIRROR 情绪解读</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* 3. 状态：展示流式解读结果 */}
        {step === 'reading' && (
          <div className="w-full flex flex-col items-center">
            
            {/* 顶部小卡牌缩略图 */}
            <div className="flex justify-center gap-3 my-6">
              {serverCards.map((card) => (
                <div key={card.id} className="flex flex-col items-center scale-90">
                  <TarotCard card={card} revealed={true} size="sm" interactive={false} />
                  <span className="text-[9px] text-gold-muted/50 mt-1.5 font-serif">
                    {card.positionName}
                  </span>
                </div>
              ))}
            </div>

            {/* AI解读文字渲染区 */}
            <ReadingResult
              parsedReading={parsedReading}
              cards={serverCards}
              generating={generating}
            />

            {/* AI 解读报错与重试 */}
            {!generating && readingError && (
              <div className="w-full max-w-sm px-5 py-4 rounded-xl border border-red-950/45 bg-[#170B0B]/50 flex flex-col gap-3.5 mb-6 text-center shadow-lg" style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.1)' }}>
                <span className="text-[11px] text-red-400 font-serif font-bold tracking-widest">
                  ✦ MIRROR 情绪解读遇到异常 ✦
                </span>
                <p className="text-[10px] text-red-300/80 font-mono break-all leading-relaxed px-2">
                  {readingError}
                </p>
                <button
                  onClick={handleStartReading}
                  className="mx-auto px-5 py-2.5 rounded-lg border border-red-800/40 bg-red-950/40 text-[10px] text-red-300 font-serif tracking-widest hover:bg-red-900/40 transition-all duration-300 cursor-pointer"
                >
                  ✦ 重新发起 MIRROR 解读 ✦
                </button>
              </div>
            )}

            {/* 自动静默保存提示 */}
            {!generating && savedJournalId && (
              <div className="w-full flex flex-col items-center gap-3.5 mb-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full max-w-sm px-6 py-2 rounded-lg bg-[#11131A]/35 border border-gold/5 text-center text-[10px] text-gold-muted/65 font-serif tracking-widest"
                >
                  ✦ 已同步并保存到您的情绪日记 ✦
                </motion.div>
                
                <div className="flex gap-3">
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
              </div>
            )}

            {/* 追问聊天对话区 */}
            {!generating && savedJournalId && (
              <div className="w-full border-t border-gold/10 pt-6 mt-2 flex flex-col gap-4">
                
                {/* 标题 */}
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
        )}

      </div>

      {showShare && serverCards.length > 0 && (
        <SharePoster
          question={question}
          mood={mood}
          mainCard={serverCards[0]}
          intuitiveSummary={parsedReading.intuitiveSummary}
          onClose={() => setShowShare(false)}
        />
      )}
    </main>
  );
}

export default function ReadingNewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#07090F] flex items-center justify-center text-gold/50 font-serif text-sm animate-pulse">
        ✦ 加载中 ✦
      </div>
    }>
      <ReadingNewContent />
    </Suspense>
  );
}
