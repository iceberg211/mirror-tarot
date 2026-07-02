'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { useAudio } from '@/hooks/useAudio';
import { saveLocalReading } from '@/lib/db/localJournal';
import { SelectedCard, ParsedReading } from '@/lib/tarot/types';
import { moodConfigs } from '@/lib/tarot/moods';
import { parseStreamingReading } from '@/lib/tarot/utils';
import { useThrottledStreamText } from '@/hooks/useThrottledStreamText';
import DailySelectSection from '@/components/tarot/DailySelectSection';
import DailyRevealSection from '@/components/tarot/DailyRevealSection';
import DailyResultSection from '@/components/tarot/DailyResultSection';

export default function DailyReadingPage() {
  const router = useRouter();
  const { isMuted, toggleMute, playBowl, stopBowl, playReveal, playShuffleScratch } = useAudio();

  const [step, setStep] = useState<'select' | 'press' | 'reveal' | 'result'>('select');
  const [selectedMood, setSelectedMood] = useState('calm');
  const [isPressing, setIsPressing] = useState(false);
  const [pressProgress, setPressProgress] = useState(0); // 0 到 100
  const [pressWarning, setPressWarning] = useState('');

  const [drawnCard, setDrawnCard] = useState<SelectedCard | null>(null);
  const {
    text: readingText,
    reset: resetReadingText,
    append: appendReadingText,
    setImmediateText: setReadingTextImmediate,
  } = useThrottledStreamText(80);
  const [parsedReading, setParsedReading] = useState<ParsedReading | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [interpreting, setInterpreting] = useState(false);
  const [apiError, setApiError] = useState('');

  const pressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef(0);

  const moodName = moodConfigs.find((m) => m.id === selectedMood)?.name || '平静';
  const streamingSummary = useMemo(() => {
    return readingText
      .split('# ')
      .find((part) => part.startsWith('SUMMARY'))
      ?.replace('SUMMARY\n', '')
      .trim();
  }, [readingText]);

  // 1. 长按手势处理
  const handlePressStart = (e: React.PointerEvent) => {
    e.preventDefault();
    if (step !== 'select') return;
    
    setIsPressing(true);
    setPressProgress(0);
    setPressWarning('');
    progressRef.current = 0;

    playBowl();

    pressIntervalRef.current = setInterval(() => {
      progressRef.current += 1.5; // 大约 2.2 秒内满格 (100)
      
      // 随机发出细小的洗牌刮擦沙沙声，丰富物理触摸反馈
      if (Math.random() > 0.8) {
        playShuffleScratch(0.015);
      }

      if (progressRef.current >= 100) {
        setPressProgress(100);
        handlePressComplete();
      } else {
        setPressProgress(Math.floor(progressRef.current));
      }
    }, 30);
  };

  const handlePressEnd = () => {
    if (pressIntervalRef.current) {
      clearInterval(pressIntervalRef.current);
      pressIntervalRef.current = null;
    }
    
    stopBowl();
    setIsPressing(false);

    if (progressRef.current < 100 && step === 'select') {
      setPressProgress(0);
      progressRef.current = 0;
      setPressWarning('请保持长按镜面以唤醒潜意识连接...');
    }
  };

  // 2. 达到长按阈值触发抽牌
  const handlePressComplete = async () => {
    if (pressIntervalRef.current) {
      clearInterval(pressIntervalRef.current);
      pressIntervalRef.current = null;
    }
    stopBowl();
    setIsPressing(false);
    setStep('reveal');

    try {
      // 抽今日运势单牌
      const drawRes = await fetch('/api/reading/draw?spreadType=one_card');
      const drawData = await drawRes.json();
      if (!drawData.success || !drawData.cards || drawData.cards.length === 0) {
        throw new Error(drawData.error || '抽牌失败，请稍后重试');
      }

      const card = drawData.cards[0];
      setDrawnCard(card);
      
      // 触发卡牌翻开音效
      playReveal();

      // 进入大模型解读生成
      await handleGenerateReading(card);

    } catch (err) {
      console.error('Daily draw failed:', err);
      setApiError(err instanceof Error ? err.message : '抽取今日运势卡牌失败');
      setStep('select');
    }
  };

  // 3. 产生 AI 今日低语流式解读
  const handleGenerateReading = async (card: SelectedCard) => {
    setInterpreting(true);
    resetReadingText('');
    setApiError('');

    try {
      const response = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: '每日镜面低语',
          mood: moodName,
          spreadType: 'one_card',
          cards: [card],
        }),
      });

      if (!response.ok) {
        throw new Error(`AI 请求失败 (HTTP ${response.status})`);
      }

      if (!response.body) throw new Error('流式通道未就绪');

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

      const finalParsed = parseStreamingReading(text, 1);
      setParsedReading(finalParsed);

      // 自动保存到本地情绪日记
      const readingId = saveLocalReading(
        '每日镜面低语',
        moodName,
        'one_card',
        [card],
        finalParsed
      );

      setSavedId(readingId);
      setStep('result');
    } catch (err) {
      console.error('AI Interpretation failed:', err);
      setApiError(err instanceof Error ? err.message : '唤醒今日镜面低语失败，请重试');
    } finally {
      setInterpreting(false);
    }
  };

  // 4. 清理 Timer
  useEffect(() => {
    return () => {
      if (pressIntervalRef.current) clearInterval(pressIntervalRef.current);
      stopBowl();
    };
  }, [stopBowl]);

  return (
    <main className="min-h-screen pb-24 bg-[#05060A] text-foreground flex flex-col items-center justify-between relative overflow-y-auto select-none">
      
      {/* 背景发光微光特效 */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-radial-gradient from-gold/5 via-transparent to-transparent pointer-events-none z-0" />
      
      {/* 顶部 Header */}
      <div className="w-full max-w-md px-6 pt-6 flex justify-between items-center z-10">
        <button
          onClick={() => router.push('/')}
          className="w-9 h-9 rounded-full border border-gold/15 bg-card/40 flex items-center justify-center text-gold/85 hover:border-gold/35 cursor-pointer transition-all duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono tracking-[0.25em] text-gold-muted/80 uppercase">
          镜面低语 ✦ Daily Whisper
        </span>
        <button
          onClick={toggleMute}
          className="w-9 h-9 rounded-full border border-gold/15 bg-card/40 flex items-center justify-center text-gold/85 hover:border-gold/35 cursor-pointer transition-all duration-300"
        >
          {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
        </button>
      </div>

      <div className="w-full max-w-md px-6 flex-1 flex flex-col items-center justify-center z-10 py-6">
        <AnimatePresence mode="wait">
          
          {/* 状态 1：选择情绪 & 长按激活 */}
          {step === 'select' && (
            <DailySelectSection
              selectedMood={selectedMood}
              setSelectedMood={setSelectedMood}
              pressProgress={pressProgress}
              isPressing={isPressing}
              pressWarning={pressWarning}
              apiError={apiError}
              onPressStart={handlePressStart}
              onPressEnd={handlePressEnd}
            />
          )}

          {/* 状态 2：抽卡揭示翻开 */}
          {step === 'reveal' && (
            <DailyRevealSection
              drawnCard={drawnCard}
              interpreting={interpreting}
              streamingSummary={streamingSummary}
            />
          )}

          {/* 状态 3：展示低语结果 */}
          {step === 'result' && parsedReading && drawnCard && (
            <DailyResultSection
              parsedReading={parsedReading}
              drawnCard={drawnCard}
              savedId={savedId}
              onViewReport={(id) => router.push(`/reading/${id}`)}
              onBackToJournal={() => router.push('/journal')}
            />
          )}

        </AnimatePresence>
      </div>

      {/* 底部版权声明 */}
      <div className="w-full max-w-md px-6 text-center text-[9px] text-gold-muted/30 font-mono tracking-widest mt-4">
        MIRROR TAROT IS A SELF-EXPLORATION COMPANION
      </div>
    </main>
  );
}
