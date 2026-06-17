'use client';

import React, { useRef } from 'react';
import { Download, Upload } from 'lucide-react';

interface BackupSectionProps {
  importStatus: { type: 'success' | 'error' | null; message: string };
  setImportStatus: (status: { type: 'success' | 'error' | null; message: string }) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export default function BackupSection({
  importStatus,
  setImportStatus,
  onExport,
  onImport
}: BackupSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
    }
    e.target.value = '';
  };

  const triggerFileInput = () => {
    setImportStatus({ type: null, message: '' });
    fileInputRef.current?.click();
  };

  return (
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
  );
}
