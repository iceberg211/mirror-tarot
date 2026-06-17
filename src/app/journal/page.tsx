'use client';

import React, { useState } from 'react';
import { Moon } from 'lucide-react';
import DreamJournalModal from '@/components/journal/DreamJournalModal';
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

  const [showDreamModal, setShowDreamModal] = useState(false);

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

        {/* 梦境记录入口 */}
        <div className="w-full flex justify-end -mt-2">
          <button
            type="button"
            onClick={() => setShowDreamModal(true)}
            className="px-4 py-2 rounded-lg border border-gold/25 bg-[#171510] text-[10px] text-gold font-serif tracking-widest hover:bg-gold/5 transition-all cursor-pointer shadow-gold-glow flex items-center gap-1.5"
          >
            <Moon className="w-3.5 h-3.5 animate-pulse" />
            <span>✦ 记录昨晚梦境 ✦</span>
          </button>
        </div>

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

      {showDreamModal && (
        <DreamJournalModal onClose={() => setShowDreamModal(false)} />
      )}

      <BottomNav />
    </main>
  );
}
