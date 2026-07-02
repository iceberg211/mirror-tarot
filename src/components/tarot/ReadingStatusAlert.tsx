'use client';

import React from 'react';

interface ReadingStatusAlertProps {
  generating: boolean;
  readingError: string | null;
  isReadingEmpty: boolean;
  onRegenerate: () => void;
}

export default function ReadingStatusAlert({
  generating,
  readingError,
  isReadingEmpty,
  onRegenerate,
}: ReadingStatusAlertProps) {
  if (generating) return null;

  // 1. API 失败报错重建提示
  if (readingError) {
    return (
      <div className="w-full max-w-sm px-5 py-4 rounded-xl border border-red-950/45 bg-[#170B0B]/50 flex flex-col gap-3.5 mb-6 text-center shadow-lg" style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.1)' }}>
        <span className="text-[11px] text-red-400 font-serif font-bold tracking-widest">
          ✦ 情绪解读重建失败 ✦
        </span>
        <p className="text-[10px] text-red-300/80 font-mono break-all leading-relaxed px-2">
          {readingError}
        </p>
        <button
          onClick={onRegenerate}
          className="mx-auto px-5 py-2.5 rounded-lg border border-red-800/40 bg-red-950/40 text-[10px] text-red-300 font-serif tracking-widest hover:bg-red-900/40 transition-all duration-300 cursor-pointer"
        >
          ✦ 点击重试重建 ✦
        </button>
      </div>
    );
  }

  // 2. 解读内容损坏/缺失重建提示
  if (isReadingEmpty) {
    return (
      <div className="w-full max-w-sm px-5 py-4 rounded-xl border border-gold/15 bg-[#11131A]/60 flex flex-col gap-3.5 mb-6 text-center shadow-gold-glow">
        <span className="text-[11px] text-gold font-serif font-semibold tracking-widest">
          ✦ 解读信息缺失 ✦
        </span>
        <p className="text-[10px] text-gold-muted/70 font-serif leading-relaxed px-2">
          检测到此篇情绪日记缺少 AI 情绪解读，可能因为之前大模型接口配置有误或中断。
        </p>
        <button
          onClick={onRegenerate}
          className="mx-auto px-5 py-2.5 rounded-lg border border-gold/25 bg-gold/5 text-[10px] text-gold font-serif tracking-widest hover:bg-gold/10 transition-all duration-300 cursor-pointer shadow-gold-glow"
        >
          ✦ 重新唤醒 MIRROR 情绪解读 ✦
        </button>
      </div>
    );
  }

  return null;
}
