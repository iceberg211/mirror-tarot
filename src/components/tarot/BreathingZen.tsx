'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { useAudio } from '@/hooks/useAudio';

interface BreathingZenProps {
  onClose: () => void;
  element?: 'water' | 'fire' | 'wind' | 'earth' | null;
}

type BreathPhase = 'inhale' | 'holdIn' | 'exhale' | 'holdOut';

const themeConfigs = {
  water: {
    textColor: 'text-blue-400',
    borderColor: 'stroke-blue-400/40',
    activeBorderColor: 'stroke-blue-500',
    glowColor: 'from-[#051124]/95 to-[#02050A]/95',
    radialGlow: 'rgba(29, 78, 216, 0.15)',
    inhaleText: '吸气 (Inhale) ✦ 汲取温和的水流之光',
    holdInText: '屏气 (Hold) ✦ 潜入内在平静的深海',
    exhaleText: '呼气 (Exhale) ✦ 释放脑海多余的敏感与情绪',
    holdOutText: '屏气 (Hold) ✦ 享受水月映照的绝对安宁',
  },
  fire: {
    textColor: 'text-red-400',
    borderColor: 'stroke-red-400/40',
    activeBorderColor: 'stroke-red-500',
    glowColor: 'from-[#240505]/95 to-[#0A0202]/95',
    radialGlow: 'rgba(220, 38, 38, 0.15)',
    inhaleText: '吸气 (Inhale) ✦ 唤醒心轮深处的火之意志',
    holdInText: '屏气 (Hold) ✦ 积蓄改变与行动的力量',
    exhaleText: '呼气 (Exhale) ✦ 燃尽不必要的旧习惯与焦躁',
    holdOutText: '屏气 (Hold) ✦ 凝视灰烬之后的纯粹自我',
  },
  wind: {
    textColor: 'text-teal-400',
    borderColor: 'stroke-teal-400/40',
    activeBorderColor: 'stroke-teal-500',
    glowColor: 'from-[#051824]/95 to-[#02090D]/95',
    radialGlow: 'rgba(13, 148, 136, 0.15)',
    inhaleText: '吸气 (Inhale) ✦ 吸纳清朗空灵的精神之风',
    holdInText: '屏气 (Hold) ✦ 悬浮在思想止息的绝对虚空',
    exhaleText: '呼气 (Exhale) ✦ 吹散纠结困惑的逻辑枷锁',
    holdOutText: '屏气 (Hold) ✦ 倾听虚空深处的镜面低语',
  },
  earth: {
    textColor: 'text-emerald-400',
    borderColor: 'stroke-emerald-400/40',
    activeBorderColor: 'stroke-emerald-500',
    glowColor: 'from-[#052411]/95 to-[#020A05]/95',
    radialGlow: 'rgba(16, 185, 129, 0.15)',
    inhaleText: '吸气 (Inhale) ✦ 承接大地沉稳厚重的滋养',
    holdInText: '屏气 (Hold) ✦ 将心识稳固锚定在此时此刻',
    exhaleText: '呼气 (Exhale) ✦ 卸下肩头沉重的现实重担',
    holdOutText: '屏气 (Hold) ✦ 感受根基与大地的连接',
  },
  default: {
    textColor: 'text-gold',
    borderColor: 'stroke-gold/15',
    activeBorderColor: 'stroke-gold/35',
    glowColor: 'from-[#090C12]/95 to-[#05060A]/95',
    radialGlow: 'rgba(201, 167, 106, 0.08)',
    inhaleText: '吸气 (Inhale) ✦ 感受纯净能量流入',
    holdInText: '屏气 (Hold) ✦ 将能量沉淀至心轮',
    exhaleText: '呼气 (Exhale) ✦ 吐出积攒的浊气与执念',
    holdOutText: '屏气 (Hold) ✦ 享受虚空中的极致宁静',
  }
};

