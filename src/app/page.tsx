'use client';

import React from 'react';
import BottomNav from '@/components/layout/BottomNav';
import DreamJournalModal from '@/components/journal/DreamJournalModal';
import HomeHero from '@/components/home/HomeHero';
import HomeInquiryForm from '@/components/home/HomeInquiryForm';
import HomeMoonModal from '@/components/home/HomeMoonModal';
import { useHomeReadingFlow } from '@/hooks/useHomeReadingFlow';

export default function HomePage() {
  const flow = useHomeReadingFlow();

  return (
    <main className="relative flex min-h-screen flex-col overflow-y-auto bg-[#05060A] pb-24 text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,167,106,0.10),transparent_35%),linear-gradient(180deg,rgba(7,9,15,0.15),rgba(5,6,10,0.96)_62%)]" />

      <div className="relative z-10">
        {flow.activeSection === 'overview' ? (
          <HomeHero
            moonPhase={flow.moonPhase}
            onStartInquiry={() => flow.openInquiry()}
            onDailyDraw={flow.handleDailyDraw}
            onOpenDream={flow.openDreamModal}
            onMoonResonate={flow.handleMoonResonate}
            latestEntry={flow.latestEntry}
          />
        ) : (
          <HomeInquiryForm
            question={flow.question}
            onQuestionChange={(value) => {
              flow.setQuestion(value);
              if (flow.error) flow.setError('');
            }}
            selectedMood={flow.selectedMood}
            onMoodChange={flow.setSelectedMood}
            selectedSpread={flow.selectedSpread}
            onSpreadChange={flow.setSelectedSpread}
            customCardCount={flow.customCardCount}
            customPositionNames={flow.customPositionNames}
            error={flow.error}
            isDream={flow.isDream}
            onBack={flow.closeInquiry}
            onTemplateSelect={flow.handleTemplateSelect}
            onCustomCardCountChange={flow.handleCustomCardCountChange}
            onCustomPositionChange={flow.handleCustomPositionChange}
            onSubmit={flow.handleStart}
            recentMoodState={flow.recentMoodState}
          />
        )}

        <p className="mx-auto mt-2 max-w-md px-6 text-center text-[9px] font-mono uppercase tracking-[0.24em] text-gold-muted/34">
          Self Exploration Companion
        </p>
      </div>

      {flow.showMoonModal && (
        <HomeMoonModal
          moonPhase={flow.moonPhase}
          onClose={() => flow.setShowMoonModal(false)}
        />
      )}

      {flow.showDreamModal && (
        <DreamJournalModal onClose={() => flow.setShowDreamModal(false)} />
      )}

      <BottomNav />
    </main>
  );
}
