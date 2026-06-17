'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Sparkles } from 'lucide-react';
import { JournalEntry } from '@/lib/db/localJournal';
import { moodConfigs } from '@/lib/tarot/moods';
import { spreads } from '@/lib/tarot/spreads';

interface JournalConstellationViewProps {
  filteredEntries: JournalEntry[];
  activeEntryId: string | null;
  setActiveEntryId: (id: string | null) => void;
}

export default function JournalConstellationView({
  filteredEntries,
  activeEntryId,
  setActiveEntryId
}: JournalConstellationViewProps) {
  
  const constellationEntries = useMemo(() => {
    return [...filteredEntries].slice(0, 10).reverse();
  }, [filteredEntries]);

  // 计算星点的坐标
  const points = useMemo(() => {
    if (constellationEntries.length === 0) return [];
    
    return constellationEntries.map((entry, idx) => {
      const cx = 35 + (idx * 280) / (constellationEntries.length - 1 || 1);
      const moodConfig = moodConfigs.find((m) => m.name === entry.mood);
      const category = moodConfig?.category || 'light';
      
      // 添加一个基于 ID 的伪随机微小扰动值，让轨迹形态更自然
      const offset = (entry.id.charCodeAt(0) % 5) * 4 - 8;
      let cy = 100;
      let color = '#FBBF24'; // light -> 金
      let shadowGlow = 'rgba(251, 191, 36, 0.4)';
      
      if (category === 'light') {
        cy = 45 + offset;
        color = '#FBBF24';
        shadowGlow = 'rgba(251, 191, 36, 0.4)';
      } else if (category === 'shadow') {
        cy = 155 + offset;
        color = '#60A5FA'; // shadow -> 蓝
        shadowGlow = 'rgba(96, 165, 250, 0.4)';
      } else if (category === 'storm') {
        cy = 100 + offset;
        color = '#C084FC'; // storm -> 紫
        shadowGlow = 'rgba(192, 132, 252, 0.4)';
      }
      
      return {
        id: entry.id,
        cx,
        cy,
        color,
        shadowGlow,
        entry,
        category,
        isStarred: entry.isStarred || false
      };
    });
  }, [constellationEntries]);

  // 连线的折线路径 D
  const linePathD = useMemo(() => {
    if (points.length === 0) return '';
    return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.cx} ${p.cy}`).join(' ');
  }, [points]);

  const activeEntry = useMemo(() => {
    return filteredEntries.find((e) => e.id === activeEntryId);
  }, [filteredEntries, activeEntryId]);

  if (filteredEntries.length === 0) {
    return (
      <div className="w-full py-12 border-y border-dashed border-gold/12 text-center">
        <p className="text-xs text-gold-muted/50 font-serif">暂无日记数据以绘制星轨图。</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-5 animate-fadeIn">
      <div className="relative w-full border-y border-gold/12 py-4 flex flex-col gap-2.5 overflow-hidden">
        {/* 星空背景衬托 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(201,167,106,0.015)_0%,_transparent_70%)] pointer-events-none" />
        
        <div className="flex justify-between items-center border-b border-gold/10 pb-1.5 z-10">
          <span className="text-[10px] text-gold font-serif font-bold tracking-widest uppercase flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            ✦ 潜意识轨迹星图
          </span>
          <span className="text-[8px] text-gold-muted/40 font-mono">
            {points.length} DAYS LINE
          </span>
        </div>
        
        <div className="w-full relative min-h-[200px]">
          <svg viewBox="0 0 350 200" className="w-full h-auto z-10 relative">
            <style>{`
              @keyframes dash {
                to {
                  stroke-dashoffset: 0;
                }
              }
            `}</style>
            
            {/* 水平背景虚线 */}
            {[45, 100, 155].map((yVal, idx) => (
              <line
                key={idx}
                x1="20"
                y1={yVal}
                x2="330"
                y2={yVal}
                stroke="rgba(201, 167, 106, 0.04)"
                strokeWidth="0.8"
                strokeDasharray="2 3"
              />
            ))}
            
            {points.length >= 2 && (
              <>
                {/* 背景流光连线底板 */}
                <path
                  d={linePathD}
                  fill="none"
                  stroke="rgba(201, 167, 106, 0.15)"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
                {/* 有向流光粒子线 */}
                <path
                  d={linePathD}
                  fill="none"
                  stroke="#C9A76A"
                  strokeWidth="1.2"
                  strokeDasharray="5 15"
                  strokeDashoffset="100"
                  className="opacity-65 animate-[dash_6s_linear_infinite]"
                />
              </>
            )}
            
            {/* 各个星点 */}
            {points.map((p) => {
              const isActive = p.id === activeEntryId;
              return (
                <g
                  key={p.id}
                  onClick={() => setActiveEntryId(p.id)}
                  className="cursor-pointer group"
                >
                  {/* 选中高亮环 */}
                  {isActive && (
                    <>
                      <circle
                        cx={p.cx}
                        cy={p.cy}
                        r="8"
                        fill="none"
                        stroke={p.color}
                        strokeWidth="0.8"
                        className="opacity-40 animate-ping"
                      />
                      <circle
                        cx={p.cx}
                        cy={p.cy}
                        r="5.5"
                        fill="none"
                        stroke={p.color}
                        strokeWidth="1"
                        className="opacity-75"
                      />
                    </>
                  )}
                  
                  {/* 北极星专属外圈发光星轨 */}
                  {p.isStarred && (
                    <circle
                      cx={p.cx}
                      cy={p.cy}
                      r="10"
                      fill="none"
                      stroke="rgba(251, 191, 36, 0.45)"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                      className="animate-[spin_15s_linear_infinite]"
                    />
                  )}
                  
                  {/* 悬停微高亮环 */}
                  <circle
                    cx={p.cx}
                    cy={p.cy}
                    r={p.isStarred ? 9 : 4.5}
                    fill="none"
                    stroke={p.isStarred ? '#FBBF24' : p.color}
                    strokeWidth="0.8"
                    className="opacity-0 group-hover:opacity-40 transition-opacity duration-300"
                  />
                  
                  {/* 实体星点 */}
                  <circle
                    cx={p.cx}
                    cy={p.cy}
                    r={p.isStarred ? 6 : 3}
                    fill={p.isStarred ? '#FCD34D' : p.color}
                    className={`transition-all duration-300 ${
                      p.isStarred ? 'animate-pulse' : ''
                    }`}
                    style={{
                      filter: p.isStarred
                        ? 'drop-shadow(0 0 7px rgba(251, 191, 36, 0.9))'
                        : isActive
                        ? `drop-shadow(0 0 5px ${p.color})`
                        : `drop-shadow(0 0 2px ${p.color})`
                    }}
                  />
                </g>
              );
            })}
          </svg>
          
          {/* 轴侧说明小标签 */}
          <div className="absolute top-2.5 left-2 flex flex-col gap-14 text-[7px] text-gold-muted/30 font-serif select-none pointer-events-none">
            <span>光芒区 (Light)</span>
            <span>激荡区 (Storm)</span>
            <span>阴影区 (Shadow)</span>
          </div>
        </div>
      </div>
      
      {/* 时光信箱日记预览 */}
      {activeEntry ? (
        (() => {
          const spreadInfo = spreads[activeEntry.spreadType];
          const dateStr = new Date(activeEntry.createdAt).toLocaleDateString('zh-CN', {
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          return (
            <div className="w-full border-y border-gold/12 py-4 animate-slideUp flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-gold/10 pb-1.5 text-[9px] text-gold-muted/80 font-serif">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gold-muted/50" />
                  {dateStr}
                </span>
                <span className="text-gold uppercase tracking-wider">{spreadInfo?.name} ✦ {activeEntry.mood}</span>
              </div>
              
              <div className="flex flex-col gap-1">
                <h4 className="text-xs text-foreground font-serif leading-relaxed line-clamp-1 font-semibold">
                  “ {activeEntry.question} ”
                </h4>
                <p className="text-[10px] text-gold-muted/75 font-serif italic line-clamp-2 leading-relaxed mt-0.5">
                  {activeEntry.reading.intuitiveSummary || '情绪解读激活中...'}
                </p>
              </div>
              
              <Link
                href={`/reading/${activeEntry.id}`}
                className="w-full py-2 rounded-full border border-gold/25 bg-gold/5 text-gold text-[10px] font-serif tracking-widest text-center hover:bg-gold/10 transition-all cursor-pointer"
              >
                阅读这期心智测算报告 ➔
              </Link>
            </div>
          );
        })()
      ) : (
        <div className="w-full py-6 text-center border-y border-dashed border-gold/10 text-[10px] text-gold-muted/40 font-serif">
          点击上方星点，阅读对应日记。
        </div>
      )}
    </div>
  );
}
