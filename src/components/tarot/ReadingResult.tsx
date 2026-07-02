'use client';

import React, { memo, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Flame, AlertCircle, Eye } from 'lucide-react';
import { SelectedCard, ParsedReading } from '@/lib/tarot/types';
import CardMeaningModal from '@/components/tarot/CardMeaningModal';

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
  isPending: boolean;
  onOpenDictionary?: (card: SelectedCard) => void;
}

const DETAIL_MODE_STORAGE_KEY = 'mirror_tarot_reading_detail_mode';

type ResultTabId = typeof TAB_CONFIG[number]['id'];

interface MeaningsModuleType {
  getCardMeaning: (cardId: string, orientation: 'upright' | 'reversed') => {
    general: string;
    love: string;
    career: string;
    advice: string;
  };
}

const ReadingCardInsight = memo(function ReadingCardInsight({
  card,
  index,
  interpretation,
  detailMode,
  generating,
  isActiveFocus,
  isPending,
  onOpenDictionary,
}: ReadingCardInsightProps) {
  const keywords = card.orientation === 'reversed'
    ? card.keywords.reversed
    : card.keywords.upright;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.15 }}
      className={`flex flex-col gap-2 rounded-xl border p-4 transition-all duration-500 ${
        isPending
          ? 'border-gold/5 bg-[#0F1117]/20 opacity-40'
          : 'border-gold/15 bg-[#0F1117]/60'
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-gold/10 pb-2">
        <span className={`min-w-0 text-[11px] font-serif font-semibold uppercase tracking-widest ${
          isPending ? 'text-gold-muted/40' : 'text-gold'
        }`}>
          {index + 1}. {card.positionName} · {card.zhName}
        </span>
        {!isPending && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-mono tracking-widest ${
            card.orientation === 'reversed'
              ? 'border border-red-900/20 bg-red-950/20 text-red-400/80'
              : 'border border-gold/15 bg-gold/5 text-gold/80'
          }`}>
            {card.orientation === 'reversed' ? '逆位' : '正位'}
          </span>
        )}
      </div>

      {isPending ? (
        <div className="py-2.5 text-center text-[10px] text-gold-muted/25 font-serif animate-pulse flex items-center justify-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-gold/30 animate-ping" />
          <span>能量连结中，等待心智回响...</span>
        </div>
      ) : (
        <>
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

          {!generating && onOpenDictionary && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onOpenDictionary(card)}
                className="text-[9px] font-serif text-gold-muted/50 hover:text-gold hover:underline tracking-widest cursor-pointer transition-colors border-none bg-transparent"
              >
                查看牌义图鉴 ✦
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
});

export default function ReadingResult({
  parsedReading,
  cards,
  generating,
  activeFocusIndex = -1,
}: ReadingResultProps) {
  const [activeTab, setActiveTab] = useState<ResultTabId>('contradiction');
  const [detailMode, setDetailMode] = useState<ReadingDetailMode>(() => {
    if (typeof window === 'undefined') return 'beginner';
    return localStorage.getItem(DETAIL_MODE_STORAGE_KEY) === 'deep' ? 'deep' : 'beginner';
  });

  // 百科 Modal 状态
  const [modalCard, setModalCard] = useState<SelectedCard | null>(null);

  const tabs = useMemo(() => {
    return TAB_CONFIG.map((tab) => ({
      id: tab.id,
      name: tab.name,
      icon: tab.icon,
      content: parsedReading[tab.key],
    }));
  }, [parsedReading]);

  const visibleActiveTab = useMemo<ResultTabId>(() => {
    if (!generating) return activeTab;
    const activeTabReady = tabs.some((tab) => tab.id === activeTab && !!tab.content?.trim());
    if (activeTabReady) return activeTab;
    return tabs.find((tab) => !!tab.content?.trim())?.id || activeTab;
  }, [activeTab, generating, tabs]);

  useEffect(() => {
    localStorage.setItem(DETAIL_MODE_STORAGE_KEY, detailMode);
  }, [detailMode]);

  const handleOpenDictionary = (card: SelectedCard) => {
    setModalCard(card);
  };

  return (
    <div className="w-full max-w-md px-6 flex flex-col gap-6 select-none pb-12 z-10">
      {/* 阶段 1：先看结论 */}
      {(parsedReading.intuitiveSummary || generating) && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-gold/20" />
            <span className="text-[9px] font-serif text-gold/75 tracking-[0.24em] font-semibold uppercase">先看结论 ✦ First Intuition</span>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-gold/20" />
          </div>

          <AnimatePresence mode="wait">
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
          </AnimatePresence>
        </div>
      )}

      {/* 阶段 2：逐张牌 */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2 px-1 mt-1">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-gold/20" />
          <span className="text-[9px] font-serif text-gold/75 tracking-[0.24em] font-semibold uppercase">逐张牌映射 ✦ Card Meanings</span>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-gold/20" />
        </div>

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
                className={`rounded-full px-3 py-1.5 text-[10px] font-serif tracking-widest transition-colors cursor-pointer ${
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

        {cards.map((card, idx) => {
          const isPending = generating && activeFocusIndex !== -1 && idx > activeFocusIndex;
          return (
            <ReadingCardInsight
              key={card.id}
              card={card}
              index={idx}
              interpretation={parsedReading.cardReadings[idx]?.interpretation}
              detailMode={detailMode}
              generating={generating}
              isActiveFocus={activeFocusIndex === idx}
              isPending={isPending}
              onOpenDictionary={handleOpenDictionary}
            />
          );
        })}
      </div>

      {/* 阶段 3：今天可做 (切签卡片) */}
      {(parsedReading.contradiction || parsedReading.overlookedFactor || parsedReading.actionAdvice || parsedReading.gentleReminder || generating) && (
        <div className="flex flex-col gap-4.5">
          <div className="flex items-center gap-2 px-1 mt-1">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-gold/20" />
            <span className="text-[9px] font-serif text-gold/75 tracking-[0.24em] font-semibold uppercase">今天可做 ✦ Daily Action Plan</span>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-gold/20" />
          </div>

          <div className="flex flex-col gap-3">
            {/* 页签头部 */}
            <div className="grid grid-cols-4 gap-1.5">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = visibleActiveTab === tab.id;
                const isReady = !!tab.content && tab.content.trim() !== '';

                return (
                  <button
                    key={tab.id}
                    type="button"
                    disabled={generating && !isReady}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 rounded-lg border text-[9px] font-serif tracking-widest flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer outline-none transition-all duration-300 ${
                      isActive
                        ? 'border-gold bg-[#1E1C16]/65 text-gold shadow-gold-glow font-semibold'
                        : isReady
                          ? 'border-gold/10 bg-[#0E1017]/40 text-gold-muted/65 hover:border-gold/25'
                          : 'border-gold/5 bg-transparent text-gold-muted/20 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>

            {/* 页签内容 */}
            <div className="min-h-[110px] p-4.5 rounded-xl border border-gold/15 bg-[#11131A]/65 flex flex-col justify-center shadow-gold-glow">
              <AnimatePresence mode="wait">
                <motion.p
                  key={visibleActiveTab}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs text-foreground/90 font-serif leading-relaxed tracking-wide"
                >
                  {tabs.find((t) => t.id === visibleActiveTab)?.content || (
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
        </div>
      )}

      {/* 详细牌义百科 Modal */}
      <AnimatePresence>
        {modalCard && (
          <CardMeaningModal
            card={modalCard}
            onClose={() => setModalCard(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
