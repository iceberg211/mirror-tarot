'use client';

import React from 'react';
import BottomNav from '@/components/layout/BottomNav';
import { useJournalData } from '@/hooks/useJournalData';
import JournalHeader from '@/components/journal/JournalHeader';
import WeeklyCalendar from '@/components/journal/WeeklyCalendar';
import JournalListTab from '@/components/journal/JournalListTab';
import AnalyticsTab from '@/components/journal/AnalyticsTab';

export default function JournalPage() {
  const {
    entries,
    filteredEntries,
    checkins,
    checkInDays,
    showCheckInPicker,
    setShowCheckInPicker,
    activeTab,
    setActiveTab,
    analytics,
    monthlyReport,
    generatingReport,
    reportError,
    selectedSpread,
    setSelectedSpread,
    selectedMood,
    setSelectedMood,
    importStatus,
    setImportStatus,
    handleCheckIn,
    handleGenerateReport,
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

        {/* 页签 Tab 控制器 */}
        <div className="w-full grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0E1017]/40 border border-gold/10">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`py-2 text-[11px] font-serif tracking-widest rounded-lg cursor-pointer transition-all duration-300 outline-none ${
              activeTab === 'list'
                ? 'border border-gold bg-[#1E1C16]/65 text-gold shadow-gold-glow font-semibold'
                : 'border border-transparent text-gold-muted/65 hover:text-gold'
            }`}
          >
            日记列表 ✦ List
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`py-2 text-[11px] font-serif tracking-widest rounded-lg cursor-pointer transition-all duration-300 outline-none ${
              activeTab === 'analytics'
                ? 'border border-gold bg-[#1E1C16]/65 text-gold shadow-gold-glow font-semibold'
                : 'border border-transparent text-gold-muted/65 hover:text-gold'
            }`}
          >
            潜意识镜面 ✦ Analytics
          </button>
        </div>

        {/* 页签内容 */}
        {activeTab === 'list' ? (
          <JournalListTab
            entries={entries}
            filteredEntries={filteredEntries}
            selectedSpread={selectedSpread}
            setSelectedSpread={setSelectedSpread}
            selectedMood={selectedMood}
            setSelectedMood={setSelectedMood}
            importStatus={importStatus}
            setImportStatus={setImportStatus}
            onExport={handleExportData}
            onImport={handleImportData}
          />
        ) : (
          <AnalyticsTab
            analytics={analytics}
            checkins={checkins}
            entries={entries}
            monthlyReport={monthlyReport}
            generatingReport={generatingReport}
            reportError={reportError}
            onGenerateReport={handleGenerateReport}
          />
        )}
      </div>

      <BottomNav />
    </main>
  );
}
