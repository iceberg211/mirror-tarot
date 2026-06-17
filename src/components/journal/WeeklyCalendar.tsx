'use client';

import React from 'react';
import { Sparkles, Heart, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { moodConfigs } from '@/lib/tarot/moods';

interface WeeklyCalendarProps {
  checkInDays: {
    dateStr: string;
    dayLabel: string;
    checked: boolean;
    mood: string;
    moodLabel: string;
    isToday: boolean;
  }[];
  showCheckInPicker: boolean;
  setShowCheckInPicker: (show: boolean) => void;
  onCheckIn: (mood: string) => void;
}

export default function WeeklyCalendar({
  checkInDays,
  showCheckInPicker,
  setShowCheckInPicker,
  onCheckIn
}: WeeklyCalendarProps) {
  return (
    <div className="w-full border-y border-gold/12 py-4 flex flex-col gap-4">
      <div className="flex justify-between items-center text-xs font-serif text-gold font-semibold tracking-widest">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>情绪周历打卡</span>
        </div>
        <span className="text-[10px] text-gold-muted/60 font-mono tracking-wider">7 DAYS</span>
      </div>

      <div className="flex justify-between items-center">
        {checkInDays.map((day) => {
          return (
            <div key={day.dateStr} className="flex flex-col items-center gap-1.5 flex-1">
              {day.checked ? (
                // 已打卡状态
                <div className="w-9 h-9 rounded-full bg-gold/8 border border-gold/45 text-gold font-serif text-xs font-semibold flex items-center justify-center">
                  {day.moodLabel}
                </div>
              ) : day.isToday ? (
                // 今天尚未打卡
                <button
                  type="button"
                  onClick={() => setShowCheckInPicker(true)}
                  className="w-9 h-9 rounded-full border border-dashed border-gold/40 hover:border-gold bg-transparent flex items-center justify-center text-gold/55 cursor-pointer hover:bg-gold/5 outline-none transition-colors duration-300"
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

      {/* 情绪快速打卡弹窗 */}
      <AnimatePresence>
        {showCheckInPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05060A]/85 backdrop-blur-md p-4 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm rounded-2xl border border-gold/25 bg-[#0F1118] p-5 shadow-gold-glow flex flex-col items-center gap-4 text-center"
            >
              <button
                type="button"
                onClick={() => setShowCheckInPicker(false)}
                className="absolute top-4.5 right-4.5 text-gold-muted/40 hover:text-gold cursor-pointer border-none bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-10 h-10 rounded-full border border-gold/20 flex items-center justify-center text-gold shadow-gold-glow mt-1">
                <Heart className="w-4 h-4 text-gold animate-[pulse_1.5s_infinite]" />
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-serif text-gold font-semibold tracking-widest">记录您当下的感受</h3>
                <p className="text-[10px] text-gold-muted/60 font-serif">选择一个主导您此时情绪的标签</p>
              </div>

              {/* 按分类渲染情绪标签 */}
              <div className="w-full mt-2 flex flex-col gap-4.5 text-left max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                {(['light', 'shadow', 'storm'] as const).map((cat) => {
                  const titleMap = {
                    light: '光芒 ✦ Light (温和/喜悦)',
                    shadow: '阴影 ✦ Shadow (低落/内耗)',
                    storm: '风暴 ✦ Storm (冲突/紧绷)',
                  };
                  const colorMap = {
                    light: 'text-amber-400/80 border-amber-500/10 bg-amber-950/5',
                    shadow: 'text-blue-400/80 border-blue-500/10 bg-blue-950/5',
                    storm: 'text-purple-400/80 border-purple-500/10 bg-purple-950/5',
                  };
                  const catMoods = moodConfigs.filter((m) => m.category === cat);
                  return (
                    <div key={cat} className="flex flex-col gap-2">
                      <div className={`text-[9px] font-serif tracking-widest uppercase font-semibold py-0.5 px-2 rounded border ${colorMap[cat]} w-fit`}>
                        {titleMap[cat]}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {catMoods.map((mood) => (
                          <button
                            key={mood.id}
                            type="button"
                            onClick={() => onCheckIn(mood.name)}
                            className="py-2.5 px-2 rounded-xl border border-gold/10 bg-[#0E1017]/55 hover:border-gold/30 hover:bg-[#151821] text-xs font-serif text-gold-muted/80 cursor-pointer transition-all outline-none flex flex-col items-center justify-center gap-0.5 text-center group active:scale-95 duration-200"
                          >
                            <span className="font-semibold tracking-wider text-gold-muted group-hover:text-gold">{mood.name}</span>
                            <span className="text-[8px] text-gold-muted/35 font-serif leading-none tracking-wide group-hover:text-gold-muted/50">{mood.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
