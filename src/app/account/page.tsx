'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';
import AppPageShell from '@/components/layout/AppPageShell';
import BottomNav from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import {
  getLocalCheckIns,
  getLocalMonthlyReport,
  getLocalReadings,
} from '@/lib/db/localJournal';
import { useClientReady } from '@/hooks/useClientReady';

export default function AccountPage() {
  const { user, profile, status, authError, openAuthModal, signOut } = useAuth();
  const ready = useClientReady();
  const isSignedIn = status === 'authenticated' && user !== null;
  const [pendingWarning, setPendingWarning] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      const result = await signOut();
      if (!result.signedOut && result.pendingCount > 0) {
        setPendingWarning(result.pendingCount);
      }
    } finally {
      setSigningOut(false);
    }
  }, [signOut]);

  const handleForceSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut({ force: true });
      setPendingWarning(0);
    } finally {
      setSigningOut(false);
    }
  }, [signOut]);

  const snapshot = useMemo(() => {
    if (!ready) {
      return { readings: 0, checkins: 0, hasReport: false };
    }
    return {
      readings: getLocalReadings().length,
      checkins: getLocalCheckIns().length,
      hasReport: Boolean(getLocalMonthlyReport()),
    };
  }, [ready]);

  return (
    <AppPageShell
      eyebrow="Account"
      title="我的"
      description="管理登录、同步方式与本机记录归属。"
      imageSrc="/cards/rws/21-the-world.jpg"
      imageAlt="世界塔罗牌"
    >
      <div className="mt-7 flex flex-col gap-7 pb-12">
        <section className="border-y border-gold/12 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/16 text-gold">
              <UserRound className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono uppercase tracking-[0.26em] text-gold-muted">
                Current Identity
              </p>
              <h2 className="mt-2 text-lg font-serif font-semibold tracking-widest text-gold">
                {status === 'loading'
                  ? '正在确认登录状态…'
                  : isSignedIn
                    ? profile?.displayName || '镜面旅人'
                    : '游客模式'}
              </h2>
              <p className="mt-2 flex items-center gap-2 text-sm font-serif leading-5 text-gold-muted">
                <Mail className="h-3.5 w-3.5" aria-hidden />
                {status === 'loading'
                  ? '正在读取本机会话'
                  : isSignedIn
                    ? user.email
                    : '尚未登录，记录仅保存在当前设备。'}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 border-y border-gold/10 py-4">
            <div>
              <span className="block text-lg font-mono text-gold">
                {ready ? snapshot.readings : '—'}
              </span>
              <span className="text-xs font-serif tracking-widest text-gold-muted">日记</span>
            </div>
            <div>
              <span className="block text-lg font-mono text-gold">
                {ready ? snapshot.checkins : '—'}
              </span>
              <span className="text-xs font-serif tracking-widest text-gold-muted">打卡</span>
            </div>
            <div>
              <span className="block text-lg font-mono text-gold">
                {ready ? (snapshot.hasReport ? '1' : '0') : '—'}
              </span>
              <span className="text-xs font-serif tracking-widest text-gold-muted">报告</span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {status === 'loading' ? (
              <p className="text-sm font-serif leading-6 text-gold-muted animate-pulse">
                正在确认登录状态，请稍候…
              </p>
            ) : isSignedIn ? (
              <>
                <p className="flex items-start gap-2 text-sm font-serif leading-6 text-foreground/85">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                  已登录。云端同步按账号隔离；本机仍缓存副本便于离线查看。退出会清理本机缓存（含解读缓存），防止他人看到私密记录。
                </p>

                {authError && (
                  <p className="text-xs font-serif leading-5 text-red-500" role="alert">
                    {authError}
                  </p>
                )}

                {pendingWarning > 0 ? (
                  <div className="rounded-lg border border-red-400/25 bg-red-950/10 p-4">
                    <p className="flex items-start gap-2 text-xs font-serif leading-6 text-red-200">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      本机还有 {pendingWarning} 条记录没有同步到云端。现在退出会清空本机副本，这些记录将无法找回。
                    </p>
                    <div className="mt-3 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setPendingWarning(0)}
                        className="min-h-11 flex-1 rounded-full border border-gold/20 text-xs font-serif tracking-widest text-gold-muted transition-colors hover:border-gold/40 hover:text-gold"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={handleForceSignOut}
                        disabled={signingOut}
                        className="min-h-11 flex-1 rounded-full border border-red-400/40 bg-red-950/25 text-xs font-serif tracking-widest text-red-200 transition-colors hover:bg-red-950/40 disabled:opacity-55"
                      >
                        {signingOut ? '正在退出...' : '仍然退出'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-400/25 bg-red-950/10 px-5 text-sm font-serif tracking-widest text-red-200 transition-colors hover:border-red-300/45 hover:bg-red-950/25 disabled:opacity-55"
                  >
                    <LogOut className="h-4 w-4" aria-hidden />
                    {signingOut ? '正在退出...' : '退出登录'}
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-sm font-serif leading-6 text-foreground/85">
                  游客记录保存在本机。登录后会把游客数据迁移到账号，用于跨设备云同步与长期画像；未登录时请用日记页的备份功能保护数据。
                </p>
                {authError && (
                  <p className="text-xs font-serif leading-5 text-red-500" role="alert">
                    {authError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="min-h-11 rounded-full border border-gold/40 bg-gold/10 px-5 text-sm font-serif font-semibold tracking-[0.24em] text-gold transition-all hover:bg-gold/15"
                >
                  用邮箱登录
                </button>
              </>
            )}
          </div>
        </section>
      </div>

      <BottomNav />
    </AppPageShell>
  );
}
