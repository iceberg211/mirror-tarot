'use client';

import React, { useState } from 'react';
import { Moon, Sparkles, Wind, Flame, Droplets, Mountain } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import DreamJournalModal from '@/components/journal/DreamJournalModal';
import BreathingZen from '@/components/tarot/BreathingZen';
import NightReflectionsModal from '@/components/journal/NightReflectionsModal';

export default function ZenPage() {
  const [showDreamModal, setShowDreamModal] = useState(false);
  const [showNightModal, setShowNightModal] = useState(false);
  const [activeElement, setActiveElement] = useState<'water' | 'fire' | 'wind' | 'earth' | 'default' | null>(null);

  const elements = [
    { id: 'water', name: '水元素 ✦ 情绪净化', label: '水', icon: Droplets, desc: '平复细致敏感，消解情绪内耗', color: 'hover:border-blue-400 hover:bg-blue-950/10' },
    { id: 'fire', name: '火元素 ✦ 直觉唤醒', label: '火', icon: Flame, desc: '燃尽行动焦虑，注入突破能量', color: 'hover:border-red-400 hover:bg-red-950/10' },
    { id: 'wind', name: '风元素 ✦ 理性悬浮', label: '风', icon: Wind, desc: '吹散精神紧绷，打破过度思考', color: 'hover:border-teal-400 hover:bg-teal-950/10' },
    { id: 'earth', name: '土元素 ✦ 现实锚定', label: '土', icon: Mountain, desc: '承接大地滋养，稳固当下重心', color: 'hover:border-emerald-400 hover:bg-emerald-950/10' },
  ];

  return (
    <main className="flex-grow min-h-screen pb-28 flex flex-col justify-between items-center text-foreground relative overflow-y-auto bg-[#05060A] select-none">
      {/* 装饰星体与发光 */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-radial-gradient from-gold/5 via-transparent to-transparent pointer-events-none z-0" />
      
      {/* 1. 顶部 Header */}
      <div className="w-full max-w-md px-6 pt-12 flex flex-col items-center text-center z-10">
        <div className="w-12 h-12 rounded-full border border-gold/35 flex items-center justify-center mb-6 shadow-gold-glow">
          <Moon className="w-5 h-5 text-gold animate-[pulse_4s_infinite]" />
        </div>
        
        <h1 className="text-2xl font-serif tracking-widest text-gold font-bold filter drop-shadow-[0_0_10px_rgba(201,167,106,0.35)]">
          疗愈禅修 ✦ Zen
        </h1>
        <p className="text-[10px] text-gold-muted/80 font-mono tracking-[0.2em] uppercase mt-2">
          Mind, Body & Dream Alignment
        </p>
        <p className="text-xs text-gold/60 font-serif tracking-widest mt-2">
          抚平心智水流，连接梦境盲区
        </p>
      </div>

      <div className="w-full max-w-md px-6 flex-1 flex flex-col gap-6 mt-8 z-10">
        
        {/* 梦境映射入口大卡片 */}
        <div className="w-full p-5 rounded-2xl border border-gold/25 bg-gradient-to-b from-[#171510] via-[#241F16] to-[#171510] shadow-gold-glow flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] text-gold font-mono tracking-widest border border-gold/25 px-2 py-0.5 rounded-full uppercase w-fit bg-gold/5">
                Dream Mapping
              </span>
              <h3 className="text-sm font-serif text-gold font-bold tracking-widest mt-1">
                ✦ 潜意识梦境映射 ✦
              </h3>
              <p className="text-[10px] text-gold-muted/70 font-serif leading-relaxed tracking-wider mt-0.5 max-w-[280px]">
                荣格说，梦是写给显意识的信。分析您昨晚的梦境符号，生成潜意识追问并开启映射抽牌。
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center text-gold">
              <Moon className="w-5 h-5 animate-pulse" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDreamModal(true)}
            className="w-full py-2.5 rounded-xl border border-gold/45 bg-gold/5 text-gold text-xs font-serif tracking-widest hover:bg-gold/10 transition-all cursor-pointer shadow-gold-glow text-center"
          >
            记录梦境开始映射 ➔
          </button>
        </div>

        {/* 晚间回顾入口大卡片 */}
        <div className="w-full p-5 rounded-2xl border border-gold/15 bg-gradient-to-b from-[#0F1118]/80 via-[#16130E]/80 to-[#0F1118]/80 shadow-gold-glow flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] text-gold font-mono tracking-widest border border-gold/25 px-2 py-0.5 rounded-full uppercase w-fit bg-gold/5">
                Night Reflection
              </span>
              <h3 className="text-sm font-serif text-gold font-bold tracking-widest mt-1">
                ✦ 30秒晚间回顾 ✦
              </h3>
              <p className="text-[10px] text-gold-muted/70 font-serif leading-relaxed tracking-wider mt-0.5 max-w-[280px]">
                在睡前温柔地关照今日情绪、今日牌的显化，并留下给明天的寄语。30秒即可完成日记打卡沉淀。
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center text-gold">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowNightModal(true)}
            className="w-full py-2.5 rounded-xl border border-gold/25 bg-gold/5 text-gold text-xs font-serif tracking-widest hover:bg-gold/10 transition-all cursor-pointer shadow-gold-glow text-center"
          >
            开启30秒晚间回顾 ➔
          </button>
        </div>

        {/* 呼吸禅修大模块 */}
        <div className="w-full p-5 rounded-2xl border border-gold/15 bg-[#0F1117]/60 shadow-gold-glow flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-gold/10 pb-2 text-[10px] text-gold font-serif font-bold tracking-widest uppercase">
            <span>四大元素调息 ✦ Ambient Breathing</span>
            <span className="text-[8px] text-gold-muted/60 font-mono">5 Senses Zen</span>
          </div>

          <p className="text-[10px] text-gold-muted/70 font-serif leading-relaxed tracking-wider -mt-1">
            根据今日的心态，挑选与自身能量共振的古老自然元素，开启 1 / 3 / 5 分钟的五感呼吸微禅修。
          </p>

          <div className="grid grid-cols-2 gap-3 w-full mt-1">
            {elements.map((el) => {
              const Icon = el.icon;
              return (
                <button
                  key={el.id}
                  type="button"
                  onClick={() => setActiveElement(el.id as any)}
                  className={`p-3.5 rounded-xl border border-gold/10 bg-[#0E1017]/45 cursor-pointer text-left transition-all duration-300 flex flex-col gap-1.5 ${el.color}`}
                >
                  <div className="flex justify-between items-center text-gold">
                    <span className="text-xs font-serif font-bold tracking-wider">{el.name.split(' ✦ ')[0]}</span>
                    <Icon className="w-4 h-4 text-gold/70" />
                  </div>
                  <span className="text-[8px] text-gold-muted/40 font-serif leading-tight">{el.desc}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setActiveElement('default')}
            className="w-full py-2.5 rounded-xl border border-gold/15 bg-[#12141D]/60 text-gold-muted text-xs font-serif tracking-widest hover:border-gold/30 hover:bg-gold/5 transition-all cursor-pointer text-center mt-1"
          >
            ✦ 普通静音呼吸调息
          </button>
        </div>

      </div>

      {/* 底部导航 */}
      <BottomNav />

      {/* 弹窗逻辑 */}
      {showDreamModal && (
        <DreamJournalModal onClose={() => setShowDreamModal(false)} />
      )}

      {showNightModal && (
        <NightReflectionsModal onClose={() => setShowNightModal(false)} />
      )}

      {activeElement && (
        <BreathingZen
          element={activeElement === 'default' ? null : (activeElement as any)}
          onClose={() => setActiveElement(null)}
        />
      )}
    </main>
  );
}
