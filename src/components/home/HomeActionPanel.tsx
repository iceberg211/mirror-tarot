'use client';

import React from 'react';
import { ArrowRight, Moon, Sparkles } from 'lucide-react';

interface HomeActionPanelProps {
  onStartInquiry: () => void;
  onDailyDraw: () => void;
  onOpenDream: () => void;
}

export default function HomeActionPanel({
  onStartInquiry,
  onDailyDraw,
  onOpenDream,
}: HomeActionPanelProps) {
  return (
    <section className="mt-6 border-y border-gold/12 py-5">
      <button
        type="button"
        onClick={onStartInquiry}
        className="group grid min-h-[76px] w-full grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-gold/32 bg-gold/10 px-5 text-left shadow-gold-glow transition-all duration-300 hover:border-gold/55 hover:bg-gold/14 cursor-pointer"
      >
        <span>
          <span className="block text-base font-serif font-semibold tracking-widest text-gold">
            开始问牌 ✦ Start Inquiry
          </span>
          <span className="mt-1 block text-[11px] font-serif leading-5 tracking-wide text-gold-muted/72">
            写下正在纠结的事，系统会推荐合适牌阵。
          </span>
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/24 text-gold transition-transform duration-300 group-hover:translate-x-0.5">
          <ArrowRight className="h-4 w-4" />
        </span>
      </button>
 
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onDailyDraw}
          className="min-h-[66px] rounded-xl border border-gold/14 bg-[#0E1017]/45 px-3.5 py-2 text-left transition-all duration-300 hover:border-gold/35 hover:bg-gold/6 cursor-pointer flex flex-col justify-center"
        >
          <span className="flex items-center gap-2 text-xs font-serif font-semibold tracking-widest text-foreground/88">
            <Sparkles className="h-4 w-4 text-gold/78" />
            今日一牌
          </span>
          <span className="mt-1 block text-[9px] font-serif leading-relaxed text-gold-muted/62">
            看今天适合关注什么
          </span>
        </button>
 
        <button
          type="button"
          onClick={onOpenDream}
          className="min-h-[66px] rounded-xl border border-gold/14 bg-[#0E1017]/45 px-3.5 py-2 text-left transition-all duration-300 hover:border-gold/35 hover:bg-gold/6 cursor-pointer flex flex-col justify-center"
        >
          <span className="flex items-center gap-2 text-xs font-serif font-semibold tracking-widest text-foreground/88">
            <Moon className="h-4 w-4 text-gold/78" />
            记录梦境
          </span>
          <span className="mt-1 block text-[9px] font-serif leading-relaxed text-gold-muted/62">
            记录梦境，并生成抽牌问题
          </span>
        </button>
      </div>
    </section>
  );
}
