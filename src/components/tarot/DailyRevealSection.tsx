'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import TarotCard from '@/components/tarot/TarotCard';
import { SelectedCard } from '@/lib/tarot/types';

interface DailyRevealSectionProps {
  drawnCard: SelectedCard | null;
  interpreting: boolean;
  streamingSummary: string | undefined;
}

export default function DailyRevealSection({
  drawnCard,
  interpreting,
  streamingSummary,
}: DailyRevealSectionProps) {
  return (
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
              “ {streamingSummary || '正在捕捉卡牌能量，织就属于您的晨间低语...'} ”
            </p>
          </div>
        ) : (
          <span className="text-[10px] text-gold-muted/40 font-serif animate-pulse">
            正在连通阿卡西场...
          </span>
        )}
      </div>
    </motion.div>
  );
}
