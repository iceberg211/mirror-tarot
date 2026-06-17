'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import { useJournalData } from '@/hooks/useJournalData';
import AnalyticsTab from '@/components/journal/AnalyticsTab';

export default function ReflectionsPage() {
  const {
    entries,
    checkins,
    analytics,
    monthlyReport,
    generatingReport,
    reportError,
    handleGenerateReport
  } = useJournalData();

  return (
    <main className="flex-grow min-h-screen pb-28 flex flex-col items-center text-foreground relative overflow-y-auto bg-[#05060A] select-none">
      {/* 装饰发光 */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-radial-gradient from-gold/5 via-transparent to-transparent pointer-events-none z-0" />
      
      {/* 顶部 Header */}
      <div className="w-full max-w-md px-6 pt-12 flex flex-col items-center text-center z-10">
        <div className="w-12 h-12 rounded-full border border-gold/35 flex items-center justify-center mb-6 shadow-gold-glow">
          <Sparkles className="w-5 h-5 text-gold animate-[pulse_4s_infinite]" />
        </div>
        
        <h1 className="text-2xl font-serif tracking-widest text-gold font-bold filter drop-shadow-[0_0_10px_rgba(201,167,106,0.35)]">
          潜意识觉察 ✦ Reflections
        </h1>
        <p className="text-[10px] text-gold-muted/80 font-mono tracking-[0.2em] uppercase mt-2">
          Subconscious Image & Reports
        </p>
        <p className="text-xs text-gold/60 font-serif tracking-widest mt-2">
          分析您的能量起伏，绘制心智雷达图谱
        </p>
      </div>

      <div className="w-full max-w-md px-6 flex-1 flex flex-col gap-5 mt-4 z-10">
        <AnalyticsTab
          analytics={analytics}
          checkins={checkins}
          entries={entries}
          monthlyReport={monthlyReport}
          generatingReport={generatingReport}
          reportError={reportError}
          onGenerateReport={handleGenerateReport}
        />
      </div>

      <BottomNav />
    </main>
  );
}
