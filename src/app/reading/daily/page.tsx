'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Moon, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { useAudio } from '@/hooks/useAudio';
import { saveLocalReading } from '@/lib/db/localJournal';
import { SelectedCard, ParsedReading } from '@/lib/tarot/types';
import TarotCard from '@/components/tarot/TarotCard';
import { moodConfigs } from '@/lib/tarot/moods';
import { parseStreamingReading } from '@/lib/tarot/utils';

export default function DailyReadingPage() {
  const router = useRouter();
  const { isMuted, toggleMute, playBowl, stopBowl, playReveal, playShuffleScratch } = useAudio();

  const [step, setStep] = useState<'select' | 'press' | 'reveal' | 'result'>('select');
  const [selectedMood, setSelectedMood] = useState('calm');
  const [isPressing, setIsPressing] = useState(false);
  const [pressProgress, setPressProgress] = useState(0); // 0 到 100
  const [pressWarning, setPressWarning] = useState('');

  const [drawnCard, setDrawnCard] = useState<SelectedCard | null>(null);
  const [readingText, setReadingText] = useState('');
  const [parsedReading, setParsedReading] = useState<ParsedReading | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [interpreting, setInterpreting] = useState(false);
  const [apiError, setApiError] = useState('');

  const pressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef(0);

  const moodName = moodConfigs.find((m) => m.id === selectedMood)?.name || '平静';

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
    setReadingText('');
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
        setReadingText(text);
      }

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
            <motion.div
              key="select-stage"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full flex flex-col items-center justify-center"
            >
              <div className="text-center mb-8">
                <h2 className="text-lg font-serif text-gold font-bold tracking-widest">
                  开启晨间镜面觉察
                </h2>
                <p className="text-[10px] text-gold-muted/60 font-serif tracking-widest mt-1">
                  ✦ 感受当下的温度，寻找潜意识的声音 ✦
                </p>
              </div>

              {/* 情绪选择器 */}
              <div className="w-full mb-8 flex flex-col gap-3 items-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gold-muted/70 font-serif tracking-widest uppercase">
                    你此刻脑海中最清晰的情绪是？
                  </span>
                  {(() => {
                    const active = moodConfigs.find((m) => m.id === selectedMood);
                    if (!active) return null;
                    const colorMap = {
                      light: 'text-amber-400/80',
                      shadow: 'text-blue-400/80',
                      storm: 'text-purple-400/80'
                    };
                    return (
                      <span className={`text-[9px] font-serif tracking-wide transition-colors duration-300 ${colorMap[active.category]}`}>
                        {active.category === 'light' ? '光芒 ✦ ' :
                         active.category === 'shadow' ? '阴影 ✦ ' : '风暴 ✦ '}{active.description}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-2 px-1 max-w-full justify-start md:justify-center">
                  {moodConfigs.map((mood) => {
                    const isSelected = selectedMood === mood.id;
                    const colorClasses = 
                      mood.category === 'light' 
                        ? (isSelected ? 'border-amber-400 text-amber-400 bg-amber-950/20 shadow-[0_0_10px_rgba(251,191,36,0.25)] scale-105' : 'border-gold/15 text-gold-muted/65 bg-[#0E1017]/35 hover:border-amber-400/35')
                        : mood.category === 'shadow'
                        ? (isSelected ? 'border-blue-400 text-blue-400 bg-blue-950/20 shadow-[0_0_10px_rgba(96,165,250,0.25)] scale-105' : 'border-gold/15 text-gold-muted/65 bg-[#0E1017]/35 hover:border-blue-400/35')
                        : (isSelected ? 'border-purple-400 text-purple-400 bg-purple-950/20 shadow-[0_0_10px_rgba(192,132,252,0.25)] scale-105' : 'border-gold/15 text-gold-muted/65 bg-[#0E1017]/35 hover:border-purple-400/35');

                    return (
                      <button
                        key={mood.id}
                        onClick={() => setSelectedMood(mood.id)}
                        className={`w-10 h-10 rounded-full border text-xs font-serif transition-all duration-300 cursor-pointer outline-none flex items-center justify-center flex-shrink-0 ${colorClasses}`}
                      >
                        {mood.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 互动指纹镜面圈 */}
              <div className="relative w-56 h-56 flex items-center justify-center">
                
                {/* 环形进度条 */}
                <svg className="absolute w-full h-full rotate-[-90deg] pointer-events-none">
                  <circle
                    cx="112"
                    cy="112"
                    r="102"
                    className="stroke-gold/5 fill-none"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx="112"
                    cy="112"
                    r="102"
                    className="stroke-gold/40 fill-none"
                    strokeWidth="2.5"
                    strokeDasharray="640"
                    strokeDashoffset={640 - (pressProgress * 6.4)}
                    style={{ transition: isPressing ? 'none' : 'stroke-dashoffset 0.4s ease-out' }}
                  />
                </svg>

                {/* 镜面触控核心按钮 */}
                <motion.div
                  onPointerDown={handlePressStart}
                  onPointerUp={handlePressEnd}
                  onPointerLeave={handlePressEnd}
                  animate={{
                    scale: isPressing ? 1.15 : 1.0,
                    boxShadow: isPressing 
                      ? '0 0 30px rgba(201,167,106,0.35), inset 0 0 20px rgba(201,167,106,0.2)' 
                      : '0 0 15px rgba(201,167,106,0.08)'
                  }}
                  className="w-40 h-40 rounded-full border border-gold/25 bg-gradient-to-b from-[#0F1118] to-[#05060A] flex flex-col items-center justify-center cursor-pointer select-none active:scale-95 touch-none relative z-10"
                >
                  <Moon className={`w-8 h-8 text-gold/70 mb-2 transition-all duration-1000 ${
                    isPressing ? 'animate-spin' : 'animate-[pulse_4s_ease-in-out_infinite]'
                  }`} />
                  <span className="text-[10px] text-gold font-serif tracking-widest">
                    {isPressing ? `${Math.floor((100 - pressProgress) / 33) + 1}s...` : '长按镜面 3秒'}
                  </span>
                </motion.div>
              </div>

              {/* 异常或提醒文字 */}
              <div className="min-h-[24px] mt-6 text-center px-4">
                {pressWarning && (
                  <span className="text-[10px] text-gold font-serif tracking-wide animate-pulse">
                    {pressWarning}
                  </span>
                )}
                {apiError && (
                  <span className="text-[10px] text-red-400 font-serif tracking-wide">
                    {apiError}
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* 状态 2：抽卡揭示翻开 */}
          {step === 'reveal' && (
            <motion.div
              key="reveal-stage"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center"
            >
              <div className="mb-6 text-center">
                <span className="text-[11px] text-gold font-serif tracking-widest font-semibold uppercase">
                  ✦ 今日映射之镜已启 ✦
                </span>
                <h3 className="text-sm font-serif text-gold-muted/80 tracking-widest mt-1">
                  正在唤醒您的今日卡牌与潜意识低语
                </h3>
              </div>

              {/* 翻卡 */}
              <div className="my-6">
                {drawnCard ? (
                  <TarotCard card={drawnCard} revealed={true} size="md" interactive={false} />
                ) : (
                  <div className="w-[160px] h-[280px] rounded-xl border border-gold/15 bg-card/20 animate-pulse" />
                )}
              </div>

              {/* 动态读取文字展示 */}
              <div className="w-full max-w-sm mt-4 p-4 rounded-xl border border-gold/10 bg-[#0A0D14]/55 text-center min-h-[85px] flex items-center justify-center">
                {interpreting ? (
                  <div className="flex flex-col gap-2.5 items-center">
                    <Sparkles className="w-4 h-4 text-gold animate-spin" />
                    <p className="text-[11px] text-gold-muted/85 font-serif leading-relaxed tracking-wider px-2">
                      “ {readingText.split('# ').find(p => p.startsWith('SUMMARY'))?.replace('SUMMARY\n', '') || '正在捕捉卡牌能量，织就属于您的晨间低语...'} ”
                    </p>
                  </div>
                ) : (
                  <span className="text-[10px] text-gold-muted/40 font-serif animate-pulse">
                    正在连通阿卡西场...
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* 状态 3：展示低语结果 */}
          {step === 'result' && parsedReading && drawnCard && (
            <motion.div
              key="result-stage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full flex flex-col items-center"
            >
              {/* 今日卡牌和低语卡片 */}
              <div className="w-full p-5 rounded-2xl border border-gold/20 bg-gradient-to-b from-[#0C0F16] to-[#05060A] shadow-gold-glow flex flex-col items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

                <div className="text-center">
                  <span className="text-[9px] text-gold font-mono tracking-widest border border-gold/20 px-2 py-0.5 rounded-full uppercase">
                    Today&apos;s Affirmation
                  </span>
                  <h3 className="text-sm font-serif text-gold-muted/80 tracking-widest mt-2.5">
                    今日镜面低语
                  </h3>
                </div>

                {/* 镜面金句低语 - 放大字号，居中排版 */}
                <p className="text-sm md:text-base font-serif text-gold font-medium leading-relaxed tracking-wider italic text-center px-2 filter drop-shadow-[0_0_3px_rgba(201,167,106,0.15)]">
                  “ {parsedReading.intuitiveSummary} ”
                </p>

                {/* 卡牌与牌名 */}
                <div className="flex flex-col items-center gap-2 mt-2">
                  <TarotCard card={drawnCard} revealed={true} size="sm" interactive={false} />
                  <div className="text-center mt-1">
                    <span className="text-xs font-serif text-gold tracking-widest">
                      {drawnCard.zhName} ✦ {drawnCard.orientation === 'reversed' ? '逆位' : '正位'}
                    </span>
                    <p className="text-[9px] text-gold-muted/50 font-mono tracking-widest mt-0.5">
                      {drawnCard.name.toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* 今日行动微建议 */}
                {parsedReading.actionAdvice && (
                  <div className="w-full border-t border-gold/5 pt-4 mt-1 flex flex-col gap-1.5 text-center">
                    <span className="text-[9px] text-gold-muted/60 font-serif tracking-widest">
                      ✦ 今日正念微行动 ✦
                    </span>
                    <p className="text-xs text-foreground/80 font-serif leading-relaxed px-4">
                      {parsedReading.actionAdvice}
                    </p>
                  </div>
                )}
              </div>

              {/* 动作按钮区 */}
              <div className="w-full flex flex-col gap-3 mt-8">
                {savedId && (
                  <button
                    onClick={() => router.push(`/reading/${savedId}`)}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-[#171610] via-[#2A241A] to-[#171610] border border-gold/45 text-gold text-xs font-serif tracking-widest hover:brightness-110 cursor-pointer shadow-gold-glow flex items-center justify-center"
                  >
                    ✦ 查看今日深层心理觉察报告 ✦
                  </button>
                )}
                <button
                  onClick={() => router.push('/journal')}
                  className="w-full h-11 rounded-xl border border-gold/15 bg-card/25 text-gold-muted/80 text-xs font-serif tracking-widest hover:border-gold/30 hover:bg-gold/5 cursor-pointer flex items-center justify-center"
                >
                  返回我的情绪日记
                </button>
              </div>
            </motion.div>
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
