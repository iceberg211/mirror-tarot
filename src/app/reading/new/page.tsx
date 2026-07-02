'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SelectedCard, ParsedReading, SpreadType } from '@/lib/tarot/types';
import { getSpreadByType } from '@/lib/tarot/spreads';
import { saveLocalReading } from '@/lib/db/localJournal';
import { getTodayMoonPhase } from '@/lib/tarot/moonPhase';
import { useAudio } from '@/hooks/useAudio';
import { buildFollowUpSuggestions } from '@/lib/tarot/utils';
import DrawInteractiveSection from '@/components/tarot/DrawInteractiveSection';
import RevealCardSection from '@/components/tarot/RevealCardSection';

function ReadingNewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const question = searchParams.get('question') || '';
  const mood = searchParams.get('mood') || '平静';
  const spreadType = (searchParams.get('spreadType') || 'three_cards') as SpreadType;
  const isDream = searchParams.get('isDream') === 'true';
  const readingStyle = searchParams.get('readingStyle') || 'gentle';
  const recentMoodState = (searchParams.get('recentMoodState') || undefined) as 'shadow' | 'storm' | undefined;

  const dreamAnalysis = searchParams.get('dreamAnalysis') || '';
  const dreamMetaphor = searchParams.get('dreamMetaphor') || '';
  const dreamQuestion = searchParams.get('dreamQuestion') || '';

  const customPosString = searchParams.get('customPositions') || '';
  const customPositions = useMemo(
    () => customPosString
      ? customPosString.split(',').map((position) => position.trim()).filter(Boolean)
      : [],
    [customPosString]
  );

  const spread = useMemo(() => (
    spreadType === 'custom'
      ? {
          type: 'custom' as SpreadType,
          name: '自定义牌阵',
          positions: customPositions.length > 0 ? customPositions : ['我的问题'],
          description: '自己命名每张牌的位置，按你关心的角度来抽牌。'
        }
      : getSpreadByType(spreadType)
  ), [customPositions, spreadType]);
  const positionCount = spread?.positions.length || 0;
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
          parsed.spreadType === spreadType &&
          (spreadType !== 'custom' || parsed.customPosString === customPosString)
        ) {
          // 异步触发以规避 react-hooks/set-state-in-effect 报错警告
          setTimeout(() => {
            if (parsed.serverCards && parsed.serverCards.length > 0) {
              setServerCards(parsed.serverCards);
            }
            if (parsed.revealedStates) {
              setRevealedStates(parsed.revealedStates);
              const isAllRev = Object.keys(parsed.revealedStates).length === positionCount && positionCount > 0;
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
        const params = new URLSearchParams({ spreadType });
        if (spreadType === 'custom' && customPosString) {
          params.set('customPositions', customPosString);
        }
        const res = await fetch(`/api/reading/draw?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setServerCards(data.cards);
        }
      } catch (err) {
        console.error('Failed to pre-draw cards:', err);
      }
    }
    initDraw();
  }, [spreadType, customPosString, question, mood, positionCount]);

  // 抽牌状态更新时：同步到 sessionStorage 缓存
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (serverCards.length === 0) return;
    try {
      const sessionData = {
        question,
        mood,
        spreadType,
        customPosString,
        serverCards,
        revealedStates,
        step,
      };
      sessionStorage.setItem('mirror_tarot_session', JSON.stringify(sessionData));
    } catch (e) {
      console.error('Failed to save session to sessionStorage:', e);
    }
  }, [question, mood, spreadType, customPosString, serverCards, revealedStates, step]);

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

    if (Object.keys(newRevealed).length === positionCount) {
      setAllRevealed(true);
    }
  };

  // 一键依次快速翻开所有卡牌
  const handleRevealAll = () => {
    if (serverCards.length === 0) return;
    serverCards.forEach((_, idx) => {
      setTimeout(() => {
        setRevealedStates((prev) => {
          const next = { ...prev, [idx]: true };
          if (Object.keys(next).length === positionCount) {
            setAllRevealed(true);
          }
          return next;
        });
      }, idx * 150);
    });
  };

  // 用户点击“生成解读”后保存记录并跳转
  const handleStartReading = () => {
    if (serverCards.length === 0) return;
    setSaveError(null);

    // 清理当前页面的抽卡 session 缓存
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('mirror_tarot_session');
    }

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
      followUpSuggestions: buildFollowUpSuggestions({
        question,
        spreadType,
        cards: serverCards,
      }),
    };

    const dreamContext = isDream && dreamAnalysis
      ? {
          analysis: dreamAnalysis,
          metaphor: dreamMetaphor,
          sourceQuestion: dreamQuestion,
        }
      : undefined;

    const journalId = saveLocalReading(
      question,
      mood,
      spreadType,
      serverCards,
      emptyReading,
      isDream,
      readingStyle,
      dreamContext,
      recentMoodState
    );
    if (journalId) {
      router.push(`/reading/${journalId}?trigger=true&readingStyle=${readingStyle}`);
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
          <DrawInteractiveSection
            moonPhase={moonPhase}
            spread={spread || null}
            onDrawComplete={handleDrawComplete}
          />
        )}

        {/* 2. 状态：翻开揭示卡牌 */}
        {step === 'reveal' && (
          <RevealCardSection
            serverCards={serverCards}
            revealedStates={revealedStates}
            allRevealed={allRevealed}
            saveError={saveError}
            onRevealAll={handleRevealAll}
            onRevealCard={handleRevealCard}
            onStartReading={handleStartReading}
          />
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
