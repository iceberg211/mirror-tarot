'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import AuthModal from '@/components/auth/AuthModal';
import { describeAuthError } from '@/lib/auth/messages';
import { ensureUserProfile, type UserProfile } from '@/lib/auth/profile';
import {
  clearActiveUserId,
  clearSessionLocalCache,
  countPendingLocalReadings,
  migrateGuestDataToUser,
  setActiveUserId,
  syncJournalData,
} from '@/lib/db/localJournal';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

export type AuthStatus = 'loading' | 'guest' | 'authenticated' | 'unconfigured';

export interface SignOutResult {
  /** 是否真的完成退出。false 表示因存在未同步记录被拦下 */
  signedOut: boolean;
  /** 本机尚未同步到云端的记录数 */
  pendingCount: number;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  status: AuthStatus;
  authModalOpen: boolean;
  authError: string;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: (options?: { force?: boolean }) => Promise<SignOutResult>;
  refreshSession: () => Promise<void>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'unconfigured');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authError, setAuthError] = useState('');

  const lastUserIdRef = useRef<string>('');
  /** 已成功完成游客数据迁移的用户，避免重复迁移 */
  const handledUserIdsRef = useRef<Set<string>>(new Set());
  /** 同一用户的会话水合只跑一次（回调页与 auth 事件可能并发触发） */
  const hydrationRef = useRef<Map<string, Promise<void>>>(new Map());
  /** 每次退出登录递增；用于丢弃退出后仍在途的水合结果 */
  const epochRef = useRef(0);

  const cleanupLocalSession = useCallback((userId: string) => {
    epochRef.current += 1;
    if (userId) {
      // 必须连同 AI 结果缓存一起清掉，否则私密解读原文仍留在本机
      clearSessionLocalCache(userId);
      handledUserIdsRef.current.delete(userId);
    }
    hydrationRef.current.clear();
    clearActiveUserId();
    lastUserIdRef.current = '';
    setSession(null);
    setUser(null);
    setProfile(null);
    setStatus('guest');
    setAuthError('');
  }, []);

  const hydrateSignedInUser = useCallback((nextSession: Session): Promise<void> => {
    const userId = nextSession.user.id;

    const inFlight = hydrationRef.current.get(userId);
    if (inFlight) return inFlight;

    const epoch = epochRef.current;

    const task = (async () => {
      setSession(nextSession);
      setUser(nextSession.user);
      setStatus('authenticated');
      setActiveUserId(userId);
      lastUserIdRef.current = userId;

      try {
        const nextProfile = await ensureUserProfile(nextSession.user);
        // 期间用户已退出：丢弃这次结果，避免退出后被重新点亮为已登录
        if (epoch !== epochRef.current) return;
        setProfile(nextProfile);

        if (!handledUserIdsRef.current.has(userId)) {
          // 先占位再 await：并发调用时只有一个会真正执行迁移
          handledUserIdsRef.current.add(userId);
          const migrated = await migrateGuestDataToUser(userId);
          if (!migrated) handledUserIdsRef.current.delete(userId);
        } else {
          await syncJournalData();
        }
      } catch (error) {
        console.error('Failed to hydrate auth state:', error);
      }
    })().finally(() => {
      hydrationRef.current.delete(userId);
    });

    hydrationRef.current.set(userId, task);
    return task;
  }, []);

  const refreshSession = useCallback(async () => {
    if (!supabase) {
      setStatus('unconfigured');
      return;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Failed to refresh auth session:', error);
      setStatus('guest');
      return;
    }

    if (data.session) {
      await hydrateSignedInUser(data.session);
    } else {
      cleanupLocalSession('');
    }
  }, [cleanupLocalSession, hydrateSignedInUser]);

  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        cleanupLocalSession(lastUserIdRef.current);
        return;
      }

      // token 刷新很频繁，只同步会话本身，不做画像写入与全量同步
      if (event === 'TOKEN_REFRESHED') {
        if (nextSession) {
          setSession(nextSession);
          setUser(nextSession.user);
        }
        return;
      }

      if (!nextSession) {
        if (event === 'INITIAL_SESSION') cleanupLocalSession('');
        return;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Supabase 要求回调内不要直接调用其它 auth 方法，放到下一个事件循环
        window.setTimeout(() => {
          void hydrateSignedInUser(nextSession);
        }, 0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [cleanupLocalSession, hydrateSignedInUser]);

  const signInWithEmail = useCallback(async (email: string) => {
    setAuthError('');
    if (!supabase) {
      setAuthError('Supabase 尚未配置，无法发送登录链接。');
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
      },
    });

    if (error) {
      const message = describeAuthError(error, '登录链接发送失败，请稍后再试。');
      setAuthError(message);
      throw new Error(message);
    }
  }, []);

  const signOut = useCallback(
    async (options?: { force?: boolean }): Promise<SignOutResult> => {
      const pendingCount = countPendingLocalReadings();

      // 未同步的记录一旦清缓存就永久丢失，先让调用方确认
      if (pendingCount > 0 && !options?.force) {
        return { signedOut: false, pendingCount };
      }

      const lastUserId = lastUserIdRef.current;

      if (supabase) {
        // 默认 scope 是 global，会把其它设备一起登出；这里只登出当前设备
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error && !options?.force) {
          setAuthError(describeAuthError(error, '退出登录失败，请稍后重试。'));
          return { signedOut: false, pendingCount };
        }
      }

      cleanupLocalSession(lastUserId);
      return { signedOut: true, pendingCount };
    },
    [cleanupLocalSession],
  );

  const openAuthModal = useCallback(() => {
    setAuthError('');
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      status,
      authModalOpen,
      authError,
      signInWithEmail,
      signOut,
      refreshSession,
      openAuthModal,
      closeAuthModal,
    }),
    [
      authError,
      authModalOpen,
      closeAuthModal,
      openAuthModal,
      profile,
      refreshSession,
      session,
      signInWithEmail,
      signOut,
      status,
      user,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal
        key={authModalOpen ? 'auth-modal-open' : 'auth-modal-closed'}
        open={authModalOpen}
        status={status}
        error={authError}
        onClose={closeAuthModal}
        onSubmit={signInWithEmail}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
