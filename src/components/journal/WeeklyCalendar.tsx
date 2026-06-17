'use client';

import React from 'react';
import { Sparkles, Heart, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const moodList = ['迷茫', '焦虑', '期待', '平静', '难过', '纠结'];

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

              <div className="grid grid-cols-3 gap-3 w-full mt-2">
                {moodList.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => onCheckIn(mood)}
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
    </div>
  );
}
