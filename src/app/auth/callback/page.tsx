'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useAuth();
  const [message, setMessage] = useState('正在确认登录链接...');

  useEffect(() => {
    let cancelled = false;

    async function exchangeCode() {
      const errorDescription = searchParams.get('error_description');
      if (errorDescription) {
        setMessage(`登录链接无效或已过期：${errorDescription}`);
        return;
      }

      const code = searchParams.get('code');
      if (!supabase || !code) {
        setMessage('未找到登录凭据，请回到首页重新发送登录链接。');
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;

      if (error) {
        setMessage(error.message || '登录链接确认失败，请重新尝试。');
        return;
      }

      await refreshSession();
      if (cancelled) return;

      setMessage('登录成功，正在带你回到账号页...');
      window.setTimeout(() => router.replace('/account?auth=success'), 600);
    }

    exchangeCode();

    return () => {
      cancelled = true;
    };
  }, [refreshSession, router, searchParams]);

  return (
    <main className="min-h-screen bg-[#05060A] px-6 text-foreground flex items-center justify-center">
      <div className="w-full max-w-sm border-y border-gold/16 py-8 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gold-muted/55">
          Mirror Account
        </p>
        <h1 className="mt-3 text-xl font-serif font-semibold tracking-widest text-gold">
          登录确认
        </h1>
        <p className="mt-4 text-xs font-serif leading-6 text-gold-muted/78">{message}</p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#05060A] flex items-center justify-center text-gold/60 font-serif text-sm">
        正在加载登录状态...
      </main>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
