'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX } from 'lucide-react';
import { useAudio } from '@/hooks/useAudio';

interface BreathingZenProps {
  onClose: () => void;
}

type BreathPhase = 'inhale' | 'holdIn' | 'exhale' | 'holdOut';

export default function BreathingZen({ onClose }: BreathingZenProps) {
  const { isMuted, toggleMute, playBowl, stopBowl } = useAudio();
  const [timeLeft, setTimeLeft] = useState(180); // 3分钟 (180秒)
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(4); // 每个阶段4秒
  const [completed, setCompleted] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const breathTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. 进入冥想自动播放颂钵，退出自动停止
  useEffect(() => {
    playBowl();
    
    // 3分钟总倒计时
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCompleted(true);
          stopBowl();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 呼吸阶段循环控制器
    breathTimerRef.current = setInterval(() => {
      setPhaseTimeLeft((prev) => {
        if (prev <= 1) {
          setPhase((currentPhase) => {
            const nextMap: Record<BreathPhase, BreathPhase> = {
              inhale: 'holdIn',
              holdIn: 'exhale',
              exhale: 'holdOut',
              holdOut: 'inhale',
            };
            return nextMap[currentPhase];
          });
          return 4; // 重置为 4 秒
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (breathTimerRef.current) clearInterval(breathTimerRef.current);
      stopBowl();
    };
  }, [playBowl, stopBowl]);

  // 当静音状态切换时，实时同步播放与关闭
  useEffect(() => {
    if (isMuted) {
      stopBowl();
    } else if (!completed) {
      playBowl();
    }
  }, [completed, isMuted, playBowl, stopBowl]);

  // 格式化秒数为 MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 获取阶段提示语
  const getPhaseText = () => {
    switch (phase) {
      case 'inhale': return '吸气 (Inhale) ✦ 感受纯净能量流入';
      case 'holdIn': return '屏气 (Hold) ✦ 将能量沉淀至心轮';
      case 'exhale': return '呼气 (Exhale) ✦ 吐出积攒的浊气与执念';
      case 'holdOut': return '屏气 (Hold) ✦ 享受虚空中的极致宁静';
    }
  };

  // 根据当前呼吸阶段计算生命之花缩放和透明度
  const getAnimationConfig = () => {
    switch (phase) {
      case 'inhale':
        return { scale: 1.25, opacity: 1, duration: 4 };
      case 'holdIn':
        return { scale: 1.25, opacity: 0.9, duration: 0.2 };
      case 'exhale':
        return { scale: 0.8, opacity: 0.45, duration: 4 };
      case 'holdOut':
        return { scale: 0.8, opacity: 0.45, duration: 0.2 };
    }
  };

  const config = getAnimationConfig();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-2xl bg-[#05060A]/92 select-none px-6 text-foreground">
      
      {/* 顶部控制栏 */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10 max-w-md mx-auto w-full">
        <button
          onClick={toggleMute}
          className="w-10 h-10 rounded-full border border-gold/15 bg-card/25 flex items-center justify-center text-gold/85 hover:border-gold/35 hover:bg-gold/5 transition-all duration-300 cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
        </button>

        <span className="text-[11px] font-mono tracking-[0.2em] text-gold-muted/70 uppercase">
          镜面冥想 ✦ Breathing Zen
        </span>

        <button
          onClick={() => {
            stopBowl();
            onClose();
          }}
          className="w-10 h-10 rounded-full border border-gold/15 bg-card/25 flex items-center justify-center text-gold/85 hover:border-gold/35 hover:bg-gold/5 transition-all duration-300 cursor-pointer"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!completed ? (
          <motion.div
            key="meditation-active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col items-center justify-center w-full max-w-md relative"
          >
            {/* 倒计时 */}
            <div className="absolute top-12 text-center">
              <span className="text-xl font-mono text-gold font-light tracking-widest shadow-gold-glow">
                {formatTime(timeLeft)}
              </span>
              <p className="text-[9px] text-gold-muted/50 font-serif tracking-widest mt-1">
                ✦ 意念归一，静享清流 ✦
              </p>
            </div>

            {/* 生命之花 SVG 呼吸振子 */}
            <div className="relative w-72 h-72 flex items-center justify-center my-8">
              {/* 金色流动外呼吸圆环进度条 */}
              <svg className="absolute w-full h-full rotate-[-90deg]">
                <circle
                  cx="144"
                  cy="144"
                  r="135"
                  className="stroke-gold/5 fill-none"
                  strokeWidth="1.5"
                />
                <motion.circle
                  cx="144"
                  cy="144"
                  r="135"
                  className="stroke-gold/35 fill-none"
                  strokeWidth="2.5"
                  strokeDasharray="848"
                  // 针对不同的呼吸阶段，展示不同程度的环形包络
                  animate={{
                    strokeDashoffset:
                      phase === 'inhale' ? 848 - (4 - phaseTimeLeft) * 212 :
                      phase === 'holdIn' ? 0 :
                      phase === 'exhale' ? phaseTimeLeft * 212 : 848
                  }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </svg>

              {/* 动态生命之花图腾 */}
              <motion.div
                animate={{ scale: config.scale, opacity: config.opacity }}
                transition={{ duration: config.duration, ease: 'easeInOut' }}
                className="w-52 h-52 flex items-center justify-center text-gold/60"
              >
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_12px_rgba(201,167,106,0.3)]">
                  {/* 中心圆 */}
                  <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="0.6" />
                  
                  {/* 周围相交第一圈（6个圆环，构成经典的种子图样） */}
                  {[0, 60, 120, 180, 240, 300].map((angle, idx) => {
                    const rad = (angle * Math.PI) / 180;
                    const cx = 50 + 15 * Math.cos(rad);
                    const cy = 50 + 15 * Math.sin(rad);
                    return (
                      <circle key={idx} cx={cx} cy={cy} r="15" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    );
                  })}

                  {/* 周围相交第二圈（12个外圆交叉） */}
                  {[30, 90, 150, 210, 270, 330].map((angle, idx) => {
                    const rad = (angle * Math.PI) / 180;
                    const cx = 50 + 26 * Math.cos(rad);
                    const cy = 50 + 26 * Math.sin(rad);
                    return (
                      <circle key={`outer-${idx}`} cx={cx} cy={cy} r="15" fill="none" stroke="currentColor" strokeWidth="0.35" opacity="0.65" />
                    );
                  })}
                  
                  {/* 最外环大圆 */}
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
                </svg>
              </motion.div>
            </div>

            {/* 呼吸状态文本指示器 */}
            <div className="text-center px-4 max-w-sm mt-4">
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-sm font-serif text-gold font-medium tracking-widest leading-relaxed"
              >
                {getPhaseText()}
              </motion.div>
              <div className="text-[10px] text-gold-muted/40 font-mono tracking-widest mt-2">
                REMAINING: {phaseTimeLeft}s
              </div>
            </div>
          </motion.div>
        ) : (
          /* 4. 冥想完成界面 */
          <motion.div
            key="meditation-completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-grow flex flex-col items-center justify-center text-center max-w-md px-6"
          >
            {/* 金色发光星图占位 */}
            <div className="w-24 h-24 rounded-full border border-gold/20 flex items-center justify-center mb-8 shadow-gold-glow animate-[spin_40s_linear_infinite]">
              <div className="w-16 h-16 rounded-full border border-dashed border-gold/15" />
              <div className="absolute w-2 h-2 rounded-full bg-gold/50" />
            </div>

            <h2 className="text-base font-serif text-gold font-bold tracking-widest mb-4">
              ✦ 镜面洗礼完成 ✦
            </h2>
            <p className="text-xs text-foreground/85 font-serif leading-relaxed tracking-wider px-4 mb-8">
              浊气已除，灵明自现。<br />
              这面心智之镜已被清空，愿今日的情绪卡牌指引能陪伴您安然入睡，并在新的一天带来澄澈与智慧。
            </p>

            <button
              onClick={() => {
                stopBowl();
                onClose();
              }}
              className="px-6 py-2.5 rounded-lg border border-gold/25 bg-gold/5 text-[11px] text-gold font-serif tracking-widest hover:bg-gold/10 transition-all duration-300 cursor-pointer shadow-gold-glow"
            >
              ✦ 完成冥想 ✦
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
