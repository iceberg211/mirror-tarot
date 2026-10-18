'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Compass, Eye } from 'lucide-react';

interface ReflectionsPreviewLockedProps {
  completedCount: number;
}

export default function ReflectionsPreviewLocked({ completedCount }: ReflectionsPreviewLockedProps) {
  const router = useRouter();
  const remaining = Math.max(0, 3 - completedCount);
  const percentage = Math.min(100, Math.round((completedCount / 3) * 100));

  return (
    <div className="flex flex-col gap-6">
      {/* 顶部充能进度卡片 */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gold/25 bg-gradient-to-br from-[#1C1811]/90 via-[#12131C]/80 to-[#0A0C14]/90 p-5 text-center shadow-gold-glow relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 text-gold text-xs shadow-gold-glow">
              ✦
            </span>
            <span className="text-xs font-serif font-bold tracking-widest text-gold uppercase">
              心智图谱充能中
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-gold bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
            {completedCount} / 3 次
          </span>
        </div>

        <p className="text-xs font-serif leading-relaxed tracking-wide text-foreground/85 px-1">
          {completedCount === 0
            ? '完成 3 次镜面问牌，Mirror 将为你编织专属潜意识图谱、荣格人格原型与情绪星轨。'
            : `已收集 ${completedCount} 块心智镜像，再完成 ${remaining} 次解读即可揭晓完整潜意识图谱。`}
        </p>

        {/* 充能条 */}
        <div className="flex items-center gap-3 mt-1">
          <div className="flex-1 h-2 rounded-full bg-gold/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold/60 to-gold rounded-full transition-all duration-700 shadow-gold-glow"
              style={{ width: `${Math.max(6, percentage)}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-gold font-bold">
            {percentage}%
          </span>
        </div>

        <button
          type="button"
          onClick={() => router.push('/')}
          className="mt-2 w-full min-h-11 rounded-xl bg-gradient-to-r from-[#1E1B13] via-[#2F291C] to-[#1E1B13] border border-gold/45 text-gold text-xs font-serif font-semibold tracking-widest hover:brightness-110 shadow-gold-glow flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{completedCount === 0 ? '✦ 开始第一次镜面问牌 ✦' : '✦ 继续完成解读 · 解锁洞察 ✦'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 虚化预览态：展示即将解锁的荣格原型与心智词云模样 */}
      <div className="relative rounded-2xl border border-gold/15 bg-card/40 p-5 overflow-hidden">
        {/* 蒙层与解锁引导 */}
        <div className="absolute inset-0 z-20 bg-background/65 backdrop-blur-[5px] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-11 h-11 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center text-gold shadow-gold-glow mb-3">
            <Lock className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-serif font-bold tracking-widest text-gold mb-1.5">
            专属荣格原型与心智星轨
          </h4>
          <p className="text-xs font-serif leading-relaxed text-gold-muted/80 max-w-[260px] mb-4">
            AI 将根据你的多轮问牌心事与抽中象征，深度绘制潜意识雷达与心智图谱。
          </p>
          <div className="flex items-center gap-1.5 text-[10px] font-serif text-gold/80 border border-gold/25 bg-gold/5 px-3 py-1 rounded-full">
            <Eye className="w-3 h-3 text-gold" />
            <span>此图谱为专属生成预览示意</span>
          </div>
        </div>

        {/* 底层模拟虚化内容 */}
        <div className="flex flex-col gap-4 filter blur-[1px] opacity-40 select-none pointer-events-none">
          <div className="p-4 rounded-xl border border-gold/15 bg-[#12141F]">
            <span className="text-[10px] font-serif text-gold-muted">荣格潜意识主导原型</span>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-12 h-16 rounded bg-gold/10 border border-gold/20" />
              <div>
                <span className="text-sm font-serif text-gold font-bold">智者 / 隐士</span>
                <p className="text-[10px] font-serif text-gold-muted/70 mt-1">
                  习惯向内审视，在静止中寻找现实破局答案。
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-gold/15 bg-[#12141F] flex flex-wrap gap-2 justify-center py-6">
            {['边界感', '内心秩序', '关系期待', '放下焦虑', '直觉觉察', '行动突破', '自我接纳'].map((word, i) => (
              <span key={i} className="text-xs font-serif px-2.5 py-1 rounded-full bg-gold/10 text-gold/80 border border-gold/20">
                {word}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
