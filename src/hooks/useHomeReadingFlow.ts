'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SpreadType } from '@/lib/tarot/types';
import { moodConfigs } from '@/lib/tarot/moods';
import { useAudio } from '@/hooks/useAudio';
import {
  getLocalReadings,
  updateActionSeedStatus,
  getLocalDateString,
  JournalEntry,
} from '@/lib/db/localJournal';
import { getTodayMoonPhase } from '@/lib/tarot/moonPhase';

export const questionTemplates = [
  '面对当前瓶颈，我忽略了什么？',
  '今日我最需要关照的情绪是什么？',
  '在这段亲密关系中，我的潜意识在投射什么？',
  '关于最近面临的选择，卡牌能给我什么心智启示？',
  '分析一下我最近面临的潜意识梦境隐喻。',
];

export type HomeSection = 'overview' | 'inquiry';
export type ActionSeedStatus = 'completed' | 'failed' | 'dismissed';

export function useHomeReadingFlow() {
  const router = useRouter();
  const { playBowl } = useAudio();
  const [activeSection, setActiveSection] = useState<HomeSection>('overview');
  const [question, setQuestion] = useState('');
  const [selectedMood, setSelectedMood] = useState('calm');
  const [selectedSpread, setSelectedSpread] = useState<SpreadType>('three_cards');
  const [customCardCount, setCustomCardCount] = useState<number>(3);
  const [customPositionNames, setCustomPositionNames] = useState<string[]>(['现状', '阻碍', '建议']);
  const [showMoonModal, setShowMoonModal] = useState(false);
  const [showDreamModal, setShowDreamModal] = useState(false);
  const [error, setError] = useState('');
  const [isDream, setIsDream] = useState(false);
  const [pendingSeedEntry, setPendingSeedEntry] = useState<JournalEntry | null>(null);
  const [recapFeedback, setRecapFeedback] = useState('');
  const [moonPhase] = useState(() => getTodayMoonPhase());

  React.useEffect(() => {
    const readings = getLocalReadings();
    const todayStr = getLocalDateString();
    const found = readings.find((entry) => entry.actionSeed?.status === 'pending');
    if (found?.actionSeed && found.actionSeed.date !== todayStr) {
      const timer = window.setTimeout(() => setPendingSeedEntry(found), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const selectedMoodConfig = useMemo(
    () => moodConfigs.find((mood) => mood.id === selectedMood) || moodConfigs[0],
    [selectedMood]
  );

  const openInquiry = (nextQuestion = '', dreamMode = false) => {
    setActiveSection('inquiry');
    setQuestion(nextQuestion);
    setIsDream(dreamMode);
    setError('');
  };

  const closeInquiry = () => {
    setActiveSection('overview');
    setQuestion('');
    setIsDream(false);
    setError('');
  };

  const openDreamModal = () => {
    setError('');
    setShowDreamModal(true);
  };

  const handleMoonResonate = () => {
    playBowl();
    setShowMoonModal(true);
  };

  const handleDailyDraw = () => {
    setError('');
    const params = new URLSearchParams({
      question: '抽取今日运势与觉察指引。',
      mood: selectedMoodConfig.name,
      spreadType: 'one_card',
    });
    router.push(`/reading/new?${params.toString()}`);
  };

  const handleTemplateSelect = (template: string) => {
    setQuestion(template);
    setIsDream(template.includes('梦境'));
    if (error) setError('');
  };

  const handleCustomCardCountChange = (count: number) => {
    setCustomCardCount(count);
    setCustomPositionNames((current) => {
      const nextNames = [...current];
      if (nextNames.length < count) {
        for (let index = nextNames.length; index < count; index += 1) {
          nextNames.push(index === 1 ? '阻碍' : index === 2 ? '建议' : '视角');
        }
      }
      return nextNames.slice(0, count);
    });
  };

  const handleCustomPositionChange = (index: number, value: string) => {
    setCustomPositionNames((current) => {
      const nextNames = [...current];
      nextNames[index] = value;
      return nextNames;
    });
  };

  const handleStart = (event: React.FormEvent) => {
    event.preventDefault();
    if (!question.trim()) {
      setError('把当下的困惑写下来，卡牌才能回应你。');
      return;
    }

    const params = new URLSearchParams({
      question: question.trim(),
      mood: selectedMoodConfig.name,
      spreadType: selectedSpread,
    });

    if (isDream) {
      params.append('isDream', 'true');
    }

    if (selectedSpread === 'custom') {
      const validNames = customPositionNames.slice(0, customCardCount);
      if (validNames.some((name) => !name.trim())) {
        setError('请为自定义牌阵的每个位置填写觉察视角。');
        return;
      }
      params.append('customPositions', validNames.map((name) => name.trim()).join(','));
    }

    setError('');
    router.push(`/reading/new?${params.toString()}`);
  };

  const handleRecapCheckIn = (status: ActionSeedStatus) => {
    if (!pendingSeedEntry) return;
    updateActionSeedStatus(pendingSeedEntry.id, status);

    if (status === 'completed') {
      setRecapFeedback('知行合一，昨日的提醒已经进入现实。');
    } else if (status === 'failed') {
      setRecapFeedback('没有关系，能看见它，本身就是一次整理。');
    } else {
      setRecapFeedback('顺应当下，保留这颗种子，等待更合适的时刻。');
    }

    window.setTimeout(() => {
      setPendingSeedEntry(null);
      setRecapFeedback('');
    }, 1800);
  };

  return {
    activeSection,
    question,
    setQuestion,
    selectedMood,
    setSelectedMood,
    selectedMoodConfig,
    selectedSpread,
    setSelectedSpread,
    customCardCount,
    customPositionNames,
    showMoonModal,
    setShowMoonModal,
    showDreamModal,
    setShowDreamModal,
    error,
    setError,
    isDream,
    pendingSeedEntry,
    setPendingSeedEntry,
    recapFeedback,
    moonPhase,
    openInquiry,
    closeInquiry,
    openDreamModal,
    handleMoonResonate,
    handleDailyDraw,
    handleTemplateSelect,
    handleCustomCardCountChange,
    handleCustomPositionChange,
    handleStart,
    handleRecapCheckIn,
  };
}
