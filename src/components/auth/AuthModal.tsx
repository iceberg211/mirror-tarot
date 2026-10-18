'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Mail, ShieldCheck } from 'lucide-react';
import { AUTH_RESEND_COOLDOWN_SECONDS } from '@/lib/auth/messages';

type AuthStatus = 'loading' | 'guest' | 'authenticated' | 'unconfigured';

interface AuthModalProps {
  open: boolean;
  status: AuthStatus;
  error: string;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
}

/**
 * 纯展示组件：不持有任何认证状态，只负责输入、冷却与文案。
 * 认证副作用全部由 useAuth 提供，避免 UI 与业务逻辑耦合。
 */
export default function AuthModal({ open, status, error, onClose, onSubmit }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 打开时聚焦输入框；状态重置由父级通过 key 重新挂载完成
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = email.trim();
      if (!trimmed || sending || cooldown > 0) return;

      setSending(true);
      try {
        await onSubmit(trimmed);
        setSent(true);
        setCooldown(AUTH_RESEND_COOLDOWN_SECONDS);
      } catch {
        setSent(false);
      } finally {
        setSending(false);
      }
    },
    [cooldown, email, onSubmit, sending],
  );

  if (!open) return null;

  const cooldownActive = cooldown > 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/72 px-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-sm border-y border-gold/20 bg-background/95 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gold-muted/55">
              Mirror Account
            </p>
            <h2
              id="auth-modal-title"
              className="mt-2 text-xl font-serif font-semibold tracking-widest text-gold"
            >
              保存你的镜面轨迹
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/15 text-gold-muted/70 transition-colors hover:border-gold/35 hover:text-gold"
            aria-label="关闭登录弹窗"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <p className="mt-4 text-xs font-serif leading-6 tracking-wide text-foreground/72">
          输入邮箱后，我们会发送一封登录链接。登录后，本机记录会迁移到你的账号，并用于长期画像。
        </p>

        {status === 'unconfigured' ? (
          <div className="mt-5 border-y border-gold/12 py-4 text-[11px] font-serif leading-6 text-gold-muted/75">
            Supabase 尚未配置，当前仍可继续使用游客模式和本机备份。
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-serif tracking-widest text-gold-muted/65">
                邮箱地址
              </span>
              <span className="flex h-11 items-center gap-2 border-b border-gold/18 text-foreground focus-within:border-gold/45">
                <Mail className="h-4 w-4 text-gold-muted/55" aria-hidden />
                <input
                  ref={inputRef}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-full flex-1 bg-transparent text-sm font-serif outline-none placeholder:text-gold-muted/30"
                />
              </span>
            </label>

            {error && (
              <p className="text-[11px] font-serif leading-5 text-red-500" role="alert">
                {error}
              </p>
            )}

            {sent && (
              <div className="flex items-start gap-2 border-y border-gold/12 py-3 text-[11px] font-serif leading-6 text-gold-muted/80">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                <span>
                  登录链接已发送。请打开邮箱完成登录，链接会带你回到 Mirror Tarot。
                  {cooldownActive && ` ${cooldown} 秒后可重新发送。`}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={sending || cooldownActive}
              className="h-11 rounded-full border border-gold/40 bg-gold/10 text-xs font-serif font-semibold tracking-[0.24em] text-gold transition-all hover:bg-gold/15 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {sending
                ? '发送中...'
                : cooldownActive
                  ? `重新发送（${cooldown}s）`
                  : sent
                    ? '再发一次登录链接'
                    : '发送登录链接'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
