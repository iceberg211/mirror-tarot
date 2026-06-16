'use client';

import { useState, useEffect, useRef } from 'react';

// 全局静音状态，保证多个组件共享相同的状态
let globalMuted = false;
const listeners = new Set<(muted: boolean) => void>();

function setGlobalMuted(muted: boolean) {
  globalMuted = muted;
  if (typeof window !== 'undefined') {
    localStorage.setItem('mirror_tarot_mute', muted ? 'true' : 'false');
  }
  listeners.forEach((l) => l(muted));
}

export function useAudio() {
  const [isMuted, setIsMuted] = useState(globalMuted);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // 持续性白噪音和颂钵的 Node 引用，以便停止它们
  const ambientNodesRef = useRef<{ source: AudioBufferSourceNode; gainNode: GainNode } | null>(null);
  const bowlNodesRef = useRef<{ oscillators: OscillatorNode[]; gainNode: GainNode } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('mirror_tarot_mute');
      if (savedMute === 'true' && !globalMuted) {
        setGlobalMuted(true);
      }
    }

    const handleChange = (muted: boolean) => {
      setIsMuted(muted);
      if (muted) {
        // 如果被静音，立刻切断所有正在播放的持续音效
        stopAmbient();
        stopBowl();
      }
    };

    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  const toggleMute = () => {
    setGlobalMuted(!isMuted);
  };

  // 初始化或激活 Web Audio Context
  const getAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    
    // 实例化 AudioContext
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
    }

    // 解决 Chrome 等浏览器自动播放限制，在用户交互时恢复 context
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    return audioCtxRef.current;
  };

  /**
   * 1. 实时合成洗牌摩擦音 (White Noise with Envelope)
   */
  const playShuffle = () => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    // 产生 1.2 秒的白噪声
    const bufferSize = ctx.sampleRate * 1.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // 滤波器：过滤高频，让声音沙沙声更柔和，像卡牌摩擦
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.Q.setValueAtTime(1.0, ctx.currentTime);

    // 增益节点（包络控制）
    const gainNode = ctx.createGain();
    const t = ctx.currentTime;
    
    // 模拟洗牌的起伏感：快速往复切牌摩擦
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.08, t + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.02, t + 0.25);
    gainNode.gain.linearRampToValueAtTime(0.07, t + 0.4);
    gainNode.gain.linearRampToValueAtTime(0.01, t + 0.6);
    gainNode.gain.linearRampToValueAtTime(0.06, t + 0.8);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    // 连线: Source -> Filter -> Gain -> Destination
    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noiseSource.start(t);
    noiseSource.stop(t + 1.2);
  };

  /**
   * 2. 实时合成水晶清响翻牌音 (Sine waves with exponential decay chime)
   * 双谐波振荡叠加 (A5: 880Hz + E6: 1320Hz)
   */
  const playReveal = () => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.12, t + 0.02); // 瞬态敲击起音
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 2.0); // 2秒清脆长延音

    // 基音：880Hz (纯净高雅)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, t);

    // 泛音：1320Hz (增添空灵感)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, t);
    
    // 微弱三度泛音：1760Hz
    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1760, t);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.04, t);
    
    const osc3Gain = ctx.createGain();
    osc3Gain.gain.setValueAtTime(0.01, t);

    // 连接
    osc1.connect(gainNode);
    
    osc2.connect(osc2Gain);
    osc2Gain.connect(gainNode);
    
    osc3.connect(osc3Gain);
    osc3Gain.connect(gainNode);

    gainNode.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc3.start(t);

    osc1.stop(t + 2.0);
    osc2.stop(t + 2.0);
    osc3.stop(t + 2.0);
  };

  /**
   * 3. 持续性流式文本输出背景沙沙白噪音 (Low volume ambient shimmer wind)
   */
  const playAmbient = () => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    // 避免重复创建
    if (ambientNodesRef.current) return;

    // 创建白噪声 buffer
    const bufferSize = ctx.sampleRate * 4; // 4秒循环
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // 滤波器：使用低通滤波器过滤高频尖锐音，使风鸣极其轻柔
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    // 极轻音量，淡入
    const gainNode = ctx.createGain();
    const t = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.015, t + 1.0); // 1秒淡入

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(t);
    ambientNodesRef.current = { source, gainNode };
  };

  const stopAmbient = () => {
    if (!ambientNodesRef.current) return;
    const { source, gainNode } = ambientNodesRef.current;
    
    try {
      const ctx = audioCtxRef.current;
      if (ctx) {
        const t = ctx.currentTime;
        // 淡出 0.5 秒再停止，避免破音
        gainNode.gain.setValueAtTime(gainNode.gain.value, t);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        source.stop(t + 0.5);
      } else {
        source.stop();
      }
    } catch (_) {
      // 捕获可能已停止的报错
    }
    
    ambientNodesRef.current = null;
  };

  /**
   * 4. 持续性颂钵多谐波共振冥声音效 (Tibetan Singing Bowl with 110Hz + 220Hz + 330Hz + 双耳差频)
   * 528Hz (修复奇迹频率) 与 528.5Hz (双耳差频)
   */
  const playBowl = () => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    if (bowlNodesRef.current) return;

    const t = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.06, t + 2.0); // 2秒缓慢淡入，制造深远幽静感

    const oscillators: OscillatorNode[] = [];

    // 528Hz 奇迹频率
    const frequencies = [264, 264.5, 396, 528, 528.5, 792];
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      
      // 给不同的泛音分配不同的音量
      const oscGain = ctx.createGain();
      const relativeVolume = idx === 0 || idx === 1 ? 0.35 : idx === 3 || idx === 4 ? 0.2 : 0.08;
      oscGain.gain.setValueAtTime(relativeVolume, t);
      
      osc.connect(oscGain);
      oscGain.connect(gainNode);
      osc.start(t);
      
      oscillators.push(osc);
    });

    gainNode.connect(ctx.destination);
    bowlNodesRef.current = { oscillators, gainNode };
  };

  const stopBowl = () => {
    if (!bowlNodesRef.current) return;
    const { oscillators, gainNode } = bowlNodesRef.current;
    
    try {
      const ctx = audioCtxRef.current;
      if (ctx) {
        const t = ctx.currentTime;
        // 慢淡出 2.5 秒，模拟颂钵余音逐渐消逝在虚空中
        gainNode.gain.setValueAtTime(gainNode.gain.value, t);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
        
        setTimeout(() => {
          oscillators.forEach((osc) => {
            try { osc.stop(); } catch (_) {}
          });
        }, 2600);
      } else {
        oscillators.forEach((osc) => osc.stop());
      }
    } catch (_) {
      // 容错
    }

    bowlNodesRef.current = null;
  };

  return {
    isMuted,
    toggleMute,
    playShuffle,
    playReveal,
    playAmbient,
    stopAmbient,
    playBowl,
    stopBowl
  };
}
