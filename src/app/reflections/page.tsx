'use client';

import React from 'react';
import AppPageShell from '@/components/layout/AppPageShell';
import BottomNav from '@/components/layout/BottomNav';
import { useJournalData } from '@/hooks/useJournalData';
import AnalyticsTab from '@/components/journal/AnalyticsTab';
import ProfileInsightPanel from '@/components/journal/ProfileInsightPanel';
import ReflectionsOverview from '@/components/journal/ReflectionsOverview';

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

        <ProfileInsightPanel entries={entries} checkins={checkins} />

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
    </AppPageShell>
  );
}
