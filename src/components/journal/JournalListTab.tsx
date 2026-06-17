'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight, Download, Upload } from 'lucide-react';
import { spreads } from '@/lib/tarot/spreads';
import { JournalEntry } from '@/lib/db/localJournal';

const moodList = ['迷茫', '焦虑', '期待', '平静', '难过', '纠结'];

interface JournalListTabProps {
  entries: JournalEntry[];
  filteredEntries: JournalEntry[];
  selectedSpread: string;
  setSelectedSpread: (spread: string) => void;
  selectedMood: string;
  setSelectedMood: (mood: string) => void;
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
  importStatus,
  setImportStatus,
  onExport,
  onImport
}: JournalListTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 筛选控制器 */}
      {entries.length > 0 && (
        <div className="flex gap-3 bg-[#0E1017]/40 border border-gold/10 p-3 rounded-xl select-none">
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
        </div>
      )}

      {/* 列表主体 */}
      <div className="flex-1 flex flex-col gap-4 mt-2">
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => {
            const spreadInfo = spreads[entry.spreadType];
            const dateStr = new Date(entry.createdAt).toLocaleDateString('zh-CN', {
              month: 'short',
              day: 'numeric',
            });

            return (
              <Link
                key={entry.id}
                href={`/reading/${entry.id}`}
                className="w-full p-4 rounded-xl border border-gold/15 bg-[#0F1117]/60 hover:border-gold/30 hover:bg-[#12141D]/60 flex justify-between items-center gap-4 transition-all duration-300 group cursor-pointer"
              >
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  {/* 顶部元数据 */}
                  <div className="flex items-center gap-2 text-[9px] text-gold-muted/70 font-serif">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gold-muted/50" />
                      {dateStr}
                    </span>
                    <span>•</span>
                    <span className="text-gold tracking-widest">{spreadInfo?.name}</span>
                    <span>•</span>
                    <span className="text-gold-muted">{entry.mood}</span>
                  </div>

                  {/* 问题摘要 */}
                  <h3 className="text-xs md:text-sm text-foreground/90 font-serif leading-relaxed truncate">
                    {entry.question}
                  </h3>

                  {/* AI解读引言 */}
                  <p className="text-[11px] text-gold-muted/75 font-serif italic line-clamp-1">
                    {entry.reading.intuitiveSummary || '等待情绪解读激活中...'}
                  </p>
                </div>

                {/* 右侧微缩卡牌占位 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex -space-x-2.5">
                    {entry.cards.slice(0, 3).map((card, idx) => (
                      <div
                        key={card.id}
                        style={{ zIndex: idx }}
                        className="w-7 h-11 rounded-sm border border-gold/35 overflow-hidden bg-[#090B11] flex items-center justify-center relative shadow-md"
                      >
                        <div className="absolute inset-0.5 border border-gold/10 rounded-sm" />
                        <span className="text-[8px] font-serif text-gold/35 scale-90">
                          {card.zhName.charAt(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gold-muted/40 group-hover:text-gold group-hover:translate-x-0.5 transition-all duration-300" />
                </div>
              </Link>
            );
          })
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
        )}
      </div>

      {/* 数据备份与恢复卡片 */}
      <div className="w-full mt-6 p-4 rounded-xl border border-gold/10 bg-[#0F1117]/30 flex flex-col gap-3.5 select-none">
        <div className="border-b border-gold/5 pb-2 text-[10px] text-gold-muted/80 font-serif tracking-widest uppercase font-semibold">
          ✦ 数据备份与恢复 (Data Backup & Restore)
        </div>
        <p className="text-[10px] text-gold-muted/65 leading-relaxed font-serif">
          由于目前不提供云端账号系统，您的情绪日记均保存在当前浏览器本地。建议定期备份您的日记数据，以防清理浏览器缓存造成日记丢失。
        </p>

        <div className="flex gap-3 mt-1">
          <button
            type="button"
            onClick={onExport}
            className="flex-1 py-2 px-3 rounded-lg border border-gold/20 bg-gold/5 hover:bg-gold/10 text-gold text-[10px] font-serif tracking-widest flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出日记备份</span>
          </button>
          
          <button
            type="button"
            onClick={triggerFileInput}
            className="flex-1 py-2 px-3 rounded-lg border border-gold/20 bg-gold/5 hover:bg-gold/10 text-gold text-[10px] font-serif tracking-widest flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>导入备份恢复</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>

        {importStatus.type && (
          <div className={`mt-2 text-center text-[10px] font-serif py-1 rounded border ${
            importStatus.type === 'success'
              ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30'
              : 'text-red-400 bg-red-950/20 border-red-900/30'
          }`}>
            {importStatus.message}
          </div>
        )}
      </div>
    </div>
  );
}
