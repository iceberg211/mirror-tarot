'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { JournalEntry } from '@/lib/db/localJournal';

interface MindOrbitWordCloudProps {
  entries: JournalEntry[];
}

// 常见心智、塔罗、情绪及现实生活高频觉察词表
const FOCUS_WORDS = [
  '焦虑', '纠结', '迷茫', '疲惫', '选择', '突破', '感情', '关系', '工作', 
  '抉择', '逃避', '改变', '未来', '平静', '信心', '金钱', '前途', '健康',
  '发展', '压力', '成长', '阻碍', '释怀', '疗愈', '新生', '信任', '控制',
  '防御', '沟通', '家庭', '睡眠', '梦境', '直觉', '安全感', '边界'
];

interface OrbitWord {
  text: string;
  count: number;
  scale: number;
  opacity: number;
  x: number; // 绝对坐标百分比
  y: number; // 绝对坐标百分比
}

export default function MindOrbitWordCloud({ entries }: MindOrbitWordCloudProps) {
  const orbitWords = useMemo<OrbitWord[]>(() => {
    try {
      const nowMs = new Date().getTime();
      const recentReadings = entries.filter((r) => {
        const entryTime = new Date(r.createdAt).getTime();
        return nowMs - entryTime <= 30 * 24 * 60 * 60 * 1000;
      });

      if (recentReadings.length === 0) return [];

      // 1. 合并最近所有日记的提问、情绪和冥想感悟文本
      const combinedText = recentReadings
        .map((r) => `${r.question} ${r.mood} ${r.userNotes || ''} ${(r as any).dreamContext?.analysis || ''}`)
        .join(' ');

      // 2. 嗅探词频
      const wordCounts: Record<string, number> = {};
      FOCUS_WORDS.forEach((word) => {
        const regex = new RegExp(word, 'g');
        const matches = combinedText.match(regex);
        if (matches) {
          wordCounts[word] = matches.length;
        }
      });

      // 3. 转为排序数组
      const sorted = Object.entries(wordCounts)
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // 取前10个高频词

      if (sorted.length === 0) {
        // 兜底词组
        const fallbacks = ['平静', '觉察', '潜意识', '镜面', '情绪', '选择'];
        return fallbacks.map((text, idx) => {
          const angle = (idx / fallbacks.length) * 2 * Math.PI;
          const radius = 28 + (idx % 2) * 12; // 轨道半径 %
          return {
            text,
            count: 1,
            scale: 1.0,
            opacity: 0.7,
            x: 50 + radius * Math.cos(angle),
            y: 50 + radius * Math.sin(angle),
          };
        });
      }

      // 4. 将高频词映射到极坐标轨道上
      // 轨道 1 (内圈 r=15-20): Top 1-2
      // 轨道 2 (中圈 r=30-35): Top 3-6
      // 轨道 3 (外圈 r=42-46): Top 7-10
      const maxCount = sorted[0].count;

      return sorted.map((item, idx) => {
        let radius = 32;
        let scale = 1.0;
        let opacity = 0.8;

        if (idx < 2) {
          // 内圈
          radius = 16 + idx * 4;
          scale = 1.25 + (item.count / maxCount) * 0.25;
          opacity = 0.95;
        } else if (idx < 6) {
          // 中圈
          radius = 29 + (idx % 2) * 5;
          scale = 1.0 + (item.count / maxCount) * 0.15;
          opacity = 0.8;
        } else {
          // 外圈
          radius = 42 + (idx % 2) * 4;
          scale = 0.85;
          opacity = 0.55;
        }

        // 分配角度，平铺环绕
        const angle = (idx / sorted.length) * 2 * Math.PI + (idx * 0.15); 
        return {
          text: item.text,
          count: item.count,
          scale,
          opacity,
          x: 50 + radius * Math.cos(angle),
          y: 50 + radius * Math.sin(angle),
        };
      });
    } catch (e) {
      console.error('Failed to compute orbit word cloud:', e);
      return [];
    }
  }, [entries]);

  if (orbitWords.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="w-full rounded-2xl border border-gold/15 bg-gradient-to-b from-[#0C0F16]/50 to-[#05060A]/85 p-5 shadow-gold-glow flex flex-col gap-4 relative overflow-hidden select-none"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] font-mono text-gold-muted/50 uppercase tracking-[0.2em]">
          Mind Orbit WordCloud
        </span>
        <h3 className="text-sm font-serif font-bold text-gold tracking-widest mt-1">
          本月心智星轨词云
        </h3>
      </div>

      {/* 词云星空球体 */}
      <div className="relative w-full aspect-square max-h-[220px] rounded-xl border border-gold/5 bg-[#04060A] overflow-hidden flex items-center justify-center mt-2">
        {/* 中心微弱渐变光晕 */}
        <div className="absolute w-24 h-24 rounded-full bg-gold/10 blur-xl pointer-events-none" />
        
        {/* 轨道圆环底纹线 */}
        <div className="absolute w-[36%] h-[36%] rounded-full border border-gold/5 border-dashed pointer-events-none" />
        <div className="absolute w-[62%] h-[62%] rounded-full border border-gold/5 border-dashed pointer-events-none" />
        <div className="absolute w-[88%] h-[88%] rounded-full border border-gold/5 border-dashed pointer-events-none" />

        {/* 极缓速度自旋星空层 */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 180, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 w-full h-full"
        >
          {orbitWords.map((word, idx) => {
            const sizeClasses = 
              word.scale > 1.3 ? 'text-sm font-bold text-gold-focus' :
              word.scale >= 1.0 ? 'text-xs text-gold/90' : 'text-[10px] text-gold-muted/65';

            return (
              <motion.div
                key={idx}
                style={{
                  position: 'absolute',
                  left: `${word.x}%`,
                  top: `${word.y}%`,
                  transform: 'translate(-50%, -50%)',
                  opacity: word.opacity,
                }}
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [word.opacity, word.opacity * 0.8, word.opacity]
                }}
                transition={{
                  duration: 4 + (idx % 3) * 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className={`font-serif tracking-widest whitespace-nowrap drop-shadow-[0_0_8px_rgba(201,167,106,0.15)] ${sizeClasses}`}
              >
                {word.text}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <div className="flex items-center gap-1.5 justify-center text-[9px] font-serif text-gold-muted/40 tracking-wider">
        <Sparkles className="w-2.5 h-2.5" />
        <span>靠近中心的词汇代表您本月关注的潜意识心结</span>
      </div>
    </motion.div>
  );
}
