'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Moon } from 'lucide-react';
import { moodConfigs } from '@/lib/tarot/moods';

interface DailySelectSectionProps {
  selectedMood: string;
  setSelectedMood: (mood: string) => void;
  pressProgress: number;
  isPressing: boolean;
  pressWarning: string;
  apiError: string;
  onPressStart: (e: React.PointerEvent) => void;
  onPressEnd: () => void;
}

export default function DailySelectSection({
  selectedMood,
  setSelectedMood,
  pressProgress,
  isPressing,
  pressWarning,
  apiError,
  onPressStart,
  onPressEnd,
}: DailySelectSectionProps) {
  const activeMood = moodConfigs.find((m) => m.id === selectedMood);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'light': return 'text-amber-400/80';
      case 'shadow': return 'text-blue-400/80';
      default: return 'text-purple-400/80';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full flex flex-col items-center justify-center select-none"
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
          {activeMood && (
            <span className={`text-[9px] font-serif tracking-wide transition-colors duration-300 ${getCategoryColor(activeMood.category)}`}>
              {activeMood.category === 'light' ? '光芒 ✦ ' :
               activeMood.category === 'shadow' ? '阴影 ✦ ' : '风暴 ✦ '}{activeMood.description}
            </span>
          )}
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
          onPointerDown={onPressStart}
          onPointerUp={onPressEnd}
          onPointerLeave={onPressEnd}
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
  );
}
