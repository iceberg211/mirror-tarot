'use client';

import React from 'react';
import AppPageShell from '@/components/layout/AppPageShell';
import BottomNav from '@/components/layout/BottomNav';
import { useJournalData } from '@/hooks/useJournalData';
import AnalyticsTab from '@/components/journal/AnalyticsTab';
import ProfileInsightPanel from '@/components/journal/ProfileInsightPanel';
import ReflectionsOverview from '@/components/journal/ReflectionsOverview';
import JungianArchetypeCard from '@/components/journal/JungianArchetypeCard';
import MindOrbitWordCloud from '@/components/journal/MindOrbitWordCloud';
import DeckProgressCard from '@/components/journal/DeckProgressCard';
import ReflectionsPreviewLocked from '@/components/journal/ReflectionsPreviewLocked';

export default function ReflectionsPage() {
  const {
    ready,
    entries,
    checkins,
    analytics,
    monthlyReport,
    generatingReport,
    reportError,
    handleGenerateReport,
  } = useJournalData();

  const hasEnoughEntries = entries.length >= 3;

  return (
    <AppPageShell
      eyebrow="Insights"
      title="洞察"
      description="把最近的情绪、牌面和元素分布整理成一张可读的心智图谱。"
      imageSrc="/cards/rws/09-the-hermit.jpg"
      imageAlt="隐士塔罗牌"
    >
      <div className="mt-7 flex flex-col gap-7">
        {!ready ? (
          <div className="rounded-2xl border border-gold/12 bg-card/60 p-6 text-center text-sm font-serif text-gold-muted animate-pulse">
            正在整理本机记录…
          </div>
        ) : (
          <>
            <ReflectionsOverview
              entries={entries}
              checkins={checkins}
              monthlyReport={monthlyReport}
              generatingReport={generatingReport}
            />

            {/* 78 张全牌义图鉴探索与点亮进度 */}
            <DeckProgressCard entries={entries} />

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
              <ReflectionsPreviewLocked completedCount={entries.length} />
            )}
          </>
        )}
      </div>

      <BottomNav />
    </AppPageShell>
  );
}
