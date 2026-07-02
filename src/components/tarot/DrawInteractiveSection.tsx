'use client';

import React from 'react';
import { getMoonSvgPath } from '@/lib/tarot/moonPhase';
import CardDeck from '@/components/tarot/CardDeck';

interface DrawInteractiveSectionProps {
  moonPhase: {
    name: string;
    percent: number;
    iconType: string;
    advice: string;
  };
  spread: {
    positions: string[];
    name: string;
  } | null | undefined;
  onDrawComplete: () => void;
}

export default function DrawInteractiveSection({
  moonPhase,
  spread,
  onDrawComplete,
}: DrawInteractiveSectionProps) {
  return (
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
          onComplete={onDrawComplete}
        />
      )}
    </div>
  );
}
