'use client';

import React from 'react';
import { CheckInEntry, JournalAnalytics, JournalEntry } from '@/lib/db/localJournal';
import { moodConfigs } from '@/lib/tarot/moods';
import { CloudSun, CloudRain, CloudLightning, Sun, Cloud } from 'lucide-react';

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
  analytics: JournalAnalytics | null;
  checkins: CheckInEntry[];
  entries: JournalEntry[];
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
  const mindWeather = React.useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const moodCounts = { light: 0, shadow: 0, storm: 0 };
    let totalCount = 0;
    
    checkins.forEach((c) => {
      const t = new Date(c.date).getTime();
      if (t >= thirtyDaysAgo) {
        const moodConfig = moodConfigs.find((m) => m.name === c.mood);
        if (moodConfig) {
          moodCounts[moodConfig.category]++;
          totalCount++;
        }
      }
    });
    
    entries.forEach((e) => {
      const t = new Date(e.createdAt).getTime();
      if (t >= thirtyDaysAgo) {
        const moodConfig = moodConfigs.find((m) => m.name === e.mood);
        if (moodConfig) {
          moodCounts[moodConfig.category]++;
          totalCount++;
        }
      }
    });
    
    if (totalCount === 0) {
      return {
        title: '云迷雾锁 ✦ 数据积累中',
        description: '潜意识数据积累中。在 300 天内打卡情绪或开启塔罗日记，即可揭示心灵天气图景。',
        advice: '建议今日开启一次「每日镜面低语」或进行一次身心调息。',
        themeColor: 'text-gold-muted/60',
        bgGlow: 'rgba(201, 167, 106, 0.05)',
        icon: Cloud
      };
    }
    
    const lightPct = (moodCounts.light / totalCount) * 100;
    const shadowPct = (moodCounts.shadow / totalCount) * 100;
    const stormPct = (moodCounts.storm / totalCount) * 100;
    
    let title = '';
    let description = '';
    let advice = '';
    let themeColor = 'text-gold';
    let bgGlow = 'rgba(201, 167, 106, 0.1)';
    let icon = CloudSun;
    
    if (stormPct >= 40) {
      title = '风暴聚顶 ✦ 情绪激荡';
      description = `过去 30 天内，您的心灵天空被风暴元素占领（占比 ${Math.round(stormPct)}%）。这象征着近期心智中存在较强的执念、焦虑或愤怒情绪，心灵张力较大。`;
      advice = '适宜减少重大脑力决策，配合进行「风元素·理性悬浮」调息冥想以给理智降温。';
      themeColor = 'text-purple-400';
      bgGlow = 'rgba(192, 132, 252, 0.15)';
      icon = CloudLightning;
    } else if (shadowPct >= 50) {
      title = '微雨覆镜 ✦ 潜流漫过';
      description = `过去 30 天内，您的心智多处于阴影与敏感区间（占比 ${Math.round(shadowPct)}%）。内心体验细腻深邃，但也伴随着微弱的倦怠感或消极沉溺。`;
      advice = '适合在今日进行「自我与阴影」牌阵，亦可多通过「水元素·情绪净化」调息将抗拒转化为流动的自愈力。';
      themeColor = 'text-blue-400';
      bgGlow = 'rgba(96, 165, 250, 0.15)';
      icon = CloudRain;
    } else if (lightPct >= 50) {
      title = '金光照临 ✦ 晴空万里';
      description = `本月您的潜意识能量饱满明亮，光芒能量占比达 ${Math.round(lightPct)}%。内心秩序井然，行动力与直觉高涨。`;
      advice = '此时正是以「火元素·直觉唤醒」借势而上的好时机，可以尝试挑战此前犹豫不决的事情。';
      themeColor = 'text-amber-400';
      bgGlow = 'rgba(251, 191, 36, 0.15)';
      icon = Sun;
    } else {
      title = '薄雾破晓 ✦ 阴晴相宜';
      description = `您的潜意识处于光芒（${Math.round(lightPct)}%）、阴影（${Math.round(shadowPct)}%）与风暴（${Math.round(stormPct)}%）的动态均衡之中。内心如雨后薄雾，理智与情感正在寻找平衡。`;
      advice = '适宜进行「二选一抉择」牌阵，理清潜意识中的细微冲突，稳固当下重心。';
      themeColor = 'text-gold';
      bgGlow = 'rgba(201, 167, 106, 0.1)';
      icon = CloudSun;
    }
    
    return { title, description, advice, themeColor, bgGlow, icon };
  }, [checkins, entries]);

  if (!analytics) return null;

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn pb-12 mt-2">
      {/* 本月心灵天气晴雨表 */}
      {(() => {
        const weather = mindWeather;
        const WeatherIcon = weather.icon;
        return (
          <div
            style={{
              background: `radial-gradient(circle at 90% 10%, ${weather.bgGlow}, transparent 55%), #0F1117`
            }}
            className="w-full p-4.5 rounded-xl border border-gold/15 bg-[#0F1117]/60 flex gap-4 items-start shadow-gold-glow animate-fadeIn"
          >
            <div className={`w-12 h-12 rounded-full border border-gold/15 flex items-center justify-center flex-shrink-0 bg-card/40 ${weather.themeColor} shadow-gold-glow`}>
              <WeatherIcon className="w-6 h-6 animate-[pulse_3s_infinite]" />
            </div>
            
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <div className="flex justify-between items-center border-b border-gold/10 pb-1.5">
                <span className={`text-xs font-serif font-bold tracking-widest ${weather.themeColor}`}>
                  {weather.title}
                </span>
                <span className="text-[8px] text-gold-muted/50 font-mono tracking-widest uppercase">
                  MIND WEATHER
                </span>
              </div>
              <p className="text-[10px] text-foreground/85 font-serif leading-relaxed tracking-wide font-medium">
                {weather.description}
              </p>
              <div className="text-[9px] text-gold-muted/80 font-serif leading-relaxed tracking-wider italic border-t border-gold/5 pt-1.5 mt-0.5">
                <span className="text-gold not-italic font-bold">✦ 建议：</span>{weather.advice}
              </div>
            </div>
          </div>
        );
      })()}
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
                const points = trend.map((point, idx) => {
                  const x = 30 + (idx * 350) / (trend.length - 1 || 1);
                  const y = 130 - ((point.score - 1) * 100) / 3;
                  return { x, y, ...point };
                });

                const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
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
                    {points.map((p, i) => (
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

      {/* 潜意识能量雷达 (NEW P1) */}
      <div className="w-full p-4 rounded-xl border border-gold/15 bg-[#0F1117]/60 flex flex-col gap-3 shadow-gold-glow animate-fadeIn">
        <div className="flex justify-between items-center border-b border-gold/10 pb-2 text-[10px] text-gold font-serif font-bold tracking-widest uppercase">
          <span>潜意识能量雷达 ✦ Element Radar</span>
          <span className="text-[8px] text-gold-muted/60 font-mono">30 DAYS Energy</span>
        </div>

        {(() => {
          const props = analytics.elementProportions;
          const total = props.water + props.fire + props.wind + props.earth;
          if (total === 0) {
            return (
              <div className="h-44 flex items-center justify-center text-[10px] text-gold-muted/50 font-serif">
                数据积累中，记录至少 1 篇情绪日记以绘制雷达图...
              </div>
            );
          }

          // 中心 cx=200, cy=130, maxR=80
          const cx = 200;
          const cy = 130;
          const maxR = 80;

          // 计算顶点
          const py_water = cy - (props.water / 100) * maxR;
          const px_fire  = cx + (props.fire / 100) * maxR;
          const py_wind  = cy + (props.wind / 100) * maxR;
          const px_earth = cx - (props.earth / 100) * maxR;

          // 判定主导元素
          const maxEntry = Object.entries(props).sort((a, b) => b[1] - a[1])[0];
          const maxElement = maxEntry[0] as 'water' | 'fire' | 'wind' | 'earth';
          
          const adviceMap = {
            water: '本月您的水元素（情绪/感知）比例偏高。这表明您情感体验细腻，但也更容易陷入情绪内耗或过度敏感，建议适时通过镜面冥想平复心流。',
            fire: '本月您的火元素（行动/直觉）主导了心智。这意味着您当前行动力很强，渴望寻求突破；但需警惕浮躁与冲动，注意劳逸结合。',
            wind: '本月您的风元素（心智/理性）比例过重。这往往意味着您正处于高强度的脑力决策或精神紧绷状态，容易过度思考，建议多落地感知当下。',
            earth: '本月您的土元素（物质/现实）能量沉稳。这象征着您当前关注点集中在工作、生活秩序等现实基础；但注意提防因过度务实而显得沉闷。'
          };

          return (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <svg viewBox="0 0 400 250" className="w-full h-auto">
                  <defs>
                    <linearGradient id="radarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-gold, #C9A76A)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="var(--color-gold, #C9A76A)" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>

                  {/* 背景多边形环 (R = 26, 53, 80) */}
                  {[26, 53, 80].map((r, idx) => (
                    <polygon
                      key={idx}
                      points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
                      fill="none"
                      stroke="rgba(201, 167, 106, 0.08)"
                      strokeWidth="0.8"
                    />
                  ))}

                  {/* 轴线 */}
                  <line x1={cx} y1={cy - 85} x2={cx} y2={cy + 85} stroke="rgba(201, 167, 106, 0.08)" strokeWidth="0.8" />
                  <line x1={cx - 100} y1={cy} x2={cx + 100} y2={cy} stroke="rgba(201, 167, 106, 0.08)" strokeWidth="0.8" />

                  {/* 用户能量分布多边形 */}
                  <polygon
                    points={`${cx},${py_water} ${px_fire},${cy} ${cx},${py_wind} ${px_earth},${cy}`}
                    fill="url(#radarGrad)"
                    stroke="#C9A76A"
                    strokeWidth="1.5"
                    className="drop-shadow-[0_0_5px_rgba(201,167,106,0.3)]"
                  />

                  {/* 顶点控制圆点 */}
                  <circle cx={cx} cy={py_water} r="3" className="fill-[#0F1117] stroke-gold stroke-[1.5]" />
                  <circle cx={px_fire} cy={cy} r="3" className="fill-[#0F1117] stroke-gold stroke-[1.5]" />
                  <circle cx={cx} cy={py_wind} r="3" className="fill-[#0F1117] stroke-gold stroke-[1.5]" />
                  <circle cx={px_earth} cy={cy} r="3" className="fill-[#0F1117] stroke-gold stroke-[1.5]" />

                  {/* 标签刻度文本 */}
                  <text x={cx} y={cy - 90} className="fill-gold/90 font-serif text-[9px] text-center" textAnchor="middle">水 (情感/感知) {props.water}%</text>
                  <text x={cx + 92} y={cy + 3} className="fill-gold/90 font-serif text-[9px] text-left" textAnchor="start">火 (行动/直觉) {props.fire}%</text>
                  <text x={cx} y={cy + 96} className="fill-gold/90 font-serif text-[9px] text-center" textAnchor="middle">风 (理智/思想) {props.wind}%</text>
                  <text x={cx - 92} y={cy + 3} className="fill-gold/90 font-serif text-[9px] text-right" textAnchor="end">土 (现实/物质) {props.earth}%</text>
                </svg>
              </div>

              {/* 元素分析解说 */}
              <p className="text-[10px] text-gold-muted/80 font-serif leading-relaxed tracking-wide px-2 border-t border-gold/5 pt-3">
                <span className="text-gold font-semibold">✦ 潜意识状态解读：</span>
                {adviceMap[maxElement]}
              </p>
            </div>
          );
        })()}
      </div>

      {/* 潜意识人格原型 (NEW P1) */}
      {analytics.dominantArchetype && (
        <div className="w-full p-4 rounded-xl border border-gold/15 bg-[#0F1117]/60 flex flex-col gap-3 shadow-gold-glow animate-fadeIn">
          <div className="flex justify-between items-center border-b border-gold/10 pb-2 text-[10px] text-gold font-serif font-bold tracking-widest uppercase">
            <span>潜意识人格原型 ✦ Subconscious Archetype</span>
            <span className="text-[8px] text-gold-muted/60 font-mono">30 DAYS Archetype</span>
          </div>

          <div className="flex gap-4 items-center p-1">
            <div className="w-14 h-24 rounded-lg overflow-hidden border border-gold/25 relative shadow-gold-glow flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={analytics.dominantArchetype.image} alt={analytics.dominantArchetype.zhName} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-serif text-gold font-semibold tracking-widest">
                ✦ {analytics.dominantArchetype.zhName} ✦ {analytics.dominantArchetype.name.toUpperCase()}
              </span>
              <p className="text-[10px] text-foreground/80 font-serif leading-relaxed tracking-wide font-medium">
                {analytics.dominantArchetype.description}
              </p>
            </div>
          </div>
        </div>
      )}

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
              {analytics.topCards.map((tc) => (
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
