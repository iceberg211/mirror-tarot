'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Moon, Calendar, AlertCircle } from 'lucide-react';
import { saveLocalReading, getLocalDateString } from '@/lib/db/localJournal';
import { moodConfigs } from '@/lib/tarot/moods';

interface NightReflectionsModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const manifestOptions = ['极应验 ✦', '有触动 ✦', '觉察平淡 ✦', '今日未抽牌 ✦'];
const reminderTemplates = [
  '专注当下，不为明天焦虑。',
  '今日的疲惫已是昨天，明天温柔对待自己。',
  '保持觉察，勇敢地表达真实想法。',
  '少想多做，用行动打破精神内耗。',
];

export default function NightReflectionsModal({ onClose, onSuccess }: NightReflectionsModalProps) {
  const [selectedMood, setSelectedMood] = useState('calm');
  const [manifest, setManifest] = useState('有触动 ✦');
  const [reminder, setReminder] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminder.trim()) {
      setError('请给自己写一句明天的温柔提醒……');
      return;
    }

    try {
      const moodName = moodConfigs.find((m) => m.id === selectedMood)?.name || '平静';
      const question = `【晚间回顾】今日牌印验：${manifest}。明天提醒：${reminder}`;
      
      const reflectionReading = {
        questionSummary: '今日晚间自我觉察与反思回顾。',
        intuitiveSummary: `今日情绪「${moodName}」，卡牌印验「${manifest}」。明天的我，请记住：${reminder}`,
        cardReadings: [],
        contradiction: '',
        overlookedFactor: '',
        actionAdvice: `明日提醒：${reminder}`,
        gentleReminder: '安稳入睡，今夜潜意识会为您整理思绪。',
        followUpSuggestions: []
      };

      saveLocalReading(
        question,
        moodName,
        'custom',
        [],
        reflectionReading,
        false
      );

      setIsSaved(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      console.error(err);
      setError('打卡保存失败，请稍后重试');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05060A]/85 backdrop-blur-md">
      {/* 弹窗容器 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md border border-gold/25 bg-[#0F1118] rounded-2xl p-6 shadow-gold-glow flex flex-col gap-5 relative overflow-hidden"
      >
        {/* 顶部金边饰条 */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        
        {/* 关闭按钮 */}
        {!isSaved && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gold-muted/60 hover:text-gold hover:bg-gold/5 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer bg-transparent border-none"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        )}

        {/* 标题 */}
        <div className="flex items-center gap-2.5 text-gold mb-1">
          <Moon className="w-5 h-5 text-gold animate-[pulse_3s_infinite]" />
          <h3 className="text-sm font-serif font-bold tracking-widest uppercase">
            30秒晚间回顾 ✦ Night Reflection
          </h3>
        </div>

        {isSaved ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-10 gap-3 text-center"
          >
            <Sparkles className="w-8 h-8 text-gold animate-bounce" />
            <h4 className="text-sm font-serif text-gold font-bold tracking-widest">
              ✦ 晚间回顾打卡成功 ✦
            </h4>
            <p className="text-[10px] text-gold-muted/70 font-serif leading-relaxed tracking-wider px-4">
              今日的繁星已落入你的潜意识。今夜好梦，明天见。
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
            {/* 1. 今日情绪 */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] text-gold-muted font-serif tracking-widest">
                1. 关照今日，你最后的感受是？
              </label>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
                {moodConfigs.map((mood) => {
                  const isSelected = selectedMood === mood.id;
                  const colorClasses = isSelected
                    ? 'border-gold bg-gold/10 text-gold shadow-gold-glow'
                    : 'border-gold/10 bg-[#11131A]/40 text-gold-muted/60 hover:border-gold/20';
                  
                  return (
                    <button
                      key={mood.id}
                      type="button"
                      onClick={() => setSelectedMood(mood.id)}
                      className={`px-3 py-1 rounded-full border text-[10px] font-serif tracking-wider whitespace-nowrap cursor-pointer transition-all duration-200 active:scale-95 outline-none`}
                    >
                      <div className={`flex items-center gap-1 ${isSelected ? 'text-gold' : 'text-gold-muted/70'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-gold' : 'bg-gold-muted/40'}`} />
                        <span>{mood.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. 卡牌印验 */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] text-gold-muted font-serif tracking-widest">
                2. 今日抽取的塔罗牌是否应验？
              </label>
              <div className="grid grid-cols-2 gap-2">
                {manifestOptions.map((opt) => {
                  const isSelected = manifest === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setManifest(opt)}
                      className={`py-1.5 rounded-lg border text-[10px] font-serif tracking-wider cursor-pointer transition-all duration-200 text-center ${
                        isSelected
                          ? 'border-gold bg-gold/5 text-gold shadow-gold-glow font-medium'
                          : 'border-gold/10 bg-[#11131A]/30 text-gold-muted/65 hover:border-gold/20'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. 明天提醒 */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] text-gold-muted font-serif tracking-widest">
                  3. 给明天的我，写一句温柔提醒：
                </label>
              </div>
              
              {/* 快捷模板 */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
                {reminderTemplates.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setReminder(tpl);
                      setError(null);
                    }}
                    className="text-[9px] text-gold-muted/75 hover:text-gold border border-gold/10 bg-card/20 hover:border-gold/25 rounded-full px-2.5 py-0.5 whitespace-nowrap transition-all duration-200 cursor-pointer"
                  >
                    {tpl.length > 15 ? tpl.slice(0, 15) + '...' : tpl}
                  </button>
                ))}
              </div>

              <div className="relative rounded-xl border border-gold/15 bg-card/45 p-3.5 shadow-gold-glow focus-within:border-gold/30 transition-all duration-300">
                <textarea
                  value={reminder}
                  onChange={(e) => {
                    setReminder(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="如：明早记得先做完最重要的事，不要急躁……"
                  className="w-full h-16 bg-transparent outline-none border-none text-xs text-foreground/90 font-serif tracking-wide placeholder:text-gold-muted/30 resize-none no-scrollbar leading-relaxed"
                  maxLength={150}
                />
              </div>

              {error && (
                <div className="text-[10px] text-red-400 flex items-center gap-1.5 pl-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-10 rounded-xl border border-gold/10 bg-[#0E1017]/30 text-gold-muted/65 text-xs font-serif tracking-widest hover:border-gold/25 cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-[2] h-10 rounded-xl bg-gradient-to-r from-[#171610] via-[#2E281C] to-[#171610] border border-gold text-gold text-xs font-serif tracking-widest hover:brightness-110 cursor-pointer shadow-gold-glow flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>晚间打卡保存</span>
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
