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
  const remaining = Math.max(0, 3 - entries.length);

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
              <div className="flex flex-col gap-5 rounded-2xl border border-gold/15 bg-card p-6 text-center shadow-gold-glow">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-gold/20 bg-gold/5 text-gold">
                  <Sparkles className="h-4.5 w-4.5" aria-hidden />
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-serif font-semibold tracking-widest text-gold uppercase">
                    心智图谱充能中
                  </h3>
                  <p className="text-sm font-serif leading-relaxed tracking-wide text-gold-muted px-2">
                    已完成 {entries.length}/3 次解读
                    {remaining > 0 ? `，再完成 ${remaining} 次即可开启完整洞察。` : '。'}
                  </p>
                  <div
                    className="mx-auto mt-1 h-2 w-full max-w-[220px] overflow-hidden rounded-full bg-gold/10"
                    role="progressbar"
                    aria-valuenow={entries.length}
                    aria-valuemin={0}
                    aria-valuemax={3}
                    aria-label="洞察解锁进度"
                  >
                    <div
                      className="h-full rounded-full bg-gold/70 transition-all duration-500"
                      style={{ width: `${Math.min(100, (entries.length / 3) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-2.5 max-w-[220px] mx-auto w-full">
                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="w-full min-h-11 rounded-xl bg-gradient-to-r from-[#171610] via-[#2E281C] to-[#171610] border border-gold/45 text-gold text-sm font-serif font-semibold tracking-widest hover:brightness-110 shadow-gold-glow flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{entries.length === 0 ? '开始第一次解读' : '继续一次解读'}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </AppPageShell>
  );
}
