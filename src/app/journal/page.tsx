'use client';

import React from 'react';
import BottomNav from '@/components/layout/BottomNav';
import { useJournalData } from '@/hooks/useJournalData';
import JournalHeader from '@/components/journal/JournalHeader';
import WeeklyCalendar from '@/components/journal/WeeklyCalendar';
import JournalListTab from '@/components/journal/JournalListTab';

export default function JournalPage() {
  const {
    entries,
    filteredEntries,
    checkins,
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
    <main className="flex-grow min-h-screen pb-28 flex flex-col items-center text-foreground relative overflow-y-auto select-none">
      {/* 顶部 Header */}
      <JournalHeader />

      <div className="w-full max-w-md px-6 flex-1 flex flex-col gap-5 mt-6">
        {/* 情绪周历打卡 */}
        <WeeklyCalendar
          checkInDays={checkInDays}
          showCheckInPicker={showCheckInPicker}
          setShowCheckInPicker={setShowCheckInPicker}
          onCheckIn={handleCheckIn}
        />

        {/* 直接渲染日记/轨迹列表 */}
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
      </div>

      <BottomNav />
    </main>
  );
}
