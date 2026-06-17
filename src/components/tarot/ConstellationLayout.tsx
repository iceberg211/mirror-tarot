'use client';

import React from 'react';
import TarotCard from '@/components/tarot/TarotCard';
import { SelectedCard } from '@/lib/tarot/types';

interface ConstellationLayoutProps {
  spreadType: string;
  cards: SelectedCard[];
  activeFocusIndex: number;
}

const spreadPositionsConfig: Record<string, { left: number; top: number }[]> = {
  one_card: [
    { left: 50, top: 50 }
  ],
  three_cards: [
    { left: 19, top: 50 },
    { left: 50, top: 50 },
    { left: 81, top: 50 }
  ],
  relationship: [
    { left: 18, top: 50 }, // 自我 (左)
    { left: 82, top: 50 }, // 对方 (右)
    { left: 50, top: 76 }, // 现状 (下)
    { left: 50, top: 24 }  // 未来 (上)
  ],
  career: [
    { left: 19, top: 62 }, // 机会 (左下)
    { left: 81, top: 62 }, // 风险 (右下)
    { left: 50, top: 28 }  // 建议 (上)
  ],
  shadow: [
    { left: 50, top: 22 }, // 显意识 (上)
    { left: 50, top: 53 }, // 潜意识 (中)
    { left: 50, top: 84 }  // 出路 (下)
  ],
  choice: [
    { left: 50, top: 78 }, // 现状 (下)
    { left: 18, top: 46 }, // 选项 A (左)
    { left: 82, top: 46 }, // 选项 B (右)
    { left: 50, top: 16 }  // 建议与抉择 (上)
  ],
  mirror_cross: [
    { left: 18, top: 52 }, // 核心现状 (左)
    { left: 47, top: 52 }, // 横向阻碍 (中偏左)
    { left: 50, top: 16 }, // 理智冠冕 (上)
    { left: 50, top: 86 }, // 真实根基 (下)
    { left: 82, top: 52 }  // 觉察出路 (右)
  ]
};

const spreadConnectionsConfig: Record<string, { from: number; to: number }[]> = {
  three_cards: [
    { from: 0, to: 1 },
    { from: 1, to: 2 }
  ],
  relationship: [
    { from: 0, to: 2 }, // 自我 -> 现状
    { from: 1, to: 2 }, // 对方 -> 现状
    { from: 2, to: 3 }  // 现状 -> 未来
  ],
  career: [
    { from: 0, to: 2 }, // 机会 -> 建议
    { from: 1, to: 2 }  // 风险 -> 建议
  ],
  shadow: [
    { from: 0, to: 1 }, // 显意识 -> 潜意识
    { from: 1, to: 2 }  // 潜意识 -> 出路
  ],
  choice: [
    { from: 0, to: 1 }, // 现状 -> 选项A
    { from: 0, to: 2 }, // 现状 -> 选项B
    { from: 1, to: 3 }, // 选项A -> 建议
    { from: 2, to: 3 }  // 选项B -> 建议
  ],
  mirror_cross: [
    { from: 3, to: 0 }, // 根基 -> 现状
    { from: 0, to: 1 }, // 现状 -> 阻碍
    { from: 1, to: 4 }, // 阻碍 -> 出路
    { from: 2, to: 4 }  // 冠冕 -> 出路
  ]
};

function getLayoutConfig(spreadType: string, cardCount: number) {
  if (spreadType === 'custom') {
    if (cardCount === 1) {
      return {
        positions: spreadPositionsConfig.one_card,
        connections: []
      };
    }
    if (cardCount === 2) {
      return {
        positions: [
          { left: 28, top: 50 },
          { left: 72, top: 50 }
        ],
        connections: [{ from: 0, to: 1 }]
      };
    }
    return {
      positions: spreadPositionsConfig.three_cards,
      connections: spreadConnectionsConfig.three_cards
    };
  }

  return {
    positions: spreadPositionsConfig[spreadType] || spreadPositionsConfig.three_cards,
    connections: spreadConnectionsConfig[spreadType] || []
  };
}

export default function ConstellationLayout({
  spreadType,
  cards,
  activeFocusIndex
}: ConstellationLayoutProps) {
  const layout = getLayoutConfig(spreadType, cards.length);
  const hasConnections = layout.connections.length > 0;
  const isSomeFocused = activeFocusIndex !== -1;

  return (
    <div className="w-full h-[280px] md:h-[310px] relative mt-2 mb-6 border border-gold/5 bg-gradient-to-b from-[#0B0D14]/20 to-transparent rounded-2xl overflow-hidden shadow-gold-glow flex items-center justify-center">
      
      {/* 底层 SVG 能量流动虚线 */}
      {hasConnections && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            {/* 金光流溢滤镜 */}
            <filter id="gold-glow-line" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            {/* 有向线段的端点箭头 */}
            <marker
              id="arrow-head"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#C9A76A" fillOpacity="0.75" />
            </marker>
          </defs>

          {layout.connections.map((conn, cIdx) => {
            const fromPos = layout.positions[conn.from];
            const toPos = layout.positions[conn.to];
            if (!fromPos || !toPos) return null;

            return (
              <g key={cIdx}>
                {/* 流光能量线 */}
                <line
                  x1={`${fromPos.left}%`}
                  y1={`${fromPos.top}%`}
                  x2={`${toPos.left}%`}
                  y2={`${toPos.top}%`}
                  stroke="#C9A76A"
                  strokeWidth="1.2"
                  strokeOpacity="0.55"
                  strokeDasharray="4 5"
                  filter="url(#gold-glow-line)"
                  markerEnd="url(#arrow-head)"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    values="180;0"
                    dur="5s"
                    repeatCount="indefinite"
                  />
                </line>
                
                {/* 连线中点的交互圆点 ✦ */}
                <g 
                  transform={`translate(${(fromPos.left + toPos.left) / 2}, ${(fromPos.top + toPos.top) / 2})`}
                  className="cursor-help pointer-events-auto"
                >
                  <circle cx="0" cy="0" r="4" className="fill-[#0C0E15] stroke-gold stroke-[0.8] animate-pulse" />
                  <text x="0" y="2.5" className="fill-gold text-[6px] font-serif font-bold text-center" textAnchor="middle">✦</text>
                  <title>心智水流由此传递</title>
                </g>
              </g>
            );
          })}
        </svg>
      )}

      {/* 顶层卡牌绝对定位 */}
      {cards.map((card, idx) => {
        const pos = layout.positions[idx] || { left: 50, top: 50 };
        const isFocused = activeFocusIndex === idx;

        return (
          <div
            key={card.id}
            className="absolute z-10 transition-all duration-700 select-none"
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className={`flex flex-col items-center transition-all duration-700 ${
                isFocused
                  ? 'scale-100 filter drop-shadow-[0_0_15px_rgba(201,167,106,0.55)]'
                  : isSomeFocused
                    ? 'scale-[0.78] opacity-35 blur-[0.5px]'
                    : 'scale-90 opacity-90'
              }`}
            >
              <TarotCard card={card} revealed={true} size="sm" interactive={false} />
              <span
                className={`text-[8px] mt-1 font-serif tracking-widest text-center whitespace-nowrap px-1.5 py-0.5 rounded bg-[#090B11]/60 border transition-colors duration-500 max-w-[80px] truncate ${
                  isFocused
                    ? 'text-gold font-semibold border-gold/30 bg-[#151720]/80'
                    : 'text-gold-muted/50 border-transparent'
                }`}
              >
                {card.positionName}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
