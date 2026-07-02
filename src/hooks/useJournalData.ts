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

export function useJournalData() {
  const [entries, setEntries] = useState<JournalEntry[]>(() => getLocalReadings());
  const [checkins, setCheckins] = useState<CheckInEntry[]>(() => getLocalCheckIns());
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);

  // 页签控制与分析数据
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [analytics, setAnalytics] = useState<JournalAnalytics | null>(() => getJournalAnalytics());
  const [monthlyReport, setMonthlyReport] = useState(() => getLocalMonthlyReport());
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // 备份导入导出状态
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const { playAmbient, stopAmbient } = useAudio();

  // 筛选状态
  const [selectedSpread, setSelectedSpread] = useState<string>('all');
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [dreamOnly, setDreamOnly] = useState<boolean>(false);

  const refreshData = useCallback(() => {
    const readings = getLocalReadings();
    setEntries(readings);

    const history = getLocalCheckIns();
    setCheckins(history);

    const anaData = getJournalAnalytics(readings, history);
    setAnalytics(anaData);

    const rpt = getLocalMonthlyReport();
    setMonthlyReport(rpt);
  }, []);

  // 获取数据
  useEffect(() => {
    let cancelled = false;

    // 触发云端数据同步并在同步完成后刷新 UI
    syncJournalData()
      .then((success) => {
        if (cancelled) return;
        if (success) {
          refreshData();
        }
      })
      .catch((err) => {
        console.error('Trigger sync error on mount:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshData]);

  // 执行筛选 - 改用 useMemo 以解决 react-hooks/set-state-in-effect 报错并优化性能
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    if (selectedSpread !== 'all') {
      result = result.filter((e) => e.spreadType === selectedSpread);
    }

    if (selectedMood !== 'all') {
      result = result.filter((e) => e.mood === selectedMood);
    }

    if (dreamOnly) {
      result = result.filter((e) => !!e.isDream);
    }

    return result;
  }, [selectedSpread, selectedMood, dreamOnly, entries]);

  const handleCheckIn = (mood: string) => {
    saveLocalCheckIn(mood);
    setShowCheckInPicker(false);
    refreshData();
  };

  const handleGenerateReport = async () => {
    if (generatingReport || !analytics) return;
    let reportFlushTimer: number | null = null;
    let text = '';

    const flushReportText = () => {
      if (reportFlushTimer !== null) {
        window.clearTimeout(reportFlushTimer);
        reportFlushTimer = null;
      }
      setMonthlyReport(text);
    };

    const scheduleReportFlush = () => {
      if (reportFlushTimer !== null) return;
      reportFlushTimer = window.setTimeout(() => {
        reportFlushTimer = null;
        setMonthlyReport(text);
      }, 120);
    };

    setGeneratingReport(true);
    setMonthlyReport('');
    setReportError(null);
    playAmbient();

    try {
      const response = await fetch('/api/journal/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkins,
          readings: entries.slice(0, 20),
          topCards: analytics.topCards,
        }),
      });

      if (!response.ok) {
        let errMsg = `HTTP 错误！状态码: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch {
          try {
            const txt = await response.text();
            if (txt) errMsg = txt;
          } catch {}
        }
        throw new Error(errMsg);
      }

      if (!response.body) throw new Error('流式读取器未就绪 (ReadableStream not supported)');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        const chunk = decoder.decode(value, { stream: !done });
        text += chunk;
        scheduleReportFlush();
      }
      flushReportText();

      if (text.trim().length < 40) {
        throw new Error('AI 分析生成的文本过短，请重试');
      }

      saveLocalMonthlyReport(text);
      stopAmbient();
      setGeneratingReport(false);
    } catch (err) {
      if (reportFlushTimer !== null) {
        window.clearTimeout(reportFlushTimer);
      }
      console.error('Generate report error:', err);
      stopAmbient();
      const errMsg = err instanceof Error ? err.message : String(err);
      setReportError(errMsg || '生成潜意识报告失败');
      setGeneratingReport(false);
    }
  };

  const handleExportData = () => {
    try {
      const dataStr = exportJournalData();
      if (!dataStr) return;
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const exportFileDefaultName = `mirror_tarot_backup_${getLocalDateString()}.json`;

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
          refreshData();
        } else {
          setImportStatus({ type: 'error', message: '导入失败：文件格式或版本不合规。' });
        }
      } catch {
        setImportStatus({ type: 'error', message: '导入失败：解析备份文件出错。' });
      }
    };
    reader.readAsText(file);
  };

  // 计算最近 7 天的打卡状态
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
