'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { ActionSeedStatus } from '@/hooks/useHomeReadingFlow';
import { JournalEntry } from '@/lib/db/localJournal';

interface HomeSeedRecapModalProps {
  entry: JournalEntry;
  feedback: string;
  onCheckIn: (status: ActionSeedStatus) => void;
  onDismiss: () => void;
}

export default function HomeSeedRecapModal({
  entry,
  feedback,
  onCheckIn,
  onDismiss,
}: HomeSeedRecapModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05060A]/85 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-sm border-y border-gold/22 bg-[#0B0D13]/92 px-6 py-6 text-center shadow-gold-glow"
      >
        <Sparkles className="mx-auto h-6 w-6 text-gold" />
        <h3 className="mt-3 text-sm font-serif font-semibold tracking-widest text-gold">
          昨日星轨回响
        </h3>
        <p className="mt-1 text-[9px] font-mono uppercase tracking-[0.24em] text-gold-muted/45">
          Seed Recap
        </p>

        <div className="my-5 border-y border-gold/10 py-4 text-left">
          <p className="text-[9px] font-serif tracking-widest text-gold-muted/55">昨日行动提醒</p>
          <p className="mt-2 text-xs font-serif leading-6 tracking-wide text-foreground/88">
            “{entry.actionSeed?.seedText}”
          </p>
        </div>

        {feedback ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-4 text-xs font-serif leading-6 tracking-wide text-gold"
          >
            {feedback}
          </motion.p>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-serif tracking-wide text-gold-muted/80">
              这个提醒昨天进入行动了吗？
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onCheckIn('completed')}
                className="rounded-full border border-gold/40 bg-gold/10 py-2 text-[11px] font-serif tracking-wider text-gold"
              >
                做到了
              </button>
              <button
                type="button"
                onClick={() => onCheckIn('failed')}
                className="rounded-full border border-gold/16 py-2 text-[11px] font-serif tracking-wider text-gold-muted/78"
              >
                没做到
              </button>
              <button
                type="button"
                onClick={() => onCheckIn('dismissed')}
                className="rounded-full border border-gold/12 py-2 text-[11px] font-serif tracking-wider text-gold-muted/58"
              >
                稍后
              </button>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="text-[10px] font-serif tracking-widest text-gold-muted/45 underline-offset-4 hover:text-gold-muted"
            >
              暂不复盘
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
