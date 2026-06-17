'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type ElementType = 'water' | 'fire' | 'wind' | 'earth';

type ElementSourceNode = AudioBufferSourceNode & {
  lfo?: OscillatorNode;
  groundOscillator?: OscillatorNode;
};

interface ElementNodes {
  source: ElementSourceNode;
  gainNode: GainNode;
  intervalId?: ReturnType<typeof setInterval>;
}

let globalMuted = false;
const listeners = new Set<(muted: boolean) => void>();

function setGlobalMuted(muted: boolean) {
  globalMuted = muted;
  if (typeof window !== 'undefined') {
    localStorage.setItem('mirror_tarot_mute', muted ? 'true' : 'false');
  }
  listeners.forEach((listener) => listener(muted));
}

function createNoiseBuffer(ctx: AudioContext, seconds: number) {
  const bufferSize = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function stopOscillator(oscillator?: OscillatorNode) {
  if (!oscillator) return;
  try {
    oscillator.stop();
  } catch {
    // 已停止的节点无需处理
  }
}

export function useAudio() {
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === 'undefined') return globalMuted;
    const savedMute = localStorage.getItem('mirror_tarot_mute') === 'true';
    if (savedMute) globalMuted = true;
    return globalMuted;
  });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientNodesRef = useRef<{ source: AudioBufferSourceNode; gainNode: GainNode } | null>(null);
  const bowlNodesRef = useRef<{ oscillators: OscillatorNode[]; gainNode: GainNode } | null>(null);
  const elementNodesRef = useRef<ElementNodes | null>(null);

  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;

    if (!audioCtxRef.current) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
    }

    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    return audioCtxRef.current;
  }, []);

  const stopAmbient = useCallback(() => {
    if (!ambientNodesRef.current) return;
    const { source, gainNode } = ambientNodesRef.current;

    try {
      const ctx = audioCtxRef.current;
      if (ctx) {
        const t = ctx.currentTime;
        gainNode.gain.setValueAtTime(gainNode.gain.value, t);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        source.stop(t + 0.5);
      } else {
        source.stop();
      }
    } catch {
      // 已停止的节点无需处理
    }

    ambientNodesRef.current = null;
  }, []);

  const stopBowl = useCallback(() => {
    if (!bowlNodesRef.current) return;
    const { oscillators, gainNode } = bowlNodesRef.current;

    try {
      const ctx = audioCtxRef.current;
      if (ctx) {
        const t = ctx.currentTime;
        gainNode.gain.setValueAtTime(gainNode.gain.value, t);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
        setTimeout(() => {
          oscillators.forEach(stopOscillator);
        }, 2600);
      } else {
        oscillators.forEach(stopOscillator);
      }
    } catch {
      // 已停止的节点无需处理
    }

    bowlNodesRef.current = null;
  }, []);

  const stopElementAmbient = useCallback(() => {
    if (!elementNodesRef.current) return;
    const { source, gainNode, intervalId } = elementNodesRef.current;

    if (intervalId) clearInterval(intervalId);

    const stopSource = () => {
      try {
        source.stop();
      } catch {
        // 已停止的节点无需处理
      }
      stopOscillator(source.lfo);
      stopOscillator(source.groundOscillator);
    };

    try {
      const ctx = audioCtxRef.current;
      if (ctx) {
        const t = ctx.currentTime;
        gainNode.gain.setValueAtTime(gainNode.gain.value, t);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 1);
        setTimeout(stopSource, 1100);
      } else {
        stopSource();
      }
    } catch {
      // 已停止的节点无需处理
    }

    elementNodesRef.current = null;
  }, []);

  useEffect(() => {
    const handleChange = (muted: boolean) => {
      setIsMuted(muted);
      if (muted) {
        stopAmbient();
        stopBowl();
        stopElementAmbient();
      }
    };

    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, [stopAmbient, stopBowl, stopElementAmbient]);

  const toggleMute = useCallback(() => {
    setGlobalMuted(!globalMuted);
  }, []);

  const playShuffle = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = createNoiseBuffer(ctx, 1.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(480, ctx.currentTime);

    const gainNode = ctx.createGain();
    const t = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.045, t + 0.15);
    gainNode.gain.linearRampToValueAtTime(0.015, t + 0.35);
    gainNode.gain.linearRampToValueAtTime(0.04, t + 0.55);
    gainNode.gain.linearRampToValueAtTime(0.01, t + 0.75);
    gainNode.gain.linearRampToValueAtTime(0.035, t + 0.95);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noiseSource.start(t);
    noiseSource.stop(t + 1.2);
  }, [getAudioContext, isMuted]);

  const playReveal = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.09, t + 0.025);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);

    const tones = [
      { frequency: 440, type: 'sine' as OscillatorType, volume: 0.06 },
      { frequency: 554.37, type: 'sine' as OscillatorType, volume: 0.028 },
      { frequency: 659.25, type: 'sine' as OscillatorType, volume: 0.025 },
      { frequency: 880, type: 'sine' as OscillatorType, volume: 0.012 },
      { frequency: 220, type: 'triangle' as OscillatorType, volume: 0.015 },
    ];

    tones.forEach(({ frequency, type, volume }) => {
      const oscillator = ctx.createOscillator();
      const toneGain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, t);
      toneGain.gain.setValueAtTime(volume, t);
      oscillator.connect(toneGain);
      toneGain.connect(gainNode);
      oscillator.start(t);
      oscillator.stop(t + 3.2);
    });

    gainNode.connect(ctx.destination);
  }, [getAudioContext, isMuted]);

  const playAmbient = useCallback(() => {
    if (isMuted || ambientNodesRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const source = ctx.createBufferSource();
    source.buffer = createNoiseBuffer(ctx, 4);
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    const gainNode = ctx.createGain();
    const t = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.015, t + 1);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(t);
    ambientNodesRef.current = { source, gainNode };
  }, [getAudioContext, isMuted]);

  const playBowl = useCallback(() => {
    if (isMuted || bowlNodesRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.06, t + 2);

    const oscillators: OscillatorNode[] = [];
    const frequencies = [264, 264.5, 396, 528, 528.5, 792];

    frequencies.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const toneGain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, t);

      const relativeVolume = index === 0 || index === 1 ? 0.35 : index === 3 || index === 4 ? 0.2 : 0.08;
      toneGain.gain.setValueAtTime(relativeVolume, t);

      oscillator.connect(toneGain);
      toneGain.connect(gainNode);
      oscillator.start(t);
      oscillators.push(oscillator);
    });

    gainNode.connect(ctx.destination);
    bowlNodesRef.current = { oscillators, gainNode };
  }, [getAudioContext, isMuted]);

  const playShuffleScratch = useCallback((volume = 0.05) => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = createNoiseBuffer(ctx, 0.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
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
  }, [getAudioContext, isMuted]);

  const playElementAmbient = useCallback((element: ElementType) => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    if (elementNodesRef.current) {
      stopElementAmbient();
    }

    const t = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.035, t + 2);

    let source: ElementSourceNode;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    if (element === 'water' || element === 'wind') {
      source = ctx.createBufferSource() as ElementSourceNode;
      source.buffer = createNoiseBuffer(ctx, element === 'water' ? 6 : 5);
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = element === 'water' ? 'lowpass' : 'bandpass';
      filter.frequency.setValueAtTime(element === 'water' ? 220 : 320, t);
      if (element === 'wind') filter.Q.setValueAtTime(2.2, t);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(element === 'water' ? 0.12 : 0.09, t);
      lfoGain.gain.setValueAtTime(element === 'water' ? 120 : 180, t);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(t);
      source.lfo = lfo;

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(t);
    } else if (element === 'fire') {
      source = ctx.createBufferSource() as ElementSourceNode;
      source.buffer = createNoiseBuffer(ctx, 4);
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, t);

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(t);

      intervalId = setInterval(() => {
        if (globalMuted) return;
        const curCtx = audioCtxRef.current;
        if (!curCtx || Math.random() <= 0.45) return;

        const curT = curCtx.currentTime;
        const snapLenSeconds = 0.006 + Math.random() * 0.018;
        const snapSrc = curCtx.createBufferSource();
        snapSrc.buffer = createNoiseBuffer(curCtx, snapLenSeconds);

        const snapFilter = curCtx.createBiquadFilter();
        snapFilter.type = 'highpass';
        snapFilter.frequency.setValueAtTime(2000 + Math.random() * 1200, curT);

        const snapGain = curCtx.createGain();
        snapGain.gain.setValueAtTime(0.025 + Math.random() * 0.035, curT);
        snapGain.gain.exponentialRampToValueAtTime(0.001, curT + snapLenSeconds);

        snapSrc.connect(snapFilter);
        snapFilter.connect(snapGain);
        snapGain.connect(curCtx.destination);
        snapSrc.start(curT);
        snapSrc.stop(curT + snapLenSeconds);
      }, 200);
    } else {
      source = ctx.createBufferSource() as ElementSourceNode;
      source.buffer = createNoiseBuffer(ctx, 8);
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(75, t);

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(t);

      const oscillator = ctx.createOscillator();
      const oscillatorGain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(110, t);
      oscillatorGain.gain.setValueAtTime(0.006, t);
      oscillator.connect(oscillatorGain);
      oscillatorGain.connect(gainNode);
      oscillator.start(t);
      source.groundOscillator = oscillator;

      intervalId = setInterval(() => {
        if (globalMuted) return;
        const curCtx = audioCtxRef.current;
        if (!curCtx || Math.random() <= 0.7) return;

        const curT = curCtx.currentTime;
        const chime = curCtx.createOscillator();
        const chimeGain = curCtx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(1000 + Math.random() * 500, curT);
        chimeGain.gain.setValueAtTime(0, curT);
        chimeGain.gain.linearRampToValueAtTime(0.005, curT + 0.06);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, curT + 3.5);
        chime.connect(chimeGain);
        chimeGain.connect(curCtx.destination);
        chime.start(curT);
        chime.stop(curT + 3.5);
      }, 3500);
    }

    elementNodesRef.current = { source, gainNode, intervalId };
  }, [getAudioContext, isMuted, stopElementAmbient]);

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
    stopElementAmbient,
  };
}
