'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CardBack from './CardBack';
import { useAudio } from '@/hooks/useAudio';

interface CardDeckProps {
  neededCount: number;
  positions: string[];
  onComplete: (drawnIndices: number[]) => void;
}

type ShufflingState = 'initial' | 'stirring' | 'cutting' | 'expanding' | 'ready';

export default function CardDeck({ neededCount, positions, onComplete }: CardDeckProps) {
  const { playShuffle, playReveal, playShuffleScratch } = useAudio();
  const [shufflingState, setShufflingState] = useState<ShufflingState>('initial');
  const [shuffleProgress, setShuffleProgress] = useState(0);
  const [cutStep, setCutStep] = useState<number[]>([]);
  
  // 底部牌堆中的卡片（总共22张大阿卡纳卡背代表）
  const [cards, setCards] = useState(() =>
    Array.from({ length: 22 }).map((_, i) => ({ index: i, isDrawn: false }))
  );
  
  // 记录牌阵卡槽 [0, 1, 2] 分别对应抽了牌堆里的第几张牌的 index
  const [slotMapping, setSlotMapping] = useState<Record<number, number>>({});
  const [drawnCount, setDrawnCount] = useState(0);

  // 搅拌洗牌阶段卡牌的随机浮动状态
  const [stirringCards, setStirringCards] = useState<{ id: number; x: number; y: number; rotate: number }[]>([]);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const accumDistance = useRef(0);

  // 初始化搅拌卡牌的随机位置
  useEffect(() => {
    if (shufflingState === 'initial') {
      const initialStirring = Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        x: Math.random() * 160 - 80,
        y: Math.random() * 80 - 40,
        rotate: Math.random() * 180 - 90,
      }));
      setStirringCards(initialStirring);
      setShufflingState('stirring');
    }
  }, [shufflingState]);

  // 搅拌阶段让卡牌进行缓慢的怠速漂浮
  useEffect(() => {
    if (shufflingState !== 'stirring') return;

    const interval = setInterval(() => {
      setStirringCards(prev =>
        prev.map(c => ({
          ...c,
          x: c.x + (Math.random() * 20 - 10),
          y: c.y + (Math.random() * 14 - 7),
          rotate: c.rotate + (Math.random() * 30 - 15),
        }))
      );
    }, 2500);

    return () => clearInterval(interval);
  }, [shufflingState]);

  // 搅拌洗牌的手势跟踪
  const handleStirMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (shufflingState !== 'stirring') return;

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    if (lastMousePos.current) {
      const dx = clientX - lastMousePos.current.x;
      const dy = clientY - lastMousePos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      accumDistance.current += dist;

      // 每移动一定距离，播放卡牌摩擦音，并增加洗牌进度
      if (accumDistance.current > 45) {
        accumDistance.current = 0;
        setShuffleProgress(prev => {
          const next = Math.min(prev + 3, 100);
          if (next >= 100) {
            playReveal(); // 播放一声亮磬暗示洗牌结束
            setTimeout(() => {
              setShufflingState('cutting');
            }, 600);
          } else {
            playShuffleScratch(0.045);
          }
          return next;
        });

        // 搅拌时让漂浮的卡牌跟着晃动一下，增加交互视觉回馈
        setStirringCards(prev =>
          prev.map(c => {
            if (Math.random() > 0.6) {
              return {
                ...c,
                x: Math.max(-120, Math.min(120, c.x + dx * 0.4)),
                y: Math.max(-60, Math.min(60, c.y + dy * 0.4)),
                rotate: c.rotate + (dx + dy) * 0.3,
              };
            }
            return c;
          })
        );
      }
    }
    lastMousePos.current = { x: clientX, y: clientY };
  };

  const handleStirEnd = () => {
    lastMousePos.current = null;
  };

  // 点击进行切牌三叠拼合
  const handleCutClick = (pileIdx: number) => {
    if (shufflingState !== 'cutting' || cutStep.includes(pileIdx)) return;
    playShuffleScratch(0.06);
    
    const nextSteps = [...cutStep, pileIdx];
    setCutStep(nextSteps);

    // 如果三叠牌全部被重新选定
    if (nextSteps.length === 3) {
      setTimeout(() => {
        setShufflingState('expanding');
        playShuffle(); // 播放展牌沙沙声
        
        // 展牌动画 1.5 秒后完成，可以开始选牌
        setTimeout(() => {
          setShufflingState('ready');
        }, 1500);
      }, 700);
    }
  };

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
          {shufflingState === 'stirring' && (
            <motion.div
              key="stirring"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex flex-col items-center gap-2"
            >
              <p className="text-xs text-gold font-serif tracking-widest animate-pulse">
                ✦ 闭上双眼，在下方打圈摩擦洗牌注入意念 ✦
              </p>
              {/* 极其精致的洗牌进度条 */}
              <div className="w-44 h-1 bg-gold/15 rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full bg-gradient-to-r from-gold/40 via-gold to-gold/40 shadow-gold-glow"
                  style={{ width: `${shuffleProgress}%` }}
                />
              </div>
            </motion.div>
          )}

          {shufflingState === 'cutting' && (
            <motion.p
              key="cutting"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-gold font-serif tracking-widest animate-pulse font-semibold"
            >
              ✦ 凭第一直觉，依次点击切分并拼合三叠牌堆 ({cutStep.length}/3) ✦
            </motion.p>
          )}

          {shufflingState === 'expanding' && (
            <motion.p
              key="expanding"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs text-gold-muted font-serif tracking-widest animate-[pulse_1s_infinite]"
            >
              ✦ 破而后立，正在顺时针展牌 ✦
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
              ✦ 左右拨动牌堆，凭第一直觉点击抽选 {drawnCount + 1}/{neededCount} 张牌 ✦
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* 下方交互区域：根据状态机渲染不同的操作场景 */}
      <div className="w-full relative h-[190px] flex items-center justify-center overflow-hidden my-4">
        
        {/* 背景微光圈 */}
        <div className="absolute inset-0 bg-radial-gradient from-gold/5 via-transparent to-transparent pointer-events-none blur-xl" />

        {/* 场景 1：手势搅拌洗牌 */}
        {shufflingState === 'stirring' && (
          <div
            className="w-full h-full relative flex items-center justify-center touch-none"
            onMouseMove={handleStirMove}
            onMouseLeave={handleStirEnd}
            onMouseUp={handleStirEnd}
            onTouchMove={handleStirMove}
            onTouchEnd={handleStirEnd}
          >
            {/* 混沌磁场圆形感应边界 */}
            <div className="absolute w-[260px] h-[150px] rounded-full border border-dashed border-gold/10 flex items-center justify-center bg-gold/[0.01]" />
            
            {stirringCards.map(c => (
              <motion.div
                key={c.id}
                animate={{
                  x: c.x,
                  y: c.y,
                  rotate: c.rotate,
                }}
                transition={{ type: 'spring', stiffness: 20, damping: 10 }}
                className="absolute w-[65px] h-[110px] pointer-events-none opacity-80"
              >
                <CardBack className="w-full h-full border border-gold/15" />
              </motion.div>
            ))}
          </div>
        )}

        {/* 场景 2：切牌三叠仪式 */}
        {shufflingState === 'cutting' && (
          <div className="flex items-center gap-6 justify-center w-full h-full">
            {[0, 1, 2].map(pileIdx => {
              const clicked = cutStep.includes(pileIdx);
              // 点击后的叠牌收拢动画位移
              const animateX = clicked 
                ? (1 - cutStep.indexOf(pileIdx)) * -10 // 被按顺序收拢到中间
                : 0;

              return (
                <div
                  key={pileIdx}
                  onClick={() => handleCutClick(pileIdx)}
                  className={`relative w-[65px] h-[110px] ${
                    clicked ? 'pointer-events-none' : 'cursor-pointer hover:shadow-gold-glow border border-gold/15 rounded-lg'
                  }`}
                >
                  <motion.div
                    animate={{
                      x: animateX,
                      y: clicked ? -2 : 0,
                      scale: clicked ? 0.95 : 1,
                      opacity: clicked ? 0.4 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                    className="w-full h-full"
                  >
                    {/* 给切牌的三个牌堆绘制几张卡牌叠加的效果，使其看起来像一沓牌 */}
                    <div className="absolute top-1 left-1 w-full h-full bg-[#07090F] border border-gold/5 rounded-lg shadow-sm" />
                    <div className="absolute top-0.5 left-0.5 w-full h-full bg-[#07090F] border border-gold/10 rounded-lg shadow-sm" />
                    <CardBack className="w-full h-full relative z-10" />
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}

        {/* 场景 3：呼啦摊牌展牌动画 */}
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
                    delay: idx * 0.035, // 呼啦依次展开排开
                  }}
                >
                  <CardBack className="w-full h-full border border-gold/15 shadow-gold-glow" />
                </motion.div>
              );
            })}
          </div>
        )}

        {/* 场景 4：左右拨动牌堆手选抽牌 */}
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

