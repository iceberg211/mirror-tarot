'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

interface ReadingSummaryCardProps {
  formattedDate: string;
  spreadName?: string;
  mood: string;
  question: string;
}

export default function ReadingSummaryCard({
  formattedDate,
  spreadName,
  mood,
  question,
}: ReadingSummaryCardProps) {
  return (
    <div className="w-full p-4 rounded-xl border border-gold/15 bg-[#0F1117]/60 flex flex-col gap-2.5 mb-6">
      <div className="flex justify-between items-center text-[10px] text-gold-muted/65 font-serif border-b border-gold/5 pb-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formattedDate}</span>
        </div>
        <span className="text-gold tracking-widest">
          {spreadName} ✦ {mood}
        </span>
      </div>
      <p className="text-xs md:text-sm text-foreground/90 font-serif leading-relaxed tracking-wide font-medium">
        “ {question} ”
      </p>
    </div>
  );
}
