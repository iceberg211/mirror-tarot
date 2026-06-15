import React from 'react';

interface CardBackProps {
  className?: string;
}

export default function CardBack({ className = '' }: CardBackProps) {
  return (
    <div className={`relative w-full h-full aspect-[2/3.5] rounded-xl overflow-hidden shadow-gold-glow border border-gold/40 bg-[#090B11] p-3 flex flex-col justify-between select-none ${className}`}>
      {/* 复杂的装饰边框线 */}
      <div className="absolute inset-1.5 border border-gold/20 rounded-[10px] pointer-events-none" />
      <div className="absolute inset-2.5 border border-gold/15 rounded-[8px] pointer-events-none" />

      {/* 四个角的古典星芒花纹 */}
      <div className="absolute top-4 left-4 w-4 h-4 text-gold/60 pointer-events-none">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
        </svg>
      </div>
      <div className="absolute top-4 right-4 w-4 h-4 text-gold/60 pointer-events-none">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
        </svg>
      </div>
      <div className="absolute bottom-4 left-4 w-4 h-4 text-gold/60 pointer-events-none">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
        </svg>
      </div>
      <div className="absolute bottom-4 right-4 w-4 h-4 text-gold/60 pointer-events-none">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
        </svg>
      </div>

      {/* 中心占星与镜面图腾 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[85%] h-[85%] relative flex items-center justify-center">
          {/* 星轨同心圆 */}
          <div className="absolute w-[80%] h-[80%] rounded-full border border-dashed border-gold/15 animate-[spin_120s_linear_infinite]" />
          <div className="absolute w-[60%] h-[60%] rounded-full border border-gold/20" />
          <div className="absolute w-[50%] h-[50%] rounded-full border border-dashed border-gold/25 animate-[spin_80s_linear_infinite_reverse]" />
          
          {/* 月相装饰 */}
          <svg className="absolute w-24 h-24 text-gold/30" viewBox="0 0 100 100" fill="currentColor">
            {/* 两个弯月对称围绕 */}
            <path d="M30 50 A 20 20 0 0 1 50 30 A 20 20 0 0 0 42 50 A 20 20 0 0 0 50 70 A 20 20 0 0 1 30 50 Z" />
            <path d="M70 50 A 20 20 0 0 0 50 30 A 20 20 0 0 1 58 50 A 20 20 0 0 1 50 70 A 20 20 0 0 0 70 50 Z" />
          </svg>

          {/* 字母 "M" 精美古典图腾 */}
          <span className="relative text-3xl md:text-4xl font-serif text-gold/85 font-semibold tracking-wider filter drop-shadow-[0_0_8px_rgba(201,167,106,0.5)]">
            M
          </span>

          {/* 核心刻线和刻度 */}
          <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-gradient-to-b from-transparent via-gold/20 to-transparent" />
          <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        </div>
      </div>

      {/* 对称辅助小线条 */}
      <div className="w-full flex justify-center text-[8px] text-gold/30 font-mono tracking-widest pt-2">
        ✦ MIRROR ✦
      </div>
      <div className="w-full flex justify-center text-[8px] text-gold/30 font-mono tracking-widest pb-2">
        ✦ TAROT ✦
      </div>
    </div>
  );
}
