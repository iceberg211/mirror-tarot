'use client';

import React from 'react';
import { motion } from 'framer-motion';
import TarotCard from '@/components/tarot/TarotCard';
import { SelectedCard, ParsedReading } from '@/lib/tarot/types';

interface DailyResultSectionProps {
  parsedReading: ParsedReading;
  drawnCard: SelectedCard;
  savedId: string | null;
  onViewReport: (id: string) => void;
  onBackToJournal: () => void;
}

export default function DailyResultSection({
  parsedReading,
  drawnCard,
  savedId,
  onViewReport,
  onBackToJournal,
}: DailyResultSectionProps) {
  return (
    <motion.div
      key="result-stage"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full flex flex-col items-center select-none"
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
            onClick={() => onViewReport(savedId)}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[#171610] via-[#2A241A] to-[#171610] border border-gold/45 text-gold text-xs font-serif tracking-widest hover:brightness-110 cursor-pointer shadow-gold-glow flex items-center justify-center"
          >
            ✦ 查看今日深层心理觉察报告 ✦
          </button>
        )}
        <button
          onClick={onBackToJournal}
          className="w-full h-11 rounded-xl border border-gold/15 bg-card/25 text-gold-muted/80 text-xs font-serif tracking-widest hover:border-gold/30 hover:bg-gold/5 cursor-pointer flex items-center justify-center"
        >
          返回我的情绪日记
        </button>
      </div>
    </motion.div>
  );
}
