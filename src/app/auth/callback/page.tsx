'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { describeAuthError } from '@/lib/auth/messages';

type Phase = 'working' | 'success' | 'error';

const OTP_TYPES = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'] as const;
type OtpType = (typeof OTP_TYPES)[number];

function parseOtpType(value: string | null): OtpType {
  return value && (OTP_TYPES as readonly string[]).includes(value) ? (value as OtpType) : 'email';
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession, openAuthModal } = useAuth();
  const [phase, setPhase] = useState<Phase>('working');
  const [message, setMessage] = useState('正在确认登录链接...');
  const startedRef = useRef(false);

  const fail = useCallback((text: string) => {
    setPhase('error');
    setMessage(text);
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    async function confirm() {
      if (!supabase) {
        fail('Supabase 尚未配置，无法完成登录。');
        return;
      }

      const callbackError = searchParams.get('error_description') || searchParams.get('error_code');
      if (callbackError) {
        fail(describeAuthError({ message: callbackError }, '登录链接无效或已过期，请重新发送。'));
        return;
      }

      // 推荐路径：邮件模板使用 {{ .TokenHash }}，可在任意设备打开
      const tokenHash = searchParams.get('token_hash');
      // 兼容路径：PKCE 的 ?code=，要求与申请链接时使用同一个浏览器
      const code = searchParams.get('code');

      let error: unknown = null;

      if (tokenHash) {
        const result = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: parseOtpType(searchParams.get('type')),
        });
        error = result.error;
      } else if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code);
        error = result.error;
      } else {
        if (!cancelled) fail('未找到登录凭据，请回到首页重新发送登录链接。');
        return;
      }

      if (cancelled) return;

      if (error) {
        fail(
          describeAuthError(error, '登录链接确认失败，可能已过期或被使用过，请重新发送一封。'),
        );
        return;
      }

      setPhase('success');
      setMessage('登录成功，正在带你回到账号页...');
      await refreshSession();
      if (cancelled) return;

      window.setTimeout(() => router.replace('/account?auth=success'), 500);
    }

    void confirm();

    return () => {
      cancelled = true;
    };
  }, [fail, refreshSession, router, searchParams]);

  const handleRetry = useCallback(() => {
    openAuthModal();
    router.replace('/');
  }, [openAuthModal, router]);

  return (
    <main className="min-h-screen bg-background px-6 text-foreground flex items-center justify-center">
      <div className="w-full max-w-sm border-y border-gold/16 py-8 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gold-muted/55">
          Mirror Account
        </p>
        <h1 className="mt-3 text-xl font-serif font-semibold tracking-widest text-gold">
          登录确认
        </h1>
        <p
          className={`mt-4 text-xs font-serif leading-6 ${
            phase === 'error' ? 'text-red-500' : 'text-gold-muted/78'
          }`}
          role={phase === 'error' ? 'alert' : undefined}
        >
          {message}
        </p>

        {phase === 'error' && (
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleRetry}
              className="min-h-11 rounded-full border border-gold/40 bg-gold/10 px-5 text-xs font-serif font-semibold tracking-[0.24em] text-gold transition-all hover:bg-gold/15"
            >
              重新发送登录链接
            </button>
            <button
              type="button"
              onClick={() => router.replace('/')}
              className="min-h-11 rounded-full border border-gold/15 px-5 text-xs font-serif tracking-widest text-gold-muted transition-colors hover:border-gold/35 hover:text-gold"
            >
              先以游客身份继续
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background flex items-center justify-center text-gold/60 font-serif text-sm">
          正在加载登录状态...
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
