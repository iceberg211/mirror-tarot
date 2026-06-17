'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CardBack from './CardBack';
import { useAudio } from '@/hooks/useAudio';

interface CardDeckProps {
  neededCount: number;
  positions: string[];
  onComplete: (drawnIndices: number[]) => void;
}

type ShufflingState = 'shuffling' | 'expanding' | 'ready';

export default function CardDeck({ neededCount, positions, onComplete }: CardDeckProps) {
  const { playShuffle, playReveal } = useAudio();
  const [shufflingState, setShufflingState] = useState<ShufflingState>('shuffling');
  
  // 底部牌堆中的卡片（总共22张大阿卡纳卡背代表）
  const [cards, setCards] = useState(() =>
    Array.from({ length: 22 }).map((_, i) => ({ index: i, isDrawn: false }))
  );
  
  // 记录牌阵卡槽 [0, 1, 2] 分别对应抽了牌堆里的第几张牌的 index
  const [slotMapping, setSlotMapping] = useState<Record<number, number>>({});
  const [drawnCount, setDrawnCount] = useState(0);

  // 挂载后自动执行洗牌和展牌过渡，无需繁琐的手动搅拌与切牌
  useEffect(() => {
    playShuffle();
    let timer2: ReturnType<typeof setTimeout> | undefined;
    const timer1 = setTimeout(() => {
      setShufflingState('expanding');
      timer2 = setTimeout(() => {
        setShufflingState('ready');
      }, 1500);
    }, 1500);
    return () => {
      clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
    };
  }, [playShuffle]);

  // 物理震动触发
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(8);
    }
  };

  // 点击抽出底部牌龙里的某张牌
  const handleDrawCard = (cardIndex: number) => {
    if (shufflingState !== 'ready' || drawnCount >= neededCount) return;
    
    // 如果该张牌已经被抽走，不可重复抽取
    const targetCard = cards.find(c => c.index === cardIndex);
    if (!targetCard || targetCard.isDrawn) return;

    // 播放翻牌磬声
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
      const drawnIndices = Array.from({ length: neededCount }).map((_, idx) => newMapping[idx]);
      
      // 延迟 0.9s 执行 onComplete，让飞行 Shared Layout 动画播放完毕
      setTimeout(() => {
        onComplete(drawnIndices);
      }, 900);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-between min-h-[490px] py-4 select-none">
      
      {/* 上方：牌阵空白卡槽 */}
      <div className="w-full max-w-md px-4 flex justify-center gap-3 md:gap-5 my-6">
        {positions.map((posName, idx) => {
          const mappedCardIndex = slotMapping[idx];
          const hasCard = mappedCardIndex !== undefined;

          return (
            <div key={idx} className="flex flex-col items-center flex-1 max-w-[120px]">
              <div className="relative w-full aspect-[2/3.5] rounded-xl border border-dashed border-gold/25 bg-[#0B0D13]/60 flex items-center justify-center overflow-visible">
                {hasCard ? (
                  <motion.div
                    layoutId={`deck-card-${mappedCardIndex}`}
                    className="w-full h-full p-0.5 relative z-20"
                    transition={{ type: 'spring', stiffness: 95, damping: 15 }}
                  >
                    <CardBack className="shadow-gold-glow border-gold/60" />
                  </motion.div>
                ) : (
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
      <div className="h-10 flex flex-col items-center justify-center my-1">
        <AnimatePresence mode="wait">
          {shufflingState === 'shuffling' && (
            <motion.p
              key="shuffling"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-gold-muted font-serif tracking-widest animate-pulse"
            >
              ✦ 闭上双眼，正在感应星轨洗牌中 ✦
            </motion.p>
          )}

          {shufflingState === 'expanding' && (
            <motion.p
              key="expanding"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-gold font-serif tracking-widest animate-[pulse_1s_infinite] font-semibold"
            >
              ✦ 洗牌完毕，正在铺开塔罗牌龙 ✦
            </motion.p>
          )}

          {shufflingState === 'ready' && (
            <motion.p
              key="picking"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-gold font-serif tracking-widest animate-pulse font-semibold"
            >
              ✦ 左右拨动牌堆，凭第一直觉点击抽选卡牌 (已抽选 {drawnCount}/{neededCount} 张) ✦
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* 下方交互区域 */}
      <div className="w-full relative h-[190px] flex items-center justify-center overflow-hidden my-4">
        
        {/* 背景微光圈 */}
        <div className="absolute inset-0 bg-radial-gradient from-gold/5 via-transparent to-transparent pointer-events-none blur-xl" />

        {/* 1. 自动洗牌叠牌状态 */}
        {shufflingState === 'shuffling' && (
          <div className="relative w-[100px] h-[135px] flex items-center justify-center">
            {Array.from({ length: 8 }).map((_, idx) => {
              // 模拟叠牌洗牌微弱错落动画
              const rotateVal = (idx - 4) * 1.5;
              const yOffset = -idx * 1.2;

              return (
                <motion.div
                  key={idx}
                  style={{
                    position: 'absolute',
                    width: '78px',
                    height: '135px',
                    top: yOffset,
                    zIndex: idx,
                  }}
                  animate={{
                    x: [0, (idx % 2 === 0 ? 8 : -8), 0],
                    rotate: [rotateVal, rotateVal + (idx % 2 === 0 ? 3 : -3), rotateVal],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: idx * 0.05,
                  }}
                  className="shadow-gold-glow"
                >
                  <CardBack className="border border-gold/15" />
                </motion.div>
              );
            })}
          </div>
        )}

        {/* 2. 自动依次展牌动画 */}
        {shufflingState === 'expanding' && (
          <div className="relative w-[100px] h-[135px] flex items-center justify-center">
            {cards.map((card, idx) => {
              const relativeIndex = idx - 10.5;
              const targetAngle = relativeIndex * 2.2;
              const targetY = Math.pow(Math.abs(relativeIndex), 1.7) * 0.16;

              return (
                <motion.div
                  key={idx}
                  className="absolute w-[78px] h-[135px] pointer-events-none"
                  initial={{ rotate: 0, y: 0, x: 0 }}
                  animate={{
                    rotate: targetAngle,
                    y: targetY,
                    x: relativeIndex * 1.5,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 85,
                    damping: 14,
                    delay: idx * 0.035,
                  }}
                >
                  <CardBack className="w-full h-full border border-gold/15 shadow-gold-glow" />
                </motion.div>
              );
            })}
          </div>
        )}

        {/* 3. 抽牌就绪：横向滚动牌龙 */}
        {shufflingState === 'ready' && (
          <div className="w-full h-full overflow-x-auto no-scrollbar py-6 flex items-center scroll-smooth snap-x snap-mandatory">
            <div className="flex items-center pl-[35vw] pr-[35vw] gap-0">
              {cards.map((card) => {
                const { index, isDrawn } = card;

                const relativeIndex = index - 10.5;
                const angle = relativeIndex * 2.2;
                const yOffset = Math.pow(Math.abs(relativeIndex), 1.7) * 0.16;

                return (
                  <CardWrapper
                    key={index}
                    index={index}
                    isDrawn={isDrawn}
                    angle={angle}
                    yOffset={yOffset}
                    triggerHaptic={triggerHaptic}
                    onClick={() => handleDrawCard(index)}
                  />
                );
              })}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

// 抽取出来的卡片包裹层，管理每张卡背独立的 Hover 状态并向上升腾粒子
interface CardWrapperProps {
  index: number;
  isDrawn: boolean;
  angle: number;
  yOffset: number;
  triggerHaptic: () => void;
  onClick: () => void;
}

function CardWrapper({ index, isDrawn, angle, yOffset, triggerHaptic, onClick }: CardWrapperProps) {
  const [hovered, setHovered] = useState(false);
  const particleConfigs = useMemo(
    () =>
      Array.from({ length: 4 }).map((_, particleIndex) => ({
        x: 20 + seededRatio(index, particleIndex, 1) * 38,
        scale: 0.5 + seededRatio(index, particleIndex, 2) * 0.7,
        duration: 0.75 + seededRatio(index, particleIndex, 3) * 0.45,
        delay: particleIndex * 0.18,
      })),
    [index]
  );

  const handleTouch = () => {
    triggerHaptic();
  };

  return (
    <div
      className="flex-shrink-0 snap-center relative"
      style={{
        marginLeft: index === 0 ? '0px' : '-3.5rem', 
        zIndex: isDrawn ? 10 : hovered ? 100 : index,
      }}
    >
      <AnimatePresence>
        {!isDrawn && (
          <motion.div
            layoutId={`deck-card-${index}`}
            onClick={onClick}
            onMouseEnter={() => {
              setHovered(true);
              triggerHaptic();
            }}
            onMouseLeave={() => setHovered(false)}
            onTouchStart={handleTouch}
            animate={{
              rotate: angle,
              y: yOffset,
              scale: 1,
            }}
            whileHover={{
              y: yOffset - 32,
              scale: 1.1,
              rotate: 0,
              transition: { duration: 0.22, ease: 'easeOut' }
            }}
            transition={{ type: 'spring', stiffness: 70, damping: 14 }}
            className="w-[78px] h-[135px] rounded-lg cursor-pointer hover:shadow-gold-glow-lg border border-gold/10 relative"
          >
            <CardBack className="w-full h-full" />

            {/* 升腾金色星砂粒子 */}
            {hovered && (
              <div className="absolute inset-0 pointer-events-none overflow-visible">
                {particleConfigs.map((particle, pIdx) => (
                  <motion.div
                    key={pIdx}
                    initial={{
                      x: particle.x,
                      y: 110,
                      opacity: 0.9,
                      scale: particle.scale
                    }}
                    animate={{
                      y: -40,
                      opacity: 0,
                      scale: 0.2
                    }}
                    transition={{
                      duration: particle.duration,
                      ease: 'easeOut',
                      repeat: Infinity,
                      delay: particle.delay
                    }}
                    className="absolute w-1 h-1 rounded-full bg-[#E5C158] shadow-[0_0_5px_#E5C158]"
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function seededRatio(index: number, particleIndex: number, salt: number) {
  const raw = Math.sin((index + 1) * 97.13 + (particleIndex + 1) * 31.7 + salt * 11.11) * 10000;
  return raw - Math.floor(raw);
}
