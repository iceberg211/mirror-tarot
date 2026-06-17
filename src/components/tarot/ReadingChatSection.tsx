'use client';

import React from 'react';
import { MessageSquare, Send } from 'lucide-react';

interface ReadingChatSectionProps {
  chatMessages: { role: 'user' | 'assistant'; content: string }[];
  chatLoading: boolean;
  chatInput: string;
  setChatInput: (val: string) => void;
  onSendFollowUp: (inputText: string) => void;
  defaultSuggestions: string[];
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function ReadingChatSection({
  chatMessages,
  chatLoading,
  chatInput,
  setChatInput,
  onSendFollowUp,
  defaultSuggestions,
  chatEndRef
}: ReadingChatSectionProps) {
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    onSendFollowUp(chatInput);
  };

  return (
    <div className="w-full border-t border-gold/10 pt-6 mt-2 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-gold px-1">
        <MessageSquare className="w-4 h-4" />
        <span className="text-xs font-serif tracking-widest font-semibold">继续追问</span>
      </div>

      {/* 对话列表 */}
      {chatMessages.length > 0 && (
        <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col gap-1 max-w-[85%] ${
                msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'
              }`}
            >
              <div
                className={`p-3 rounded-2xl text-xs font-serif leading-relaxed tracking-wide ${
                  msg.role === 'user'
                    ? 'bg-[#1E1C16] border border-gold/20 text-gold rounded-tr-none'
                    : 'bg-card border border-gold/5 text-foreground/90 rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="self-start max-w-[85%] flex flex-col items-start">
              <div className="p-3 rounded-2xl bg-card border border-gold/5 text-xs font-serif text-gold-muted/40 animate-pulse rounded-tl-none">
                正在梳理牌面指引...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* 快捷追问建议 (Chips) */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {defaultSuggestions.map((sug, idx) => (
          <button
            key={idx}
            type="button"
            disabled={chatLoading}
            onClick={() => onSendFollowUp(sug)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full border border-gold/15 bg-card/45 text-[10px] text-gold-muted hover:border-gold/30 hover:text-gold cursor-pointer transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* 追问输入框 */}
      <form onSubmit={handleFormSubmit} className="flex gap-2 mt-1 relative">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          disabled={chatLoading}
          placeholder="对于这个结果，你还想了解什么？"
          className="flex-1 h-10.5 rounded-xl border border-gold/15 bg-[#0A0C12] pl-4 pr-12 text-xs text-foreground placeholder:text-gold-muted/30 outline-none focus:border-gold/30 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={chatLoading || !chatInput.trim()}
          className="absolute right-1.5 top-1.5 w-7.5 h-7.5 rounded-lg border border-gold/25 bg-gold/5 flex items-center justify-center text-gold cursor-pointer hover:bg-gold/10 disabled:opacity-50 disabled:pointer-events-none transition-all"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
