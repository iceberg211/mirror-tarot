'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight } from 'lucide-react';
import AppPageShell from '@/components/layout/AppPageShell';
import BottomNav from '@/components/layout/BottomNav';
import { useJournalData } from '@/hooks/useJournalData';
import AnalyticsTab from '@/components/journal/AnalyticsTab';
import ProfileInsightPanel from '@/components/journal/ProfileInsightPanel';
import ReflectionsOverview from '@/components/journal/ReflectionsOverview';
import JungianArchetypeCard from '@/components/journal/JungianArchetypeCard';
import MindOrbitWordCloud from '@/components/journal/MindOrbitWordCloud';

export default function ReflectionsPage() {
  const router = useRouter();
  const {
    entries,
    checkins,
    analytics,
    monthlyReport,
    generatingReport,
    reportError,
    handleGenerateReport
  } = useJournalData();

  const hasEnoughEntries = entries.length >= 3;

  return (
    <AppPageShell
      eyebrow="Reflections"
      title="觉察"
      description="把最近的情绪、牌面和元素分布整理成一张可读的心智图谱。"
      imageSrc="/cards/rws/09-the-hermit.jpg"
      imageAlt="隐士塔罗牌"
    >
      <div className="mt-7 flex flex-col gap-7">
        <ReflectionsOverview
          entries={entries}
          checkins={checkins}
          monthlyReport={monthlyReport}
          generatingReport={generatingReport}
        />

        {hasEnoughEntries ? (
          <>
            <ProfileInsightPanel entries={entries} checkins={checkins} />
            <JungianArchetypeCard entries={entries} />
            <MindOrbitWordCloud entries={entries} />
            <AnalyticsTab
              analytics={analytics}
              checkins={checkins}
              entries={entries}
              monthlyReport={monthlyReport}
              generatingReport={generatingReport}
              reportError={reportError}
              onGenerateReport={handleGenerateReport}
            />
          </>
        ) : (
          <div className="flex flex-col gap-5 rounded-2xl border border-gold/15 bg-card p-6 text-center select-none shadow-gold-glow">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-gold/20 bg-gold/5 text-gold animate-[pulse_3s_infinite]">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xs font-serif font-semibold tracking-widest text-gold uppercase">
                心智镜面正在充能 ✦ Mirror Charging
              </h3>
              <p className="text-[10px] font-serif leading-relaxed tracking-wider text-gold-muted/80 px-4">
                当前觉察日记不足 3 篇（已记录 {entries.length} 篇）。
                AI 心智分析库需要至少 3 篇以上的日记，才能为您凝练“个人心智成长档案”，并开启雷达折射星图与每月趋势。
              </p>
            </div>

            <div className="mt-2 flex flex-col gap-2.5 max-w-[200px] mx-auto w-full">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full h-9.5 rounded-xl bg-gradient-to-r from-[#171610] via-[#2E281C] to-[#171610] border border-gold/45 text-gold text-[10px] font-serif font-semibold tracking-widest hover:brightness-110 shadow-gold-glow flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>开启第一次抽牌</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </AppPageShell>
  );
}
