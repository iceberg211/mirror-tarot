'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight } from 'lucide-react';
import { JournalEntry } from '@/lib/db/localJournal';
import { spreads } from '@/lib/tarot/spreads';

interface JournalListItemProps {
  entry: JournalEntry;
  privacyMode?: boolean;
}

export default function JournalListItem({ entry, privacyMode = false }: JournalListItemProps) {
  const spreadInfo = spreads[entry.spreadType];
  const dateStr = new Date(entry.createdAt).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      href={`/reading/${entry.id}`}
      className="w-full border-b border-gold/10 py-4 flex justify-between items-center gap-4 transition-all duration-300 group cursor-pointer hover:border-gold/24"
    >
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        {/* 顶部元数据 */}
        <div className="flex items-center gap-2 text-[9px] text-gold-muted/65 font-serif">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gold-muted/50" />
            {dateStr}
          </span>
          <span>•</span>
          <span className="text-gold tracking-widest">{spreadInfo?.name}</span>
          <span>•</span>
          <span className="text-gold-muted">{entry.mood}</span>
          {entry.isDream && (
            <>
              <span>•</span>
              <span className="text-blue-300/90 font-medium px-1.5 py-0.5 rounded-full bg-blue-950/15 border border-blue-900/20 scale-95 font-sans">
                梦境 ✦ Dream
              </span>
            </>
          )}
        </div>

        {/* 问题摘要 */}
        <h3 className={`text-sm text-foreground/90 font-serif leading-relaxed truncate transition-all duration-300 ${
          privacyMode ? 'blur-[4.5px] select-none opacity-40 pointer-events-none' : ''
        }`}>
          {entry.question}
        </h3>

        {/* AI解读引言 */}
        <p className={`text-[11px] text-gold-muted/70 font-serif italic line-clamp-1 transition-all duration-300 ${
          privacyMode ? 'blur-[4.5px] select-none opacity-40 pointer-events-none' : ''
        }`}>
          {entry.reading.intuitiveSummary || '等待情绪解读激活中...'}
        </p>
      </div>

      {/* 右侧微缩卡牌占位 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex -space-x-2.5">
          {entry.cards.slice(0, 3).map((card, idx) => (
            <div
              key={card.id}
              style={{ zIndex: idx }}
              className="w-7 h-11 rounded-sm border border-gold/25 overflow-hidden bg-[#090B11] flex items-center justify-center relative"
            >
              <div className="absolute inset-0.5 border border-gold/10 rounded-sm" />
              <span className="text-[8px] font-serif text-gold/35 scale-90">
                {card.zhName.charAt(0)}
              </span>
            </div>
          ))}
        </div>
        <ChevronRight className="w-4 h-4 text-gold-muted/40 group-hover:text-gold group-hover:translate-x-0.5 transition-all duration-300" />
      </div>
    </Link>
  );
}
