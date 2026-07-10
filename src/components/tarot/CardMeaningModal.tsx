'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Moon, Compass } from 'lucide-react';
import TarotCard from '@/components/tarot/TarotCard';
import { getLocalReadings } from '@/lib/db/localJournal';
import { spreads } from '@/lib/tarot/spreads';
import type { SelectedCard, TarotCard as TarotCardType } from '@/lib/tarot/types';

interface MeaningsModuleType {
  getCardMeaning: (cardId: string, orientation: 'upright' | 'reversed') => {
    general: string;
    love: string;
    career: string;
    advice: string;
  };
}

type ModalCard = TarotCardType | SelectedCard;

interface CardMeaningModalProps {
  card: ModalCard;
  onClose: () => void;
  drawnStats?: Record<string, number>;
}

function getInitialOrientation(card: ModalCard): 'upright' | 'reversed' {
  if ('orientation' in card && (card.orientation === 'upright' || card.orientation === 'reversed')) {
    return card.orientation;
  }
  return 'upright';
}

function CardMeaningModalInner({
  card,
  onClose,
  drawnStats,
  initialOrientation,
}: CardMeaningModalProps & { initialOrientation: 'upright' | 'reversed' }) {
  const [modalOrientation, setModalOrientation] = useState<'upright' | 'reversed'>(initialOrientation);
  const [modalRevealed, setModalRevealed] = useState(true);
  const [meaningsModule, setMeaningsModule] = useState<MeaningsModuleType | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('@/lib/tarot/meanings')
      .then((mod) => {
        if (!cancelled) setMeaningsModule(mod);
      })
      .catch((err) => console.error('Failed to load card meanings library dynamically:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  const cardMeaning = useMemo(() => {
    if (!meaningsModule) return null;
    return meaningsModule.getCardMeaning(card.id, modalOrientation);
  }, [card.id, modalOrientation, meaningsModule]);

  const personalStats = useMemo(() => {
    try {
      const readings = getLocalReadings();
      const cardReadings = readings.filter((r) =>
        Array.isArray(r.cards) && r.cards.some((c) => c.id === card.id)
      );
      if (cardReadings.length === 0) return null;

      const moodCounts: Record<string, number> = {};
      const spreadCounts: Record<string, number> = {};

      cardReadings.forEach((r) => {
        moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1;
        spreadCounts[r.spreadType] = (spreadCounts[r.spreadType] || 0) + 1;
      });

      let topMood = '';
      let maxMoodCount = 0;
      Object.entries(moodCounts).forEach(([mood, count]) => {
        if (count > maxMoodCount) {
          maxMoodCount = count;
          topMood = mood;
        }
      });

      let topSpread = '';
      let maxSpreadCount = 0;
      Object.entries(spreadCounts).forEach(([spreadKey, count]) => {
        if (count > maxSpreadCount) {
          maxSpreadCount = count;
          topSpread = spreadKey;
        }
      });

      const spreadName = spreads[topSpread as keyof typeof spreads]?.name || topSpread;

      return {
        count: cardReadings.length,
        topMood,
        topSpread: spreadName,
      };
    } catch (e) {
      console.error('Failed to compute personal stats for card:', e);
      return null;
    }
  }, [card.id]);

  const serverCard: SelectedCard = {
    ...card,
    orientation: modalOrientation,
    positionName: 'positionName' in card && card.positionName ? card.positionName : '占卜释意',
    positionOrder: 'positionOrder' in card && typeof card.positionOrder === 'number' ? card.positionOrder : 1,
  };

  const currentCount = drawnStats ? (drawnStats[card.id] || 0) : (personalStats?.count || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05060A]/85 backdrop-blur-md p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-sm rounded-2xl border border-gold/30 bg-[#0F1118]/95 p-5 shadow-gold-glow-lg flex flex-col gap-4 overflow-y-auto max-h-[90vh] no-scrollbar"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full border border-gold/15 bg-card/40 flex items-center justify-center text-gold/75 hover:border-gold/35 cursor-pointer z-10"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="w-full flex flex-col items-center gap-2 mt-2">
          <div className="scale-95 shadow-gold-glow">
            <TarotCard
              card={serverCard}
              revealed={modalRevealed}
              size="sm"
              onClick={() => setModalRevealed(!modalRevealed)}
            />
          </div>
          <p className="text-[9px] text-gold-muted/40 font-serif tracking-widest mt-1">
            💡 点击卡牌可进行 3D 翻转互动
          </p>
        </div>

        <div className="flex flex-col items-center text-center border-b border-gold/10 pb-3">
          <h2 className="text-lg font-serif text-gold font-bold tracking-widest">
            {card.zhName}
          </h2>
          <span className="text-[10px] text-gold-muted/65 font-mono tracking-wider mt-0.5 uppercase">
            {card.name}
          </span>

          <span className="text-[9px] font-serif text-gold-focus mt-1 px-2.5 py-0.5 rounded-full bg-gold/5 border border-gold/10 tracking-widest">
            {currentCount > 0 ? `✦ 累计已唤醒 ${currentCount} 次 ✦` : '✦ 潜意识中尚未唤醒过此牌 ✦'}
          </span>

          <div className="flex bg-[#07090F] p-0.5 rounded-lg border border-gold/15 mt-3.5 w-full max-w-[180px]">
            <button
              type="button"
              onClick={() => setModalOrientation('upright')}
              className={`flex-1 py-1 rounded-md text-[10px] font-serif tracking-widest cursor-pointer outline-none transition-all ${
                modalOrientation === 'upright'
                  ? 'bg-gold/10 text-gold font-semibold'
                  : 'text-gold-muted/50 hover:text-gold/75'
              }`}
            >
              正位
            </button>
            <button
              type="button"
              onClick={() => setModalOrientation('reversed')}
              className={`flex-1 py-1 rounded-md text-[10px] font-serif tracking-widest cursor-pointer outline-none transition-all ${
                modalOrientation === 'reversed'
                  ? 'bg-gold/10 text-gold font-semibold'
                  : 'text-gold-muted/50 hover:text-gold/75'
              }`}
            >
              逆位
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 py-1">
          {!meaningsModule ? (
            <div className="py-8 text-center text-xs text-gold-muted/50 font-serif animate-pulse">
              ✦ 正在加载牌义指引... ✦
            </div>
          ) : !cardMeaning ? (
            <div className="py-8 text-center text-xs text-gold-muted/50 font-serif">
              ✦ 牌义信息暂缺 ✦
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gold font-serif tracking-widest uppercase font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  <span>通用启示</span>
                </span>
                <p className="text-[11px] text-foreground/85 font-serif leading-relaxed tracking-wide font-medium">
                  {cardMeaning.general}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gold font-serif tracking-widest uppercase font-semibold flex items-center gap-1.5">
                  <Moon className="w-3 h-3" />
                  <span>感情与关系</span>
                </span>
                <p className="text-[11px] text-foreground/85 font-serif leading-relaxed tracking-wide font-medium">
                  {cardMeaning.love}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gold font-serif tracking-widest uppercase font-semibold flex items-center gap-1.5">
                  <Compass className="w-3 h-3" />
                  <span>职业与抉择</span>
                </span>
                <p className="text-[11px] text-foreground/85 font-serif leading-relaxed tracking-wide font-medium">
                  {cardMeaning.career}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gold font-serif tracking-widest uppercase font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  <span>行动指引</span>
                </span>
                <p className="text-[11px] text-foreground/85 font-serif leading-relaxed tracking-wide font-medium">
                  {cardMeaning.advice}
                </p>
              </div>

              {personalStats && (
                <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-gold/20 bg-[#16130E]/60 shadow-[inset_0_0_8px_rgba(201,167,106,0.15)] mt-2">
                  <span className="text-[10px] text-gold font-serif tracking-widest uppercase font-semibold flex items-center gap-1.5 border-b border-gold/10 pb-1.5">
                    <Moon className="w-3 h-3 text-gold animate-pulse" />
                    <span>个人心智共鸣 (Resonance)</span>
                  </span>
                  <p className="text-[10px] text-gold-muted/85 font-serif leading-relaxed tracking-wider mt-1">
                    此牌已在您的情绪日记中累计被唤醒过 <strong className="text-gold font-bold">{personalStats.count}</strong> 次。
                    当您抽中它时，您的内心大多处于 <strong className="text-gold font-bold">「{personalStats.topMood}」</strong> 的心境，
                    并且最常在进行 <strong className="text-gold font-bold">「{personalStats.topSpread}」</strong> 觉察时遇到它。
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function CardMeaningModal({ card, onClose, drawnStats }: CardMeaningModalProps) {
  if (!card) return null;

  // Remount when card changes so orientation resets without effect-setState
  return (
    <CardMeaningModalInner
      key={card.id}
      card={card}
      onClose={onClose}
      drawnStats={drawnStats}
      initialOrientation={getInitialOrientation(card)}
    />
  );
}
