'use client';

import { useState, useEffect, useMemo } from 'react';
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
  getLocalDateString
} from '@/lib/db/localJournal';
import { useAudio } from '@/hooks/useAudio';

export function useJournalData() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [checkins, setCheckins] = useState<CheckInEntry[]>([]);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);

  // 页签控制与分析数据
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [analytics, setAnalytics] = useState<JournalAnalytics | null>(null);
  const [monthlyReport, setMonthlyReport] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // 备份导入导出状态
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const { playAmbient, stopAmbient } = useAudio();

  // 筛选状态
  const [selectedSpread, setSelectedSpread] = useState<string>('all');
  const [selectedMood, setSelectedMood] = useState<string>('all');

  const refreshData = () => {
    const readings = getLocalReadings();
    setEntries(readings);

    const history = getLocalCheckIns();
    setCheckins(history);

    const anaData = getJournalAnalytics();
    setAnalytics(anaData);

    const rpt = getLocalMonthlyReport();
    setMonthlyReport(rpt);
  };

  // 获取数据
  useEffect(() => {
    // 异步延时加载以解决 React setState synchronous effect 规则警告
    const timer = setTimeout(() => {
      refreshData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // 执行筛选 - 改用 useMemo 以解决 react-hooks/set-state-in-effect 报错并优化性能
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    if (selectedSpread !== 'all') {
      result = result.filter((e) => e.spreadType === selectedSpread);
    }

    if (selectedMood !== 'all') {
      result = result.filter((e) => e.mood === selectedMood);
    }

    return result;
  }, [selectedSpread, selectedMood, entries]);

  const handleCheckIn = (mood: string) => {
    saveLocalCheckIn(mood);
    setShowCheckInPicker(false);
    refreshData();
  };

  const handleGenerateReport = async () => {
    if (generatingReport || !analytics) return;
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
      let text = '';

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        const chunk = decoder.decode(value, { stream: !done });
        text += chunk;
        setMonthlyReport(text);
      }

      if (text.trim().length < 40) {
        throw new Error('AI 分析生成的文本过短，请重试');
      }

      saveLocalMonthlyReport(text);
      stopAmbient();
      setGeneratingReport(false);
    } catch (err) {
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
          setImportStatus({ type: 'success', message: '🎉 日记备份成功恢复并导入！' });
          refreshData();
        } else {
          setImportStatus({ type: 'error', message: '❌ 导入失败：文件格式不合规。' });
        }
      } catch {
        setImportStatus({ type: 'error', message: '❌ 导入失败：解析备份文件出错。' });
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
      const moodLabel = checkIn?.mood ? checkIn.mood.charAt(0) : '';

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
    importStatus,
    setImportStatus,
    handleCheckIn,
    handleGenerateReport,
    handleExportData,
    handleImportData
  };
}
