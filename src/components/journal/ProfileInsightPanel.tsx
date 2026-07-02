'use client';

import React, { useMemo, useState } from 'react';
import { Archive, LockKeyhole, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  buildInsightMetrics,
  getInsightSnapshot,
  InsightPeriodDays,
  InsightSnapshot,
  saveInsightSnapshot,
} from '@/lib/insights/profileInsights';
import { CheckInEntry, JournalEntry } from '@/lib/db/localJournal';

interface ProfileInsightPanelProps {
  entries: JournalEntry[];
  checkins: CheckInEntry[];
}

const periods: InsightPeriodDays[] = [30, 90, 365];

export default function ProfileInsightPanel({ entries, checkins }: ProfileInsightPanelProps) {
  const { user, status, openAuthModal } = useAuth();
  const [periodDays, setPeriodDays] = useState<InsightPeriodDays>(30);
  const [snapshot, setSnapshot] = useState<InsightSnapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const metrics = useMemo(
    () => buildInsightMetrics(entries, checkins, periodDays),
    [checkins, entries, periodDays],
  );
  const readyForProfile = metrics.totalReadings >= 3;
  const topCard = metrics.analytics.topCards[0];
  const dominant = metrics.analytics.dominantArchetype;

  const handleGenerateSnapshot = async () => {
    if (!user) {
      openAuthModal();
      return;
    }

    setSaving(true);
    setError('');
    try {
      const saved = await saveInsightSnapshot(user.id, metrics, metrics.recentTheme);
      if (saved) {
        setSnapshot(saved);
      } else {
        const existing = await getInsightSnapshot(user.id, periodDays);
        if (existing) setSnapshot(existing);
        setError('画像快照暂时无法写入云端，已保留当前可见分析。');
      }
    } catch (err) {
      console.error('Failed to generate insight snapshot:', err);
      const existing = await getInsightSnapshot(user.id, periodDays);
      if (existing) setSnapshot(existing);
      setError('画像快照生成失败，已保留已有快照。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="w-full border-y border-gold/12 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.26em] text-gold-muted/50">
            Mirror Profile
          </p>
          <h2 className="mt-2 text-lg font-serif font-semibold tracking-widest text-gold">
            我的镜面档案
          </h2>
          <p className="mt-2 text-[11px] font-serif leading-6 tracking-wide text-gold-muted/72">
            汇总高频牌、人格原型、情绪周期和元素比例，形成账号级长期画像。
          </p>
        </div>
        <Archive className="mt-1 h-5 w-5 text-gold/70" />
      </div>

      <div className="mt-5 flex gap-2">
        {periods.map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => setPeriodDays(period)}
            className={`rounded-full border px-3 py-1.5 text-[10px] font-mono tracking-widest transition-colors ${
              periodDays === period
                ? 'border-gold/45 bg-gold/10 text-gold'
                : 'border-gold/12 text-gold-muted/60 hover:border-gold/30 hover:text-gold'
            }`}
          >
            {period}D
          </button>
        ))}
      </div>

      {!readyForProfile ? (
        <div className="mt-5 border-y border-dashed border-gold/12 py-5 text-center">
          <p className="text-xs font-serif text-gold-muted/70">
            需要至少 3 次抽牌记录，镜面档案才会开始显影。
          </p>
          <p className="mt-2 text-[10px] font-serif leading-5 text-gold-muted/50">
            现在已有 {metrics.totalReadings} 次记录。可以先完成今日一牌或一次完整牌阵。
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-y border-gold/10 py-4">
          <div>
            <span className="block text-[9px] font-mono uppercase tracking-[0.22em] text-gold-muted/45">
              Archetype
            </span>
            <span className="mt-1 block text-sm font-serif font-semibold tracking-widest text-gold">
              {dominant?.zhName || '积累中'}
            </span>
          </div>
          <div>
            <span className="block text-[9px] font-mono uppercase tracking-[0.22em] text-gold-muted/45">
              Top Card
            </span>
            <span className="mt-1 block text-sm font-serif font-semibold tracking-widest text-gold">
              {topCard?.zhName || '暂无'}
            </span>
          </div>
          <div>
            <span className="block text-[9px] font-mono uppercase tracking-[0.22em] text-gold-muted/45">
              Readings
            </span>
            <span className="mt-1 block text-sm font-mono text-gold">
              {metrics.totalReadings}
            </span>
          </div>
          <div>
            <span className="block text-[9px] font-mono uppercase tracking-[0.22em] text-gold-muted/45">
              Checkins
            </span>
            <span className="mt-1 block text-sm font-mono text-gold">
              {metrics.totalCheckins}
            </span>
          </div>
        </div>
      )}

      <p className="mt-4 text-[11px] font-serif leading-6 tracking-wide text-foreground/76">
        {metrics.recentTheme}
      </p>

      {status !== 'authenticated' ? (
        <button
          type="button"
          onClick={openAuthModal}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-gold/30 bg-gold/8 px-4 text-[10px] font-serif tracking-widest text-gold transition-colors hover:bg-gold/12"
        >
          <LockKeyhole className="h-3.5 w-3.5" />
          登录保存长期画像
        </button>
      ) : (
        <button
          type="button"
          onClick={handleGenerateSnapshot}
          disabled={!readyForProfile || saving}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-gold/30 bg-gold/8 px-4 text-[10px] font-serif tracking-widest text-gold transition-colors hover:bg-gold/12 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${saving ? 'animate-spin' : ''}`} />
          {saving ? '保存中' : '生成画像快照'}
        </button>
      )}

      {snapshot && (
        <p className="mt-3 text-[9px] font-mono uppercase tracking-[0.18em] text-gold-muted/45">
          已保存 {snapshot.periodDays} 天快照：{new Date(snapshot.updatedAt).toLocaleString('zh-CN')}
        </p>
      )}

      {error && (
        <p className="mt-3 text-[10px] font-serif leading-5 text-red-300">{error}</p>
      )}
    </section>
  );
}
