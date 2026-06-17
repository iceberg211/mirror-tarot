'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Moon, Eye, EyeOff } from 'lucide-react';
import { spreads } from '@/lib/tarot/spreads';
import { moodConfigs } from '@/lib/tarot/moods';
import { JournalEntry } from '@/lib/db/localJournal';
import BackupSection from '@/components/journal/BackupSection';
import JournalConstellationView from '@/components/journal/JournalConstellationView';
import JournalListItem from '@/components/journal/JournalListItem';

const moodList = moodConfigs.map((m) => m.name);

interface JournalListTabProps {
  entries: JournalEntry[];
  filteredEntries: JournalEntry[];
  selectedSpread: string;
  setSelectedSpread: (spread: string) => void;
  selectedMood: string;
  setSelectedMood: (mood: string) => void;
  dreamOnly: boolean;
  setDreamOnly: (dreamOnly: boolean) => void;
  importStatus: { type: 'success' | 'error' | null; message: string };
  setImportStatus: (status: { type: 'success' | 'error' | null; message: string }) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export default function JournalListTab({
  entries,
  filteredEntries,
  selectedSpread,
  setSelectedSpread,
  selectedMood,
  setSelectedMood,
  dreamOnly,
  setDreamOnly,
  importStatus,
  setImportStatus,
  onExport,
  onImport
}: JournalListTabProps) {
  const [viewMode, setViewMode] = useState<'list' | 'constellation'>('list');
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [privacyMode, setPrivacyMode] = useState(false);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 筛选控制器 */}
      {entries.length > 0 && (
        <div className="flex gap-3 bg-[#0E1017]/40 border border-gold/10 p-3 rounded-xl select-none items-end">
          {/* 牌阵筛选 */}
          <div className="flex-1 flex flex-col gap-1">
            <span className="text-[9px] text-gold-muted/60 font-serif tracking-wider">按牌阵</span>
            <select
              value={selectedSpread}
              onChange={(e) => setSelectedSpread(e.target.value)}
              className="w-full bg-[#11131A] border border-gold/15 rounded-lg py-1.5 px-2 text-xs text-gold outline-none cursor-pointer"
            >
              <option value="all">全部牌阵</option>
              {Object.entries(spreads).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.name}
                </option>
              ))}
            </select>
          </div>

          {/* 情绪筛选 */}
          <div className="flex-1 flex flex-col gap-1">
            <span className="text-[9px] text-gold-muted/60 font-serif tracking-wider">按情绪</span>
            <select
              value={selectedMood}
              onChange={(e) => setSelectedMood(e.target.value)}
              className="w-full bg-[#11131A] border border-gold/15 rounded-lg py-1.5 px-2 text-xs text-gold outline-none cursor-pointer"
            >
              <option value="all">全部情绪</option>
              {moodList.map((mood) => (
                <option key={mood} value={mood}>
                  {mood}
                </option>
              ))}
            </select>
          </div>

          {/* 梦境筛选 */}
          <div className="flex flex-col gap-1 items-center justify-center pl-1.5 border-l border-gold/10 flex-shrink-0">
            <span className="text-[9px] text-gold-muted/60 font-serif tracking-wider">梦境</span>
            <button
              type="button"
              onClick={() => setDreamOnly(!dreamOnly)}
              className={`w-9 h-7.5 rounded-lg border flex items-center justify-center cursor-pointer transition-all duration-300 ${
                dreamOnly
                  ? 'border-blue-400/80 bg-blue-950/20 text-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.25)]'
                  : 'border-gold/15 bg-[#11131A] text-gold-muted/50 hover:border-gold/30 hover:text-gold'
              }`}
              title={dreamOnly ? '仅看梦境记录已开启' : '一键筛选梦境记录'}
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>

          {/* 隐私防窥 */}
          <div className="flex flex-col gap-1 items-center justify-center pl-1.5 border-l border-gold/10 flex-shrink-0">
            <span className="text-[9px] text-gold-muted/60 font-serif tracking-wider">防窥</span>
            <button
              type="button"
              onClick={() => setPrivacyMode(!privacyMode)}
              className={`w-9 h-7.5 rounded-lg border flex items-center justify-center cursor-pointer transition-all duration-300 ${
                privacyMode
                  ? 'border-gold bg-gold/10 text-gold shadow-gold-glow'
                  : 'border-gold/15 bg-[#11131A] text-gold-muted/50 hover:border-gold/30 hover:text-gold'
              }`}
              title={privacyMode ? '隐私防窥模式已开启' : '一键开启毛玻璃防窥'}
            >
              {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* 视图切换 */}
      {entries.length > 0 && (
        <div className="flex justify-end gap-2 px-1 mt-1">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-lg text-[10px] font-serif tracking-widest border transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'border-gold text-gold bg-gold/5 shadow-gold-glow font-semibold'
                : 'border-gold/10 text-gold-muted/50 hover:border-gold/25'
            }`}
          >
            列表视图 ✦ List
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('constellation');
              if (filteredEntries.length > 0 && !activeEntryId) {
                setActiveEntryId(filteredEntries[0].id);
              }
            }}
            className={`px-3 py-1 rounded-lg text-[10px] font-serif tracking-widest border transition-all cursor-pointer ${
              viewMode === 'constellation'
                ? 'border-gold text-gold bg-gold/5 shadow-gold-glow animate-[pulse_3s_infinite] font-semibold'
                : 'border-gold/10 text-gold-muted/50 hover:border-gold/25'
            }`}
          >
            星轨视图 ✦ Constellation
          </button>
        </div>
      )}

      {/* 列表主体 */}
      <div className="flex-1 flex flex-col gap-4 mt-2">
        {viewMode === 'list' ? (
          filteredEntries.length > 0 ? (
            filteredEntries.map((entry) => (
              <JournalListItem key={entry.id} entry={entry} privacyMode={privacyMode} />
            ))
          ) : (
            /* 空白状态 */
            <div className="text-center py-12 border border-dashed border-gold/10 rounded-xl bg-card/25">
              <p className="text-xs text-gold-muted/50 font-serif">✦ 镜中空无一物，期待您的第一篇倾听日记 ✦</p>
              <Link
                href="/"
                className="mt-4 inline-block px-5 py-2 border border-gold/25 text-gold font-serif rounded-lg text-[10px] hover:bg-gold/5 transition-all"
              >
                开启塔罗探索
              </Link>
            </div>
          )
        ) : (
          /* 星轨轨迹连线图 */
          <JournalConstellationView
            filteredEntries={filteredEntries}
            activeEntryId={activeEntryId}
            setActiveEntryId={setActiveEntryId}
          />
        )}
      </div>

      {/* 数据备份与恢复 */}
      <BackupSection
        importStatus={importStatus}
        setImportStatus={setImportStatus}
        onExport={onExport}
        onImport={onImport}
      />
    </div>
  );
}
