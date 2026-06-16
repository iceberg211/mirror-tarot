'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Compass, HelpCircle, Eye, Sparkles, AlertCircle, Moon } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import { spreads } from '@/lib/tarot/spreads';
import { SpreadType } from '@/lib/tarot/types';
import { getTodayMoonPhase, getMoonSvgPath } from '@/lib/tarot/moonPhase';

// 情绪配置列表
const moods = [
  { id: 'confused', name: '迷茫', label: '迷' },
  { id: 'anxious', name: '焦虑', label: '虑' },
  { id: 'expectant', name: '期待', label: '期' },
  { id: 'calm', name: '平静', label: '静' },
  { id: 'sad', name: '难过', label: '难' },
  { id: 'tangled', name: '纠结', label: '纠' },
];

export default function HomePage() {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [selectedMood, setSelectedMood] = useState('confused');
  const [selectedSpread, setSelectedSpread] = useState<SpreadType>('three_cards');
  const [error, setError] = useState('');

  const moonPhase = getTodayMoonPhase();

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setError('把您当下的困惑写下来，卡牌才能为您指明方向……');
      return;
    }
    setError('');
    
    // 携带参数跳转到抽牌交互页面
    const params = new URLSearchParams({
      question: question.trim(),
      mood: moods.find((m) => m.id === selectedMood)?.name || '平静',
      spreadType: selectedSpread,
    });
    router.push(`/reading/new?${params.toString()}`);
  };

  return (
    <main className="flex-1 min-h-screen pb-24 flex flex-col justify-between items-center text-foreground relative overflow-y-auto">
      {/* 装饰星体 */}
      <div className="absolute top-12 left-10 w-24 h-24 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
      <div className="absolute top-48 right-12 w-36 h-36 rounded-full bg-[#1A1F35]/30 blur-3xl pointer-events-none" />

      {/* 1. 顶部 Header / Brand */}
      <div className="w-full max-w-md px-6 pt-12 flex flex-col items-center text-center">
        {/* 顶部个人图标或精致Logo装饰 */}
        <div className="w-12 h-12 rounded-full border border-gold/35 flex items-center justify-center mb-6 shadow-gold-glow">
          <Moon className="w-5 h-5 text-gold animate-[pulse_3s_ease-in-out_infinite]" />
        </div>
        
        <h1 className="text-3xl font-serif tracking-widest text-gold font-bold filter drop-shadow-[0_0_10px_rgba(201,167,106,0.35)]">
          Mirror Tarot
        </h1>
        <p className="text-[11px] text-gold-muted/80 font-mono tracking-[0.2em] uppercase mt-2">
          Ask the card. Meet yourself.
        </p>
        <p className="text-xs text-gold/60 font-serif tracking-widest mt-2">
          问牌，也是问自己。
        </p>
      </div>

      {/* 今日月影星象指引 */}
      <div className="w-full max-w-md px-6 mt-2 mb-2">
        <div className="w-full p-4 rounded-2xl border border-gold/15 bg-[#0F1117]/60 flex items-center gap-4 shadow-gold-glow">
          <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#11131E] to-[#08090E] border border-gold/10 flex items-center justify-center relative overflow-hidden flex-shrink-0">
            <div className="absolute inset-1 rounded-full bg-gold/5 blur-[2px]" />
            <svg viewBox="0 0 100 100" className="w-8 h-8 text-gold/80 drop-shadow-[0_0_8px_rgba(201,167,106,0.5)]">
              <circle cx="50" cy="50" r="38" className="fill-[#1A1F30]/40 stroke-none" />
              <path
                d={getMoonSvgPath(moonPhase.iconType, moonPhase.percent)}
                className="fill-gold stroke-none"
              />
            </svg>
          </div>

          <div className="flex-grow flex flex-col gap-0.5">
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-gold-muted/70 font-mono tracking-widest uppercase">
                LUNAR SIGN ✦ {moonPhase.illustration}
              </span>
              <span className="text-[8px] text-gold font-mono border border-gold/15 px-1.5 py-0.5 rounded-full">
                {moonPhase.percent}% 明度
              </span>
            </div>
            <h3 className="text-xs font-serif text-gold font-semibold tracking-widest">
              {moonPhase.name}
            </h3>
            <p className="text-[9px] text-foreground/85 font-serif leading-relaxed tracking-wide mt-1">
              {moonPhase.advice}
            </p>
          </div>
        </div>
      </div>

      {/* 2. 主表单域 */}
      <form onSubmit={handleStart} className="w-full max-w-md px-6 flex-1 flex flex-col justify-center gap-6 my-6">
        
        {/* 问题输入卡片 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gold-muted font-serif tracking-widest pl-1">
            今天你想问什么？
          </label>
          <div className="relative rounded-2xl border border-gold/25 bg-card/60 p-4 shadow-gold-glow focus-within:border-gold-focus transition-all duration-300">
            <textarea
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                if (error) setError('');
              }}
              placeholder="把你现在的困惑写下来……"
              className="w-full h-24 bg-transparent outline-none border-none text-sm text-foreground/90 font-serif tracking-wide placeholder:text-gold-muted/40 resize-none no-scrollbar leading-relaxed"
              maxLength={400}
            />
            {/* 右下角的水晶球点缀 */}
            <div className="absolute bottom-3 right-3 flex items-center justify-center text-gold/45">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] text-red-400 flex items-center gap-1.5 pl-1"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </div>

        {/* 情绪选择器 (横向滑动) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gold-muted font-serif tracking-widest pl-1">
            你现在的感受是？
          </label>
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 px-1">
            {moods.map((mood) => {
              const isSelected = selectedMood === mood.id;
              return (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => setSelectedMood(mood.id)}
                  className="flex flex-col items-center gap-2 cursor-pointer outline-none select-none flex-shrink-0"
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center border text-xs font-serif font-medium transition-all duration-300 ${
                      isSelected
                        ? 'border-gold text-gold bg-[#1F1E19]/60 scale-105 shadow-gold-glow'
                        : 'border-gold/15 text-gold-muted/70 bg-[#0E1017]/40 hover:border-gold/40'
                    }`}
                  >
                    {mood.label}
                  </div>
                  <span
                    className={`text-[10px] tracking-wider font-serif ${
                      isSelected ? 'text-gold font-medium' : 'text-gold-muted/60'
                    }`}
                  >
                    {mood.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 牌阵选择器 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gold-muted font-serif tracking-widest pl-1">
            选择牌阵
          </label>
          <div className="grid grid-cols-2 gap-3.5">
            {(Object.keys(spreads) as SpreadType[]).map((type) => {
              const spread = spreads[type];
              const isSelected = selectedSpread === type;

              // 构建精巧的简易排布图占位符
              const slotCount = spread.positions.length;
              const slotsArray = Array.from({ length: slotCount });

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedSpread(type)}
                  className={`relative rounded-xl p-3 text-left border flex flex-col justify-between transition-all duration-300 cursor-pointer outline-none min-h-[105px] ${
                    isSelected
                      ? 'border-gold bg-[#151720]/75 shadow-gold-glow'
                      : 'border-gold/15 bg-[#0F1118]/50 hover:border-gold/30 hover:bg-[#12141D]/60'
                  }`}
                >
                  <div className="flex flex-col">
                    <span
                      className={`text-xs font-serif font-semibold tracking-wider ${
                        isSelected ? 'text-gold' : 'text-foreground/80'
                      }`}
                    >
                      {spread.name}
                    </span>
                    <span className="text-[9px] text-gold-muted/60 font-serif tracking-widest mt-0.5">
                      {spread.positions.join(' / ')}
                    </span>
                  </div>

                  {/* 牌阵迷你卡牌槽位排布图 */}
                  <div className="flex gap-1 mt-3.5">
                    {slotsArray.map((_, i) => (
                      <div
                        key={i}
                        className={`w-3.5 h-6 rounded-sm border ${
                          isSelected ? 'border-gold/50 bg-gold/5' : 'border-gold/20 bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 触发抽牌按钮 */}
        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          className="w-full h-12 rounded-xl mt-4 bg-gradient-to-r from-[#171610] via-[#2E281C] to-[#171610] border border-gold text-gold text-sm font-serif font-semibold tracking-[0.25em] shadow-gold-glow flex items-center justify-center cursor-pointer transition-all hover:brightness-110"
        >
          ✦ 开始抽牌 ✦
        </motion.button>

      </form>

      {/* 底部版权及描述声明 */}
      <div className="w-full max-w-md px-6 text-center text-[9px] text-gold-muted/40 font-mono tracking-widest my-4">
        MIRROR TAROT IS A SELF-EXPLORATION COMPANION
      </div>

      {/* 全局底部导航 */}
      <BottomNav />
    </main>
  );
}
