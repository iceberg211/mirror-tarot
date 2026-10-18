'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Flame, Sparkles } from 'lucide-react';
import { useActionItem } from '@/hooks/useActionItem';

export default function HomeActionItemCard() {
  const { activeItem, loading, toggleComplete } = useActionItem();

  if (loading || !activeItem) {
    return null;
  }

  const isCompleted = activeItem.actionSeed.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`mx-auto w-full max-w-md px-6 my-2 z-10 relative`}
    >
      <div
        className={`rounded-2xl border p-4 transition-all duration-500 relative overflow-hidden backdrop-blur-md ${
          isCompleted
            ? 'border-emerald-500/25 bg-emerald-950/15 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
            : 'border-gold/30 bg-gradient-to-br from-[#1A1813]/80 via-[#12131A]/70 to-[#0A0C12]/80 shadow-gold-glow'
        }`}
      >
        {/* 背景微光 */}
        <div
          className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl pointer-events-none transition-colors duration-500 ${
            isCompleted ? 'bg-emerald-500/10' : 'bg-gold/10'
          }`}
        />

        <div className="flex items-start gap-3 relative z-10">
          {/* 打卡勾选按钮 */}
          <button
            type="button"
            onClick={toggleComplete}
            aria-label={isCompleted ? '取消完成微行动' : '标记微行动为已完成'}
            className={`mt-0.5 shrink-0 rounded-full p-1 transition-transform active:scale-90 cursor-pointer ${
              isCompleted
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-gold/70 hover:text-gold hover:scale-110'
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 fill-emerald-500/20" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>

          {/* 核心文案区域 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="flex items-center gap-1.5 text-[10px] font-serif tracking-[0.2em] uppercase font-semibold text-gold/90">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>今日微行动</span>
              </span>
              <span
                className={`text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-full border ${
                  isCompleted
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-gold/20 bg-gold/5 text-gold-muted/80'
                }`}
              >
                {isCompleted ? '已践行 ✦' : '待迈出'}
              </span>
            </div>

            <p
              className={`text-xs font-serif leading-relaxed tracking-wide transition-all duration-300 ${
                isCompleted
                  ? 'line-through text-foreground/45'
                  : 'text-foreground/90 font-medium'
              }`}
            >
              {activeItem.actionSeed.seedText}
            </p>

            {activeItem.question && (
              <p className="mt-1.5 text-[10px] font-serif text-gold-muted/50 truncate">
                源自困惑：{activeItem.question}
              </p>
            )}
          </div>
        </div>

        {/* 完成后的激励提示 */}
        <AnimatePresence>
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2.5 pt-2 border-t border-emerald-500/15 flex items-center gap-1.5 text-[10px] font-serif text-emerald-400/90 tracking-widest"
            >
              <Sparkles className="w-3 h-3 shrink-0 text-emerald-300" />
              <span>行动胜过一切沉思，你已经向前走了一步。</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
