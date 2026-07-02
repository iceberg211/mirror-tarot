'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { BookOpen, UserRound, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MoonPhaseInfo, getMoonSvgPath } from '@/lib/tarot/moonPhase';
import { JournalEntry } from '@/lib/db/localJournal';
import { useAuth } from '@/hooks/useAuth';
import HomeActionPanel from '@/components/home/HomeActionPanel';

interface HomeHeroProps {
  moonPhase: MoonPhaseInfo;
  onStartInquiry: () => void;
  onDailyDraw: () => void;
  onOpenDream: () => void;
  onMoonResonate: () => void;
  latestEntry: JournalEntry | null;
}

const heroCards = [
  {
    src: '/cards/rws/02-the-high-priestess.jpg',
    alt: '女祭司塔罗牌',
    className: 'left-[20%] top-4 -rotate-12 opacity-70 scale-90',
    priority: false,
  },
  {
    src: '/cards/rws/18-the-moon.jpg',
    alt: '月亮塔罗牌',
    className: 'left-1/2 top-0 -translate-x-1/2 rotate-2 opacity-100 scale-100 z-10',
    priority: true,
  },
  {
    src: '/cards/rws/17-the-star.jpg',
    alt: '星星塔罗牌',
    className: 'right-[20%] top-4 rotate-12 opacity-70 scale-90',
    priority: false,
  },
];

export default function HomeHero({
  moonPhase,
  onStartInquiry,
  onDailyDraw,
  onOpenDream,
  onMoonResonate,
  latestEntry,
}: HomeHeroProps) {
  const router = useRouter();
  const { status } = useAuth();

  return (
    <section className="relative w-full overflow-hidden px-6 pt-6 pb-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[430px] bg-[radial-gradient(circle_at_50%_12%,rgba(201,167,106,0.18),transparent_34%),radial-gradient(circle_at_18%_35%,rgba(71,85,105,0.22),transparent_34%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-[0.28em] text-gold-muted/70">
            Mirror Tarot
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/deck')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/15 bg-[#0F1117]/45 text-gold/85 shadow-gold-glow transition-all duration-300 hover:border-gold/35"
              aria-label="查阅牌义字典"
            >
              <BookOpen className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => router.push('/account')}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 ${
                status === 'authenticated'
                  ? 'border-gold/40 bg-gold/10 text-gold'
                  : 'border-gold/15 bg-[#0F1117]/45 text-gold/80 hover:border-gold/35'
              }`}
              aria-label="账号"
            >
              <UserRound className="h-4 w-4" />
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="mt-7"
        >
          <p className="text-[11px] font-serif tracking-[0.22em] text-gold-muted/80">
            把问题说清楚一点
          </p>
          <h1 className="mt-3 text-[44px] font-serif font-semibold leading-[0.95] tracking-normal text-gold drop-shadow-[0_0_18px_rgba(201,167,106,0.28)]">
            Mirror
            <br />
            Tarot
          </h1>
          <p className="mt-4 max-w-[286px] text-sm font-serif leading-7 tracking-wide text-foreground/78">
            用塔罗和 AI 把当下的困惑整理成解释、提醒和下一步行动。
          </p>
        </motion.div>

        <HomeActionPanel
          onStartInquiry={onStartInquiry}
          onDailyDraw={onDailyDraw}
          onOpenDream={onOpenDream}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.12, ease: 'easeOut' }}
          className="relative mt-5 h-[152px]"
        >
          <div className="absolute left-1/2 top-4 h-32 w-32 -translate-x-1/2 rounded-full border border-gold/10 bg-[radial-gradient(circle,rgba(201,167,106,0.1),transparent_68%)] blur-[1px]" />
          {heroCards.map((card) => (
            <Image
              key={card.src}
              src={card.src}
              alt={card.alt}
              width={82}
              height={138}
              priority={card.priority}
              sizes="82px"
              className={`absolute rounded-[9px] border border-gold/15 object-cover shadow-[0_18px_46px_rgba(0,0,0,0.5)] ${card.className}`}
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
            className="min-h-9 rounded-full border border-gold/25 px-3 text-[10px] font-serif tracking-widest text-gold transition-all duration-300 hover:border-gold/50 hover:bg-gold/5"
          >
            月相建议
          </button>
        </motion.div>

        {latestEntry && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            type="button"
            onClick={() => router.push(`/reading/${latestEntry.id}`)}
            className="mt-4 grid min-h-[58px] w-full grid-cols-[auto_1fr_auto] items-center gap-3.5 rounded-xl border border-gold/10 bg-[#0E1017]/25 p-3.5 text-left transition-all duration-300 hover:border-gold/30 hover:bg-[#0E1017]/45 cursor-pointer"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/14 text-gold/80">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </span>
            <span className="min-w-0">
              <span className="block text-[9px] font-mono uppercase tracking-[0.2em] text-gold-muted/48">
                最近觉察记录 ✦ Recent Inquiry
              </span>
              <span className="mt-1 block truncate text-xs font-serif tracking-widest text-gold font-medium">
                “ {latestEntry.question} ”
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-gold/85" />
          </motion.button>
        )}
      </div>
    </section>
  );
}
