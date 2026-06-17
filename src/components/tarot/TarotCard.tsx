'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { SelectedCard } from '@/lib/tarot/types';
import CardBack from './CardBack';
import { useAudio } from '@/hooks/useAudio';

interface TarotCardProps {
  card?: SelectedCard;
  revealed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  interactive?: boolean;
  className?: string;
  onScratchFinished?: () => void;
}

// 尺寸映射
const sizeClasses = {
  sm: 'w-[100px] h-[175px] text-xs',
  md: 'w-[160px] h-[280px] text-sm',
  lg: 'w-[220px] h-[385px] text-base',
};

export default function TarotCard({
  card,
  revealed = false,
  size = 'md',
  onClick,
  interactive = true,
  className = '',
  onScratchFinished,
}: TarotCardProps) {
  const { playReveal } = useAudio();
  const [imageError, setImageError] = useState(false);
  const hasRevealedRef = useRef(false);

  useEffect(() => {
    if (revealed) {
      if (!hasRevealedRef.current) {
        hasRevealedRef.current = true;
        playReveal();
        // 如果外部传入了 onScratchFinished 回调，直接同步触发
        if (onScratchFinished) {
          onScratchFinished();
        }
      }
    } else {
      hasRevealedRef.current = false;
    }
  }, [onScratchFinished, playReveal, revealed]);

  const handleCardClick = () => {
    if (interactive && onClick) {
      onClick();
    }
  };



  return (
    <div
      onClick={handleCardClick}
      className={`perspective-1000 select-none ${interactive && onClick ? 'cursor-pointer' : ''} ${sizeClasses[size]} ${className}`}
    >
      <motion.div
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: revealed ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        whileHover={interactive ? { y: -8, scale: 1.02 } : {}}
        className="relative w-full h-full duration-300"
      >
        {/* 卡背 (0度方向，背面遮挡) */}
        <div className="absolute inset-0 backface-hidden z-10">
          <CardBack />
        </div>

        {/* 卡面 (旋转180度，翻转后可见) */}
        <div
          className="absolute inset-0 backface-hidden z-20 rounded-xl overflow-hidden border border-gold/40 shadow-gold-glow bg-[#0E1017] p-2 flex flex-col justify-between"
          style={{ transform: 'rotateY(180deg)' }}
        >
          {/* 四角框饰 */}
          <div className="absolute inset-1 border border-gold/15 rounded-[10px] pointer-events-none" />

          {/* 正逆位容器外壳保持正立 */}
          <div className="w-full h-full flex flex-col justify-between">
            {/* 顶部牌名 (英文) */}
            <div className="text-[10px] text-gold-muted font-serif tracking-widest text-center mt-1 uppercase">
              {card?.name || 'TAROT CARD'}
            </div>

            {/* 卡牌图象或精致占位符 */}
            <div className="flex-1 my-2 mx-1 rounded-lg overflow-hidden bg-[#06080C] border border-gold/10 relative flex items-center justify-center">
              {!imageError && card?.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={card.image}
                  alt={card.zhName}
                  onError={() => setImageError(true)}
                  className={`w-full h-full object-cover transition-transform duration-500 ${
                    card?.orientation === 'reversed' ? 'rotate-180' : ''
                  }`}
                />
              ) : (
                /* 极其唯美的金色占位符，如果图片丢失或未下载好时渲染 */
                <div className={`w-full h-full p-4 flex flex-col justify-between items-center bg-gradient-to-b from-[#090C12] to-[#040608] relative transition-transform duration-500 ${
                  card?.orientation === 'reversed' ? 'rotate-180' : ''
                }`}>
                  {/* 金色线条图案 */}
                  <div className="absolute inset-3 border border-dashed border-gold/5 rounded-md" />
                  
                  {/* 中心神秘星轨图 */}
                  <div className="relative w-16 h-16 rounded-full border border-gold/15 flex items-center justify-center animate-[spin_60s_linear_infinite]">
                    <div className="w-12 h-12 rounded-full border border-dashed border-gold/10" />
                    <div className="absolute w-2 h-2 rounded-full bg-gold/30" />
                    {/* 小星座饰 */}
                    <div className="absolute top-1 left-4 w-1 h-1 rounded-full bg-gold/40" />
                    <div className="absolute bottom-2 right-3 w-1 h-1 rounded-full bg-gold/40" />
                  </div>

                  <span className="text-2xl font-serif text-gold/30 select-none">
                    {card?.number !== undefined ? card.number.toString().padStart(2, '0') : '✦'}
                  </span>
                </div>
              )}

              {/* 正位/逆位的水印文本：悬浮浮层，在任何情况下保持正立 */}
              <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none z-30">
                <span className="text-[9px] font-mono tracking-widest text-gold/80 bg-[#0E1017]/90 px-2.5 py-0.5 rounded-full border border-gold/15 shadow-md">
                  {card?.orientation === 'reversed' ? 'REVERSED ✦ 逆位' : 'UPRIGHT ✦ 正位'}
                </span>
              </div>
            </div>

            {/* 底部牌名 (中文) */}
            <div className="flex flex-col items-center mb-1">
              <span className="text-sm font-serif text-gold tracking-widest font-semibold filter drop-shadow-[0_0_2px_rgba(201,167,106,0.3)]">
                {card?.zhName || '未命名'}
              </span>
              <span className="text-[9px] text-gold-muted/70 font-mono tracking-wider mt-0.5">
                {card?.arcana === 'major' ? `Major Arcana ✦ ${card.number}` : `Minor Arcana`}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
