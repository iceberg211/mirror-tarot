'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sparkles, Wind, Flame, Droplets, Mountain, ChevronRight } from 'lucide-react';
import AppPageShell from '@/components/layout/AppPageShell';
import BottomNav from '@/components/layout/BottomNav';
import DreamJournalModal from '@/components/journal/DreamJournalModal';
import BreathingZen from '@/components/tarot/BreathingZen';
import NightReflectionsModal from '@/components/journal/NightReflectionsModal';
import { getLocalCheckIns, getLocalDateString, getLocalReadings } from '@/lib/db/localJournal';
import { moodConfigs } from '@/lib/tarot/moods';

type ElementId = 'water' | 'fire' | 'wind' | 'earth';

const elements: Array<{
  id: ElementId;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  glowClass: string;
}> = [
  { id: 'water', name: '水', desc: '情绪净化 ✦ 缓释紧绷风暴', icon: Droplets, tone: 'text-blue-400', glowClass: 'shadow-[0_0_12px_rgba(96,165,250,0.08)] hover:shadow-[0_0_18px_rgba(96,165,250,0.22)] hover:border-blue-400/40 hover:bg-blue-500/5' },
  { id: 'fire', name: '火', desc: '直觉唤醒 ✦ 驱散疲惫低落', icon: Flame, tone: 'text-red-400', glowClass: 'shadow-[0_0_12px_rgba(248,113,113,0.08)] hover:shadow-[0_0_18px_rgba(248,113,113,0.22)] hover:border-red-400/40 hover:bg-red-500/5' },
  { id: 'wind', name: '风', desc: '理性悬浮 ✦ 止息脑中过度思考', icon: Wind, tone: 'text-teal-400', glowClass: 'shadow-[0_0_12px_rgba(45,212,191,0.08)] hover:shadow-[0_0_18px_rgba(45,212,191,0.22)] hover:border-teal-400/40 hover:bg-teal-500/5' },
  { id: 'earth', name: '土', desc: '现实沉淀 ✦ 踏实守护感官境界', icon: Mountain, tone: 'text-emerald-400', glowClass: 'shadow-[0_0_12px_rgba(52,211,153,0.08)] hover:shadow-[0_0_18px_rgba(52,211,153,0.22)] hover:border-emerald-400/40 hover:bg-emerald-500/5' },
];

