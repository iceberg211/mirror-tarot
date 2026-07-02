'use client';

import React, { memo, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Flame, AlertCircle, Eye } from 'lucide-react';
import { SelectedCard, ParsedReading } from '@/lib/tarot/types';

interface ReadingResultProps {
  parsedReading: ParsedReading;
  cards: SelectedCard[];
  generating: boolean;
  activeFocusIndex?: number;
}

const TAB_CONFIG = [
  { id: 'contradiction', name: '核心矛盾', icon: Info, key: 'contradiction' },
  { id: 'overlooked', name: '忽略因素', icon: Eye, key: 'overlookedFactor' },
  { id: 'advice', name: '建议行动', icon: Flame, key: 'actionAdvice' },
  { id: 'reminder', name: '温柔提醒', icon: AlertCircle, key: 'gentleReminder' },
] as const;

type ReadingDetailMode = 'beginner' | 'deep';

interface ReadingCardInsightProps {
  card: SelectedCard;
  index: number;
  interpretation?: string;
  detailMode: ReadingDetailMode;
  generating: boolean;
  isActiveFocus: boolean;
}

const DETAIL_MODE_STORAGE_KEY = 'mirror_tarot_reading_detail_mode';

const ReadingCardInsight = memo(function ReadingCardInsight({
  card,
  index,
  interpretation,
  detailMode,
  generating,
  isActiveFocus,
}: ReadingCardInsightProps) {
  const keywords = card.orientation === 'reversed'
    ? card.keywords.reversed
    : card.keywords.upright;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.15 }}
      className="flex flex-col gap-2 rounded-xl border border-gold/15 bg-[#0F1117]/60 p-4"
    >
      <div className="flex items-center justify-between gap-3 border-b border-gold/10 pb-2">
        <span className="min-w-0 text-[11px] font-serif font-semibold uppercase tracking-widest text-gold">
          {index + 1}. {card.positionName} · {card.zhName}
        </span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-mono tracking-widest ${
          card.orientation === 'reversed'
            ? 'border border-red-900/20 bg-red-950/20 text-red-400/80'
            : 'border border-gold/15 bg-gold/5 text-gold/80'
        }`}>
          {card.orientation === 'reversed' ? '逆位' : '正位'}
        </span>
      </div>

      <p className="pt-1 text-xs font-serif leading-relaxed tracking-wide text-foreground/85">
        {interpretation ? (
          <>
            {interpretation}
            {generating && isActiveFocus && (
              <span className="ml-1 inline-block select-none font-sans font-bold text-gold animate-pulse">
                ·
              </span>
            )}
          </>
        ) : (
          generating ? (
            <span className="text-gold-muted/30 animate-pulse">正在梳理牌面映射...</span>
          ) : (
            <span className="text-gold-muted/30">等待解读开始...</span>
          )
        )}
      </p>

      {detailMode === 'deep' && (
        <div className="mt-2 border-t border-gold/8 pt-3">
          <p className="text-[10px] font-serif leading-5 tracking-wide text-gold-muted/72">
            <span className="text-gold/85">为什么这样解释：</span>
            这张牌位于「{card.positionName}」，代表本次问题里的对应视角；它以
            {card.orientation === 'reversed' ? '逆位' : '正位'} 出现，关键词是
            「{keywords.slice(0, 4).join('、')}」。解读会把这些象征和你的提问、当前情绪放在一起看。
          </p>
        </div>
      )}
    </motion.div>
  );
});

export default function ReadingResult({ parsedReading, cards, generating, activeFocusIndex = -1 }: ReadingResultProps) {
  const [activeTab, setActiveTab] = useState<'contradiction' | 'overlooked' | 'advice' | 'reminder'>('contradiction');
  const [detailMode, setDetailMode] = useState<ReadingDetailMode>(() => {
    if (typeof window === 'undefined') return 'beginner';
    return localStorage.getItem(DETAIL_MODE_STORAGE_KEY) === 'deep' ? 'deep' : 'beginner';
  });

  const tabs = useMemo(() => TAB_CONFIG.map(tab => ({
    id: tab.id,
    name: tab.name,
    icon: tab.icon,
    content: parsedReading[tab.key]
  })), [parsedReading]);

  useEffect(() => {
    localStorage.setItem(DETAIL_MODE_STORAGE_KEY, detailMode);
  }, [detailMode]);

  return (
    <div className="w-full max-w-md px-6 flex flex-col gap-6 select-none pb-12">
      {/* 一句话直觉解读 - 信件引言 */}
      <AnimatePresence mode="wait">
        {(parsedReading.intuitiveSummary || generating) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative p-5 rounded-2xl glassmorphism text-center italic border-gold/25"
          >
            <div className="absolute top-2 left-3 text-gold/30 text-3xl font-serif">“</div>
            <p className="text-sm font-serif text-gold/90 leading-relaxed px-4">
              {parsedReading.intuitiveSummary || (
                <span className="text-gold-muted/40 animate-pulse">正在倾听卡牌的直觉声音...</span>
              )}
            </p>
            <div className="absolute bottom-2 right-4 text-gold/30 text-3xl font-serif">”</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 每一张牌的解读 */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between border-y border-gold/10 py-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-gold-muted/45">
              Reading Mode
            </p>
            <p className="mt-1 text-xs font-serif tracking-widest text-gold">
              {detailMode === 'beginner' ? '新手模式' : '深度模式'}
            </p>
          </div>
          <div className="flex rounded-full border border-gold/12 p-1">
            {([
              ['beginner', '新手'],
              ['deep', '深度'],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDetailMode(mode)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-serif tracking-widest transition-colors ${
                  detailMode === mode
                    ? 'bg-gold/10 text-gold'
                    : 'text-gold-muted/55 hover:text-gold'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {cards.map((card, idx) => (
          <ReadingCardInsight
            key={card.id}
            card={card}
            index={idx}
            interpretation={parsedReading.cardReadings[idx]?.interpretation}
            detailMode={detailMode}
            generating={generating}
            isActiveFocus={activeFocusIndex === idx}
          />
        ))}
      </div>

      {/* 三个切签卡片 (Tab 切换) - 完全复刻图 4 样式 */}
      {(parsedReading.contradiction || parsedReading.overlookedFactor || parsedReading.actionAdvice || parsedReading.gentleReminder || generating) && (
        <div className="flex flex-col gap-3">
          {/* 页签头部 */}
          <div className="grid grid-cols-4 gap-1.5">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 rounded-lg border text-[9px] font-serif tracking-widest flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer outline-none transition-all duration-300 ${
                    isActive
                      ? 'border-gold bg-[#1E1C16]/65 text-gold shadow-gold-glow font-semibold'
                      : 'border-gold/10 bg-[#0E1017]/40 text-gold-muted/65 hover:border-gold/25'
                  }`}
                >
                  <TabIcon className="w-3 h-3" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>

          {/* 页签内容 */}
          <div className="min-h-[110px] p-4.5 rounded-xl border border-gold/15 bg-[#11131A]/65 flex flex-col justify-center shadow-gold-glow">
            <AnimatePresence mode="wait">
              <motion.p
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-foreground/90 font-serif leading-relaxed tracking-wide"
              >
                {tabs.find((t) => t.id === activeTab)?.content || (
                  generating ? (
                    <span className="text-gold-muted/30 animate-pulse">正在精细解读该维度...</span>
                  ) : (
                    <span className="text-gold-muted/30">暂无内容</span>
                  )
                )}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
