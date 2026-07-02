'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import TarotCard from '@/components/tarot/TarotCard';
import { SelectedCard } from '@/lib/tarot/types';

interface RevealCardSectionProps {
  serverCards: SelectedCard[];
  revealedStates: Record<number, boolean>;
  allRevealed: boolean;
  saveError: string | null;
  onRevealAll: () => void;
  onRevealCard: (index: number) => void;
  onStartReading: () => void;
}

export default function RevealCardSection({
  serverCards,
  revealedStates,
  allRevealed,
  saveError,
  onRevealAll,
  onRevealCard,
  onStartReading,
}: RevealCardSectionProps) {
  return (
    <div className="w-full flex-grow flex flex-col justify-between items-center py-6">
      <div className="text-center mb-6 flex flex-col items-center gap-2">
        <h2 className="text-xs text-gold font-serif tracking-widest animate-pulse font-semibold">
          ✦ 依次翻开卡牌，建立心灵映射 ✦
        </h2>
        {!allRevealed && (
          <button
            type="button"
            onClick={onRevealAll}
            className="mt-1 text-[9px] text-gold-muted/65 hover:text-gold font-serif tracking-widest border border-gold/12 hover:border-gold/30 bg-gold/5 hover:bg-gold/8 px-2.5 py-1 rounded-full transition-all duration-300 cursor-pointer"
          >
            ✦ 一键快速翻开 ✦
          </button>
        )}
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
                onClick={() => onRevealCard(idx)}
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
              onClick={onStartReading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#171610] via-[#2E281C] to-[#171610] border border-gold text-gold text-sm font-serif font-semibold tracking-[0.25em] shadow-gold-glow flex items-center justify-center gap-2 cursor-pointer transition-all hover:brightness-110"
            >
              <Sparkles className="w-4 h-4" />
              <span>生成本次解读</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {saveError && (
        <p className="text-xs text-red-400 font-serif mt-2 animate-pulse">{saveError}</p>
      )}
    </div>
  );
}
