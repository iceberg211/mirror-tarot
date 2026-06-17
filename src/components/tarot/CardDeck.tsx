'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CardBack from './CardBack';
import { useAudio } from '@/hooks/useAudio';

interface CardDeckProps {
  neededCount: number;
  positions: string[];
  onComplete: (drawnIndices: number[]) => void;
}

export default function CardDeck({ neededCount, positions, onComplete }: CardDeckProps) {
  const { playShuffle, playReveal } = useAudio();
  const [shuffling, setShuffling] = useState(true);
  
  // 底部牌堆中的卡片（总共22张大阿卡纳卡背代表）
  const [cards, setCards] = useState(() =>
    Array.from({ length: 22 }).map((_, i) => ({ index: i, isDrawn: false }))
  );
  
  // 记录牌阵卡槽 [0, 1, 2] 分别对应抽了牌堆里的第几张牌的 index
  const [slotMapping, setSlotMapping] = useState<Record<number, number>>({});
  const [drawnCount, setDrawnCount] = useState(0);

  // 1. 模拟洗牌 1.5 秒，播放洗牌音效
  useEffect(() => {
    playShuffle();
    const timer = setTimeout(() => {
      setShuffling(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // 2. 点击抽出底部牌堆里的某张牌
  const handleDrawCard = (cardIndex: number) => {
    if (shuffling || drawnCount >= neededCount) return;
    
    // 如果该张牌已经被抽走，不可重复抽取
    const targetCard = cards.find(c => c.index === cardIndex);
    if (!targetCard || targetCard.isDrawn) return;

    // 播放水晶翻牌磬声
    playReveal();

    // 更新牌龙的抽取状态
    setCards(prev => prev.map(c => c.index === cardIndex ? { ...c, isDrawn: true } : c));

    // 绑定卡槽映射
    const newMapping = { ...slotMapping, [drawnCount]: cardIndex };
    setSlotMapping(newMapping);
    
    const nextDrawnCount = drawnCount + 1;
    setDrawnCount(nextDrawnCount);

    // 如果抽满了
    if (nextDrawnCount === neededCount) {
      // 提取被抽中的卡牌索引数组传回父组件，父组件会拿它当随机数种子去跟真实卡牌做映射
      const drawnIndices = Array.from({ length: neededCount }).map((_, idx) => newMapping[idx]);
      
      // 延迟 0.9s 执行 onComplete，让飞入跨容器 Shared Layout 动画播放完毕
      setTimeout(() => {
        onComplete(drawnIndices);
      }, 900);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-between min-h-[490px] py-4 select-none">
      
      {/* 上方：牌阵空白卡槽 (Drawn Positions) */}
      <div className="w-full max-w-md px-4 flex justify-center gap-3 md:gap-5 my-6">
        {positions.map((posName, idx) => {
          const mappedCardIndex = slotMapping[idx];
          const hasCard = mappedCardIndex !== undefined;

          return (
            <div key={idx} className="flex flex-col items-center flex-1 max-w-[120px]">
              {/* 卡槽容器 */}
              <div className="relative w-full aspect-[2/3.5] rounded-xl border border-dashed border-gold/25 bg-[#0B0D13]/60 flex items-center justify-center overflow-visible">
                {hasCard ? (
                  // 使用 layoutId 让卡牌从底部飞到这里
                  <motion.div
                    layoutId={`deck-card-${mappedCardIndex}`}
                    className="w-full h-full p-0.5 relative z-20"
                    transition={{ type: 'spring', stiffness: 95, damping: 15 }}
                  >
                    <CardBack className="shadow-gold-glow border-gold/60" />
                  </motion.div>
                ) : (
                  /* 空槽十字 */
                  <div className="flex flex-col items-center gap-1 select-none pointer-events-none opacity-50">
                    <span className="text-gold/45 text-[10px] font-mono">✦ {idx + 1} ✦</span>
                    <div className="w-4 h-4 text-gold/30">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              
              <span className="text-[11px] md:text-xs text-gold/80 font-serif tracking-widest mt-2.5 text-center font-medium">
                {posName}
              </span>
            </div>
          );
        })}
      </div>

      {/* 中间引导提示语 */}
      <div className="h-6 flex items-center justify-center my-1">
        <AnimatePresence mode="wait">
          {shuffling ? (
            <motion.p
              key="shuffling"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-gold-muted font-serif tracking-widest animate-pulse"
            >
              ✦ 闭上双眼，正在感应星轨洗牌中 ✦
            </motion.p>
          ) : drawnCount < neededCount ? (
            <motion.p
              key="picking"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-gold font-serif tracking-widest animate-pulse font-semibold"
            >
              ✦ 左右拨动牌堆，凭第一直觉点击抽选 {drawnCount + 1}/{neededCount} 张牌 ✦
            </motion.p>
          ) : (
            <motion.p
              key="complete"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-gold-muted font-serif tracking-widest animate-[pulse_1.5s_infinite]"
            >
              ✦ 选定完毕，正在同步心智映射 ✦
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* 下方：支持横向滑动的扇形重叠牌龙 */}
      <div className="w-full relative h-[190px] flex items-center justify-center overflow-hidden my-4">
        
        {/* 背景微光圈 */}
        <div className="absolute inset-0 bg-radial-gradient from-gold/5 via-transparent to-transparent pointer-events-none blur-xl" />

        {/* 隐藏滚动条的水平长卷滚动条 */}
        <div className="w-full h-full overflow-x-auto no-scrollbar py-6 flex items-center scroll-smooth snap-x snap-mandatory">
          {/* 两侧 padding 占位，确保最左/最右的卡牌可以被拨动到屏幕正中间 */}
          <div className="flex items-center pl-[35vw] pr-[35vw] gap-0">
            {cards.map((card) => {
              const { index, isDrawn } = card;

              // 计算当前卡背的圆弧排布（rotate 与 y 位移）
              // 22 张卡，中心在 10.5。离中心越远，旋转度 rotate 越大，向下弯曲偏移 y 越大
              const relativeIndex = index - 10.5;
              const angle = shuffling ? 0 : relativeIndex * 2.2; // 洗牌时合拢(0度)，洗牌完展开
              const yOffset = shuffling ? 0 : Math.pow(Math.abs(relativeIndex), 1.7) * 0.16;

              return (
                <div
                  key={index}
                  className="flex-shrink-0 snap-center relative"
                  style={{
                    // 负边距实现横向重叠长龙
                    marginLeft: index === 0 ? '0px' : '-3.5rem', 
                    zIndex: isDrawn ? 10 : index,
                  }}
                >
                  <AnimatePresence>
                    {!isDrawn && (
                      <motion.div
                        layoutId={`deck-card-${index}`}
                        onClick={() => handleDrawCard(index)}
                        animate={{
                          rotate: angle,
                          y: yOffset,
                          scale: shuffling ? 0.9 : 1,
                        }}
                        whileHover={!shuffling ? {
                          y: yOffset - 32, // 悬停浮起动画
                          scale: 1.1,
                          rotate: 0, // 悬停时摆正
                          zIndex: 100, // 确保浮起在最前
                          transition: { duration: 0.25, ease: 'easeOut' }
                        } : {}}
                        transition={{ type: 'spring', stiffness: 70, damping: 14 }}
                        className={`w-[78px] h-[135px] rounded-lg cursor-pointer ${
                          shuffling ? 'pointer-events-none opacity-85' : 'hover:shadow-gold-glow-lg border border-gold/10'
                        }`}
                      >
                        <CardBack className="w-full h-full" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