export default function ZenPage() {
  const [showDreamModal, setShowDreamModal] = useState(false);
  const [showNightModal, setShowNightModal] = useState(false);
  const [activeElement, setActiveElement] = useState<ElementId | 'default' | 'guardian' | null>(null);

  const todayMoodCategory = useMemo(() => {
    try {
      const todayStr = getLocalDateString();
      const checkins = getLocalCheckIns();
      const todayCheckin = checkins.find((c) => c.date === todayStr);
      if (todayCheckin) {
        const config = moodConfigs.find((m) => m.id === todayCheckin.mood || m.name === todayCheckin.mood);
        return config?.category || null;
      }
    } catch (e) {
      console.error('Failed to get today mood category:', e);
    }
    return null;
  }, []);

  const recommendedElement = useMemo<'water' | 'fire' | null>(() => {
    if (todayMoodCategory === 'storm') return 'water';
    if (todayMoodCategory === 'shadow') return 'fire';
    return null;
  }, [todayMoodCategory]);

  const guardianCard = useMemo(() => {
    try {
      const readings = getLocalReadings();
      const nowMs = new Date().getTime();
      const recentReadings = readings.filter((r) => nowMs - new Date(r.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000);
      for (const r of recentReadings) {
        if (!Array.isArray(r.cards)) continue;
        const major = r.cards.find((c) => c.arcana === 'major' || /^\d{2}-/.test(c.id));
        if (major) return major;
      }
    } catch (e) {
      console.error('Failed to get guardian card:', e);
    }
    return null;
  }, []);

  return (
    <AppPageShell
      eyebrow="Zen"
      title="疗愈"
      description="梦境、晚间回顾和呼吸练习放在同一个安静的入口里，睡前打开也不会被信息淹没。"
      imageSrc="/cards/rws/14-temperance.jpg"
      imageAlt="节制塔罗牌"
    >
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="mt-7 flex flex-col gap-4.5"
      >
        <button
          type="button"
          onClick={() => setShowDreamModal(true)}
          className="group flex flex-col justify-between items-stretch p-5 rounded-2xl border border-gold/15 bg-gold/5 shadow-gold-glow cursor-pointer transition-all duration-300 hover:border-gold/30 hover:bg-gold/10 text-left relative overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-gold/5 blur-xl pointer-events-none" />
          <div className="flex gap-4 items-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gold/5 text-gold/90">
              <Moon className="h-4.5 w-4.5" />
            </span>
            <div className="flex-grow min-w-0">
              <span className="block text-sm font-serif font-bold tracking-widest text-gold flex items-center gap-2">
                潜意识梦境映射
                <span className="text-[8px] font-sans border border-gold/30 text-gold/60 px-1 py-0.5 rounded leading-none">解梦</span>
              </span>
              <span className="mt-1 block text-[11px] font-serif leading-relaxed tracking-wide text-gold-muted/80">
                记录梦境碎片，生成一条更适合抽牌的潜意识发问。
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-gold-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-gold" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowNightModal(true)}
          className="group flex flex-col justify-between items-stretch p-5 rounded-2xl border border-gold/15 bg-gold/5 shadow-gold-glow cursor-pointer transition-all duration-300 hover:border-gold/30 hover:bg-gold/10 text-left relative overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-gold/5 blur-xl pointer-events-none" />
          <div className="flex gap-4 items-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gold/5 text-gold/90">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <div className="flex-grow min-w-0">
              <span className="block text-sm font-serif font-bold tracking-widest text-gold flex items-center gap-2">
                30 秒晚间回顾
                <span className="text-[8px] font-sans border border-gold/30 text-gold/60 px-1 py-0.5 rounded leading-none">回顾</span>
              </span>
              <span className="mt-1 block text-[11px] font-serif leading-relaxed tracking-wide text-gold-muted/80">
                睡前留下一句明天提醒，让今天的牌和情绪有个安放处。
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-gold-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-gold" />
          </div>
        </button>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.16 }}
        className="mt-8"
      >
        <div className="flex items-end justify-between border-b border-gold/12 pb-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.26em] text-gold-muted/50">
              Breathing
            </p>
            <h2 className="mt-2 text-lg font-serif font-semibold tracking-widest text-gold">
              四元素调息
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setActiveElement('default')}
            className="rounded-full border border-gold/16 px-3 py-1.5 text-[10px] font-serif tracking-widest text-gold-muted/75 transition-colors duration-300 hover:border-gold/35 hover:text-gold cursor-pointer"
          >
            静音呼吸
          </button>
        </div>

        {recommendedElement && (
          <div className="mt-4 p-3 rounded-xl border border-gold/15 bg-gold/5 flex gap-2 items-center text-[10px] text-gold-focus font-serif tracking-wider shadow-gold-glow">
            <Sparkles className="w-3.5 h-3.5 text-gold animate-pulse flex-shrink-0" />
            <span>
              {todayMoodCategory === 'storm' ? (
                <>检测到你今日心绪处于风暴期，建议开启<b>『水元素调息』</b>以平定情绪波动。</>
              ) : (
                <>检测到你今日能量有些低迷沉闷，建议开启<b>『火元素调息』</b>以唤醒直觉与行动力。</>
              )}
            </span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4">
          {elements.map((element) => {
            const Icon = element.icon;
            const isRecommended = recommendedElement === element.id;
            return (
              <button
                key={element.id}
                type="button"
                onClick={() => setActiveElement(element.id)}
                className={`group p-4.5 rounded-2xl border border-gold/12 bg-gold/5 text-left text-gold-muted transition-all duration-300 relative flex flex-col justify-between min-h-[114px] cursor-pointer ${
                  element.glowClass
                } ${
                  isRecommended 
                    ? 'border-gold/35 ring-1 ring-gold/25' 
                    : ''
                }`}
              >
                <div className="flex items-start justify-between w-full">
                  <span className="text-base font-serif font-bold text-gold flex items-center gap-1.5">
                    {element.name}
                    {isRecommended && (
                      <span className="text-[8px] font-serif font-semibold tracking-widest text-[#C9A76A] border border-[#C9A76A]/45 px-1 py-0.5 rounded scale-90 animate-pulse bg-gold/5">
                        推荐
                      </span>
                    )}
                  </span>
                  <Icon className={`h-5 w-5 ${element.tone} filter drop-shadow-[0_0_4px_currentColor]`} />
                </div>
                <p className="mt-3 text-[10px] font-serif tracking-widest text-foreground/75 leading-5">
                  {element.desc}
                </p>
              </button>
            );
          })}
        </div>
      </motion.section>

      {guardianCard && (
        <div className="mt-8 pt-6 border-t border-gold/10">
          <p className="text-[10px] font-mono uppercase tracking-[0.26em] text-gold-muted/50">
            Archetype Guardian
          </p>
          <h2 className="mt-2 text-lg font-serif font-semibold tracking-widest text-gold">
            卡牌原型守护调息
          </h2>
          
          <button
            type="button"
            onClick={() => setActiveElement('guardian')}
            className="mt-4 w-full p-4 rounded-2xl border border-gold/18 bg-gradient-to-r from-gold/5 via-gold/10 to-gold/5 flex justify-between items-center group cursor-pointer shadow-gold-glow text-left hover:border-gold/35 transition-all duration-300"
          >
            <div className="flex flex-col text-left gap-1">
              <span className="text-xs font-serif font-bold text-gold tracking-widest flex items-center gap-1.5">
                ✦ 与『{guardianCard.zhName}』共鸣静修
              </span>
              <span className="text-[9px] font-serif text-gold-muted/65 leading-relaxed tracking-wider mt-0.5 max-w-[280px]">
                用呼吸连接此牌的象征能量，舒缓现实心结。
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-gold/80 transition-all duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      )}

      <BottomNav />

      {showDreamModal && (
        <DreamJournalModal onClose={() => setShowDreamModal(false)} />
      )}

      {showNightModal && (
        <NightReflectionsModal onClose={() => setShowNightModal(false)} />
      )}

      {activeElement && (
        <BreathingZen
          element={activeElement === 'default' || activeElement === 'guardian' ? null : activeElement}
          guardianCard={activeElement === 'guardian' ? guardianCard : undefined}
          onClose={() => setActiveElement(null)}
        />
      )}
    </AppPageShell>
  );
}
