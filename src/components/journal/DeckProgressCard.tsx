'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import { JournalEntry } from '@/lib/db/types';

interface DeckProgressCardProps {
  entries: JournalEntry[];
}

export default function DeckProgressCard({ entries }: DeckProgressCardProps) {
  const router = useRouter();

  // 统计已见过的卡牌去重数量
  const seenCount = useMemo(() => {
    const seenSet = new Set<string>();
    entries.forEach((entry) => {
      if (Array.isArray(entry.cards)) {
        entry.cards.forEach((card) => {
          if (card?.id) seenSet.add(card.id);
        });
      }
    });
    return seenSet.size;
  }, [entries]);

  const percentage = Math.min(100, Math.round((seenCount / 78) * 100));

  return (
    <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-[#161510]/80 via-[#10121A]/70 to-[#0A0B10]/80 p-5 shadow-gold-glow relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-gold shadow-gold-glow">
            <BookOpen className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-serif font-bold tracking-widest text-gold">
              人生之镜 · 78张牌义图鉴
            </h3>
            <p className="text-[10px] font-mono tracking-wider text-gold-muted/60 uppercase mt-0.5">
              Tarot Deck Encyclopedia & Collection
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-gold bg-gold/10 px-2.5 py-1 rounded-full border border-gold/20">
          {seenCount} / 78
        </span>
      </div>

      <p className="mt-3 text-xs font-serif leading-relaxed text-foreground/80 tracking-wide">
        每抽到一张新牌，都将点亮潜意识的一面棱镜。查阅大/小阿卡纳正逆位象征、四元素映射与原型解读。
      </p>

      {/* 收集进度条 */}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-gold/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold/60 to-gold rounded-full transition-all duration-700"
            style={{ width: `${Math.max(4, percentage)}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-gold-muted/70 shrink-0">
          已点亮 {percentage}%
        </span>
      </div>

      <div className="mt-4 pt-3 border-t border-gold/10 flex items-center justify-between">
        <span className="text-[10px] font-serif text-gold-muted/60 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-gold/60" />
          <span>点击随时查阅 78 张全量牌义</span>
        </span>
        <button
          type="button"
          onClick={() => router.push('/deck')}
          className="px-3.5 py-1.5 rounded-lg border border-gold/30 bg-gold/5 text-[10px] font-serif tracking-widest text-gold hover:bg-gold/15 transition-all flex items-center gap-1 cursor-pointer"
        >
          <span>进入牌义图鉴</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
