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
  const { playShuffle } = useAudio();
  const [drawnCount, setDrawnCount] = useState(0);
  const [shuffling, setShuffling] = useState(true);
  const [drawnCards, setDrawnCards] = useState<number[]>([]); // 记录被抽中的临时索引

  // 模拟自动洗牌 1.5 秒
  useEffect(() => {
    playShuffle();
    const timer = setTimeout(() => {
      setShuffling(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleDraw = () => {
    if (drawnCount >= neededCount || shuffling) return;
    const newDrawn = [...drawnCards, drawnCount];
    setDrawnCards(newDrawn);
    setDrawnCount(drawnCount + 1);

    if (drawnCount + 1 === neededCount) {
      onComplete(newDrawn);
    }
  };

  // 生成卡牌堆叠的辅助数组（只用来渲染一叠厚厚的牌的效果）
  const stackCards = Array.from({ length: 8 });

  return (
    <div className="w-full flex flex-col items-center justify-between min-h-[480px] py-4">
      {/* 1. 上方：牌阵空白卡槽 (Positions) */}
      <div className="w-full max-w-md px-4 flex justify-center gap-3 md:gap-5 my-6">
        {positions.map((posName, idx) => {
          const isDrawn = idx < drawnCount;
          return (
            <div
              key={idx}
              className="flex flex-col items-center flex-1 max-w-[120px]"
            >
              {/* 空白卡槽容器 */}
              <div className="relative w-full aspect-[2/3.5] rounded-xl border border-dashed border-gold/25 bg-[#0B0D13]/60 flex items-center justify-center overflow-hidden">
                {/* 如果已被抽中，用动画把牌飞进这里 */}
                {isDrawn ? (
                  <motion.div
                    initial={{ scale: 0.5, y: 200, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                    className="w-full h-full p-0.5"
                  >
                    <CardBack className="shadow-none border-gold/50" />
                  </motion.div>
                ) : (
                  /* 空槽的虚线十字和位置序号 */
                  <div className="flex flex-col items-center gap-1 select-none pointer-events-none">
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
              
              {/* 位置名称标签 (例如: 现状 / 阻碍 / 建议) */}
              <span className="text-[11px] md:text-xs text-gold/80 font-serif tracking-widest mt-2 text-center">
                {posName}
              </span>
            </div>
          );
        })}
      </div>

      {/* 2. 中间提示 */}
      <div className="h-6 flex items-center justify-center my-2">
        <AnimatePresence mode="wait">
          {shuffling ? (
            <motion.p
              key="shuffling"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-gold-muted font-serif tracking-widest animate-pulse"
            >
              ✦ 冥想您的困惑，正在神秘洗牌中 ✦
            </motion.p>
          ) : drawnCount < neededCount ? (
            <motion.p
              key="prompt"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-gold font-serif tracking-wider font-semibold animate-pulse"
            >
              ✦ 凭第一直觉，点击下方卡组抽取第 {drawnCount + 1} 张牌 ✦
            </motion.p>
          ) : (
            <motion.p
              key="done"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-gold-muted font-serif tracking-widest"
            >
              ✦ 抽牌已完成，等待揭示 ✦
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* 3. 下方：洗牌堆叠卡组 (Interactive Deck Stack) */}
      <div className="relative w-full h-[180px] flex items-center justify-center mt-6 select-none">
        {drawnCount < neededCount && (
          <div
            onClick={handleDraw}
            className={`relative w-[100px] h-[160px] cursor-pointer ${
              shuffling ? 'pointer-events-none' : ''
            }`}
          >
            {stackCards.map((_, idx) => {
              // 洗牌时做小幅左右扇形散开动画，非洗牌时堆叠在一起
              const rotateVal = shuffling ? (idx - 4) * 8 : (idx - 3) * 0.8;
              const xOffset = shuffling ? (idx - 4) * 12 : 0;
              const yOffset = -idx * 1.5;

              return (
                <motion.div
                  key={idx}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    top: yOffset,
                    left: 0,
                    zIndex: idx,
                  }}
                  animate={{
                    rotate: rotateVal,
                    x: xOffset,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 100,
                    damping: 20,
                    delay: idx * 0.05,
                  }}
                  whileHover={!shuffling ? { scale: 1.05, y: yOffset - 5 } : {}}
                  className="shadow-gold-glow"
                >
                  <CardBack className="border-gold/30" />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
