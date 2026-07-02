'use client';

import React from 'react';
import { LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';
import AppPageShell from '@/components/layout/AppPageShell';
import BottomNav from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import {
  getLocalCheckIns,
  getLocalMonthlyReport,
  getLocalReadings,
  getActiveUserId,
} from '@/lib/db/localJournal';

export default function AccountPage() {
  const { user, profile, status, openAuthModal, signOut } = useAuth();
  const snapshot = {
    readings: getLocalReadings().length,
    checkins: getLocalCheckIns().length,
    hasReport: Boolean(getLocalMonthlyReport()),
    activeUserId: getActiveUserId(),
  };

  const isSignedIn = status === 'authenticated' && user;

  return (
    <AppPageShell
      eyebrow="Account"
      title="账号"
      description="管理登录状态、同步方式和本机记录归属。"
      imageSrc="/cards/rws/21-the-world.jpg"
      imageAlt="世界塔罗牌"
    >
      <div className="mt-7 flex flex-col gap-7 pb-12">
        <section className="border-y border-gold/12 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/16 text-gold">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mono uppercase tracking-[0.26em] text-gold-muted/50">
                Current Identity
              </p>
              <h2 className="mt-2 text-lg font-serif font-semibold tracking-widest text-gold">
                {isSignedIn ? profile?.displayName || '镜面旅人' : '游客模式'}
              </h2>
              <p className="mt-2 flex items-center gap-2 text-[11px] font-serif leading-5 text-gold-muted/72">
                <Mail className="h-3.5 w-3.5" />
                {isSignedIn ? user.email : '尚未登录，记录仅保存在当前设备。'}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 border-y border-gold/10 py-4">
            <div>
              <span className="block text-lg font-mono text-gold">{snapshot.readings}</span>
              <span className="text-[9px] font-serif tracking-widest text-gold-muted/55">日记</span>
            </div>
            <div>
              <span className="block text-lg font-mono text-gold">{snapshot.checkins}</span>
              <span className="text-[9px] font-serif tracking-widest text-gold-muted/55">打卡</span>
            </div>
            <div>
              <span className="block text-lg font-mono text-gold">{snapshot.hasReport ? '1' : '0'}</span>
              <span className="text-[9px] font-serif tracking-widest text-gold-muted/55">报告</span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {isSignedIn ? (
              <>
                <p className="flex items-start gap-2 text-[11px] font-serif leading-6 text-foreground/74">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  已登录。云端同步会按账号隔离，退出后本机会清理账号缓存，防止同设备继续看到私密记录。
                </p>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-red-400/25 bg-red-950/10 px-5 text-xs font-serif tracking-widest text-red-200 transition-colors hover:border-red-300/45 hover:bg-red-950/25"
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </button>
              </>
            ) : (
              <>
                <p className="text-[11px] font-serif leading-6 text-foreground/74">
                  登录后会把当前设备的游客记录迁移到你的账号，用于跨设备同步和长期画像。
                </p>
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="h-11 rounded-full border border-gold/40 bg-gold/10 px-5 text-xs font-serif font-semibold tracking-[0.24em] text-gold transition-all hover:bg-gold/15"
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
