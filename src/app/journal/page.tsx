'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BookOpen, Calendar, ChevronRight, Filter } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import { getLocalReadings, getLocalCheckIns, saveLocalCheckIn, getLocalDateString, CheckInEntry, JournalEntry } from '@/lib/db/localJournal';
import { spreads } from '@/lib/tarot/spreads';
import { SpreadType } from '@/lib/tarot/types';
import { Sparkles, Heart, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const moodList = ['迷茫', '焦虑', '期待', '平静', '难过', '纠结'];

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [checkins, setCheckins] = useState<CheckInEntry[]>([]);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);

  // 筛选状态
  const [selectedSpread, setSelectedSpread] = useState<string>('all');
  const [selectedMood, setSelectedMood] = useState<string>('all');

  const refreshData = () => {
    const readings = getLocalReadings();
    setEntries(readings);
    setFilteredEntries(readings);

    const history = getLocalCheckIns();
    setCheckins(history);
  };

  // 获取数据
  useEffect(() => {
    refreshData();
  }, []);

  // 计算最近 7 天的日期签到状态
  const checkInDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i)); // 从 6 天前 到 今天
      const dateStr = getLocalDateString(date);
      
      const checkIn = checkins.find((c) => c.date === dateStr);
      const isToday = dateStr === getLocalDateString();
      
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      const dayLabel = isToday ? '今' : dayNames[date.getDay()];

      // 提取情绪的首字做圆形打卡简写
      const moodLabel = checkIn?.mood ? checkIn.mood.charAt(0) : '';

      return {
        dateStr,
        dayLabel,
        checked: !!checkIn,
        mood: checkIn?.mood || '',
        moodLabel,
        isToday,
      };
    });
  }, [checkins]);

  const handleCheckIn = (mood: string) => {
    saveLocalCheckIn(mood);
    setShowCheckInPicker(false);
    refreshData();
  };

  // 执行筛选
  useEffect(() => {
    let result = [...entries];

    if (selectedSpread !== 'all') {
      result = result.filter((e) => e.spreadType === selectedSpread);
    }

    if (selectedMood !== 'all') {
      result = result.filter((e) => e.mood === selectedMood);
    }

    setFilteredEntries(result);
  }, [selectedSpread, selectedMood, entries]);

  return (
    <main className="flex-grow min-h-screen pb-28 flex flex-col items-center text-foreground relative overflow-y-auto select-none">
      {/* 顶部 Header */}
      <div className="w-full max-w-md px-6 pt-12 flex flex-col items-start gap-1">
        <h1 className="text-2xl font-serif tracking-widest text-gold font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          <span>情绪日记</span>
        </h1>
        <p className="text-[10px] text-gold-muted/60 font-mono tracking-wider uppercase">
          Mirror Tarot Journal History
        </p>
      </div>

      <div className="w-full max-w-md px-6 flex-1 flex flex-col gap-5 mt-6">
        
        {/* 情绪周历打卡卡片 */}
        <div className="w-full p-4 rounded-2xl glassmorphism border-gold/25 shadow-gold-glow flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-gold/10 pb-2 text-xs font-serif text-gold font-semibold tracking-widest">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>情绪周历打卡</span>
            </div>
            <span className="text-[10px] text-gold-muted/60 font-mono tracking-wider">7 DAYS</span>
          </div>

          <div className="flex justify-between items-center pt-1">
            {checkInDays.map((day) => {
              return (
                <div key={day.dateStr} className="flex flex-col items-center gap-1.5 flex-1">
                  {day.checked ? (
                    // 已打卡状态
                    <div className="w-9 h-9 rounded-full bg-[#1E1C16] border border-gold text-gold font-serif text-xs font-semibold flex items-center justify-center shadow-gold-glow">
                      {day.moodLabel}
                    </div>
                  ) : day.isToday ? (
                    // 今天尚未打卡
                    <button
                      type="button"
                      onClick={() => setShowCheckInPicker(true)}
                      className="w-9 h-9 rounded-full border border-dashed border-gold/40 hover:border-gold bg-[#0E1017]/30 flex items-center justify-center text-gold/50 cursor-pointer animate-[pulse_2s_infinite] hover:bg-gold/5 outline-none"
                    >
                      +
                    </button>
                  ) : (
                    // 过去未打卡
                    <div className="w-9 h-9 rounded-full border border-dashed border-gold/10 bg-transparent flex items-center justify-center text-gold-muted/20 text-xs select-none">
                      •
                    </div>
                  )}
                  <span className={`text-[10px] font-serif tracking-widest ${
                    day.isToday ? 'text-gold font-semibold' : 'text-gold-muted/65'
                  }`}>
                    {day.dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 筛选控制器 */}
        {entries.length > 0 && (
          <div className="flex gap-3 bg-[#0E1017]/40 border border-gold/10 p-3 rounded-xl">
            {/* 牌阵筛选 */}
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[9px] text-gold-muted/60 font-serif tracking-wider">按牌阵</span>
              <select
                value={selectedSpread}
                onChange={(e) => setSelectedSpread(e.target.value)}
                className="w-full bg-[#11131A] border border-gold/15 rounded-lg py-1.5 px-2 text-xs text-gold outline-none cursor-pointer"
              >
                <option value="all">全部牌阵</option>
                {Object.entries(spreads).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 情绪筛选 */}
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[9px] text-gold-muted/60 font-serif tracking-wider">按情绪</span>
              <select
                value={selectedMood}
                onChange={(e) => setSelectedMood(e.target.value)}
                className="w-full bg-[#11131A] border border-gold/15 rounded-lg py-1.5 px-2 text-xs text-gold outline-none cursor-pointer"
              >
                <option value="all">全部情绪</option>
                {moodList.map((mood) => (
                  <option key={mood} value={mood}>
                    {mood}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 列表主体 */}
        <div className="flex-1 flex flex-col gap-4">
          {filteredEntries.length > 0 ? (
            filteredEntries.map((entry) => {
              const spreadInfo = spreads[entry.spreadType];
              const dateStr = new Date(entry.createdAt).toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <Link
                  key={entry.id}
                  href={`/reading/${entry.id}`}
                  className="w-full p-4 rounded-xl border border-gold/15 bg-[#0F1117]/60 hover:border-gold/30 hover:bg-[#12141D]/60 flex justify-between items-center gap-4 transition-all duration-300 group cursor-pointer"
                >
                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    {/* 顶部元数据 */}
                    <div className="flex items-center gap-2 text-[9px] text-gold-muted/70 font-serif">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gold-muted/50" />
                        {dateStr}
                      </span>
                      <span>•</span>
                      <span className="text-gold tracking-widest">{spreadInfo?.name}</span>
                      <span>•</span>
                      <span className="text-gold-muted">{entry.mood}</span>
                    </div>

                    {/* 问题摘要 */}
                    <h3 className="text-xs md:text-sm text-foreground/90 font-serif leading-relaxed truncate">
                      {entry.question}
                    </h3>

                    {/* AI解读引言 */}
                    <p className="text-[11px] text-gold-muted/75 font-serif italic line-clamp-1">
                      {entry.reading.intuitiveSummary}
                    </p>
                  </div>

                  {/* 右侧微缩卡牌占位 */}
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2.5">
                      {entry.cards.slice(0, 3).map((card, idx) => (
                        <div
                          key={card.id}
                          style={{ zIndex: idx }}
                          className="w-7 h-11 rounded-sm border border-gold/35 overflow-hidden bg-[#090B11] flex items-center justify-center relative shadow-md"
                        >
                          {/* 极简化的小卡片表现 */}
                          <div className="absolute inset-0.5 border border-gold/10 rounded-sm" />
                          <span className="text-[8px] font-serif text-gold/35 scale-90">
                            {card.zhName.charAt(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gold-muted/40 group-hover:text-gold group-hover:translate-x-0.5 transition-all duration-300" />
                  </div>
                </Link>
              );
            })
          ) : (
            /* 空白状态 */
            <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center text-center p-6 bg-[#0E1017]/20 border border-dashed border-gold/10 rounded-2xl">
              <span className="text-2xl mb-4 text-gold/30">✦</span>
              <p className="text-xs text-gold-muted/75 font-serif mb-6 leading-relaxed">
                {entries.length === 0
                  ? '您的阁楼还空着，尚无情绪日记记录。\n前去问牌，开启您的自我探索之旅。'
                  : '没有找到符合当前筛选条件的情绪日记。'}
              </p>
              {entries.length === 0 && (
                <Link
                  href="/"
                  className="px-6 py-2.5 border border-gold/45 text-gold font-serif rounded-lg text-xs hover:bg-gold/5 transition-all shadow-gold-glow"
                >
                  前往问牌
                </Link>
              )}
            </div>
          )}
        </div>

      </div>

      <BottomNav />

      {/* 情绪快速打卡弹窗 */}
      <AnimatePresence>
        {showCheckInPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xs rounded-2xl border border-gold/25 bg-[#0F1118] p-5 shadow-gold-glow flex flex-col items-center gap-4 text-center"
            >
              <button
                onClick={() => setShowCheckInPicker(false)}
                className="absolute top-4.5 right-4.5 text-gold-muted/40 hover:text-gold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-10 h-10 rounded-full border border-gold/20 flex items-center justify-center text-gold shadow-gold-glow mt-1">
                <Heart className="w-4 h-4 text-gold" />
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-serif text-gold font-semibold tracking-widest">记录您当下的感受</h3>
                <p className="text-[10px] text-gold-muted/60 font-serif">选择一个主导您此时情绪的标签</p>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full mt-2">
                {moodList.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => handleCheckIn(mood)}
                    className="py-2.5 rounded-xl border border-gold/15 bg-[#0E1017]/55 hover:border-gold hover:text-gold text-xs font-serif text-gold-muted/80 tracking-widest cursor-pointer transition-all outline-none"
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
