'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Moon, X } from 'lucide-react';
import { MoonPhaseInfo } from '@/lib/tarot/moonPhase';

interface HomeMoonModalProps {
  moonPhase: MoonPhaseInfo;
  onClose: () => void;
}

export default function HomeMoonModal({ moonPhase, onClose }: HomeMoonModalProps) {
  const insight = moonPhase.percent < 20
    ? '新月微弱，适合把尚未成形的念头写下来，先不急着解释。'
    : moonPhase.percent < 80
      ? '弦月流动，适合用牌阵整理选择、阻碍与下一步。'
      : '满月明亮，适合做更深的镜面十字或梦境映射。';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05060A]/85 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-xs border-y border-gold/20 bg-[#0B0D13]/90 px-5 py-6 text-center shadow-gold-glow"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center text-gold-muted/55 transition-colors duration-300 hover:text-gold"
          aria-label="关闭月相共鸣"
        >
          <X className="h-4 w-4" />
        </button>

        <Moon className="mx-auto h-8 w-8 text-gold" />
        <h3 className="mt-4 text-sm font-serif font-semibold tracking-widest text-gold">
          {moonPhase.name}
        </h3>
        <p className="mt-3 text-[11px] font-serif leading-6 tracking-wide text-foreground/78">
          {insight}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 rounded-full border border-gold/20 px-5 py-1.5 text-[10px] font-serif tracking-widest text-gold transition-colors duration-300 hover:border-gold/40"
        >
          收下
        </button>
      </motion.div>
    </div>
  );
}
