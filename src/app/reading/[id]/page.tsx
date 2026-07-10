'use client';

import React, { Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Trash2, Star, ShieldCheck } from 'lucide-react';
import ReadingResult from '@/components/tarot/ReadingResult';
import { getSpreadByType } from '@/lib/tarot/spreads';
import SharePoster from '@/components/tarot/SharePoster';
import BreathingZen from '@/components/tarot/BreathingZen';
import { useReadingDetail } from '@/hooks/useReadingDetail';
import ConstellationLayout from '@/components/tarot/ConstellationLayout';
import ReadingChatSection from '@/components/tarot/ReadingChatSection';
import { useAuth } from '@/hooks/useAuth';
import { saveLocalOnboardingState } from '@/lib/product/onboarding';
import ReadingSummaryCard from '@/components/tarot/ReadingSummaryCard';
import ReadingStatusAlert from '@/components/tarot/ReadingStatusAlert';

function ReadingDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { status, openAuthModal } = useAuth();
  
  const id = params.id as string;
  const trigger = searchParams.get('trigger') === 'true';

  const {
    entry,
    loading,
    generating,
    readingError,
    showZen,
    setShowZen,
    activeElement,
    chatInput,
    setChatInput,
    showShare,
    setShowShare,
    chatMessages,
    chatLoading,
    chatEndRef,
    handleDelete,
    handleRegenerate,
    handleSendFollowUp,
    handleToggleStar,
    isStarred,
    parsedReading,
    activeFocusIndex,
    formattedDate,
    isReadingEmpty,
    defaultSuggestions
  } = useReadingDetail(id, trigger);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090F] flex items-center justify-center text-gold/50 font-serif text-sm animate-pulse">
        ✦ 加载中 ✦
      </div>
    );
  }

  if (!entry || !parsedReading) {
    return (
      <main className="min-h-screen bg-[#07090F] flex flex-col items-center justify-center text-center p-6 text-foreground">
        <p className="text-sm text-gold-muted/80 font-serif mb-4">抱歉，未找到该篇情绪日记记录</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2 border border-gold/45 text-gold font-serif rounded-lg text-xs hover:bg-gold/5 transition-all"
        >
          返回首页
        </button>
      </main>
    );
  }

  const spread = getSpreadByType(entry.spreadType);

  // 元素底色映射
  const elementMainBgs = {
    water: 'bg-[#050912]',
    fire: 'bg-[#0C0604]',
    wind: 'bg-[#07090C]',
    earth: 'bg-[#040805]',
  };

  return (
    <main className={`flex-grow min-h-screen pb-10 flex flex-col items-center text-foreground relative overflow-y-auto transition-colors duration-1000 ${
      activeElement ? elementMainBgs[activeElement] : 'bg-[#07090F]'
    }`}>
      {/* 四元素专属能量场背景发光圈 */}
      <div className={`absolute inset-0 pointer-events-none transition-all duration-[1500ms] z-0 ${
        activeElement === 'water' ? 'bg-radial-gradient from-blue-950/15 via-transparent to-transparent shadow-[inset_0_0_80px_rgba(29,78,216,0.06)]' :
        activeElement === 'fire' ? 'bg-radial-gradient from-amber-950/15 via-transparent to-transparent shadow-[inset_0_0_80px_rgba(217,119,6,0.06)]' :
        activeElement === 'wind' ? 'bg-radial-gradient from-slate-900/15 via-transparent to-transparent shadow-[inset_0_0_80px_rgba(100,116,139,0.06)]' :
        activeElement === 'earth' ? 'bg-radial-gradient from-emerald-950/15 via-transparent to-transparent shadow-[inset_0_0_80px_rgba(16,185,129,0.06)]' :
        'bg-radial-gradient from-gold/5 via-transparent to-transparent'
      }`} />
      
      {/* 顶部 Header */}
      <div className="w-full max-w-md px-6 pt-6 flex justify-between items-center z-10">
        <button
          type="button"
          onClick={() => router.push('/journal')}
          aria-label="返回日记列表"
          className="min-h-11 min-w-11 rounded-full border border-gold/15 bg-card/40 flex items-center justify-center text-gold/80 hover:border-gold/35 cursor-pointer transition-all duration-300"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
        </button>
        <span className="text-xs font-serif text-gold-muted/80 tracking-widest">
          日记详情
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleToggleStar}
            className={`min-h-11 min-w-11 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-300 ${
              isStarred
                ? 'border-gold bg-gold/10 text-gold shadow-gold-glow'
                : 'border-gold/15 bg-card/40 text-gold-muted/50 hover:border-gold/35 hover:text-gold'
            }`}
            title={isStarred ? '取消收藏' : '收藏本篇'}
            aria-label={isStarred ? '取消收藏' : '收藏本篇'}
            aria-pressed={isStarred}
          >
            <Star className={`w-4 h-4 ${isStarred ? 'fill-gold' : ''}`} aria-hidden />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            aria-label="删除本篇日记"
            className="min-h-11 min-w-11 rounded-full border border-red-950/20 bg-red-950/5 flex items-center justify-center text-red-400/80 hover:border-red-900/40 hover:bg-red-950/25 cursor-pointer transition-all duration-300"
          >
            <Trash2 className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="w-full max-w-md px-6 flex-1 flex flex-col justify-start items-center my-4 z-10">
        
        {/* 问题、情绪和时间摘要 */}
        <ReadingSummaryCard
          formattedDate={formattedDate}
          spreadName={spread?.name}
          mood={entry.mood}
          question={entry.question}
        />

        {/* 2D 几何空间星图牌阵排布与能量有向流光连线 */}
        <ConstellationLayout
          spreadType={entry.spreadType}
          cards={entry.cards}
          activeFocusIndex={activeFocusIndex}
        />

        {/* AI 解读结果 */}
        <ReadingResult
          parsedReading={parsedReading}
          cards={entry.cards}
          generating={generating}
          activeFocusIndex={activeFocusIndex}
        />

        {/* AI 解读状态警告与重试 */}
        <ReadingStatusAlert
          generating={generating}
          readingError={readingError}
          isReadingEmpty={isReadingEmpty}
          onRegenerate={() => handleRegenerate()}
        />

        {/* 生成海报与冥想按钮 */}
        {!generating && !isReadingEmpty && (
          <div className="w-full flex justify-center gap-3 mb-6">
            <button
              onClick={() => setShowShare(true)}
              className="px-4 py-2 rounded-lg border border-gold/25 bg-gold/5 text-[10px] text-gold font-serif tracking-widest hover:bg-gold/10 transition-all cursor-pointer shadow-gold-glow"
            >
              ✦ 生成分享金句海报 ✦
            </button>
            <button
              onClick={() => setShowZen(true)}
              className="px-4 py-2 rounded-lg border border-gold/25 bg-gold/5 text-[10px] text-gold font-serif tracking-widest hover:bg-gold/10 transition-all cursor-pointer shadow-gold-glow"
            >
              ✦ 进入镜面冥想 ✦
            </button>
          </div>
        )}

        {/* 追问聊天对话区 */}
        {!generating && !isReadingEmpty && (
          <ReadingChatSection
            chatMessages={chatMessages}
            chatLoading={chatLoading}
            chatInput={chatInput}
            setChatInput={setChatInput}
            onSendFollowUp={handleSendFollowUp}
            defaultSuggestions={defaultSuggestions}
            chatEndRef={chatEndRef}
          />
        )}

        {!generating && !isReadingEmpty && status === 'guest' && (
          <div className="mt-6 w-full border-y border-gold/12 py-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold/80" />
              <div className="flex-1">
                <p className="text-xs font-serif font-semibold tracking-widest text-gold">
                  保存这次镜面轨迹
                </p>
                <p className="mt-2 text-[11px] font-serif leading-6 tracking-wide text-gold-muted/72">
                  登录后会把当前设备记录迁移到账号，用于跨设备同步和长期画像。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    saveLocalOnboardingState({ authPromptSeen: true });
                    openAuthModal();
                  }}
                  className="mt-3 rounded-full border border-gold/30 bg-gold/8 px-4 py-2 text-[10px] font-serif tracking-widest text-gold transition-colors hover:bg-gold/12"
                >
                  用邮箱保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 浮窗：海报分享 */}
      {showShare && (
        <SharePoster
          question={entry.question}
          mood={entry.mood}
          mainCard={entry.cards[0]}
          intuitiveSummary={parsedReading.intuitiveSummary || ''}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* 浮窗：元素冥想调息（由本牌主导元素激活） */}
      {showZen && activeElement && (
        <BreathingZen
          element={activeElement}
          onClose={() => setShowZen(false)}
        />
      )}
    </main>
  );
}

export default function ReadingDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#07090F] flex items-center justify-center text-gold/50 font-serif text-sm animate-pulse">
        ✦ 加载中 ✦
      </div>
    }>
      <ReadingDetailContent />
    </Suspense>
  );
}