// 抽取出来的卡片包裹层，用来管理每张卡背独立的 Hover 状态并向上升腾粒子
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
              y: yOffset - 32, // 悬停浮起动画
              scale: 1.1,
              rotate: 0, // 摆正
              transition: { duration: 0.22, ease: 'easeOut' }
            }}
            transition={{ type: 'spring', stiffness: 70, damping: 14 }}
            className="w-[78px] h-[135px] rounded-lg cursor-pointer hover:shadow-gold-glow-lg border border-gold/10 relative"
          >
            <CardBack className="w-full h-full" />

            {/* 神秘上升粒子特效 (升腾金色星砂) */}
            {hovered && (
              <div className="absolute inset-0 pointer-events-none overflow-visible">
                {Array.from({ length: 4 }).map((_, pIdx) => (
                  <motion.div
                    key={pIdx}
                    initial={{
                      x: 20 + Math.random() * 38,
                      y: 110,
                      opacity: 0.9,
                      scale: 0.5 + Math.random() * 0.7
                    }}
                    animate={{
                      y: -40,
                      opacity: 0,
                      scale: 0.2
                    }}
                    transition={{
                      duration: 0.75 + Math.random() * 0.45,
                      ease: 'easeOut',
                      repeat: Infinity,
                      delay: pIdx * 0.18
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
