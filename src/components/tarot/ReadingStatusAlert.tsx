import React from 'react';
import { HeartHandshake, PhoneCall } from 'lucide-react';
import type { ParsedReading } from '@/lib/tarot/types';
import { isSupportMessage } from '@/lib/safety/supportSignals';

interface ReadingStatusAlertProps {
  generating: boolean;
  readingError: string | null;
  isReadingEmpty: boolean;
  onRegenerate: () => void;
  parsedReading?: ParsedReading;
}

export default function ReadingStatusAlert({
  generating,
  readingError,
  isReadingEmpty,
  onRegenerate,
  parsedReading,
}: ReadingStatusAlertProps) {
  if (generating) return null;

  // 0. 安全兜底路径：只按资源标题与热线号码判断。
  //    不能用「安全」这类日常词，否则「安全感」「关系让你不安全」都会误触发热线卡片。
  const supportText = [
    readingError || '',
    parsedReading?.intuitiveSummary || '',
    parsedReading?.gentleReminder || '',
    parsedReading?.actionAdvice || '',
  ].join(' ');

  if (isSupportMessage(supportText)) {
    return (
      <div className="w-full max-w-md px-5 py-5 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#1E170E]/85 to-[#0F0C07]/95 flex flex-col gap-3.5 mb-6 shadow-[0_0_20px_rgba(245,158,11,0.12)]">
        <div className="flex items-center gap-2 text-amber-400">
          <HeartHandshake className="w-4 h-4" />
          <span className="text-xs font-serif font-bold tracking-widest uppercase">
            现实守护与温暖支持
          </span>
        </div>
        <p className="text-xs font-serif leading-relaxed text-foreground/85">
          无论此刻内心有多沉重，请记得你无需独自承受。如果感到安全受威胁或情绪处于极度危机，请随时拨打免费热线：
        </p>
        <div className="flex flex-col gap-2 pt-1">
          <a
            href="tel:4001619995"
            className="flex items-center justify-between p-2.5 rounded-xl border border-amber-500/25 bg-amber-500/8 hover:bg-amber-500/15 transition-all text-xs font-serif text-amber-300"
          >
            <span className="flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>全国心理援助热线（24小时）</span>
            </span>
            <span className="font-mono font-bold tracking-wider">400-161-9995</span>
          </a>
          <a
            href="tel:01082951332"
            className="flex items-center justify-between p-2.5 rounded-xl border border-amber-500/25 bg-amber-500/8 hover:bg-amber-500/15 transition-all text-xs font-serif text-amber-300"
          >
            <span className="flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>北京心理危机研究与干预中心</span>
            </span>
            <span className="font-mono font-bold tracking-wider">010-82951332</span>
          </a>
        </div>
      </div>
    );
  }

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