export default function BreathingZen({ onClose, element = null }: BreathingZenProps) {
  const theme = element && themeConfigs[element] ? themeConfigs[element] : themeConfigs.default;

  const { isMuted, toggleMute, playBowl, stopBowl, playElementAmbient, stopElementAmbient } = useAudio();
  
  const [started, setStarted] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<60 | 180 | 300>(180);
  const [timeLeft, setTimeLeft] = useState(180);
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(4); // 每个阶段4秒
  const [completed, setCompleted] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const breathTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startMeditation = () => {
    setTimeLeft(selectedDuration);
    setStarted(true);
    
    // 播放相应音效
    if (element) {
      playElementAmbient(element);
    } else {
      playBowl();
    }
  };

  // 1. 进入冥想倒计时与呼吸循环
  useEffect(() => {
    if (!started || completed) return;

    // 总倒计时
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCompleted(true);
          
          if (element) stopElementAmbient();
          else stopBowl();

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 呼吸阶段控制器
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
    };
  }, [started, completed, element, stopBowl, stopElementAmbient]);

  // 音效静音与恢复控制
  useEffect(() => {
    if (!started || completed) return;

    if (isMuted) {
      if (element) stopElementAmbient();
      else stopBowl();
    } else {
      if (element) playElementAmbient(element);
      else playBowl();
    }
  }, [isMuted, started, completed, element, playBowl, stopBowl, playElementAmbient, stopElementAmbient]);

  // 统一释放音效清理
  useEffect(() => {
    return () => {
      stopBowl();
      stopElementAmbient();
    };
  }, [stopBowl, stopElementAmbient]);

  // 格式化秒数为 MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 获取阶段提示语
  const getPhaseText = () => {
    switch (phase) {
      case 'inhale': return theme.inhaleText;
      case 'holdIn': return theme.holdInText;
      case 'exhale': return theme.exhaleText;
      case 'holdOut': return theme.holdOutText;
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
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-2xl bg-gradient-to-b ${theme.glowColor} select-none px-6 text-foreground`}>
      
      {/* 氛围渐变发光圈 */}
      <div 
        className="absolute w-[360px] h-[360px] rounded-full blur-[80px] pointer-events-none transition-all duration-1000"
        style={{ backgroundColor: theme.radialGlow, top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }} 
      />

      {/* 顶部控制栏 */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10 max-w-md mx-auto w-full">
        <button
          onClick={toggleMute}
          className={`w-10 h-10 rounded-full border border-gold/15 bg-card/25 flex items-center justify-center ${theme.textColor} hover:border-gold/35 hover:bg-gold/5 transition-all duration-300 cursor-pointer`}
        >
          {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
        </button>

        <span className="text-[11px] font-mono tracking-[0.2em] text-gold-muted/70 uppercase">
          {element ? `${element.toUpperCase()} ✦ 镜面禅修` : '镜面冥想 ✦ Breathing Zen'}
        </span>

        <button
          onClick={() => {
            stopBowl();
            stopElementAmbient();
            onClose();
          }}
          className={`w-10 h-10 rounded-full border border-gold/15 bg-card/25 flex items-center justify-center ${theme.textColor} hover:border-gold/35 hover:bg-gold/5 transition-all duration-300 cursor-pointer`}
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        
        {/* 阶段 1：时间选项选择与准备阶段 */}
        {!started && (
          <motion.div
            key="meditation-setup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-grow flex flex-col items-center justify-center max-w-md w-full text-center z-10"
          >
            <div className="w-16 h-16 rounded-full border border-gold/20 flex items-center justify-center mb-6 shadow-gold-glow relative">
              <Sparkles className={`w-6 h-6 ${theme.textColor} animate-pulse`} />
            </div>
            
            <h2 className="text-lg font-serif text-gold font-bold tracking-widest">
              选择觉察正念时长
            </h2>
            <p className="text-[10px] text-gold-muted/60 font-serif tracking-widest mt-1">
              {element ? `✦ 唤醒您的 ${element.toUpperCase()} 元素能量场 ✦` : '✦ 调整您的呼吸，释放心中的沉闷与执念 ✦'}
            </p>

            <div className="flex gap-3.5 my-10 justify-center w-full">
              {[
                { label: '1 分钟', sec: 60, desc: '快速调息' },
                { label: '3 分钟', sec: 180, desc: '标准静修' },
                { label: '5 分钟', sec: 300, desc: '深度禅坐' }
              ].map((item) => {
                const isSelected = selectedDuration === item.sec;
                return (
                  <button
                    key={item.sec}
                    onClick={() => setSelectedDuration(item.sec as 60 | 180 | 300)}
                    className={`flex-1 py-3 px-2 rounded-xl border flex flex-col items-center gap-1 transition-all duration-300 cursor-pointer outline-none ${
                      isSelected
                        ? 'border-gold bg-[#1E1C16]/55 text-gold shadow-gold-glow'
                        : 'border-gold/15 bg-[#0E1017]/35 text-gold-muted/70 hover:border-gold/30'
                    }`}
                  >
                    <span className="text-xs font-serif font-bold tracking-wider">{item.label}</span>
                    <span className="text-[8px] opacity-60 font-mono tracking-widest uppercase">{item.desc}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={startMeditation}
              className={`w-full py-3 rounded-xl border border-gold/40 bg-gradient-to-r from-[#171610] via-[#2F291D] to-[#171610] ${theme.textColor} text-xs font-serif tracking-[0.2em] hover:brightness-110 shadow-gold-glow transition-all cursor-pointer`}
            >
              ✦ 开启正念禅修 ✦
            </button>
          </motion.div>
        )}

        {/* 阶段 2：正念呼吸倒计时中 */}
        {started && !completed && (
          <motion.div
            key="meditation-active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col items-center justify-center w-full max-w-md relative"
          >
            {/* 倒计时 */}
            <div className="absolute top-12 text-center">
              <span className={`text-xl font-mono ${theme.textColor} font-light tracking-widest filter drop-shadow-[0_0_8px_rgba(201,167,106,0.35)]`}>
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
                  className={`${theme.borderColor} fill-none`}
                  strokeWidth="1.5"
                />
                <motion.circle
                  cx="144"
                  cy="144"
                  r="135"
                  className={`${theme.activeBorderColor} fill-none`}
                  strokeWidth="2.5"
                  strokeDasharray="848"
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
                className={`w-52 h-52 flex items-center justify-center ${theme.textColor}`}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_12px_rgba(201,167,106,0.35)]">
                  {/* 中心圆 */}
                  <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="0.6" />
                  
                  {/* 周围第一圈 */}
                  {[0, 60, 120, 180, 240, 300].map((angle, idx) => {
                    const rad = (angle * Math.PI) / 180;
                    const cx = 50 + 15 * Math.cos(rad);
                    const cy = 50 + 15 * Math.sin(rad);
                    return (
                      <circle key={idx} cx={cx} cy={cy} r="15" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    );
                  })}

                  {/* 周围第二圈 */}
                  {[30, 90, 150, 210, 270, 330].map((angle, idx) => {
                    const rad = (angle * Math.PI) / 180;
                    const cx = 50 + 26 * Math.cos(rad);
                    const cy = 50 + 26 * Math.sin(rad);
                    return (
                      <circle key={`outer-${idx}`} cx={cx} cy={cy} r="15" fill="none" stroke="currentColor" strokeWidth="0.35" opacity="0.65" />
                    );
                  })}
                  
                  {/* 外层大圆 */}
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
                className={`text-sm font-serif ${theme.textColor} font-medium tracking-widest leading-relaxed`}
              >
                {getPhaseText()}
              </motion.div>
              <div className="text-[10px] text-gold-muted/40 font-mono tracking-widest mt-2">
                REMAINING: {phaseTimeLeft}s
              </div>
            </div>
          </motion.div>
        )}

        {/* 阶段 3：冥想完成界面 */}
        {completed && (
          <motion.div
            key="meditation-completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-grow flex flex-col items-center justify-center text-center max-w-md px-6 z-10"
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
              这面心智之镜已被清空，愿此期 {element ? `${element.toUpperCase()} 元素的能量` : '平静的觉察'} 能够与您融为一体，带来澄澈与力量。
            </p>

            <button
              onClick={() => {
                stopBowl();
                stopElementAmbient();
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
