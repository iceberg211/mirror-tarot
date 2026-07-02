'use client';

import {
  CheckInEntry,
  getJournalAnalytics,
  JournalAnalytics,
  JournalEntry,
} from '@/lib/db/localJournal';
import { supabase } from '@/lib/supabaseClient';

export type InsightPeriodDays = 30 | 90 | 365;

export interface InsightMetrics {
  periodDays: InsightPeriodDays;
  generatedAt: string;
  totalReadings: number;
  totalCheckins: number;
  analytics: JournalAnalytics;
  recentTheme: string;
}

export interface InsightSnapshot {
  periodDays: InsightPeriodDays;
  metrics: InsightMetrics;
  summary: string;
  updatedAt: string;
}

interface SnapshotRow {
  period_days: InsightPeriodDays;
  metrics: InsightMetrics;
  summary: string | null;
  updated_at: string;
}

function isWithinPeriod(dateValue: string, periodDays: InsightPeriodDays): boolean {
  const timestamp = new Date(dateValue).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= periodDays * 24 * 60 * 60 * 1000;
}

function buildRecentTheme(analytics: JournalAnalytics): string {
  if (analytics.dominantArchetype) {
    return `近期反复浮现的核心原型是「${analytics.dominantArchetype.zhName}」。`;
  }

  const topCard = analytics.topCards[0];
  if (topCard) {
    return `近期最常出现的镜像牌是「${topCard.zhName}」。`;
  }

  return '记录还在积累中，镜面暂时保持安静。';
}

export function buildInsightMetrics(
  entries: JournalEntry[],
  checkins: CheckInEntry[],
  periodDays: InsightPeriodDays,
): InsightMetrics {
  const periodEntries = entries.filter((entry) => isWithinPeriod(entry.createdAt, periodDays));
  const periodCheckins = checkins.filter((checkin) => isWithinPeriod(checkin.date, periodDays));
  const analytics = getJournalAnalytics(periodEntries, periodCheckins);

  return {
    periodDays,
    generatedAt: new Date().toISOString(),
    totalReadings: periodEntries.length,
    totalCheckins: periodCheckins.length,
    analytics,
    recentTheme: buildRecentTheme(analytics),
  };
}

export async function saveInsightSnapshot(
  userId: string,
  metrics: InsightMetrics,
  summary = '',
): Promise<InsightSnapshot | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('insight_snapshots')
    .upsert(
      {
        user_id: userId,
        period_days: metrics.periodDays,
        metrics,
        summary,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,period_days' },
    )
    .select('period_days,metrics,summary,updated_at')
    .single();

  if (error) {
    console.error('Failed to save insight snapshot:', error);
    return null;
  }

  const row = data as SnapshotRow;
  return {
    periodDays: row.period_days,
    metrics: row.metrics,
    summary: row.summary || '',
    updatedAt: row.updated_at,
  };
}

export async function getInsightSnapshot(
  userId: string,
  periodDays: InsightPeriodDays,
): Promise<InsightSnapshot | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('insight_snapshots')
    .select('period_days,metrics,summary,updated_at')
    .eq('user_id', userId)
    .eq('period_days', periodDays)
    .maybeSingle();

  if (error) {
    console.error('Failed to load insight snapshot:', error);
    return null;
  }

  if (!data) return null;

  const row = data as SnapshotRow;
  return {
    periodDays: row.period_days,
    metrics: row.metrics,
    summary: row.summary || '',
    updatedAt: row.updated_at,
  };
}
