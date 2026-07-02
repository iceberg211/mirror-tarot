'use client';

import React, { useMemo } from 'react';
import { Activity, BookOpen, CloudMoon, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { CheckInEntry, JournalEntry } from '@/lib/db/localJournal';

interface ReflectionsOverviewProps {
  entries: JournalEntry[];
  checkins: CheckInEntry[];
  monthlyReport: string;
  generatingReport: boolean;
}

function isWithinDays(dateValue: string, days: number) {
  const timestamp = new Date(dateValue).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= days * 24 * 60 * 60 * 1000;
}

export default function ReflectionsOverview({
  entries,
  checkins,
  monthlyReport,
  generatingReport,
}: ReflectionsOverviewProps) {
  const { status, openAuthModal } = useAuth();

  const overview = useMemo(() => {
    const recentReadings = entries.filter((entry) => isWithinDays(entry.createdAt, 30)).length;
    const recentCheckins = checkins.filter((checkin) => isWithinDays(checkin.date, 30)).length;

    return {
      recentReadings,
      recentCheckins,
      totalRecords: entries.length + checkins.length,
      reportState: generatingReport ? '生成中' : monthlyReport ? '已生成' : '待生成',
    };
  }, [checkins, entries, generatingReport, monthlyReport]);

  const accountLabel = status === 'authenticated'
    ? '账号已连接'
    : status === 'unconfigured'
      ? '本机模式'
      : '游客模式';

  const stats = [
    {
      label: '30天抽牌',
      value: overview.recentReadings,
      hint: '用于牌面和原型分析',
      icon: BookOpen,
    },
    {
      label: '30天打卡',
      value: overview.recentCheckins,
      hint: '用于情绪周期判断',
      icon: Activity,
    },
    {
      label: '月报',
      value: overview.reportState,
      hint: '可由 AI 整理近期趋势',
      icon: CloudMoon,
    },
    {
      label: '数据归属',
      value: accountLabel,
      hint: `${overview.totalRecords} 条本机可见记录`,
      icon: LockKeyhole,
    },
  ];

  return (
    <section className="w-full border-y border-gold/12 py-5">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.26em] text-gold-muted/50">
            Overview
          </p>
          <h2 className="mt-2 text-lg font-serif font-semibold tracking-widest text-gold">
            先看最近状态
          </h2>
          <p className="mt-2 text-[11px] font-serif leading-6 tracking-wide text-gold-muted/72">
            这里汇总抽牌、情绪打卡、月度报告和账号状态，帮助你快速判断当前分析是否足够可靠。
          </p>
        </div>

        {status !== 'authenticated' && status !== 'unconfigured' && (
          <button
            type="button"
            onClick={openAuthModal}
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/18 text-gold-muted/70 transition-colors hover:border-gold/35 hover:text-gold"
            aria-label="登录保存长期画像"
          >
            <LockKeyhole className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 border-y border-gold/10">
        {stats.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`min-h-[104px] px-3 py-4 ${
                index % 2 === 0 ? 'border-r border-gold/10' : ''
              } ${index < 2 ? 'border-b border-gold/10' : ''}`}
            >
              <div className="flex items-center gap-2 text-gold-muted/55">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[9px] font-mono uppercase tracking-[0.18em]">
                  {item.label}
                </span>
              </div>
              <p className="mt-3 text-base font-serif font-semibold tracking-widest text-gold">
                {item.value}
              </p>
              <p className="mt-1 text-[10px] font-serif leading-5 tracking-wide text-gold-muted/58">
                {item.hint}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
