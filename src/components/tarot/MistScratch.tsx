'use client';

import React, { useRef, useEffect, useState } from 'react';

interface MistScratchProps {
  onFinish: () => void;
  className?: string;
}

export default function MistScratch({ onFinish, className = '' }: MistScratchProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [finished, setFinished] = useState(false);
  const lastCheckedRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 自适应像素比，保证在高分屏上渲染清晰
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // 1. 绘制带有磨砂质感和金色微尘的星空遮罩
    ctx.fillStyle = '#0E1015'; // 略深色背景，与牌槽契合
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 绘制金色尘埃粒子
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * rect.width;
      const y = Math.random() * rect.height;
      const r = 0.6 + Math.random() * 1.4;
      const alpha = 0.15 + Math.random() * 0.5;
      
      ctx.fillStyle = `rgba(218, 165, 32, ${alpha})`; // 金色
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 绘制文字提示
    ctx.fillStyle = 'rgba(218, 165, 32, 0.85)';
    ctx.font = 'normal 10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦ 擦拭迷雾 ✦', rect.width / 2, rect.height / 2 - 10);
    ctx.font = 'italic 8px sans-serif';
    ctx.fillStyle = 'rgba(218, 165, 32, 0.45)';
    ctx.fillText('以直觉显影', rect.width / 2, rect.height / 2 + 8);

    // 2. 设置混合模式为 destination-out，用来做擦除笔迹
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 26; // 笔刷宽度，适合移动端粗细
    ctx.globalCompositeOperation = 'destination-out';
  }, []);

  // 检查已擦除像素比例
  const checkProgress = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const now = Date.now();
    if (now - lastCheckedRef.current < 200) return; // 200ms 采样检测防抖，极大降低 CPU 负担
    lastCheckedRef.current = now;

    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      let transparentCount = 0;
      const totalPixels = data.length / 4;

      // 采样步长为 8，只需要粗略估算，不需要精细计算所有像素，极大优化性能
      for (let i = 3; i < data.length; i += 32) {
        if (data[i] === 0) {
          transparentCount++;
        }
      }
      
      // 检查被擦除的比例是否大于 55%
      const ratio = transparentCount / (totalPixels / 8);
      if (ratio > 0.55) {
        setFinished(true);
        setTimeout(() => {
          onFinish();
        }, 250);
      }
    } catch (_) {
      // 异常容错
    }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (finished) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || finished) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    checkProgress(ctx, canvas.width, canvas.height);
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  return (
    <div className={`absolute inset-0 w-full h-full rounded-xl transition-opacity duration-300 z-30 overflow-hidden ${finished ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair absolute inset-0 touch-none"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
    </div>
  );
}
