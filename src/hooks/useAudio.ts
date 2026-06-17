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
   * 1. 实时合成洗牌摩擦音 (温润的纸质塔罗卡牌摩擦声)
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

    // 滤波器：使用低通滤波器过滤高频，截止频率设为 480Hz，使沙沙声更显厚重和柔和，去除金属塑料感
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(480, ctx.currentTime);

    // 增益节点（包络控制）
    const gainNode = ctx.createGain();
    const t = ctx.currentTime;
    
    // 模拟纸牌洗牌时层叠摩擦的渐起渐伏
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.045, t + 0.15);
    gainNode.gain.linearRampToValueAtTime(0.015, t + 0.35);
    gainNode.gain.linearRampToValueAtTime(0.04, t + 0.55);
    gainNode.gain.linearRampToValueAtTime(0.01, t + 0.75);
    gainNode.gain.linearRampToValueAtTime(0.035, t + 0.95);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    // 连线: Source -> Filter -> Gain -> Destination
    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noiseSource.start(t);
    noiseSource.stop(t + 1.2);
  };

  /**
   * 2. 实时合成大三度和弦水晶磬翻牌音 (Warm Triad Chime Chord)
   * 融合 A4(440Hz), C#5(554.37Hz), E5(659.25Hz), A5(880Hz)
   * 增添微弱的 A3(220Hz) 三角波以加强磬底的实体温润质感，长达 3.2 秒的长衰减余音
   */
  const playReveal = () => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.09, t + 0.025); // 柔和起音
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 3.2); // 3.2秒悠长余音

    // 1. 基音：A4 (440Hz) - 温和明朗
    const oscRoot = ctx.createOscillator();
    oscRoot.type = 'sine';
    oscRoot.frequency.setValueAtTime(440, t);

    // 2. 三度音：C#5 (554.37Hz) - 带来神秘大三度明亮感
    const oscThird = ctx.createOscillator();
    oscThird.type = 'sine';
    oscThird.frequency.setValueAtTime(554.37, t);

    // 3. 五度音：E5 (659.25Hz) - 巩固空灵感
    const oscFifth = ctx.createOscillator();
    oscFifth.type = 'sine';
    oscFifth.frequency.setValueAtTime(659.25, t);

    // 4. 八度泛音：A5 (880Hz) - 提供清脆感
    const oscOctave = ctx.createOscillator();
    oscOctave.type = 'sine';
    oscOctave.frequency.setValueAtTime(880, t);

    // 5. 实体铜底：A3 (220Hz) - 三角波
    const oscBase = ctx.createOscillator();
    oscBase.type = 'triangle';
    oscBase.frequency.setValueAtTime(220, t);

    // 为各声部配置独立的声部增益，防止声音过载且令听感极富层次
    const gainRoot = ctx.createGain();
    gainRoot.gain.setValueAtTime(0.06, t);

    const gainThird = ctx.createGain();
    gainThird.gain.setValueAtTime(0.028, t);

    const gainFifth = ctx.createGain();
    gainFifth.gain.setValueAtTime(0.025, t);

    const gainOctave = ctx.createGain();
    gainOctave.gain.setValueAtTime(0.012, t);

    const gainBase = ctx.createGain();
    gainBase.gain.setValueAtTime(0.015, t); // 三角波底色极其细微

    // 连接
    oscRoot.connect(gainRoot);
    gainRoot.connect(gainNode);

    oscThird.connect(gainThird);
    gainThird.connect(gainNode);

    oscFifth.connect(gainFifth);
    gainFifth.connect(gainNode);

    oscOctave.connect(gainOctave);
    gainOctave.connect(gainNode);

    oscBase.connect(gainBase);
    gainBase.connect(gainNode);

    gainNode.connect(ctx.destination);

    // 启动
    oscRoot.start(t);
    oscThird.start(t);
    oscFifth.start(t);
    oscOctave.start(t);
    oscBase.start(t);

    // 停止
    oscRoot.stop(t + 3.2);
    oscThird.stop(t + 3.2);
    oscFifth.stop(t + 3.2);
    oscOctave.stop(t + 3.2);
    oscBase.stop(t + 3.2);
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
