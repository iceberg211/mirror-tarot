'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sparkles, Wind, Flame, Droplets, Mountain, ChevronRight } from 'lucide-react';
import AppPageShell from '@/components/layout/AppPageShell';
import BottomNav from '@/components/layout/BottomNav';
import DreamJournalModal from '@/components/journal/DreamJournalModal';
import BreathingZen from '@/components/tarot/BreathingZen';
import NightReflectionsModal from '@/components/journal/NightReflectionsModal';

type ElementId = 'water' | 'fire' | 'wind' | 'earth';

const elements: Array<{
  id: ElementId;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}> = [
  { id: 'water', name: '水', desc: '情绪净化', icon: Droplets, tone: 'hover:text-blue-300' },
  { id: 'fire', name: '火', desc: '直觉唤醒', icon: Flame, tone: 'hover:text-red-300' },
  { id: 'wind', name: '风', desc: '理性悬浮', icon: Wind, tone: 'hover:text-teal-300' },
  { id: 'earth', name: '土', desc: '现实锚定', icon: Mountain, tone: 'hover:text-emerald-300' },
];

export default function ZenPage() {
  const [showDreamModal, setShowDreamModal] = useState(false);
  const [showNightModal, setShowNightModal] = useState(false);
  const [activeElement, setActiveElement] = useState<ElementId | 'default' | null>(null);

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
        className="mt-7 flex flex-col gap-2 border-y border-gold/12 py-2"
      >
        <button
          type="button"
          onClick={() => setShowDreamModal(true)}
          className="group grid min-h-[78px] grid-cols-[auto_1fr_auto] items-center gap-4 py-4 text-left"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/14 text-gold/80">
            <Moon className="h-4.5 w-4.5" />
          </span>
          <span>
            <span className="block text-sm font-serif font-semibold tracking-widest text-gold">
              潜意识梦境映射
            </span>
            <span className="mt-1 block text-[11px] font-serif leading-5 tracking-wide text-gold-muted/70">
              记录梦境碎片，生成一条更适合抽牌的潜意识发问。
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-gold-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-gold" />
        </button>

        <div className="h-px bg-gold/8" />

        <button
          type="button"
          onClick={() => setShowNightModal(true)}
          className="group grid min-h-[78px] grid-cols-[auto_1fr_auto] items-center gap-4 py-4 text-left"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/14 text-gold/80">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <span>
            <span className="block text-sm font-serif font-semibold tracking-widest text-gold">
              30 秒晚间回顾
            </span>
            <span className="mt-1 block text-[11px] font-serif leading-5 tracking-wide text-gold-muted/70">
              睡前留下一句明天提醒，让今天的牌和情绪有个安放处。
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-gold-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-gold" />
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
            className="rounded-full border border-gold/16 px-3 py-1.5 text-[10px] font-serif tracking-widest text-gold-muted/75 transition-colors duration-300 hover:border-gold/35 hover:text-gold"
          >
            静音呼吸
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4">
          {elements.map((element) => {
            const Icon = element.icon;
            return (
              <button
                key={element.id}
                type="button"
                onClick={() => setActiveElement(element.id)}
                className={`group border-b border-gold/10 pb-4 text-left text-gold-muted transition-colors duration-300 ${element.tone}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-serif text-gold">{element.name}</span>
                  <Icon className="h-4.5 w-4.5 text-current" />
                </div>
                <p className="mt-2 text-[11px] font-serif tracking-widest text-foreground/68">
                  {element.desc}
                </p>
              </button>
            );
          })}
        </div>
      </motion.section>

      <BottomNav />

      {showDreamModal && (
        <DreamJournalModal onClose={() => setShowDreamModal(false)} />
      )}

      {showNightModal && (
        <NightReflectionsModal onClose={() => setShowNightModal(false)} />
      )}

      {activeElement && (
        <BreathingZen
          element={activeElement === 'default' ? null : activeElement}
          onClose={() => setActiveElement(null)}
        />
      )}
    </AppPageShell>
  );
}
