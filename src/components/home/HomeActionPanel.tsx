'use client';

import React from 'react';
import { ArrowRight, Clock3, Moon, Sparkles } from 'lucide-react';
import { JournalEntry } from '@/lib/db/localJournal';

interface HomeActionPanelProps {
  latestEntry: JournalEntry | null;
  onStartInquiry: () => void;
  onDailyDraw: () => void;
  onOpenDream: () => void;
  onContinueLatest: (entryId: string) => void;
}

export default function HomeActionPanel({
  latestEntry,
  onStartInquiry,
  onDailyDraw,
  onOpenDream,
  onContinueLatest,
}: HomeActionPanelProps) {
  return (
    <section className="mt-6 border-y border-gold/12 py-4">
      <button
        type="button"
        onClick={onStartInquiry}
        className="group grid min-h-[68px] w-full grid-cols-[1fr_auto] items-center gap-4 rounded-[10px] border border-gold/32 bg-gold/10 px-4 text-left shadow-gold-glow transition-all duration-300 hover:border-gold/55 hover:bg-gold/14"
      >
        <span>
          <span className="block text-base font-serif font-semibold tracking-widest text-gold">
            开始问牌
          </span>
          <span className="mt-1 block text-[11px] font-serif leading-5 tracking-wide text-gold-muted/72">
            写下正在纠结的事，系统会推荐合适的牌阵。
          </span>
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/24 text-gold transition-transform duration-300 group-hover:translate-x-0.5">
          <ArrowRight className="h-4 w-4" />
        </span>
      </button>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onDailyDraw}
          className="min-h-[58px] rounded-[10px] border border-gold/14 bg-[#0E1017]/45 px-3 text-left transition-all duration-300 hover:border-gold/35 hover:bg-gold/6"
        >
          <span className="flex items-center gap-2 text-xs font-serif font-semibold tracking-widest text-foreground/88">
            <Sparkles className="h-4 w-4 text-gold/78" />
            今日一牌
          </span>
          <span className="mt-1 block text-[10px] font-serif tracking-wide text-gold-muted/62">
            快速获得今日提醒
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenDream}
          className="min-h-[58px] rounded-[10px] border border-gold/14 bg-[#0E1017]/45 px-3 text-left transition-all duration-300 hover:border-gold/35 hover:bg-gold/6"
        >
          <span className="flex items-center gap-2 text-xs font-serif font-semibold tracking-widest text-foreground/88">
            <Moon className="h-4 w-4 text-gold/78" />
            记录梦境
          </span>
          <span className="mt-1 block text-[10px] font-serif tracking-wide text-gold-muted/62">
            把梦转成可追问的问题
          </span>
        </button>
      </div>

      {latestEntry && (
        <button
          type="button"
          onClick={() => onContinueLatest(latestEntry.id)}
          className="mt-3 grid min-h-[54px] w-full grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-gold/10 pt-3 text-left"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/14 text-gold/80">
            <Clock3 className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-mono uppercase tracking-[0.2em] text-gold-muted/48">
              最近记录
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-serif tracking-widest text-gold">
              {latestEntry.question}
            </span>
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-gold-muted" />
        </button>
      )}
    </section>
  );
}
