'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CardDeck from '@/components/tarot/CardDeck';
import TarotCard from '@/components/tarot/TarotCard';
import { SelectedCard, ParsedReading, SpreadType } from '@/lib/tarot/types';
import { getSpreadByType } from '@/lib/tarot/spreads';
import { saveLocalReading } from '@/lib/db/localJournal';
import { getTodayMoonPhase, getMoonSvgPath } from '@/lib/tarot/moonPhase';
import { useAudio } from '@/hooks/useAudio';

function ReadingNewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const question = searchParams.get('question') || '';
  const mood = searchParams.get('mood') || '平静';
  const spreadType = (searchParams.get('spreadType') || 'three_cards') as SpreadType;

  const spread = getSpreadByType(spreadType);
  const moonPhase = getTodayMoonPhase();

  // 状态机步骤: 'draw' (抽牌中) | 'reveal' (点击翻开卡片)
  const [step, setStep] = useState<'draw' | 'reveal'>('draw');
  
  // 服务端预抽的真实牌
  const [serverCards, setServerCards] = useState<SelectedCard[]>([]);
  
  // 翻卡状态记录
  const [revealedStates, setRevealedStates] = useState<Record<number, boolean>>({});
  const [allRevealed, setAllRevealed] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // 引入音效
  const { stopElementAmbient } = useAudio();

  // 页面卸载时安全停止元素音效
  useEffect(() => {
    return () => {
      stopElementAmbient();
    };
  }, [stopElementAmbient]);

  // 页面加载时：如果 sessionStorage 中有当前的抽牌缓存，则直接恢复
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cached = sessionStorage.getItem('mirror_tarot_session');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (
          parsed.question === question &&
          parsed.mood === mood &&
          parsed.spreadType === spreadType
        ) {
          // 异步触发以规避 react-hooks/set-state-in-effect 报错警告
          setTimeout(() => {
            if (parsed.serverCards && parsed.serverCards.length > 0) {
              setServerCards(parsed.serverCards);
            }
            if (parsed.revealedStates) {
              setRevealedStates(parsed.revealedStates);
              const totalPositions = spread?.positions.length || 0;
              const isAllRev = Object.keys(parsed.revealedStates).length === totalPositions && totalPositions > 0;
              setAllRevealed(isAllRev);
            }
            if (parsed.step === 'draw' || parsed.step === 'reveal') {
              setStep(parsed.step);
            }
          }, 0);
          return; // 已恢复，跳过预抽
        }
      }
    } catch (e) {
      console.error('Failed to restore session from sessionStorage:', e);
    }

    // 无缓存时，静默调用 draw API
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
  }, [spreadType, question, mood, spread]);

  // 抽牌状态更新时：同步到 sessionStorage 缓存
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (serverCards.length === 0) return;
    try {
      const sessionData = {
        question,
        mood,
        spreadType,
        serverCards,
        revealedStates,
        step,
      };
      sessionStorage.setItem('mirror_tarot_session', JSON.stringify(sessionData));
    } catch (e) {
      console.error('Failed to save session to sessionStorage:', e);
    }
  }, [question, mood, spreadType, serverCards, revealedStates, step]);

  // 抽牌完毕回调
  const handleDrawComplete = () => {
    setTimeout(() => {
      setStep('reveal');
    }, 800);
  };

  // 点击翻开某张牌
  const handleRevealCard = (index: number) => {
    const newRevealed = { ...revealedStates, [index]: true };
    setRevealedStates(newRevealed);

    if (Object.keys(newRevealed).length === (spread?.positions.length || 0)) {
      setAllRevealed(true);
    }
  };

  // 用户点击“开启 MIRROR 情绪解读”触发跳转与生成
  const handleStartReading = () => {
    if (serverCards.length === 0) return;
    setSaveError(null);

    // 清理当前页面的抽卡 session 缓存
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('mirror_tarot_session');
    }

    const defaultSuggestions = [
      '结合我的感情问题解释',
      '结合我的职业问题解释',
      '我是不是在自欺欺人？',
      '给我一个更现实的建议',
      '这组牌的反面提醒是什么？',
    ];

    // 保存空白占位符日记记录，AI 解读详情在 [id]/page.tsx 中完成流式输出
    const emptyReading: ParsedReading = {
      questionSummary: '',
      intuitiveSummary: '',
      cardReadings: serverCards.map((c) => ({
        positionName: c.positionName,
        cardName: c.name,
        cardZhName: c.zhName,
        orientation: c.orientation,
        interpretation: '等待解读开始...',
      })),
      contradiction: '',
      overlookedFactor: '',
      actionAdvice: '',
      gentleReminder: '',
      followUpSuggestions: defaultSuggestions,
    };

    const journalId = saveLocalReading(question, mood, spreadType, serverCards, emptyReading);
    if (journalId) {
      router.push(`/reading/${journalId}?trigger=true`);
    } else {
      setSaveError('保存情绪日记失败，请确保本地存储可用且未满。');
    }
  };

  return (
    <main className="flex-grow min-h-screen pb-28 flex flex-col items-center text-foreground relative overflow-y-auto transition-colors duration-1000 bg-[#07090F]">
      {/* 专属背景发光圈 */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-radial-gradient from-gold/5 via-transparent to-transparent" />
      
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
        <div className="w-9 h-9 opacity-0" />
      </div>

      <div className="w-full max-w-md px-6 flex-1 flex flex-col justify-start items-center my-4 z-10">
        
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
                {allRevealed && (
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

            {saveError && (
              <p className="text-xs text-red-400 font-serif mt-2 animate-pulse">{saveError}</p>
            )}
          </div>
        )}

      </div>
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
