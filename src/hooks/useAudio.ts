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
  
  // 持续性白噪音、颂钵、以及四元素自然环境声的 Node 引用，以便停止它们
  const ambientNodesRef = useRef<{ source: AudioBufferSourceNode; gainNode: GainNode } | null>(null);
  const bowlNodesRef = useRef<{ oscillators: OscillatorNode[]; gainNode: GainNode } | null>(null);
  const elementNodesRef = useRef<{ source: AudioBufferSourceNode; gainNode: GainNode; intervalId?: any } | null>(null);

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
        stopElementAmbient();
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

  /**
   * 5. 播报一次短暂卡牌摩擦沙沙声，可以根据搅拌手势的位移速度频繁调用
   */
  const playShuffleScratch = (volume: number = 0.05) => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    
    // 产生 0.2 秒短音
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    // 稍微带一点随机性，使多次摩擦听上去更自然
    filter.frequency.setValueAtTime(650 + Math.random() * 250, t);
    filter.Q.setValueAtTime(1.8, t);
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(volume, t + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    source.start(t);
    source.stop(t + 0.2);
  };

  /**
   * 6. 持续性水/火/风/土四元素自然冥想声音合成器
   */
  const playElementAmbient = (element: 'water' | 'fire' | 'wind' | 'earth') => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    if (elementNodesRef.current) {
      stopElementAmbient();
    }

    const t = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, t);
    // 极其微弱的环境音，避免喧宾夺主
    gainNode.gain.linearRampToValueAtTime(0.035, t + 2.0); // 2秒淡入

    let source: AudioBufferSourceNode;
    let filter: BiquadFilterNode;
    let intervalId: any = undefined;

    if (element === 'water') {
      // 水（圣杯）：慢速起伏的波浪。白噪声 + LFO 调制低通滤波
      const bufferSize = ctx.sampleRate * 6;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, t);

      // 用一个慢速 Oscillator 作为 LFO 控制滤波器的频率，模拟波涛起伏
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.12, t); // ~8秒一个周期

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(120, t); // 振幅120Hz

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(t);

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(t);
      (source as any)._lfo = lfo;

    } else if (element === 'wind') {
      // 风（宝剑）：呼呼风声。带通滤波器 + LFO 调制
      const bufferSize = ctx.sampleRate * 5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, t);
      filter.Q.setValueAtTime(2.2, t);

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.09, t);

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(180, t);

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(t);

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(t);
      (source as any)._lfo = lfo;

    } else if (element === 'fire') {
      // 火（权杖）：噼啪燃烧。低通底噪 + 间歇性爆裂声
      const bufferSize = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, t);

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(t);

      // 定时器触发爆破火花
      intervalId = setInterval(() => {
        if (globalMuted) return;
        const curCtx = audioCtxRef.current;
        if (!curCtx) return;
        const curT = curCtx.currentTime;
        
        if (Math.random() > 0.45) {
          const snapLen = curCtx.sampleRate * (0.006 + Math.random() * 0.018);
          const snapBuffer = curCtx.createBuffer(1, snapLen, curCtx.sampleRate);
          const snapData = snapBuffer.getChannelData(0);
          for (let i = 0; i < snapLen; i++) snapData[i] = Math.random() * 2 - 1;

          const snapSrc = curCtx.createBufferSource();
          snapSrc.buffer = snapBuffer;

          const snapFilter = curCtx.createBiquadFilter();
          snapFilter.type = 'highpass';
          snapFilter.frequency.setValueAtTime(2000 + Math.random() * 1200, curT);

          const snapGain = curCtx.createGain();
          snapGain.gain.setValueAtTime(0.025 + Math.random() * 0.035, curT);
          snapGain.gain.exponentialRampToValueAtTime(0.001, curT + snapLen / curCtx.sampleRate);

          snapSrc.connect(snapFilter);
          snapFilter.connect(snapGain);
          snapGain.connect(curCtx.destination);
          
          snapSrc.start(curT);
        }
      }, 200);

    } else {
      // 土（星币）：大地沉鸣。超低通大地呼吸底噪 + 偶有水晶罄声
      const bufferSize = ctx.sampleRate * 8;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(75, t);

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(t);

      // 地壳嗡鸣
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, t);
      
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.006, t);
      
      osc.connect(oscGain);
      oscGain.connect(gainNode);
      osc.start(t);
      (source as any)._osc = osc;

      // 悠长风铃
      intervalId = setInterval(() => {
        if (globalMuted) return;
        const curCtx = audioCtxRef.current;
        if (!curCtx) return;
        const curT = curCtx.currentTime;

        if (Math.random() > 0.7) {
          const oscChime = curCtx.createOscillator();
          oscChime.type = 'sine';
          oscChime.frequency.setValueAtTime(1000 + Math.random() * 500, curT);

          const chimeGain = curCtx.createGain();
          chimeGain.gain.setValueAtTime(0, curT);
          chimeGain.gain.linearRampToValueAtTime(0.005, curT + 0.06);
          chimeGain.gain.exponentialRampToValueAtTime(0.0001, curT + 3.5);

          oscChime.connect(chimeGain);
          chimeGain.connect(curCtx.destination);
          oscChime.start(curT);
          oscChime.stop(curT + 3.5);
        }
      }, 3500);
    }

    elementNodesRef.current = { source, gainNode, intervalId };
  };

  const stopElementAmbient = () => {
    if (!elementNodesRef.current) return;
    const { source, gainNode, intervalId } = elementNodesRef.current;

    if (intervalId) clearInterval(intervalId);

    try {
      const ctx = audioCtxRef.current;
      if (ctx) {
        const t = ctx.currentTime;
        gainNode.gain.setValueAtTime(gainNode.gain.value, t);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 1.0); // 1秒平滑淡出
        
        setTimeout(() => {
          try {
            source.stop();
            if ((source as any)._lfo) ((source as any)._lfo).stop();
            if ((source as any)._osc) ((source as any)._osc).stop();
          } catch (_) {}
        }, 1100);
      } else {
        source.stop();
        if ((source as any)._lfo) ((source as any)._lfo).stop();
        if ((source as any)._osc) ((source as any)._osc).stop();
      }
    } catch (_) {}

    elementNodesRef.current = null;
  };

  return {
    isMuted,
    toggleMute,
    playShuffle,
    playReveal,
    playAmbient,
    stopAmbient,
    playBowl,
    stopBowl,
    playShuffleScratch,
    playElementAmbient,
    stopElementAmbient
  };
}
