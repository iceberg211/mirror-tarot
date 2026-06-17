'use client';

import React, { useRef, useEffect, useState } from 'react';

interface MistScratchProps {
  onFinish: () => void;
  className?: string;
}

export default function MistScratch({ onFinish, className = '' }: MistScratchProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [finished, setFinished] = useState(false);
  const isDrawingRef = useRef(false);
  const lastCheckedRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. 自适应高分屏像素比，保证在高分屏上渲染清晰
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // 2. 绘制带有磨砂质感和金色微尘的星空遮罩
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

    // 3. 设置混合模式为 destination-out，用来做擦除笔迹
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // 笔刷宽度乘以 dpr，使其在不同 dpr 分辨率屏幕下物理尺寸表现一致，手感更佳！
    ctx.lineWidth = 32 * dpr; 
    ctx.globalCompositeOperation = 'destination-out';

    // 4. 辅助函数：根据 touch/mouse 坐标计算相对 CSS 的坐标（因为 scale 了 dpr）
    const getCoordinates = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: clientX - r.left,
        y: clientY - r.top
      };
    };

    // 5. 检查已擦除像素比例
    const checkScratchProgress = () => {
      const now = Date.now();
      if (now - lastCheckedRef.current < 200) return; // 200ms 采样检测防抖，极大降低 CPU 负担
      lastCheckedRef.current = now;

      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        let transparentCount = 0;
        const totalPixels = data.length / 4;

        // 采样步长为 8，只需要粗略估算，不需要精细计算所有像素，极大优化性能
        for (let i = 3; i < data.length; i += 32) {
          if (data[i] === 0) {
            transparentCount++;
          }
        }
        
        // 检查被擦除的比例是否大于 45%（稍微下调阈值，提供更轻松解压的划开体验，防止边缘卡死）
        const ratio = transparentCount / (totalPixels / 8);
        if (ratio > 0.45) {
          setFinished(true);
          onFinish();
        }
      } catch (_) {
        // 异常容错
      }
    };

    // 6. 核心绘制逻辑
    const startDrawing = (x: number, y: number) => {
      isDrawingRef.current = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (x: number, y: number) => {
      if (!isDrawingRef.current) return;
      ctx.lineTo(x, y);
      ctx.stroke();
      checkScratchProgress();
    };

    const stopDrawing = () => {
      isDrawingRef.current = false;
    };

    // 7. 绑定原生 Touch 事件并强制阻止默认事件 (设置 passive: false 阻止移动端页面滚动)
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      const pos = getCoordinates(e.touches[0].clientX, e.touches[0].clientY);
      startDrawing(pos.x, pos.y);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      const pos = getCoordinates(e.touches[0].clientX, e.touches[0].clientY);
      draw(pos.x, pos.y);
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      stopDrawing();
    };

    // 8. 绑定原生 Mouse 事件
    const onMouseDown = (e: MouseEvent) => {
      const pos = getCoordinates(e.clientX, e.clientY);
      startDrawing(pos.x, pos.y);
    };

    const onMouseMove = (e: MouseEvent) => {
      const pos = getCoordinates(e.clientX, e.clientY);
      draw(pos.x, pos.y);
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopDrawing);

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDrawing);
    };
  }, [onFinish]);

  return (
    <div className={`absolute inset-0 w-full h-full rounded-xl transition-opacity duration-300 z-30 overflow-hidden ${finished ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair absolute inset-0 touch-none"
      />
    </div>
  );
}
