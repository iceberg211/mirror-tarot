'use client';

import React, { useState, useMemo } from 'react';
import { Book, Search, X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { tarotCards } from '@/lib/tarot/cards';
import { TarotCard as TarotCardType } from '@/lib/tarot/types';
import BottomNav from '@/components/layout/BottomNav';
import { getLocalReadings } from '@/lib/db/localJournal';
import CardMeaningModal from '@/components/tarot/CardMeaningModal';

export default function DeckPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all'); // 'all' | 'major' | 'wands' | 'cups' | 'swords' | 'pentacles'
  
  // 选中的卡片，用于弹窗详细浏览
  const [selectedCard, setSelectedCard] = useState<TarotCardType | null>(null);

  // 用户历史抽卡次数统计
  const [drawnStats] = useState<Record<string, number>>(() => getDrawnStats());

  // 筛选分类配置
  const filterTabs = [
    { id: 'all', name: '全部' },
    { id: 'major', name: '大阿卡纳' },
    { id: 'wands', name: '权杖 (火)' },
    { id: 'cups', name: '圣杯 (水)' },
    { id: 'swords', name: '宝剑 (风)' },
    { id: 'pentacles', name: '星币 (土)' },
  ];

  // 筛选卡牌数据
  const filteredCards = useMemo(() => {
    return tarotCards.filter((card) => {
      // 1. 搜索匹配 (支持中文、英文匹配)
      const matchesSearch =
        card.zhName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.name.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. 类别匹配
      if (filterType === 'all') return true;
      if (filterType === 'major') return card.arcana === 'major';
      return card.suit === filterType;
    });
  }, [searchQuery, filterType]);



  // 点击开启 Modal 时触发异步 import()
  const handleOpenModal = (card: TarotCardType) => {
    setSelectedCard(card);
  };

  return (
    <main className="flex-grow min-h-screen pb-28 flex flex-col items-center text-foreground relative overflow-y-auto select-none">
      
      {/* 顶部 Header */}
      <div className="w-full max-w-md px-6 pt-12 flex flex-col items-start gap-1">
        <h1 className="text-2xl font-serif tracking-widest text-gold font-bold flex items-center gap-2">
          <Book className="w-5 h-5" />
          <span>牌义图鉴</span>
        </h1>
        <p className="text-[10px] text-gold-muted/65 font-mono tracking-wider uppercase">
          Tarot Deck Meaning Encyclopedia
        </p>
      </div>

      <div className="w-full max-w-md px-6 flex-1 flex flex-col gap-4 mt-6">
        
        {/* 金边搜索框 */}
        <div className="relative rounded-xl border border-gold/15 bg-card/45 p-1 flex items-center shadow-gold-glow focus-within:border-gold-focus transition-all duration-300">
          <Search className="w-4 h-4 text-gold-muted/40 ml-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索牌名，如“愚人”、“fool”..."
            className="flex-1 bg-transparent border-none outline-none text-xs text-foreground/90 font-serif tracking-wide placeholder:text-gold-muted/30 px-2.5 py-2.5"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gold-muted/40 hover:text-gold mr-1 border-none bg-transparent"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 分类滑块选择器 */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-0.5">
          {filterTabs.map((tab) => {
            const isActive = filterType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`px-3.5 py-1.5 rounded-full border text-[10px] font-serif tracking-widest whitespace-nowrap cursor-pointer transition-all duration-300 ${
                  isActive
                    ? 'border-gold bg-[#1E1C16]/60 text-gold shadow-gold-glow font-semibold'
                    : 'border-gold/10 bg-[#0E1017]/35 text-gold-muted/65 hover:border-gold/25'
                }`}
              >
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* 卡牌列表网格 (优化性能：列表展示使用轻量级静态网格卡片) */}
        <div className="grid grid-cols-3 gap-3 my-3 flex-1 align-start">
          {filteredCards.length > 0 ? (
            filteredCards.map((card) => {
              const count = drawnStats[card.id] || 0;
              const isDrawn = count > 0;

              return (
                <div
                  key={card.id}
                  onClick={() => handleOpenModal(card)}
                  className={`rounded-xl border p-2 text-center flex flex-col justify-between items-center aspect-[2/3.3] cursor-pointer transition-all duration-300 group relative ${
                    isDrawn
                      ? 'border-gold/25 bg-[#11131A]/45 hover:border-gold/45 hover:bg-[#151722]/65 shadow-gold-glow'
                      : 'border-dashed border-gold/10 bg-[#0B0D13]/10 opacity-75 hover:opacity-100 hover:border-gold/20'
                  }`}
                >
                  {/* 已抽中的右上角次数徽标 */}
                  {isDrawn && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#C9A76A] text-black font-mono font-bold text-[8px] px-1.5 py-0.5 rounded-full z-10 shadow-md transform scale-90">
                      x{count}
                    </span>
                  )}

                  {/* 静态卡面图片，未抽中过展现灰度低明度 */}
                  <div className="w-full flex-1 rounded-lg bg-[#06080C] border border-gold/5 flex items-center justify-center relative overflow-hidden group-hover:border-gold/25 transition-all">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.image}
                      alt={card.zhName}
                      className={`w-full h-full object-cover transition-all duration-500 ${
                        isDrawn
                          ? 'opacity-70 group-hover:opacity-100'
                          : 'opacity-20 filter grayscale contrast-50 group-hover:opacity-45'
                      }`}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const placeholder = parent.querySelector('.fallback-placeholder') as HTMLElement;
                          if (placeholder) placeholder.style.display = 'flex';
                        }
                      }}
                    />
                    {/* 容错备用占位 */}
                    <div className="fallback-placeholder hidden absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#090C12] to-[#040608]">
                      <div className="absolute inset-2 border border-dashed border-gold/5 rounded" />
                      <span className="text-xl font-serif text-gold-muted/20 select-none">
                        {card.number !== undefined ? card.number.toString().padStart(2, '0') : '✦'}
                      </span>
                    </div>
                  </div>

                  {/* 牌名 */}
                  <div className="w-full flex flex-col items-center mt-2.5">
                    <span className={`text-[11px] font-serif font-medium tracking-widest truncate max-w-[80px] ${
                      isDrawn ? 'text-gold/85' : 'text-gold-muted/40'
                    }`}>
                      {card.zhName}
                    </span>
                    <span className="text-[7px] text-gold-muted/30 font-mono tracking-tighter truncate max-w-[80px] mt-0.5 uppercase">
                      {card.name}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 min-h-[200px] flex flex-col items-center justify-center text-center p-6 text-gold-muted/60 font-serif text-xs">
              ✦ 未找到相匹配的卡牌 ✦
            </div>
          )}
        </div>

      </div>

      {/* 4. 详细牌义百科 Modal */}
      <AnimatePresence>
        {selectedCard && (
          <CardMeaningModal
            card={selectedCard}
            onClose={() => setSelectedCard(null)}
            drawnStats={drawnStats}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </main>
  );
}

function getDrawnStats(): Record<string, number> {
  try {
    const readings = getLocalReadings();
    return readings.reduce<Record<string, number>>((stats, reading) => {
      if (!Array.isArray(reading.cards)) return stats;
      reading.cards.forEach((card) => {
        stats[card.id] = (stats[card.id] || 0) + 1;
      });
      return stats;
    }, {});
  } catch (err) {
    console.error('Failed to calculate drawn stats:', err);
    return {};
  }
}
