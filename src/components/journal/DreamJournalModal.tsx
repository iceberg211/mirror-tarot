'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DreamJournalModalProps {
  onClose: () => void;
}

export default function DreamJournalModal({ onClose }: DreamJournalModalProps) {
  const router = useRouter();
  const [dreamText, setDreamText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 梦境解析结果
  const [analysisResult, setAnalysisResult] = useState<{
    dreamAnalysis: string;
    tarotMetaphor: string;
    questionForSubconscious: string;
    dreamColors?: string[];
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dreamText.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/journal/dream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dreamText: dreamText.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '解析梦境失败，请稍后重试');
      }

      setAnalysisResult({
        dreamAnalysis: data.dreamAnalysis,
        tarotMetaphor: data.tarotMetaphor,
        questionForSubconscious: data.questionForSubconscious,
        dreamColors: data.dreamColors,
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '网络异常，解梦失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStartDraw = () => {
    if (!analysisResult) return;
    
    // 带参数跳转至抽牌页
    const params = new URLSearchParams({
      question: `[梦境] ${analysisResult.questionForSubconscious}`,
      mood: '平静',
      spreadType: 'shadow',
      isDream: 'true',
      dreamAnalysis: analysisResult.dreamAnalysis,
      dreamMetaphor: analysisResult.tarotMetaphor,
      dreamQuestion: analysisResult.questionForSubconscious,
    });

    onClose();
    router.push(`/reading/new?${params.toString()}`);
  };

  // 计算由 AI 提取情绪色渲染的云雾渐变背景
  const backgroundStyle = analysisResult?.dreamColors && analysisResult.dreamColors.length >= 3
    ? {
        background: `radial-gradient(circle at 15% 20%, ${analysisResult.dreamColors[0]}2a, transparent 50%), 
                     radial-gradient(circle at 85% 80%, ${analysisResult.dreamColors[1]}2a, transparent 50%), 
                     radial-gradient(circle at 50% 50%, ${analysisResult.dreamColors[2]}1f, transparent 70%),
                     linear-gradient(to bottom, #0F111A, #08090E)`
      }
    : {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05060A]/85 backdrop-blur-md">
      
      {/* 弹窗容器 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={backgroundStyle}
        className="w-full max-w-md border border-gold/20 rounded-2xl p-6 shadow-gold-glow flex flex-col gap-5 relative overflow-hidden transition-all duration-700 ease-out"
      >
        {/* 顶部饰条 */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gold-muted/60 hover:text-gold hover:bg-gold/5 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* 标题 */}
        <div className="flex items-center gap-2.5 text-gold mb-1">
          <Moon className="w-5 h-5 text-gold animate-[pulse_3s_infinite]" />
          <h3 className="text-sm font-serif font-bold tracking-widest uppercase">
            潜意识梦境映射 ✦ Dream Journal
          </h3>
        </div>

        <AnimatePresence mode="wait">
          {!analysisResult ? (
            /* 状态 1：梦境描述输入表单 */
            <motion.form
              key="dream-form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4.5"
            >
              <p className="text-[10px] text-gold-muted/70 font-serif leading-relaxed tracking-wider">
                荣格说，梦是潜意识写给显意识的信。记录下您昨晚的梦境片段，AI 释梦分析师将为您梳理梦中的潜意识符号，并推荐指引问题。
              </p>

              <div className="relative rounded-xl border border-gold/15 bg-card/45 p-3.5 shadow-gold-glow focus-within:border-gold/30 transition-all duration-300">
                <textarea
                  value={dreamText}
                  onChange={(e) => {
                    setDreamText(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  placeholder="昨晚我梦见在一座古老图书馆里迷路了，外面下着暴雨，我焦急地寻找出口……"
                  className="w-full h-28 bg-transparent outline-none border-none text-xs text-foreground/90 font-serif tracking-wide placeholder:text-gold-muted/30 resize-none no-scrollbar leading-relaxed"
                  maxLength={500}
                />
                <div className="absolute bottom-2.5 right-2.5 flex items-center justify-center text-gold/30">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
              </div>

              {error && (
                <div className="text-[10px] text-red-400 flex items-center gap-1.5 pl-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 h-10.5 rounded-xl border border-gold/10 bg-[#0E1017]/30 text-gold-muted/65 text-xs font-serif tracking-widest hover:border-gold/25 cursor-pointer disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading || !dreamText.trim()}
                  className="flex-[2] h-10.5 rounded-xl bg-gradient-to-r from-[#171610] via-[#2A241A] to-[#171610] border border-gold/45 text-gold text-xs font-serif tracking-widest hover:brightness-110 cursor-pointer shadow-gold-glow flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border border-dashed border-gold rounded-full animate-spin" />
                      <span>正在分析潜意识映射...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      <span>分析梦境映射</span>
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          ) : (
            /* 状态 2：梦境映射结果呈现 */
            <motion.div
              key="dream-result"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-4"
            >
              {/* 荣格分析评论 */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] text-gold-muted/65 font-serif tracking-widest uppercase">
                  ✦ 梦境符号学分析 ✦
                </span>
                <div className="p-3.5 rounded-xl border border-gold/10 bg-[#0C0F16]/65 text-xs text-foreground/90 font-serif leading-relaxed tracking-wide">
                  {analysisResult.dreamAnalysis}
                </div>
              </div>

              {/* 塔罗能量隐喻 */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] text-gold-muted/65 font-serif tracking-widest uppercase">
                  ✦ 塔罗原型隐喻 ✦
                </span>
                <p className="text-[11px] text-gold-muted font-serif leading-relaxed tracking-wide px-1">
                  {analysisResult.tarotMetaphor}
                </p>
              </div>

              {/* 潜意识建议发问 */}
              <div className="w-full p-3.5 rounded-xl border border-gold/20 bg-gradient-to-b from-[#1E1C16]/25 to-[#0E1017]/40 flex flex-col gap-1.5 text-center mt-1 shadow-gold-glow">
                <span className="text-[9px] text-gold font-serif tracking-widest uppercase">
                  ✦ 潜意识发问指引 ✦
                </span>
                <p className="text-xs text-gold font-serif leading-relaxed tracking-wide italic font-medium">
                  “ {analysisResult.questionForSubconscious} ”
                </p>
              </div>

              {/* 开始抽卡动作 */}
              <button
                onClick={handleStartDraw}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#171610] via-[#2E281C] to-[#171610] border border-gold text-gold text-xs font-serif font-semibold tracking-widest hover:brightness-110 shadow-gold-glow flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>开启镜面解梦抽卡</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
