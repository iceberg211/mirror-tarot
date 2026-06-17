'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, AlertCircle, Moon, Book, X, ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import { spreads } from '@/lib/tarot/spreads';
import { SpreadType } from '@/lib/tarot/types';
import { getTodayMoonPhase, getMoonSvgPath } from '@/lib/tarot/moonPhase';
import { moodConfigs } from '@/lib/tarot/moods';
import { useAudio } from '@/hooks/useAudio';
import { 
  getLocalReadings, 
  updateActionSeedStatus, 
  getLocalDateString, 
  JournalEntry 
} from '@/lib/db/localJournal';

const questionTemplates = [
  '面对当前瓶颈，我忽略了什么？',
  '今日我最需要关照的情绪是什么？',
  '在这段亲密关系中，我的潜意识在投射什么？',
  '关于最近面临的选择，卡牌能给我什么心智启示？',
  '分析一下我最近面临的潜意识梦境隐喻。',
];

export default function HomePage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'none' | 'inquiry'>('none');
  const [question, setQuestion] = useState('');
  const [selectedMood, setSelectedMood] = useState('calm');
  const [selectedSpread, setSelectedSpread] = useState<SpreadType>('three_cards');
  const [customCardCount, setCustomCardCount] = useState<number>(3);
  const [customPositionNames, setCustomPositionNames] = useState<string[]>(['现状', '阻碍', '建议']);
  const { playBowl } = useAudio();
  const [showMoonModal, setShowMoonModal] = useState(false);
  const [error, setError] = useState('');
  const [isDream, setIsDream] = useState(false);

  // 昨日种子复盘状态
  const [pendingSeedEntry, setPendingSeedEntry] = useState<JournalEntry | null>(null);
  const [recapFeedback, setRecapFeedback] = useState<string>('');

  React.useEffect(() => {
    const readings = getLocalReadings();
    const todayStr = getLocalDateString();
    // 寻找昨日或更早创建的、且状态是 pending 状态的 actionSeed
    const found = readings.find(r => r.actionSeed && r.actionSeed.status === 'pending');
    if (found && found.actionSeed && found.actionSeed.date !== todayStr) {
      setPendingSeedEntry(found);
    }
  }, []);

  const handleRecapCheckIn = (status: 'completed' | 'failed' | 'dismissed') => {
    if (!pendingSeedEntry) return;
    updateActionSeedStatus(pendingSeedEntry.id, status);
    if (status === 'completed') {
      setRecapFeedback('✦ 棒极了！知行合一，自我觉察的种子已然开花。');
    } else if (status === 'failed') {
      setRecapFeedback('✦ 没关系，觉察即是疗愈。下一次，我们更温柔地对待自己。');
    } else {
      setRecapFeedback('✦ 顺应时机，不徐不疾。等待下一个萌芽的瞬间。');
    }
    
    // 延迟自动关闭
    setTimeout(() => {
      setPendingSeedEntry(null);
      setRecapFeedback('');
    }, 1800);
  };

  const moonPhase = getTodayMoonPhase();

  const handleMoonResonate = () => {
    playBowl();
    setShowMoonModal(true);
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setError('把您当下的困惑写下来，卡牌才能为您指明方向……');
      return;
    }
    setError('');
    
    // 携带参数跳转到抽牌交互页面
    const params = new URLSearchParams({
      question: question.trim(),
      mood: moodConfigs.find((m) => m.id === selectedMood)?.name || '平静',
      spreadType: selectedSpread,
    });

    if (isDream) {
      params.append('isDream', 'true');
    }
    
    if (selectedSpread === 'custom') {
      const validNames = customPositionNames.slice(0, customCardCount);
      if (validNames.some(name => !name.trim())) {
        setError('请为自定义牌阵的每个位置填写觉察视角。');
        return;
      }
      const positionsStr = validNames.map(n => n.trim()).join(',');
      params.append('customPositions', positionsStr);
    }
    
    router.push(`/reading/new?${params.toString()}`);
  };

  const handleDailyDraw = () => {
    setError('');
    const params = new URLSearchParams({
      question: '抽取今日运势与觉察指引。',
      mood: moodConfigs.find((m) => m.id === selectedMood)?.name || '平静',
      spreadType: 'one_card',
    });
    router.push(`/reading/new?${params.toString()}`);
  };

  return (
    <main className="flex-1 min-h-screen pb-24 flex flex-col justify-between items-center text-foreground relative overflow-y-auto">
      {/* 装饰星体 */}
      <div className="absolute top-12 left-10 w-24 h-24 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
      <div className="absolute top-48 right-12 w-36 h-36 rounded-full bg-[#1A1F35]/30 blur-3xl pointer-events-none" />

      {/* 顶部 Header / 二级词典入口 */}
      <div className="w-full max-w-md px-6 pt-6 flex justify-between items-center z-10">
        <div className="w-9 h-9" />
        <span className="text-[10px] font-mono tracking-[0.25em] text-gold-muted/65 uppercase">
          Mirror Tarot
        </span>
        <button
          type="button"
          onClick={() => router.push('/deck')}
          className="w-9 h-9 rounded-full border border-gold/15 bg-card/40 flex items-center justify-center text-gold/85 hover:border-gold/35 cursor-pointer transition-all duration-300 shadow-gold-glow"
          title="查阅牌义字典"
        >
          <Book className="w-4 h-4" />
        </button>
      </div>

      {/* 1. 顶部 Header / Brand */}
      <div className="w-full max-w-md px-6 pt-6 flex flex-col items-center text-center">
        {/* 顶部个人图标或精致Logo装饰 */}
        <div className="w-12 h-12 rounded-full border border-gold/35 flex items-center justify-center mb-6 shadow-gold-glow">
          <Moon className="w-5 h-5 text-gold animate-[pulse_3s_ease-in-out_infinite]" />
        </div>
        
        <h1 className="text-3xl font-serif tracking-widest text-gold font-bold filter drop-shadow-[0_0_10px_rgba(201,167,106,0.35)]">
          Mirror Tarot
        </h1>
        <p className="text-[11px] text-gold-muted/80 font-mono tracking-[0.2em] uppercase mt-2">
          Ask the card. Meet yourself.
        </p>
        <p className="text-xs text-gold/60 font-serif tracking-widest mt-2">
          问牌，也是问自己。
        </p>
      </div>

      {/* 今日月影星象指引 */}
      <div className="w-full max-w-md px-6 mt-4 mb-2">
        <div className="w-full p-4 rounded-2xl border border-gold/15 bg-[#0F1117]/60 flex items-center gap-4 shadow-gold-glow">
          <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#11131E] to-[#08090E] border border-gold/10 flex items-center justify-center relative overflow-hidden flex-shrink-0">
            <div className="absolute inset-1 rounded-full bg-gold/5 blur-[2px]" />
            <svg viewBox="0 0 100 100" className="w-8 h-8 text-gold/80 drop-shadow-[0_0_8px_rgba(201,167,106,0.5)]">
              <circle cx="50" cy="50" r="38" className="fill-[#1A1F30]/40 stroke-none" />
              <path
                d={getMoonSvgPath(moonPhase.iconType, moonPhase.percent)}
                className="fill-gold stroke-none"
              />
            </svg>
          </div>

          <div className="flex-grow flex flex-col gap-0.5">
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-gold-muted/70 font-mono tracking-widest uppercase">
                LUNAR SIGN ✦ {moonPhase.illustration}
              </span>
              <button
                type="button"
                onClick={handleMoonResonate}
                className="text-[8px] text-gold font-serif border border-gold/35 px-2 py-0.5 rounded-full bg-gold/5 cursor-pointer hover:bg-gold/10 hover:border-gold transition-all shadow-gold-glow flex items-center gap-0.5 outline-none select-none active:scale-95 duration-200"
              >
                <span>共鸣 ✦</span>
              </button>
            </div>
            <h3 className="text-xs font-serif text-gold font-semibold tracking-widest">
              {moonPhase.name}
            </h3>
            <p className="text-[9px] text-foreground/85 font-serif leading-relaxed tracking-wide mt-1">
              {moonPhase.advice}
            </p>
          </div>
        </div>
      </div>

      {/* Onboarding 三卡片组导航 */}
      {activeSection === 'none' && (
        <div className="w-full max-w-md px-6 flex flex-col gap-4 my-4">
          {/* 卡片一: 倾诉一宗心事 */}
          <div 
            onClick={() => {
              setActiveSection('inquiry');
              setIsDream(false);
              setQuestion('');
            }}
            className="p-5 rounded-2xl border border-gold/20 bg-gradient-to-r from-[#171510]/80 via-[#241F16]/80 to-[#171510]/80 shadow-gold-glow flex items-center justify-between hover:border-gold/40 transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-center gap-4 text-left">
              <div className="w-11 h-11 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
                <Book className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-serif text-gold font-bold tracking-widest">
                  ✦ 倾诉一宗心事
                </h3>
                <p className="text-[10px] text-gold-muted/65 font-serif tracking-wider mt-1">
                  展开问题表单，在情绪与牌阵中映射内心镜像
                </p>
              </div>
            </div>
            <span className="text-[10px] text-gold/80 font-serif tracking-widest border border-gold/20 px-3 py-1 rounded-xl bg-gold/5 whitespace-nowrap">
              展开 ➔
            </span>
          </div>

          {/* 卡片二: 每日一牌低语 */}
          <div 
            onClick={handleDailyDraw}
            className="p-5 rounded-2xl border border-gold/20 bg-gradient-to-r from-[#0E1220]/80 via-[#131930]/80 to-[#0E1220]/80 shadow-gold-glow flex items-center justify-between hover:border-gold/40 transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-center gap-4 text-left">
              <div className="w-11 h-11 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-serif text-gold font-bold tracking-widest">
                  ✦ 每日一牌低语
                </h3>
                <p className="text-[10px] text-gold-muted/65 font-serif tracking-wider mt-1">
                  今日潜意识能量的镜面折射，开启单牌觉察
                </p>
              </div>
            </div>
            <span className="text-[10px] text-gold/80 font-serif tracking-widest border border-gold/20 px-3 py-1 rounded-xl bg-gold/5 whitespace-nowrap">
              抽取 ➔
            </span>
          </div>

          {/* 卡片三: 记录昨晚梦境 */}
          <div 
            onClick={() => {
              setActiveSection('inquiry');
              setIsDream(true);
              setQuestion('昨晚我梦见了……');
            }}
            className="p-5 rounded-2xl border border-gold/20 bg-gradient-to-r from-[#170E20]/80 via-[#221330]/80 to-[#170E20]/80 shadow-gold-glow flex items-center justify-between hover:border-gold/40 transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-center gap-4 text-left">
              <div className="w-11 h-11 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-serif text-gold font-bold tracking-widest">
                  ✦ 记录昨晚梦境
                </h3>
                <p className="text-[10px] text-gold-muted/65 font-serif tracking-wider mt-1">
                  梦是通往潜意识的桥梁，进行深度梦境释义
                </p>
              </div>
            </div>
            <span className="text-[10px] text-gold/80 font-serif tracking-widest border border-gold/20 px-3 py-1 rounded-xl bg-gold/5 whitespace-nowrap">
              释梦 ➔
            </span>
          </div>
        </div>
      )}

      {/* 2. 主表单域 */}
      {activeSection === 'inquiry' && (
        <div className="w-full max-w-md px-6 flex flex-col gap-3 my-4">
          <button 
            type="button"
            onClick={() => {
              setActiveSection('none');
              setIsDream(false);
              setQuestion('');
              setError('');
            }}
            className="text-xs text-gold/75 font-serif tracking-widest hover:text-gold flex items-center gap-1.5 cursor-pointer bg-transparent border-none outline-none pb-2 self-start"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回 Onboarding 主干</span>
          </button>

          <form onSubmit={handleStart} className="w-full flex flex-col gap-6">
            {/* 问题输入卡片 */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center pl-1 pr-1">
                <label className="text-xs text-gold-muted font-serif tracking-widest">
                  {isDream ? '记录你的梦境' : '今天你想问什么？'}
                </label>
                <button
                  type="button"
                  onClick={handleDailyDraw}
                  className="text-[10px] text-gold font-serif tracking-widest hover:underline hover:text-gold/80 cursor-pointer"
                >
                  ✦ 今日一牌指引
                </button>
              </div>

              {/* 问题模板 Chips */}
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                  {questionTemplates.map((template, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setQuestion(template);
                        if (template.includes('梦境')) {
                          setIsDream(true);
                        } else {
                          setIsDream(false);
                        }
                      }}
                      className="text-[10px] text-gold-muted/90 hover:text-gold border border-gold/15 bg-card/30 hover:border-gold/35 rounded-full px-3 py-1 whitespace-nowrap transition-all duration-200 cursor-pointer"
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative rounded-2xl border border-gold/25 bg-card/60 p-4 shadow-gold-glow focus-within:border-gold-focus transition-all duration-300">
                <textarea
                  value={question}
                  onChange={(e) => {
                    setQuestion(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder={isDream ? "记录梦里的碎片、情绪或冲突……" : "把你现在的困惑写下来……"}
                  className="w-full h-24 bg-transparent outline-none border-none text-sm text-foreground/90 font-serif tracking-wide placeholder:text-gold-muted/40 resize-none no-scrollbar leading-relaxed"
                  maxLength={400}
                />
                {/* 右下角的水晶球点缀 */}
                <div className="absolute bottom-3 right-3 flex items-center justify-center text-gold/45">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
              </div>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-red-400 flex items-center gap-1.5 pl-1"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </div>

            {/* 情绪选择器 (横向滑动) */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center pl-1 pr-1">
                <label className="text-xs text-gold-muted font-serif tracking-widest">
                  你现在的感受是？
                </label>
                {(() => {
                  const active = moodConfigs.find((m) => m.id === selectedMood);
                  if (!active) return null;
                  const colorMap = {
                    light: 'text-amber-400/80',
                    shadow: 'text-blue-400/80',
                    storm: 'text-purple-400/80'
                  };
                  return (
                    <span className={`text-[9px] font-serif tracking-wider transition-colors duration-300 ${colorMap[active.category]}`}>
                      {active.category === 'light' ? '光芒 ✦ ' :
                       active.category === 'shadow' ? '阴影 ✦ ' : '风暴 ✦ '}{active.description}
                    </span>
                  );
                })()}
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 px-1">
                {moodConfigs.map((mood) => {
                  const isSelected = selectedMood === mood.id;
                  
                  // 不同的情绪类别赋予不同的边框/背景色，提供色彩映射
                  const colorClasses = 
                    mood.category === 'light' 
                      ? (isSelected ? 'border-amber-400 text-amber-400 bg-amber-950/20 shadow-[0_0_12px_rgba(251,191,36,0.25)]' : 'border-gold/15 text-gold-muted/70 bg-[#0E1017]/40 hover:border-amber-400/40')
                      : mood.category === 'shadow'
                      ? (isSelected ? 'border-blue-400 text-blue-400 bg-blue-950/20 shadow-[0_0_12px_rgba(96,165,250,0.25)]' : 'border-gold/15 text-gold-muted/70 bg-[#0E1017]/40 hover:border-blue-400/40')
                      : (isSelected ? 'border-purple-400 text-purple-400 bg-purple-950/20 shadow-[0_0_12px_rgba(192,132,252,0.25)]' : 'border-gold/15 text-gold-muted/70 bg-[#0E1017]/40 hover:border-purple-400/40');

                  return (
                    <button
                      key={mood.id}
                      type="button"
                      onClick={() => setSelectedMood(mood.id)}
                      className="flex flex-col items-center gap-2 cursor-pointer outline-none select-none flex-shrink-0"
                    >
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center border text-xs font-serif font-medium transition-all duration-300 ${colorClasses} ${
                          isSelected ? 'scale-105' : ''
                        }`}
                      >
                        {mood.label}
                      </div>
                      <span
                        className={`text-[10px] tracking-wider font-serif ${
                          isSelected ? 'text-gold font-medium' : 'text-gold-muted/65'
                        }`}
                      >
                        {mood.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 牌阵选择器 */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gold-muted font-serif tracking-widest pl-1">
                选择牌阵
              </label>
              <div className="grid grid-cols-2 gap-3.5">
                {(Object.keys(spreads) as SpreadType[]).map((type) => {
                  const spread = spreads[type];
                  const isSelected = selectedSpread === type;

                  // 构建精巧的简易排布图占位符
                  const slotCount = spread.positions.length;
                  const slotsArray = Array.from({ length: slotCount });

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedSpread(type)}
                      className={`relative rounded-xl p-3 text-left border flex flex-col justify-between transition-all duration-300 cursor-pointer outline-none min-h-[105px] ${
                        isSelected
                          ? 'border-gold bg-[#151720]/75 shadow-gold-glow'
                          : 'border-gold/15 bg-[#0F1118]/50 hover:border-gold/30 hover:bg-[#12141D]/60'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span
                          className={`text-xs font-serif font-semibold tracking-wider ${
                            isSelected ? 'text-gold' : 'text-foreground/80'
                          }`}
                        >
                          {spread.name}
                        </span>
                        <span className="text-[9px] text-gold-muted/60 font-serif tracking-widest mt-0.5">
                          {spread.positions.join(' / ')}
                        </span>
                      </div>

                      {/* 牌阵迷你卡牌槽位排布图 */}
                      <div className="flex gap-1 mt-3.5">
                        {slotsArray.map((_, i) => (
                          <div
                            key={i}
                            className={`w-3.5 h-6 rounded-sm border ${
                              isSelected ? 'border-gold/50 bg-gold/5' : 'border-gold/20 bg-transparent'
                            }`}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 自定义牌阵配置面板 */}
            {selectedSpread === 'custom' && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex flex-col gap-3.5 p-4 rounded-xl border border-gold/20 bg-[#12141D]/50 shadow-gold-glow mt-1"
              >
                <div className="flex justify-between items-center border-b border-gold/10 pb-2 text-[10px] text-gold font-serif font-bold tracking-widest uppercase">
                  <span>✦ 配置您的自定义牌阵 ✦</span>
                  <span className="text-[8px] text-gold-muted/60 font-mono">Custom Spreads</span>
                </div>
                
                <div className="flex gap-4 items-center">
                  <span className="text-[10px] text-gold-muted/70 font-serif tracking-wider">设定卡牌张数：</span>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setCustomCardCount(num);
                          const nextNames = [...customPositionNames];
                          if (nextNames.length < num) {
                            for (let k = nextNames.length; k < num; k++) {
                              nextNames.push(k === 1 ? '阻碍' : k === 2 ? '建议' : '视角');
                            }
                          }
                          setCustomPositionNames(nextNames.slice(0, num));
                        }}
                        className={`w-7 h-7 rounded border text-[11px] font-mono transition-all duration-300 cursor-pointer ${
                          customCardCount === num
                            ? 'border-gold text-gold bg-gold/10 shadow-[0_0_8px_rgba(201,167,106,0.3)]'
                            : 'border-gold/15 text-gold-muted/50 hover:border-gold/35'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 mt-1">
                  {Array.from({ length: customCardCount }).map((_, idx) => (
                    <div key={idx} className="flex flex-col gap-1.5">
                      <span className="text-[9px] text-gold-muted/60 font-serif tracking-widest">
                        位置 {idx + 1} 觉察视角名称 (如: 我的现状 / 他的潜意识)
                      </span>
                      <input
                        type="text"
                        required
                        value={customPositionNames[idx] || ''}
                        onChange={(e) => {
                          const newNames = [...customPositionNames];
                          newNames[idx] = e.target.value;
                          setCustomPositionNames(newNames);
                        }}
                        placeholder={`输入位置 ${idx + 1} 觉察名，不超过6字`}
                        maxLength={6}
                        className="w-full bg-[#11131A] border border-gold/15 rounded-lg py-1.5 px-3 text-xs text-gold outline-none focus:border-gold/45"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 触发抽牌按钮 */}
            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              className="w-full h-12 rounded-xl mt-4 bg-gradient-to-r from-[#171610] via-[#2E281C] to-[#171610] border border-gold text-gold text-sm font-serif font-semibold tracking-[0.25em] shadow-gold-glow flex items-center justify-center cursor-pointer transition-all hover:brightness-110"
            >
              ✦ 开始抽牌 ✦
            </motion.button>
          </form>
        </div>
      )}

      {/* 底部版权及描述声明 */}
      <div className="w-full max-w-md px-6 text-center text-[9px] text-gold-muted/40 font-mono tracking-widest my-4">
        MIRROR TAROT IS A SELF-EXPLORATION COMPANION
      </div>

      {/* 月光能量共鸣的微型弹窗 UI */}
      {showMoonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05060A]/85 backdrop-blur-md p-4 select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-xs rounded-2xl border border-gold/25 bg-[#0F1118] p-5 shadow-gold-glow flex flex-col items-center gap-4 text-center"
          >
            <button
              onClick={() => setShowMoonModal(false)}
              className="absolute top-4.5 right-4.5 text-gold-muted/40 hover:text-gold cursor-pointer bg-transparent border-none"
            >
              <X className="w-4 h-4" />
            </button>
            <Moon className="w-8 h-8 text-gold animate-pulse mt-1" />
            <h3 className="text-sm font-serif text-gold font-semibold tracking-widest">{moonPhase.name} ✦ 共鸣</h3>
            <p className="text-[10px] text-foreground/80 font-serif leading-relaxed tracking-wider px-2">
              {moonPhase.percent < 20 ? '新月微弱，潜意识暗影易泛起。适宜在今日进行「自我与阴影」或「梦境映射」觉察。' :
               moonPhase.percent < 80 ? '弦月流光，理智与本能寻找交汇。适宜在今日进行「二选一抉择」牌阵，理清现实阻碍。' :
               '满月如盘，潜意识场能量饱满。火元素直觉充沛，适合以「每日低语」或「镜面十字」进行深度心灵探索。'}
            </p>
            <button
              onClick={() => setShowMoonModal(false)}
              className="px-5 py-1.5 rounded-lg border border-gold/20 bg-gold/5 text-[9px] text-gold font-serif tracking-widest"
            >
              确定
            </button>
          </motion.div>
        </div>
      )}

      {/* 昨日行动复盘打卡 YesterdaySeedRecap */}
      {pendingSeedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05060A]/85 backdrop-blur-md p-4 select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-sm rounded-2xl border border-gold/25 bg-[#0F1118] p-6 shadow-gold-glow flex flex-col gap-4 text-center"
          >
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="w-6 h-6 text-gold animate-pulse" />
              <h3 className="text-sm font-serif text-gold font-bold tracking-widest">
                ✦ 昨日星轨回响 ✦
              </h3>
              <p className="text-[10px] text-gold-muted/50 font-mono tracking-widest uppercase">
                YESTERDAY'S SEED RECAP
              </p>
            </div>
            
            <div className="p-4 rounded-xl border border-gold/10 bg-card/30 my-1 text-left">
              <p className="text-[9px] text-gold-muted/60 font-serif tracking-widest mb-1.5">
                昨日行动指引首言：
              </p>
              <p className="text-xs text-foreground/90 font-serif leading-relaxed tracking-wider">
                “{pendingSeedEntry.actionSeed?.seedText}”
              </p>
            </div>

            {recapFeedback ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-gold font-serif py-4 px-2"
              >
                {recapFeedback}
              </motion.div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-gold/75 font-serif tracking-wide">
                  昨日的觉察，化作行动了吗？
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleRecapCheckIn('completed')}
                    className="py-2 rounded-lg border border-gold bg-gold/10 hover:bg-gold/20 text-xs text-gold font-serif tracking-wider transition-all duration-200 cursor-pointer active:scale-95"
                  >
                    我做到了
                  </button>
                  <button
                    onClick={() => handleRecapCheckIn('failed')}
                    className="py-2 rounded-lg border border-gold/20 bg-transparent hover:border-gold/40 text-xs text-gold-muted font-serif tracking-wider transition-all duration-200 cursor-pointer active:scale-95"
                  >
                    没做到
                  </button>
                  <button
                    onClick={() => handleRecapCheckIn('dismissed')}
                    className="py-2 rounded-lg border border-gold/15 bg-transparent hover:border-gold/30 text-xs text-gold-muted/60 font-serif tracking-wider transition-all duration-200 cursor-pointer active:scale-95"
                  >
                    待时机
                  </button>
                </div>
              </div>
            )}
            
            {!recapFeedback && (
              <button
                onClick={() => setPendingSeedEntry(null)}
                className="text-[10px] text-gold-muted/40 hover:text-gold-muted/80 underline cursor-pointer mt-1 bg-transparent border-none"
              >
                稍后复盘
              </button>
            )}
          </motion.div>
        </div>
      )}

      {/* 全局底部导航 */}
      <BottomNav />
    </main>
  );
}
