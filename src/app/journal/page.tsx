'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BookOpen, Calendar, ChevronRight, Filter } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import {
  getLocalReadings,
  getLocalCheckIns,
  saveLocalCheckIn,
  getLocalDateString,
  getLocalMonthlyReport,
  saveLocalMonthlyReport,
  getJournalAnalytics,
  CheckInEntry,
  JournalEntry
} from '@/lib/db/localJournal';
import { spreads } from '@/lib/tarot/spreads';
import { SpreadType } from '@/lib/tarot/types';
import { Sparkles, Heart, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '@/hooks/useAudio';

function parseMonthlyReport(text: string) {
  const sections = {
    summary: '',
    emotionWater: '',
    subShadow: '',
    therapySoul: '',
  };
  
  if (!text) return sections;

  const parts = text.split('# ');
  parts.forEach((part) => {
    const lines = part.split('\n');
    const title = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();

    if (title.startsWith('SUMMARY')) {
      sections.summary = body;
    } else if (title.startsWith('EMOTION_WATER')) {
      sections.emotionWater = body;
    } else if (title.startsWith('SUB_SHADOW')) {
      sections.subShadow = body;
    } else if (title.startsWith('THERAPY_SOUL')) {
      sections.therapySoul = body;
    }
  });

  return sections;
}

const moodList = ['迷茫', '焦虑', '期待', '平静', '难过', '纠结'];

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [checkins, setCheckins] = useState<CheckInEntry[]>([]);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);

  // 页签控制与分析数据
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [analytics, setAnalytics] = useState<any>(null);
  const [monthlyReport, setMonthlyReport] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const { playAmbient, stopAmbient } = useAudio();

  // 筛选状态
  const [selectedSpread, setSelectedSpread] = useState<string>('all');
  const [selectedMood, setSelectedMood] = useState<string>('all');

  const refreshData = () => {
    const readings = getLocalReadings();
    setEntries(readings);
    setFilteredEntries(readings);

    const history = getLocalCheckIns();
    setCheckins(history);

    const anaData = getJournalAnalytics();
    setAnalytics(anaData);

    const rpt = getLocalMonthlyReport();
    setMonthlyReport(rpt);
  };

  // 获取数据
  useEffect(() => {
    refreshData();
  }, []);

  // 计算最近 7 天的日期签到状态
  const checkInDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i)); // 从 6 天前 到 今天
      const dateStr = getLocalDateString(date);
      
      const checkIn = checkins.find((c) => c.date === dateStr);
      const isToday = dateStr === getLocalDateString();
      
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      const dayLabel = isToday ? '今' : dayNames[date.getDay()];

      // 提取情绪的首字做圆形打卡简写
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

  const handleCheckIn = (mood: string) => {
    saveLocalCheckIn(mood);
    setShowCheckInPicker(false);
    refreshData();
  };

  // 执行筛选
  useEffect(() => {
    let result = [...entries];

    if (selectedSpread !== 'all') {
      result = result.filter((e) => e.spreadType === selectedSpread);
    }

    if (selectedMood !== 'all') {
      result = result.filter((e) => e.mood === selectedMood);
    }

    setFilteredEntries(result);
  }, [selectedSpread, selectedMood, entries]);

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
        } catch (_) {
          try {
            const txt = await response.text();
            if (txt) errMsg = txt;
          } catch (_) {}
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
    } catch (err: any) {
      console.error('Generate report error:', err);
      stopAmbient();
      setReportError(err.message || '生成潜意识报告失败');
      setGeneratingReport(false);
    }
  };

  return (
    <main className="flex-grow min-h-screen pb-28 flex flex-col items-center text-foreground relative overflow-y-auto select-none">
      {/* 顶部 Header */}
      <div className="w-full max-w-md px-6 pt-12 flex flex-col items-start gap-1">
        <h1 className="text-2xl font-serif tracking-widest text-gold font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          <span>情绪日记</span>
        </h1>
        <p className="text-[10px] text-gold-muted/60 font-mono tracking-wider uppercase">
          Mirror Tarot Journal History
        </p>
      </div>

      <div className="w-full max-w-md px-6 flex-1 flex flex-col gap-5 mt-6">
        
        {/* 情绪周历打卡卡片 */}
        <div className="w-full p-4 rounded-2xl glassmorphism border-gold/25 shadow-gold-glow flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-gold/10 pb-2 text-xs font-serif text-gold font-semibold tracking-widest">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>情绪周历打卡</span>
            </div>
            <span className="text-[10px] text-gold-muted/60 font-mono tracking-wider">7 DAYS</span>
          </div>

          <div className="flex justify-between items-center pt-1">
            {checkInDays.map((day) => {
              return (
                <div key={day.dateStr} className="flex flex-col items-center gap-1.5 flex-1">
                  {day.checked ? (
                    // 已打卡状态
                    <div className="w-9 h-9 rounded-full bg-[#1E1C16] border border-gold text-gold font-serif text-xs font-semibold flex items-center justify-center shadow-gold-glow">
                      {day.moodLabel}
                    </div>
                  ) : day.isToday ? (
                    // 今天尚未打卡
                    <button
                      type="button"
                      onClick={() => setShowCheckInPicker(true)}
                      className="w-9 h-9 rounded-full border border-dashed border-gold/40 hover:border-gold bg-[#0E1017]/30 flex items-center justify-center text-gold/50 cursor-pointer animate-[pulse_2s_infinite] hover:bg-gold/5 outline-none"
                    >
                      +
                    </button>
                  ) : (
                    // 过去未打卡
                    <div className="w-9 h-9 rounded-full border border-dashed border-gold/10 bg-transparent flex items-center justify-center text-gold-muted/20 text-xs select-none">
                      •
                    </div>
                  )}
                  <span className={`text-[10px] font-serif tracking-widest ${
                    day.isToday ? 'text-gold font-semibold' : 'text-gold-muted/65'
                  }`}>
                    {day.dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 页签 Tab 控制器 */}
        <div className="w-full grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0E1017]/40 border border-gold/10">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-2 text-[11px] font-serif tracking-widest rounded-lg cursor-pointer transition-all duration-300 outline-none ${
              activeTab === 'list'
                ? 'border border-gold bg-[#1E1C16]/65 text-gold shadow-gold-glow font-semibold'
                : 'border border-transparent text-gold-muted/65 hover:text-gold'
            }`}
          >
            日记列表 ✦ List
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 text-[11px] font-serif tracking-widest rounded-lg cursor-pointer transition-all duration-300 outline-none ${
              activeTab === 'analytics'
                ? 'border border-gold bg-[#1E1C16]/65 text-gold shadow-gold-glow font-semibold'
                : 'border border-transparent text-gold-muted/65 hover:text-gold'
            }`}
          >
            潜意识镜面 ✦ Analytics
          </button>
        </div>

        {/* 1. List 页签内容 */}
        {activeTab === 'list' && (
          <div className="w-full flex flex-col gap-4">
            {/* 筛选控制器 */}
            {entries.length > 0 && (
              <div className="flex gap-3 bg-[#0E1017]/40 border border-gold/10 p-3 rounded-xl">
                {/* 牌阵筛选 */}
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[9px] text-gold-muted/60 font-serif tracking-wider">按牌阵</span>
                  <select
                    value={selectedSpread}
                    onChange={(e) => setSelectedSpread(e.target.value)}
                    className="w-full bg-[#11131A] border border-gold/15 rounded-lg py-1.5 px-2 text-xs text-gold outline-none cursor-pointer"
                  >
                    <option value="all">全部牌阵</option>
                    {Object.entries(spreads).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 情绪筛选 */}
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[9px] text-gold-muted/60 font-serif tracking-wider">按情绪</span>
                  <select
                    value={selectedMood}
                    onChange={(e) => setSelectedMood(e.target.value)}
                    className="w-full bg-[#11131A] border border-gold/15 rounded-lg py-1.5 px-2 text-xs text-gold outline-none cursor-pointer"
                  >
                    <option value="all">全部情绪</option>
                    {moodList.map((mood) => (
                      <option key={mood} value={mood}>
                        {mood}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 列表主体 */}
        {activeTab === 'list' && (
          <div className="flex-1 flex flex-col gap-4 mt-2">
          {filteredEntries.length > 0 ? (
            filteredEntries.map((entry) => {
              const spreadInfo = spreads[entry.spreadType];
              const dateStr = new Date(entry.createdAt).toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <Link
                  key={entry.id}
                  href={`/reading/${entry.id}`}
                  className="w-full p-4 rounded-xl border border-gold/15 bg-[#0F1117]/60 hover:border-gold/30 hover:bg-[#12141D]/60 flex justify-between items-center gap-4 transition-all duration-300 group cursor-pointer"
                >
                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    {/* 顶部元数据 */}
                    <div className="flex items-center gap-2 text-[9px] text-gold-muted/70 font-serif">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gold-muted/50" />
                        {dateStr}
                      </span>
                      <span>•</span>
                      <span className="text-gold tracking-widest">{spreadInfo?.name}</span>
                      <span>•</span>
                      <span className="text-gold-muted">{entry.mood}</span>
                    </div>

                    {/* 问题摘要 */}
                    <h3 className="text-xs md:text-sm text-foreground/90 font-serif leading-relaxed truncate">
                      {entry.question}
                    </h3>

                    {/* AI解读引言 */}
                    <p className="text-[11px] text-gold-muted/75 font-serif italic line-clamp-1">
                      {entry.reading.intuitiveSummary}
                    </p>
                  </div>

                  {/* 右侧微缩卡牌占位 */}
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2.5">
                      {entry.cards.slice(0, 3).map((card, idx) => (
                        <div
                          key={card.id}
                          style={{ zIndex: idx }}
                          className="w-7 h-11 rounded-sm border border-gold/35 overflow-hidden bg-[#090B11] flex items-center justify-center relative shadow-md"
                        >
                          {/* 极简化的小卡片表现 */}
                          <div className="absolute inset-0.5 border border-gold/10 rounded-sm" />
                          <span className="text-[8px] font-serif text-gold/35 scale-90">
                            {card.zhName.charAt(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gold-muted/40 group-hover:text-gold group-hover:translate-x-0.5 transition-all duration-300" />
                  </div>
                </Link>
              );
            })
          ) : (
            /* 空白状态 */
            <div className="text-center py-12 border border-dashed border-gold/10 rounded-xl bg-card/25">
              <p className="text-xs text-gold-muted/50 font-serif">✦ 镜中空无一物，期待您的第一篇倾听日记 ✦</p>
              <Link
                href="/"
                className="mt-4 inline-block px-5 py-2 border border-gold/25 text-gold font-serif rounded-lg text-[10px] hover:bg-gold/5 transition-all"
              >
                开启塔罗探索
              </Link>
            </div>
          )}
        </div>
        )}

        {/* 2. Analytics 页签内容 */}
        {activeTab === 'analytics' && analytics && (
          <div className="w-full flex flex-col gap-6 animate-fadeIn pb-12 mt-2">
            
            {/* 情绪波动图表 */}
            <div className="w-full p-4 rounded-xl border border-gold/15 bg-[#0F1117]/60 flex flex-col gap-3 shadow-gold-glow">
              <div className="flex justify-between items-center border-b border-gold/10 pb-2 text-[10px] text-gold font-serif font-bold tracking-widest uppercase">
                <span>情绪起伏水位线 ✦ Mood Trend</span>
                <span className="text-[8px] text-gold-muted/60 font-mono">15 RECORDINGS</span>
              </div>
              
              {analytics.moodTrend.length < 2 ? (
                <div className="h-32 flex items-center justify-center text-[10px] text-gold-muted/50 font-serif">
                  数据积累中，记录至少2篇日记后绘制趋势曲线...
                </div>
              ) : (
                <div className="relative pt-2">
                  <svg viewBox="0 0 400 150" className="w-full h-auto">
                    <defs>
                      <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* y轴网格背景线 */}
                    {[30, 63.3, 96.6, 130].map((yVal, idx) => (
                      <line
                        key={idx}
                        x1="30"
                        y1={yVal}
                        x2="380"
                        y2={yVal}
                        stroke="rgba(201, 167, 106, 0.05)"
                        strokeDasharray="2 4"
                      />
                    ))}

                    {/* y轴坐标文本 */}
                    <text x="5" y="34" className="fill-gold-muted/40 font-serif text-[7px]">静/期</text>
                    <text x="5" y="67" className="fill-gold-muted/40 font-serif text-[7px]">平/纠</text>
                    <text x="5" y="100" className="fill-gold-muted/40 font-serif text-[7px]">虑/忙</text>
                    <text x="5" y="133" className="fill-gold-muted/40 font-serif text-[7px]">悲/难</text>

                    {/* 折线图与渐变区域 */}
                    {(() => {
                      const trend = analytics.moodTrend;
                      const points = trend.map((point: any, idx: number) => {
                        const x = 30 + (idx * 350) / (trend.length - 1 || 1);
                        const y = 130 - ((point.score - 1) * 100) / 3;
                        return { x, y, ...point };
                      });

                      const pathD = points.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      const areaD = `${pathD} L ${points[points.length - 1].x} 130 L ${points[0].x} 130 Z`;

                      return (
                        <>
                          <path d={areaD} fill="url(#goldGrad)" className="pointer-events-none" />
                          <path
                            d={pathD}
                            fill="none"
                            stroke="var(--gold)"
                            strokeWidth="1.5"
                            className="drop-shadow-[0_0_4px_rgba(201,167,106,0.4)] pointer-events-none"
                          />
                          {points.map((p: any, i: number) => (
                            <g key={i} className="group/dot cursor-pointer">
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r="3.5"
                                className="fill-[#0E1017] stroke-gold stroke-[1.5]"
                              />
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                  <p className="text-[8px] text-gold-muted/40 font-mono tracking-widest text-center mt-2">
                    ✦ 横轴代表测算节点(从远至近) ✦
                  </p>
                </div>
              )}
            </div>

            {/* 高频潜意识卡牌 */}
            <div className="w-full p-4 rounded-xl border border-gold/15 bg-[#0F1117]/60 flex flex-col gap-3 shadow-gold-glow">
              <div className="flex justify-between items-center border-b border-gold/10 pb-2 text-[10px] text-gold font-serif font-bold tracking-widest uppercase">
                <span>高频潜意识镜像 ✦ Top Mirror Cards</span>
                <span className="text-[8px] text-gold-muted/60 font-mono">30 DAYS Freq</span>
              </div>

              {analytics.topCards.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-[10px] text-gold-muted/50 font-serif">
                  本月暂无高频抽牌数据...
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-center gap-4 py-2">
                    {analytics.topCards.map((tc: any) => (
                      <div key={tc.id} className="flex flex-col items-center scale-90 flex-shrink-0">
                        <div className="w-14 h-24 rounded-lg overflow-hidden border border-gold/25 relative shadow-gold-glow">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={tc.image} alt={tc.zhName} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-1">
                            <span className="text-[9px] text-gold font-serif font-bold">{tc.zhName}</span>
                          </div>
                        </div>
                        <span className="text-[8px] text-gold-muted mt-2 font-mono tracking-widest border border-gold/10 px-2 py-0.5 rounded-full bg-gold/5">
                          共抽到 {tc.count} 次
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-gold-muted/75 font-serif leading-relaxed tracking-wider px-2 text-center">
                    提示：过去30天内这几张卡牌被频繁唤起，代表了您当前最核心的潜意识诉求或正面临着的重要心智课题。
                  </p>
                </div>
              )}
            </div>

            {/* 月度 AI 镜面报告信札 */}
            <div className="w-full p-5 rounded-xl border border-gold/15 bg-[#11131A]/60 flex flex-col gap-4 shadow-gold-glow relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-gold/10 pb-2 text-[10px] text-gold font-serif font-bold tracking-widest uppercase">
                <span>月度潜意识镜面信札 ✦ AI Reflections</span>
                <span className="text-[8px] text-gold-muted/60 font-mono">QWEN LITERARY</span>
              </div>

              {generatingReport ? (
                <div className="h-40 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-dashed border-gold flex items-center justify-center animate-spin">
                    <div className="w-5 h-5 rounded-full border border-gold/20" />
                  </div>
                  <span className="text-[10px] text-gold/75 font-serif tracking-widest animate-pulse">
                    正在梳理您最近30天的心智水流...
                  </span>
                  {monthlyReport && (
                    <div className="w-full max-h-[120px] overflow-y-auto border border-gold/5 p-3 rounded-lg text-[9px] text-gold-muted/65 font-serif leading-normal no-scrollbar">
                      {monthlyReport}
                    </div>
                  )}
                </div>
              ) : monthlyReport ? (
                (() => {
                  const rpt = parseMonthlyReport(monthlyReport);
                  return (
                    <div className="flex flex-col gap-5 text-foreground/95 select-text">
                      <div className="relative p-4 rounded-xl bg-[#1E1C16]/40 border border-gold/15 italic text-center text-xs font-serif leading-relaxed text-gold/90">
                        “ {rpt.summary} ”
                      </div>

                      <div className="flex flex-col gap-1.5 pt-1">
                        <h4 className="text-xs text-gold font-serif tracking-wider font-semibold">
                          【水波之镜 ✦ 情绪水位分析】
                        </h4>
                        <p className="text-[11px] text-foreground/85 font-serif leading-relaxed tracking-wide whitespace-pre-line pl-1">
                          {rpt.emotionWater}
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5 pt-1">
                        <h4 className="text-xs text-gold font-serif tracking-wider font-semibold">
                          【镜像死角 ✦ 潜意识盲区】
                        </h4>
                        <p className="text-[11px] text-foreground/85 font-serif leading-relaxed tracking-wide whitespace-pre-line pl-1">
                          {rpt.subShadow}
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5 pt-1 border-t border-gold/10 pt-4">
                        <h4 className="text-xs text-gold font-serif tracking-wider font-semibold">
                          【灵性处方 ✦ 下期疗愈指引】
                        </h4>
                        <p className="text-[11px] text-foreground/85 font-serif leading-relaxed tracking-wide whitespace-pre-line pl-1">
                          {rpt.therapySoul}
                        </p>
                      </div>

                      <button
                        onClick={handleGenerateReport}
                        className="mx-auto mt-4 px-5 py-2.5 rounded-lg border border-gold/25 bg-gold/5 text-[10px] text-gold font-serif tracking-widest hover:bg-gold/10 transition-all duration-300 cursor-pointer shadow-gold-glow animate-[pulse_3s_infinite]"
                      >
                        ✦ 重新生成镜面报告 ✦
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div className="py-8 text-center flex flex-col items-center gap-4">
                  <p className="text-xs text-gold-muted/80 font-serif px-6 leading-relaxed">
                    大模型将整合您最近 30 天的情绪水位走势与高频星卡，为您撰写一份深层的潜意识分析信札，帮助您在深夜觉察自我、和解内耗。
                  </p>
                  
                  {reportError && (
                    <span className="text-[9px] text-red-400 font-mono max-w-xs break-all px-4">
                      {reportError}
                    </span>
                  )}

                  <button
                    onClick={handleGenerateReport}
                    className="px-6 py-3 rounded-xl border border-gold/25 bg-gold/5 text-[10px] text-gold font-serif font-bold tracking-widest hover:bg-gold/10 transition-all duration-300 cursor-pointer shadow-gold-glow animate-[pulse_2s_infinite]"
                  >
                    ✦ 生成本期 AI 镜面报告 ✦
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      <BottomNav />

      {/* 情绪快速打卡弹窗 */}
      <AnimatePresence>
        {showCheckInPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xs rounded-2xl border border-gold/25 bg-[#0F1118] p-5 shadow-gold-glow flex flex-col items-center gap-4 text-center"
            >
              <button
                onClick={() => setShowCheckInPicker(false)}
                className="absolute top-4.5 right-4.5 text-gold-muted/40 hover:text-gold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-10 h-10 rounded-full border border-gold/20 flex items-center justify-center text-gold shadow-gold-glow mt-1">
                <Heart className="w-4 h-4 text-gold" />
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-serif text-gold font-semibold tracking-widest">记录您当下的感受</h3>
                <p className="text-[10px] text-gold-muted/60 font-serif">选择一个主导您此时情绪的标签</p>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full mt-2">
                {moodList.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => handleCheckIn(mood)}
                    className="py-2.5 rounded-xl border border-gold/15 bg-[#0E1017]/55 hover:border-gold hover:text-gold text-xs font-serif text-gold-muted/80 tracking-widest cursor-pointer transition-all outline-none"
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
