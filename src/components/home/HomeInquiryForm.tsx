'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { questionTemplates, recommendSpreadForQuestion } from '@/hooks/useHomeReadingFlow';
import { moodConfigs } from '@/lib/tarot/moods';
import { spreads } from '@/lib/tarot/spreads';
import { SpreadType } from '@/lib/tarot/types';

interface HomeInquiryFormProps {
  question: string;
  onQuestionChange: (question: string) => void;
  selectedMood: string;
  onMoodChange: (mood: string) => void;
  selectedSpread: SpreadType;
  onSpreadChange: (spread: SpreadType) => void;
  customCardCount: number;
  customPositionNames: string[];
  error: string;
  isDream: boolean;
  onBack: () => void;
  onTemplateSelect: (template: string) => void;
  onCustomCardCountChange: (count: number) => void;
  onCustomPositionChange: (index: number, value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  recentMoodState?: 'shadow' | 'storm' | null;
}

const spreadOrder: SpreadType[] = [
  'three_cards',
  'mirror_cross',
  'one_card',
  'relationship',
  'career',
  'shadow',
  'choice',
  'custom',
];

const moodToneMap = {
  light: 'border-amber-400/70 bg-amber-300/10 text-amber-200',
  shadow: 'border-blue-400/70 bg-blue-300/10 text-blue-200',
  storm: 'border-purple-400/70 bg-purple-300/10 text-purple-200',
};

export default function HomeInquiryForm({
  question,
  onQuestionChange,
  selectedMood,
  onMoodChange,
  selectedSpread,
  onSpreadChange,
  customCardCount,
  customPositionNames,
  error,
  isDream,
  onBack,
  onTemplateSelect,
  onCustomCardCountChange,
  onCustomPositionChange,
  onSubmit,
  recentMoodState = null,
}: HomeInquiryFormProps) {
  const router = useRouter();
  const [showAllMoods, setShowAllMoods] = React.useState(false);
  const [showAllSpreads, setShowAllSpreads] = React.useState(false);
  const activeMood = moodConfigs.find((mood) => mood.id === selectedMood) || moodConfigs[0];
  const recommendedSpread = question.trim()
    ? recommendSpreadForQuestion(question, isDream)
    : 'three_cards';
  const recommendedSpreadName = spreads[recommendedSpread].name;

  // 常用情绪优先；其余可展开
  const primaryMoods = moodConfigs.filter((m) =>
    ['calm', 'anxious', 'confused', 'tired', 'joyful', 'tangled'].includes(m.id)
  );
  const visibleMoods = showAllMoods ? moodConfigs : primaryMoods;

  // 推荐 + 2 备选，其余收进「更多牌阵」
  const primarySpreads = React.useMemo(() => {
    const picks: SpreadType[] = [recommendedSpread];
    for (const t of spreadOrder) {
      if (!picks.includes(t) && picks.length < 3) picks.push(t);
    }
    return picks;
  }, [recommendedSpread]);
  const visibleSpreads = showAllSpreads ? spreadOrder : primarySpreads;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: 'easeOut' }}
      className="mx-auto w-full max-w-md px-6 pt-6 pb-10"
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-xs font-serif tracking-widest text-gold-muted/80 transition-colors duration-300 hover:text-gold"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        返回首页
      </button>

      <form onSubmit={onSubmit} className="flex flex-col gap-7">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gold-muted/55">
            Inquiry
          </p>
          <h2 className="mt-2 text-2xl font-serif font-semibold leading-tight tracking-normal text-gold">
            {isDream ? '记录一个梦' : '写下你想问的事'}
          </h2>
          <p className="mt-3 text-xs font-serif leading-6 tracking-wide text-foreground/68">
            一句话也可以。越接近真实处境，解读越有帮助。
          </p>
        </div>

        {recentMoodState && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-3.5 rounded-xl border border-gold/20 bg-[#16130E]/60 shadow-[inset_0_0_8px_rgba(201,167,106,0.1)] text-xs text-gold font-serif leading-relaxed tracking-wider"
          >
            <div className="flex gap-2.5 items-start">
              <span className="text-base leading-none">✦</span>
              <p className="flex-1 text-[11px] text-gold-muted/90 font-serif leading-5">
                {recentMoodState === 'storm' ? (
                  <>镜面觉察到你最近心潮起伏，承受着较强的情绪风暴。在提问前，要先去做一次『水之净化调息』吗？</>
                ) : (
                  <>镜面感知到你最近有些疲惫与内耗。在开始抽牌解读前，是否需要先做一次火之调息唤起直觉？</>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/zen')}
              className="text-[9px] font-semibold text-gold border border-gold/30 hover:border-gold/60 rounded px-2.5 py-1 flex-shrink-0 cursor-pointer ml-3 bg-transparent whitespace-nowrap"
            >
              前往调息
            </button>
          </motion.div>
        )}

        <div className="relative">
          <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar pr-6">
            {questionTemplates.map((template) => (
              <button
                key={template}
                type="button"
                onClick={() => onTemplateSelect(template)}
                className="shrink-0 rounded-full border border-gold/12 px-3 py-2 text-xs font-serif tracking-wide text-gold-muted transition-all duration-300 hover:border-gold/35 hover:text-gold"
              >
                {template}
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" aria-hidden />
          <p className="mt-1 text-[11px] font-serif text-gold-muted">← 左右滑动查看更多提问模板</p>
        </div>

        <div className="relative border-b border-gold/18 pb-3 focus-within:border-gold/45">
          <textarea
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
            placeholder={isDream ? '写下梦里的画面、情绪或冲突……' : '例如：我该如何面对这段关系里的不安？'}
            className="h-28 w-full resize-none bg-transparent pr-8 text-base font-serif leading-8 tracking-wide text-foreground/92 outline-none placeholder:text-gold-muted/35 no-scrollbar"
            maxLength={400}
          />
          <Sparkles className="absolute bottom-5 right-1 h-5 w-5 text-gold/35" />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 text-[10px] text-red-300"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.26em] text-gold-muted/50">Mood</p>
              <h3 className="mt-1 text-sm font-serif tracking-widest text-gold">此刻的感受</h3>
            </div>
            <p className="max-w-[150px] text-right text-[10px] font-serif leading-5 tracking-wide text-gold-muted/65">
              {activeMood.description}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {visibleMoods.map((mood) => {
              const isSelected = selectedMood === mood.id;
              return (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => onMoodChange(mood.id)}
                  className={`min-h-11 rounded-full border text-xs font-serif tracking-widest transition-all duration-300 ${
                    isSelected
                      ? moodToneMap[mood.category]
                      : 'border-gold/10 bg-transparent text-gold-muted hover:border-gold/28 hover:text-gold-muted'
                  }`}
                >
                  {mood.name}
                </button>
              );
            })}
          </div>
          {!showAllMoods && (
            <button
              type="button"
              onClick={() => setShowAllMoods(true)}
              className="self-start text-xs font-serif text-gold-muted underline-offset-2 hover:text-gold hover:underline"
            >
              展开全部情绪
            </button>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.26em] text-gold-muted">Spread</p>
              <h3 className="mt-1 text-sm font-serif tracking-widest text-gold">牌阵</h3>
            </div>
            {question.trim() && (
              <p className="max-w-[160px] text-right text-xs font-serif leading-5 text-gold-muted">
                推荐：{recommendedSpreadName}
              </p>
            )}
          </div>

          <div className="flex flex-col divide-y divide-gold/10 border-y border-gold/10">
            {visibleSpreads.map((type) => {
              const spread = spreads[type];
              const isSelected = selectedSpread === type;
              const positionText = spread.positions.length > 0 ? spread.positions.join(' / ') : '自由定义';

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onSpreadChange(type)}
                  className="grid min-h-[62px] grid-cols-[1fr_auto] items-center gap-4 py-3 text-left"
                >
                  <span>
                    <span className={`block text-sm font-serif font-semibold tracking-widest ${isSelected ? 'text-gold' : 'text-foreground/85'}`}>
                      {spread.name}
                      {type === recommendedSpread && question.trim() && (
                        <span className="ml-2 text-[10px] font-mono uppercase tracking-[0.18em] text-gold-muted">
                          推荐
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs font-serif tracking-wide text-gold-muted">
                      {positionText}
                    </span>
                  </span>
                  <span className={`h-2.5 w-2.5 rounded-full ${isSelected ? 'bg-gold shadow-[0_0_12px_rgba(201,167,106,0.8)]' : 'bg-gold/18'}`} />
                </button>
              );
            })}
          </div>
          {!showAllSpreads && (
            <button
              type="button"
              onClick={() => setShowAllSpreads(true)}
              className="self-start text-xs font-serif text-gold-muted underline-offset-2 hover:text-gold hover:underline"
            >
              更多牌阵
            </button>
          )}
        </section>

        {selectedSpread === 'custom' && (
          <motion.section
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 border-y border-gold/12 py-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-serif tracking-widest text-gold">自定义位置</span>
              <div className="flex gap-2">
                {[1, 2, 3].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => onCustomCardCountChange(count)}
                    className={`h-8 w-8 rounded-full border text-[11px] font-mono transition-all duration-300 ${
                      customCardCount === count
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-gold/12 text-gold-muted/60 hover:border-gold/35'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {Array.from({ length: customCardCount }).map((_, index) => (
                <label key={index} className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-serif tracking-widest text-gold-muted/55">
                    位置 {index + 1}
                  </span>
                  <input
                    type="text"
                    required
                    value={customPositionNames[index] || ''}
                    onChange={(event) => onCustomPositionChange(index, event.target.value)}
                    placeholder="例如：阻碍"
                    maxLength={6}
                    className="h-9 border-b border-gold/12 bg-transparent text-xs font-serif tracking-widest text-gold outline-none transition-colors duration-300 placeholder:text-gold-muted/30 focus:border-gold/45"
                  />
                </label>
              ))}
            </div>
          </motion.section>
        )}

        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          className="h-12 w-full rounded-full border border-gold/45 bg-gold/10 text-sm font-serif font-semibold tracking-[0.24em] text-gold shadow-gold-glow transition-all duration-300 hover:bg-gold/15 hover:border-gold"
        >
          抽牌并生成解读
        </motion.button>
      </form>
    </motion.section>
  );
}
