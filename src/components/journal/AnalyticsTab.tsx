'use client';

import React from 'react';

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

interface AnalyticsTabProps {
  analytics: any;
  checkins: any[];
  entries: any[];
  monthlyReport: string;
  generatingReport: boolean;
  reportError: string | null;
  onGenerateReport: () => void;
}

export default function AnalyticsTab({
  analytics,
  checkins,
  entries,
  monthlyReport,
  generatingReport,
  reportError,
  onGenerateReport
}: AnalyticsTabProps) {
  if (!analytics) return null;

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn pb-12 mt-2">
      {/* 情绪波动图表 */}
      <div className="w-full p-4 rounded-xl border border-gold/15 bg-[#0F1117]/60 flex flex-col gap-3 shadow-gold-glow">
        <div className="flex justify-between items-center border-b border-gold/10 pb-2 text-[10px] text-gold font-serif font-bold tracking-widest uppercase">
          <span>情绪起伏水位线 ✦ Mood Trend</span>
          <span className="text-[8px] text-gold-muted/60 font-mono">
            {checkins.length + entries.length} RECORDINGS
          </span>
        </div>
        
        {analytics.moodTrend.length < 2 ? (
          <div className="h-32 flex items-center justify-center text-[10px] text-gold-muted/50 font-serif">
            数据积累中，记录至少 2 篇日记后绘制趋势曲线...
          </div>
        ) : (
          <div className="relative pt-2">
            <svg viewBox="0 0 400 150" className="w-full h-auto">
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-gold, #C9A76A)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--color-gold, #C9A76A)" stopOpacity="0.0" />
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
                      stroke="#C9A76A"
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
                        <title>{`${p.date}: ${p.mood}`}</title>
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
              提示：过去 30 天内这几张卡牌被频繁唤起，代表了您当前最核心的潜意识诉求或正面临着的重要心智课题。
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
              正在梳理您最近 30 天的心智水流...
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
                  <p className="text-[11px] text-foreground/85 font-serif leading-relaxed tracking-wide whitespace-pre-line pl-1 font-medium">
                    {rpt.emotionWater}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <h4 className="text-xs text-gold font-serif tracking-wider font-semibold">
                    【镜像死角 ✦ 潜意识盲区】
                  </h4>
                  <p className="text-[11px] text-foreground/85 font-serif leading-relaxed tracking-wide whitespace-pre-line pl-1 font-medium">
                    {rpt.subShadow}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 pt-1 border-t border-gold/10 pt-4">
                  <h4 className="text-xs text-gold font-serif tracking-wider font-semibold">
                    【灵性处方 ✦ 下期疗愈指引】
                  </h4>
                  <p className="text-[11px] text-foreground/85 font-serif leading-relaxed tracking-wide whitespace-pre-line pl-1 font-medium">
                    {rpt.therapySoul}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onGenerateReport}
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
              type="button"
              onClick={onGenerateReport}
              className="px-6 py-3 rounded-xl border border-gold/25 bg-gold/5 text-[10px] text-gold font-serif font-bold tracking-widest hover:bg-gold/10 transition-all duration-300 cursor-pointer shadow-gold-glow animate-[pulse_2s_infinite]"
            >
              ✦ 生成本期 AI 镜面报告 ✦
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
