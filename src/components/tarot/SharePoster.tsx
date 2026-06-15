'use client';

import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { X, Download, Sparkles, Moon } from 'lucide-react';
import TarotCard from './TarotCard';
import { SelectedCard } from '@/lib/tarot/types';

interface SharePosterProps {
  question: string;
  mood: string;
  mainCard: SelectedCard;
  intuitiveSummary: string;
  onClose: () => void;
}

export default function SharePoster({
  question,
  mood,
  mainCard,
  intuitiveSummary,
  onClose,
}: SharePosterProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [exportedImgUrl, setExportedImgUrl] = useState<string | null>(null);

  const handleExport = async () => {
    if (!posterRef.current || downloading) return;
    setDownloading(true);

    try {
      // 等待图片资源和字体加载完毕
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        quality: 0.98,
        backgroundColor: '#07090F',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: '360px',
          height: '640px',
        },
        width: 360,
        height: 640,
      });

      setExportedImgUrl(dataUrl);

      // 自动尝试触发 PC 端浏览器下载
      const link = document.createElement('a');
      link.download = `mirror-tarot-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to export poster image:', error);
    } finally {
      setDownloading(false);
    }
  };

  const formattedDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '.');

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md p-4 animate-fadeIn select-none">
      
      {/* 顶部控制栏 */}
      <div className="w-full max-w-sm flex justify-between items-center mb-4 text-foreground">
        <span className="text-xs font-serif text-gold-muted/80 tracking-widest">
          分享灵感卡片
        </span>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full border border-gold/15 bg-card/30 flex items-center justify-center text-gold/75 hover:border-gold/35 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 海报容器主体 (在手机端可见并按 9:16 排版) */}
      <div className="relative w-[300px] h-[533px] sm:w-[324px] sm:h-[576px] rounded-2xl border border-gold/30 overflow-hidden shadow-gold-glow-lg flex items-center justify-center">
        
        {/* DOM 海报结构 (被截图的真实节点，固定 360x640) */}
        <div
          ref={posterRef}
          className="absolute w-[360px] h-[640px] bg-[#07090F] p-6 flex flex-col justify-between items-center text-foreground z-10"
          style={{
            // 为了在预览大框里完美贴合，预览时按比例缩小展示，截图时按 100% 原始大小截图
            transform: 'scale(0.833)', // 300 / 360 = 0.833
            transformOrigin: 'center center',
          }}
        >
          {/* 古典星轨饰纹背景 */}
          <div className="absolute inset-4 border border-gold/15 rounded-[12px] pointer-events-none" />
          <div className="absolute inset-5 border border-dashed border-gold/5 rounded-[10px] pointer-events-none" />

          {/* 四角星芒 */}
          <div className="absolute top-6 left-6 text-gold/25 w-3 h-3">✦</div>
          <div className="absolute top-6 right-6 text-gold/25 w-3 h-3">✦</div>
          <div className="absolute bottom-6 left-6 text-gold/25 w-3 h-3">✦</div>
          <div className="absolute bottom-6 right-6 text-gold/25 w-3 h-3">✦</div>

          {/* 顶部 Header */}
          <div className="flex flex-col items-center gap-1.5 mt-2">
            <div className="w-8 h-8 rounded-full border border-gold/25 flex items-center justify-center">
              <Moon className="w-3.5 h-3.5 text-gold/80" />
            </div>
            <h3 className="text-sm font-serif tracking-widest text-gold font-bold">Mirror Tarot</h3>
          </div>

          {/* 中部主卡面 (RWS 牌面展示) */}
          <div className="flex-1 my-4 flex items-center justify-center">
            <div className="scale-95 shadow-gold-glow">
              <TarotCard card={mainCard} revealed={true} size="sm" interactive={false} />
            </div>
          </div>

          {/* 引言金句与困惑问题 */}
          <div className="w-full px-2 text-center flex flex-col gap-3">
            <div className="relative p-4 rounded-xl bg-[#0F1118]/85 border border-gold/10">
              <span className="absolute top-1 left-2 text-gold/20 text-2xl font-serif">“</span>
              <p className="text-xs font-serif text-gold leading-relaxed px-3">
                {intuitiveSummary}
              </p>
              <span className="absolute bottom-1 right-2 text-gold/20 text-2xl font-serif">”</span>
            </div>
            
            {/* 问题摘要 */}
            <div className="text-[10px] text-gold-muted/65 font-serif line-clamp-1 max-w-[280px] mx-auto opacity-75">
              问：{question.length > 28 ? question.slice(0, 26) + '...' : question}
            </div>
          </div>

          {/* 底部 Footer */}
          <div className="w-full flex justify-between items-center border-t border-gold/10 pt-4 mt-2 mb-1">
            <div className="flex flex-col gap-0.5 text-left pl-1">
              <span className="text-[10px] font-serif text-gold tracking-widest">{mood} ✦ 今日启示</span>
              <span className="text-[9px] font-mono text-gold-muted/50">{formattedDate}</span>
            </div>

            {/* 精美的古典星轨二维码占位符 */}
            <div className="w-11 h-11 rounded-lg border border-gold/25 bg-[#090B10] flex flex-col items-center justify-center p-0.5 relative mr-1">
              <div className="w-full h-full rounded border border-dashed border-gold/10 flex items-center justify-center">
                {/* 模拟二维码中间的小月亮 */}
                <Moon className="w-3 h-3 text-gold/50 animate-pulse" />
              </div>
              <span className="absolute bottom-[-14px] right-[-2px] text-[7px] text-gold-muted/40 font-mono tracking-tighter whitespace-nowrap scale-90">
                扫码遇见自己
              </span>
            </div>
          </div>
        </div>

        {/* 移动端专用的顶层 100% 透明图片 (覆盖于预览卡片上方，让用户在手机上能直接“长按保存”) */}
        {exportedImgUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={exportedImgUrl}
            alt="长按保存分享海报"
            className="absolute inset-0 w-full h-full opacity-0 z-30 cursor-pointer"
          />
        )}
      </div>

      {/* 底部操作区 */}
      <div className="w-full max-w-sm mt-5 px-2 flex flex-col gap-2.5 items-center">
        <button
          onClick={handleExport}
          disabled={downloading}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-[#171610] via-[#2E281C] to-[#171610] border border-gold text-gold text-xs font-serif font-semibold tracking-widest shadow-gold-glow flex items-center justify-center gap-2 cursor-pointer transition-all hover:brightness-110 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? '海报生成中...' : '✦ 保存海报至相册 ✦'}</span>
        </button>

        <p className="text-[10px] text-gold-muted/50 font-serif tracking-widest text-center leading-normal">
          {exportedImgUrl ? '📱 手机端可直接【长按海报区域】进行保存' : '提示：点击按钮即可导出并自动下载海报'}
        </p>
      </div>

    </div>
  );
}
