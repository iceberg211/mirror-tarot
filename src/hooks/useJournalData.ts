'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getLocalReadings,
  getLocalCheckIns,
  saveLocalCheckIn,
  getLocalMonthlyReport,
  saveLocalMonthlyReport,
  getJournalAnalytics,
  exportJournalData,
  importJournalData,
  CheckInEntry,
  JournalEntry,
  JournalAnalytics,
  getLocalDateString,
  syncJournalData
} from '@/lib/db/localJournal';
import { useAudio } from '@/hooks/useAudio';
import { moodConfigs } from '@/lib/tarot/moods';
import { useClientReady } from '@/hooks/useClientReady';

export function useJournalData() {
  const ready = useClientReady();
  // 本地数据版本戳：同步/导入后递增，触发 useMemo 重读
  const [dataEpoch, setDataEpoch] = useState(0);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const { playAmbient, stopAmbient } = useAudio();
  const [selectedSpread, setSelectedSpread] = useState<string>('all');
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [dreamOnly, setDreamOnly] = useState<boolean>(false);

  const bump = useCallback(() => setDataEpoch((n) => n + 1), []);

  const entries = useMemo<JournalEntry[]>(() => {
    if (!ready) return [];
    void dataEpoch;
    return getLocalReadings();
  }, [ready, dataEpoch]);

  const checkins = useMemo<CheckInEntry[]>(() => {
    if (!ready) return [];
    void dataEpoch;
    return getLocalCheckIns();
  }, [ready, dataEpoch]);

  const analytics = useMemo<JournalAnalytics | null>(() => {
    if (!ready) return null;
    void dataEpoch;
    return getJournalAnalytics(entries, checkins);
  }, [ready, dataEpoch, entries, checkins]);

  const monthlyReport = useMemo(() => {
    if (!ready) return '';
    void dataEpoch;
    return getLocalMonthlyReport();
  }, [ready, dataEpoch]);

  // 仅异步云同步后 bump，避免 effect 内同步 setState
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    syncJournalData()
      .then((success) => {
        if (!cancelled && success) bump();
      })
      .catch((err) => {
        console.error('Trigger sync error on mount:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, bump]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (selectedSpread !== 'all' && entry.spreadType !== selectedSpread) return false;
      if (selectedMood !== 'all' && entry.mood !== selectedMood) return false;
      if (dreamOnly && !entry.isDream) return false;
      return true;
    });
  }, [entries, selectedSpread, selectedMood, dreamOnly]);

  const handleCheckIn = useCallback((mood: string) => {
    saveLocalCheckIn(mood);
    bump();
    setShowCheckInPicker(false);
  }, [bump]);

  const handleGenerateReport = useCallback(async () => {
    if (generatingReport) return;
    setGeneratingReport(true);
    setReportError(null);
    playAmbient();
    try {
      const topCards = analytics?.topCards?.slice(0, 5).map((c) => ({
        zhName: c.zhName,
        count: c.count,
      })) || [];
      const response = await fetch('/api/journal/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkins: checkins.slice(-30),
          readings: entries.slice(0, 20).map((r) => ({
            question: r.question,
            mood: r.mood,
            cards: r.cards.map((c) => ({
              zhName: c.zhName,
              orientation: c.orientation,
            })),
          })),
          topCards,
        }),
      });
      if (!response.ok || !response.body) {
        throw new Error('月报生成失败');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      let done = false;
      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        text += decoder.decode(value, { stream: !done });
      }
      saveLocalMonthlyReport(text);
      bump();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setReportError(msg || '生成失败');
    } finally {
      stopAmbient();
      setGeneratingReport(false);
    }
  }, [analytics, checkins, entries, generatingReport, playAmbient, stopAmbient, bump]);

  const handleExportData = () => {
    try {
      const dataStr = exportJournalData();
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `mirror-tarot-backup-${getLocalDateString()}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (e) {
      console.error('Failed to export data:', e);
    }
  };

  const handleImportData = (file: File) => {
    setImportStatus({ type: null, message: '' });
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const resultText = event.target?.result as string;
        const ok = importJournalData(resultText);
        if (ok) {
          setImportStatus({ type: 'success', message: '日记备份已校验、合并并导入。' });
          bump();
        } else {
          setImportStatus({ type: 'error', message: '导入失败：文件格式或版本不合规。' });
        }
      } catch {
        setImportStatus({ type: 'error', message: '导入失败：解析备份文件出错。' });
      }
    };
    reader.readAsText(file);
  };

  const checkInDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = getLocalDateString(date);
      const checkIn = checkins.find((c) => c.date === dateStr);
      const isToday = dateStr === getLocalDateString();
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      const dayLabel = isToday ? '今' : dayNames[date.getDay()];
      const moodConfig = moodConfigs.find((m) => m.name === checkIn?.mood);
      const moodLabel = moodConfig ? moodConfig.label : (checkIn?.mood ? checkIn.mood.charAt(0) : '');
      return {
        dateStr,
        dayLabel,
        checked: !!checkIn,
        mood: checkIn?.mood || '',
        moodLabel,
        isToday,
      };
    });
  }, [checkins]);

  return {
    ready,
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
    dreamOnly,
    setDreamOnly,
    importStatus,
    setImportStatus,
    handleCheckIn,
    handleGenerateReport,
    handleExportData,
    handleImportData
  };
}
