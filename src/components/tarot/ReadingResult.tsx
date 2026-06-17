'use client';

import React, { useState, useMemo } from 'react';
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

export default function ReadingResult({ parsedReading, cards, generating, activeFocusIndex = -1 }: ReadingResultProps) {
  const [activeTab, setActiveTab] = useState<'contradiction' | 'overlooked' | 'advice' | 'reminder'>('contradiction');

  const tabs = useMemo(() => TAB_CONFIG.map(tab => ({
    id: tab.id,
    name: tab.name,
    icon: tab.icon,
    content: parsedReading[tab.key]
  })), [parsedReading]);

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
        {cards.map((card, idx) => {
          const cardInterpretation = parsedReading.cardReadings[idx];
          
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.15 }}
              className="p-4 rounded-xl border border-gold/15 bg-[#0F1117]/60 flex flex-col gap-2"
            >
              {/* 卡牌与位置标题 */}
              <div className="flex justify-between items-center border-b border-gold/10 pb-2">
                <span className="text-[11px] text-gold font-serif font-semibold tracking-widest uppercase">
                  {idx + 1}. {card.positionName} ✦ {card.zhName}
                </span>
                <span className={`text-[9px] font-mono tracking-widest px-2 py-0.5 rounded-full ${
                  card.orientation === 'reversed' 
                    ? 'text-red-400/80 bg-red-950/20 border border-red-900/20' 
                    : 'text-gold/80 bg-gold/5 border border-gold/15'
                }`}>
                  {card.orientation === 'reversed' ? '逆位' : '正位'}
                </span>
              </div>
              
              {/* 卡牌文本内容 */}
              <p className="text-xs text-foreground/85 font-serif leading-relaxed tracking-wide pt-1">
                {cardInterpretation?.interpretation ? (
                  <>
                    {cardInterpretation.interpretation}
                    {generating && activeFocusIndex === idx && (
                      <span className="inline-block text-gold ml-1 font-sans font-bold animate-pulse select-none">
                        ✦
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
            </motion.div>
          );
        })}
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
