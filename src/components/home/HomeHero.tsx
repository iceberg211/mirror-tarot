'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, Moon, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MoonPhaseInfo, getMoonSvgPath } from '@/lib/tarot/moonPhase';

interface HomeHeroProps {
  moonPhase: MoonPhaseInfo;
  onStartInquiry: () => void;
  onDailyDraw: () => void;
  onOpenDream: () => void;
  onMoonResonate: () => void;
}

const heroCards = [
  {
    src: '/cards/rws/02-the-high-priestess.jpg',
    alt: '女祭司塔罗牌',
    className: 'left-[18%] top-7 -rotate-12 opacity-70 scale-90',
    priority: false,
  },
  {
    src: '/cards/rws/18-the-moon.jpg',
    alt: '月亮塔罗牌',
    className: 'left-1/2 top-1 -translate-x-1/2 rotate-2 opacity-100 scale-100 z-10',
    priority: true,
  },
  {
    src: '/cards/rws/17-the-star.jpg',
    alt: '星星塔罗牌',
    className: 'right-[18%] top-8 rotate-12 opacity-70 scale-90',
    priority: false,
  },
];

export default function HomeHero({
  moonPhase,
  onStartInquiry,
  onDailyDraw,
  onOpenDream,
  onMoonResonate,
}: HomeHeroProps) {
  const router = useRouter();

  return (
    <section className="relative w-full overflow-hidden px-6 pt-6 pb-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[430px] bg-[radial-gradient(circle_at_50%_12%,rgba(201,167,106,0.18),transparent_34%),radial-gradient(circle_at_18%_35%,rgba(71,85,105,0.22),transparent_34%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-[0.28em] text-gold-muted/70">
            Mirror Tarot
          </span>
          <button
            type="button"
            onClick={() => router.push('/deck')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/15 bg-[#0F1117]/45 text-gold/85 shadow-gold-glow transition-all duration-300 hover:border-gold/35"
            aria-label="查阅牌义字典"
          >
            <BookOpen className="h-4 w-4" />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="mt-9"
        >
          <p className="text-[11px] font-serif tracking-[0.24em] text-gold-muted/80">
            问牌，也是问自己
          </p>
          <h1 className="mt-3 text-[44px] font-serif font-semibold leading-[0.95] tracking-normal text-gold drop-shadow-[0_0_18px_rgba(201,167,106,0.28)]">
            Mirror
            <br />
            Tarot
          </h1>
          <p className="mt-4 max-w-[260px] text-sm font-serif leading-7 tracking-wide text-foreground/78">
            把一件正在牵动你的事放到镜面里，让卡牌、月相和记录一起回应。
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.12, ease: 'easeOut' }}
          className="relative mt-4 h-[230px]"
        >
          <div className="absolute left-1/2 top-8 h-44 w-44 -translate-x-1/2 rounded-full border border-gold/10 bg-[radial-gradient(circle,rgba(201,167,106,0.1),transparent_68%)] blur-[1px]" />
          {heroCards.map((card) => (
            <Image
              key={card.src}
              src={card.src}
              alt={card.alt}
              width={112}
              height={188}
              priority={card.priority}
              sizes="112px"
              className={`absolute h-[188px] w-[112px] rounded-[10px] border border-gold/15 object-cover shadow-[0_24px_60px_rgba(0,0,0,0.55)] ${card.className}`}
            />
          ))}
          <div className="absolute bottom-0 left-1/2 h-px w-[78%] -translate-x-1/2 bg-gradient-to-r from-transparent via-gold/35 to-transparent" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="mt-2 grid grid-cols-[1fr_auto] items-end gap-4 border-y border-gold/10 py-4"
        >
          <div className="flex items-start gap-3">
            <div className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/15 bg-[#0E1017]/65">
              <svg viewBox="0 0 100 100" className="h-6 w-6 text-gold/85 drop-shadow-[0_0_8px_rgba(201,167,106,0.45)]">
                <circle cx="50" cy="50" r="38" className="fill-[#1A1F30]/45 stroke-none" />
                <path d={getMoonSvgPath(moonPhase.iconType, moonPhase.percent)} className="fill-gold stroke-none" />
              </svg>
            </div>
            <div>
              <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-gold-muted/55">
                Lunar Sign
              </p>
              <h2 className="mt-1 text-xs font-serif font-semibold tracking-widest text-gold">
                {moonPhase.name}
              </h2>
              <p className="mt-1 line-clamp-2 text-[10px] font-serif leading-5 tracking-wide text-foreground/68">
                {moonPhase.advice}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onMoonResonate}
            className="rounded-full border border-gold/25 px-3 py-1.5 text-[10px] font-serif tracking-widest text-gold transition-all duration-300 hover:border-gold/50 hover:bg-gold/5"
          >
            共鸣
          </button>
        </motion.div>

        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            onClick={onStartInquiry}
            className="group flex min-h-14 w-full items-center justify-between border-b border-gold/12 pb-4 text-left"
          >
            <span>
              <span className="block text-sm font-serif font-semibold tracking-widest text-gold">倾诉一件事</span>
              <span className="mt-1 block text-[11px] font-serif tracking-wide text-gold-muted/72">进入完整牌阵与情绪映射</span>
            </span>
            <ChevronRight className="h-4 w-4 text-gold-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-gold" />
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onDailyDraw}
              className="flex items-center justify-between border-b border-gold/10 py-3 text-left"
            >
              <span className="flex items-center gap-2 text-xs font-serif tracking-widest text-foreground/82">
                <Sparkles className="h-4 w-4 text-gold/75" />
                今日一牌
              </span>
            </button>
            <button
              type="button"
              onClick={onOpenDream}
              className="flex items-center justify-between border-b border-gold/10 py-3 text-left"
            >
              <span className="flex items-center gap-2 text-xs font-serif tracking-widest text-foreground/82">
                <Moon className="h-4 w-4 text-gold/75" />
                记录梦境
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
