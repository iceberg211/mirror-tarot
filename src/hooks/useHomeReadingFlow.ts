'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SpreadType } from '@/lib/tarot/types';
import { moodConfigs } from '@/lib/tarot/moods';
import { useAudio } from '@/hooks/useAudio';
import { getLocalReadings, getRecentMoodState } from '@/lib/db/localJournal';
import { getTodayMoonPhase } from '@/lib/tarot/moonPhase';

export const questionTemplates = [
  '我现在最该先处理什么？',
  '今天我需要留意哪种情绪？',
  '这段关系里，我真正担心的是什么？',
  '面对这个选择，我忽略了什么？',
  '这个梦可能在提醒我什么？',
];

export type HomeSection = 'overview' | 'inquiry';

export function getSpreadRecommendation(question: string, dreamMode = false): {
  type: SpreadType;
  reason: string;
} {
  const normalized = question.toLowerCase();
  if (dreamMode || normalized.includes('梦')) {
    return {
      type: 'shadow',
      reason: '已为你匹配「自我与阴影」牌阵，探索潜意识梦境背后的隐秘动机与出口。',
    };
  }
  if (normalized.includes('关系') || normalized.includes('感情') || normalized.includes('亲密') || normalized.includes('他') || normalized.includes('她') || normalized.includes('分手') || normalized.includes('复合') || normalized.includes('喜欢')) {
    return {
      type: 'relationship',
      reason: '已为你匹配「关系牌阵」，看清彼此的状态、关系现状与未来走向。',
    };
  }
  if (normalized.includes('职业') || normalized.includes('工作') || normalized.includes('项目') || normalized.includes('创业') || normalized.includes('跳槽') || normalized.includes('离职') || normalized.includes('面试')) {
    return {
      type: 'career',
      reason: '已为你匹配「职业牌阵」，重点梳理现实机会、潜在风险与行动建议。',
    };
  }
  if (normalized.includes('选择') || normalized.includes('二选一') || normalized.includes('抉择') || normalized.includes('还是') || normalized.includes('纠结')) {
    return {
      type: 'choice',
      reason: '已为你匹配「二选一抉择」牌阵，对比两条不同路径会带来的影响。',
    };
  }
  if (normalized.includes('阴影') || normalized.includes('潜意识') || normalized.includes('自我') || normalized.includes('内耗') || normalized.includes('抗拒') || normalized.includes('难过')) {
    return {
      type: 'shadow',
      reason: '已为你匹配「自我与阴影」牌阵，把模糊的内耗感受与深层抗拒看明白。',
    };
  }
  if (normalized.includes('瓶颈') || normalized.includes('困惑') || normalized.includes('忽略') || normalized.includes('为什么') || normalized.includes('迷茫')) {
    return {
      type: 'mirror_cross',
      reason: '已为你匹配「镜面十字」牌阵，层层拆解核心现状、理性阻碍与关键下一步。',
    };
  }
  return {
    type: 'three_cards',
    reason: '已为你匹配经典「三牌阵」，清晰呈现当前现状、卡点阻碍与行动建议。',
  };
}

export function recommendSpreadForQuestion(question: string, dreamMode = false): SpreadType {
  return getSpreadRecommendation(question, dreamMode).type;
}

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
  const [moonPhase] = useState(() => getTodayMoonPhase());
  const [homeSnapshot] = useState(() => {
    const readings = getLocalReadings();
    return {
      entryCount: readings.length,
      latestEntry: readings[0] || null,
    };
  });

  const recentMoodState = useMemo(() => {
    return getRecentMoodState();
  }, []);

  const selectedMoodConfig = useMemo(
    () => moodConfigs.find((mood) => mood.id === selectedMood) || moodConfigs[0],
    [selectedMood]
  );

  const openInquiry = (nextQuestion = '', dreamMode = false) => {
    setActiveSection('inquiry');
    setQuestion(nextQuestion);
    setIsDream(dreamMode);
    if (nextQuestion) {
      setSelectedSpread(recommendSpreadForQuestion(nextQuestion, dreamMode));
    }
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
      question: '今天我需要留意什么？',
      mood: selectedMoodConfig.name,
      spreadType: 'one_card',
    });
    router.push(`/reading/new?${params.toString()}`);
  };

  const handleTemplateSelect = (template: string) => {
    const dreamMode = template.includes('梦境');
    setQuestion(template);
    setIsDream(dreamMode);
    setSelectedSpread(recommendSpreadForQuestion(template, dreamMode));
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
      setError('先写下你想问的事。');
      return;
    }

    const params = new URLSearchParams({
      question: question.trim(),
      mood: selectedMoodConfig.name,
      spreadType: selectedSpread,
    });

    if (recentMoodState) {
      params.append('recentMoodState', recentMoodState);
    }

    if (isDream) {
      params.append('isDream', 'true');
    }

    if (selectedSpread === 'custom') {
      const validNames = customPositionNames.slice(0, customCardCount);
      if (validNames.some((name) => !name.trim())) {
        setError('请为每个自定义位置填写名称。');
        return;
      }
      params.append('customPositions', validNames.map((name) => name.trim()).join(','));
    }

    setError('');
    router.push(`/reading/new?${params.toString()}`);
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
    entryCount: homeSnapshot.entryCount,
    latestEntry: homeSnapshot.latestEntry,
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
    recentMoodState,
  };
}
