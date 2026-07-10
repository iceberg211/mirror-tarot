import type { SelectedCard } from '../tarot/types';
import { moodConfigs } from '../tarot/moods';
import { getCardElement } from '../tarot/utils';
import type { CheckInEntry, JournalAnalytics, JournalEntry } from './types';
import { getLocalDateString } from './local-storage';
import { getLocalCheckIns, getLocalReadings } from './journal-crud';

export function getJournalAnalytics(
  readingsInput?: JournalEntry[],
  checkinsInput?: CheckInEntry[]
): JournalAnalytics {
  const readings = readingsInput || getLocalReadings();
  const checkins = checkinsInput || getLocalCheckIns();

  const cardCountMap: Record<string, { card: SelectedCard; count: number }> = {};
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  readings.forEach((entry) => {
    const entryDate = new Date(entry.createdAt);
    if (entryDate >= thirtyDaysAgo) {
      entry.cards.forEach((card) => {
        if (!cardCountMap[card.id]) {
          cardCountMap[card.id] = { card, count: 0 };
        }
        cardCountMap[card.id].count += 1;
      });
    }
  });

  const topCards = Object.values(cardCountMap)
    .map((item) => ({
      id: item.card.id,
      name: item.card.name,
      zhName: item.card.zhName,
      image: item.card.image,
      count: item.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const moodScores: Record<string, number> = {};
  moodConfigs.forEach((m) => {
    moodScores[m.name] = m.score;
  });

  const dateMap: Record<string, { score: number; mood: string }> = {};

  checkins.forEach((c) => {
    const score = moodScores[c.mood] || 3;
    dateMap[c.date] = { score, mood: c.mood };
  });

  readings.forEach((r) => {
    const dateStr = getLocalDateString(new Date(r.createdAt));
    const score = moodScores[r.mood] || 3;
    dateMap[dateStr] = { score, mood: r.mood };
  });

  const moodTrend = Object.entries(dateMap)
    .map(([date, item]) => ({
      date,
      score: item.score,
      mood: item.mood,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-15);

  const elementCounts = { water: 0, fire: 0, wind: 0, earth: 0 };
  let totalCardsCount = 0;
  const majorArcanaCounts: Record<string, { card: SelectedCard; count: number }> = {};

  readings.forEach((entry) => {
    const entryDate = new Date(entry.createdAt);
    if (entryDate >= thirtyDaysAgo) {
      entry.cards.forEach((card) => {
        const el = getCardElement(card);
        elementCounts[el] += 1;
        totalCardsCount += 1;

        if (card.arcana === 'major') {
          if (!majorArcanaCounts[card.id]) {
            majorArcanaCounts[card.id] = { card, count: 0 };
          }
          majorArcanaCounts[card.id].count += 1;
        }
      });
    }
  });

  const elementProportions = { water: 25, fire: 25, wind: 25, earth: 25 };
  if (totalCardsCount > 0) {
    elementProportions.water = Math.round((elementCounts.water / totalCardsCount) * 100);
    elementProportions.fire = Math.round((elementCounts.fire / totalCardsCount) * 100);
    elementProportions.wind = Math.round((elementCounts.wind / totalCardsCount) * 100);
    elementProportions.earth = Math.round((elementCounts.earth / totalCardsCount) * 100);
  }

  let dominantArchetype = null;
  const sortedMajors = Object.values(majorArcanaCounts).sort((a, b) => b.count - a.count);
  if (sortedMajors.length > 0) {
    const bestMajor = sortedMajors[0].card;
    dominantArchetype = {
      zhName: bestMajor.zhName,
      name: bestMajor.name,
      image: bestMajor.image,
      description: `本月您的心智投射常与「${bestMajor.zhName} (${bestMajor.name})」产生深刻共鸣（累计在近30天日记中出现过 ${sortedMajors[0].count} 次）。`,
    };
  }

  return {
    topCards,
    moodTrend,
    elementProportions,
    dominantArchetype,
  };
}

export function getHistoricalContextForAI(currentId?: string): string {
  if (typeof window === 'undefined') return '';

  try {
    const readings = getLocalReadings();
    const filtered = readings.filter(
      (r) => r.id !== currentId && r.reading && r.reading.intuitiveSummary
    );

    const recent = filtered.slice(0, 3);
    if (recent.length === 0) return '';

    const lines = recent.map((r) => {
      const dateStr = new Date(r.createdAt).toLocaleDateString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
      });
      const cardsStr = r.cards
        .map((c) => `${c.zhName}(${c.orientation === 'upright' ? '正位' : '逆位'})`)
        .join('、');
      const seedStr = r.actionSeed
        ? `，行动建议是：“${r.actionSeed.seedText}”（状态：${r.actionSeed.status}）`
        : '';
      const notesStr = r.userNotes ? `，用户整理笔记：“${r.userNotes}”` : '';

      return `- ${dateStr} 问了：“${r.question}”，抽到：[${cardsStr}]。AI总结：“${r.reading.intuitiveSummary}”${seedStr}${notesStr}`;
    });

    return `【用户近期测算历史与觉察心境】\n${lines.join('\n')}\n（说明：请在本次解读中根据上下文自然地提及用户的近期状态或前情回响，让用户感到长期陪伴的连续性，不要说重复的建议）`;
  } catch (e) {
    console.error('Failed to get historical context for AI:', e);
    return '';
  }
}

export function getPersonalDataSummary(): string {
  try {
    const readings = getLocalReadings();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentReadings = readings.filter(
      (r) => new Date(r.createdAt) >= thirtyDaysAgo && r.reading && r.reading.intuitiveSummary
    );

    if (recentReadings.length < 3) return '';

    const cardCounts: Record<string, { name: string; count: number }> = {};
    recentReadings.forEach((r) => {
      r.cards.forEach((c) => {
        if (!cardCounts[c.id]) {
          cardCounts[c.id] = { name: c.zhName, count: 0 };
        }
        cardCounts[c.id].count++;
      });
    });

    const topCards = Object.values(cardCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((c) => `『${c.name}』(共出现${c.count}次)`)
      .join('、');

    const moodCounts: Record<string, number> = {};
    recentReadings.forEach((r) => {
      moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1;
    });
    const topMoods = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map((m) => `「${m[0]}」`)
      .join('、');

    const recentQuestions = recentReadings
      .slice(0, 3)
      .map((r) => `“${r.question}”`)
      .join('；');

    return `# USER_HISTORY_PROFILE
【用户近期心智画像摘要】
- 最近30天测算频次：已累计进行 ${recentReadings.length} 次自我分析与读牌。
- 潜意识高频卡牌：${topCards || '无特殊高频牌'}。
- 常见情绪波动：主要处于 ${topMoods || '平稳'} 心境。
- 最近聚焦的主题议题：${recentQuestions}。
（提示：请结合以上用户的近期画像背景进行本次情绪指引，在本次回复的措辞语气及分析侧重点中，含蓄地呼应TA最近的挣扎或成长趋势，但不要说教，保持深度的倾听同理心）`;
  } catch (e) {
    console.error('Failed to generate personal data summary:', e);
    return '';
  }
}

export function getRecentMoodState(): 'shadow' | 'storm' | null {
  if (typeof window === 'undefined') return null;
  try {
    const dates: string[] = [];
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dates.push(getLocalDateString(d));
    }

    const checkins = getLocalCheckIns();
    const readings = getLocalReadings();
    const dayCategories: Record<string, 'light' | 'shadow' | 'storm' | null> = {};

    dates.forEach((dateStr) => {
      const checkin = checkins.find((c: { date: string }) => c.date === dateStr);
      if (checkin) {
        const config = moodConfigs.find((m) => m.id === checkin.mood || m.name === checkin.mood);
        if (config) {
          dayCategories[dateStr] = config.category;
          return;
        }
      }
      const reading = readings.find((r) => r.createdAt.startsWith(dateStr));
      if (reading) {
        const config = moodConfigs.find((m) => m.id === reading.mood || m.name === reading.mood);
        if (config) {
          dayCategories[dateStr] = config.category;
          return;
        }
      }
      dayCategories[dateStr] = null;
    });

    let shadowDays = 0;
    let stormDays = 0;
    dates.forEach((dateStr) => {
      const cat = dayCategories[dateStr];
      if (cat === 'shadow') shadowDays++;
      if (cat === 'storm') stormDays++;
    });

    if (shadowDays + stormDays >= 2) {
      return stormDays >= shadowDays ? 'storm' : 'shadow';
    }
  } catch (e) {
    console.error('Failed to calculate recent mood state:', e);
  }
  return null;
}
