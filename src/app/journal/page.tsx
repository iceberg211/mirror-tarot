'use client';

import React from 'react';
import AppPageShell from '@/components/layout/AppPageShell';
import BottomNav from '@/components/layout/BottomNav';
import { useJournalData } from '@/hooks/useJournalData';
import WeeklyCalendar from '@/components/journal/WeeklyCalendar';
import JournalListTab from '@/components/journal/JournalListTab';

export default function JournalPage() {
  const {
    ready,
    entries,
    filteredEntries,
    checkInDays,
    showCheckInPicker,
    setShowCheckInPicker,
    selectedSpread,
    setSelectedSpread,
    selectedMood,
    setSelectedMood,
    dreamOnly,
    setDreamOnly,
    importStatus,
    setImportStatus,
    handleCheckIn,
    handleExportData,
    handleImportData
  } = useJournalData();

  return (
    <AppPageShell
      eyebrow="Journal"
      title="日记"
      description="把每一次抽牌、梦境和情绪打卡按时间收好，随时回看自己的变化。"
      imageSrc="/cards/rws/20-judgement.jpg"
      imageAlt="审判塔罗牌"
    >
      <div className="mt-7 flex flex-col gap-8">
        {!ready ? (
          <div className="rounded-2xl border border-gold/12 bg-card/60 p-6 text-center text-sm font-serif text-gold-muted animate-pulse">
            正在读取本机日记…
          </div>
        ) : (
          <>
            <WeeklyCalendar
              checkInDays={checkInDays}
              showCheckInPicker={showCheckInPicker}
              setShowCheckInPicker={setShowCheckInPicker}
              onCheckIn={handleCheckIn}
            />

            <JournalListTab
              entries={entries}
              filteredEntries={filteredEntries}
              selectedSpread={selectedSpread}
              setSelectedSpread={setSelectedSpread}
              selectedMood={selectedMood}
              setSelectedMood={setSelectedMood}
              dreamOnly={dreamOnly}
              setDreamOnly={setDreamOnly}
              importStatus={importStatus}
              setImportStatus={setImportStatus}
              onExport={handleExportData}
              onImport={handleImportData}
            />
          </>
        )}
      </div>

      <BottomNav />
    </AppPageShell>
  );
}
