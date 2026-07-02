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
import { Session, User } from '@supabase/supabase-js';
import { X, Mail, ShieldCheck } from 'lucide-react';
import { ensureUserProfile, UserProfile } from '@/lib/auth/profile';
import {
  clearActiveUserId,
  clearUserLocalCache,
  migrateGuestDataToUser,
  setActiveUserId,
  syncJournalData,
} from '@/lib/db/localJournal';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

type AuthStatus = 'loading' | 'guest' | 'authenticated' | 'unconfigured';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  status: AuthStatus;
  authModalOpen: boolean;
  authError: string;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthModal() {
  const { authModalOpen, closeAuthModal, signInWithEmail, authError, status } = useAuth();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!authModalOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    setSent(false);
    try {
      await signInWithEmail(email.trim());
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/72 px-6 backdrop-blur-md">
      <div className="w-full max-w-sm border-y border-gold/20 bg-[#07090F]/95 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-gold-muted/55">
              Mirror Account
            </p>
            <h2 className="mt-2 text-xl font-serif font-semibold tracking-widest text-gold">
              保存你的镜面轨迹
            </h2>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/15 text-gold-muted/70 transition-colors hover:border-gold/35 hover:text-gold"
            aria-label="关闭登录弹窗"
          >
            <X className="h-4 w-4" />
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
                <Mail className="h-4 w-4 text-gold-muted/55" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-full flex-1 bg-transparent text-sm font-serif outline-none placeholder:text-gold-muted/30"
                />
              </span>
            </label>

            {authError && (
              <p className="text-[10px] font-mono leading-5 text-red-300">{authError}</p>
            )}

            {sent && (
              <div className="flex items-start gap-2 border-y border-gold/12 py-3 text-[11px] font-serif leading-6 text-gold-muted/80">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                登录链接已发送。请打开邮箱完成登录，链接会带你回到 Mirror Tarot。
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="h-11 rounded-full border border-gold/40 bg-gold/10 text-xs font-serif font-semibold tracking-[0.24em] text-gold transition-all hover:bg-gold/15 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {sending ? '发送中...' : '发送登录链接'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'unconfigured');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authError, setAuthError] = useState('');
  const lastUserIdRef = useRef<string>('');
  const handledUserIdsRef = useRef<Set<string>>(new Set());

  const hydrateSignedInUser = useCallback(async (nextSession: Session) => {
    const nextUser = nextSession.user;
    setSession(nextSession);
    setUser(nextUser);
    setStatus('authenticated');
    setActiveUserId(nextUser.id);
    lastUserIdRef.current = nextUser.id;

    const nextProfile = await ensureUserProfile(nextUser);
    setProfile(nextProfile);

    if (!handledUserIdsRef.current.has(nextUser.id)) {
      handledUserIdsRef.current.add(nextUser.id);
      await migrateGuestDataToUser(nextUser.id);
    } else {
      await syncJournalData();
    }
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
      setSession(null);
      setUser(null);
      setProfile(null);
      setStatus('guest');
      clearActiveUserId();
    }
  }, [hydrateSignedInUser]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        const lastUserId = lastUserIdRef.current;
        if (lastUserId) clearUserLocalCache(lastUserId);
        clearActiveUserId();
        lastUserIdRef.current = '';
        setSession(null);
        setUser(null);
        setProfile(null);
        setStatus('guest');
        return;
      }

      if (nextSession) {
        window.setTimeout(() => {
          hydrateSignedInUser(nextSession).catch((error) => {
            console.error('Failed to hydrate auth state:', error);
            setStatus('guest');
          });
        }, 0);
      } else if (event === 'INITIAL_SESSION') {
        clearActiveUserId();
        setStatus('guest');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [hydrateSignedInUser]);

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
      setAuthError(error.message || '登录链接发送失败，请稍后再试。');
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      const lastUserId = lastUserIdRef.current;
      if (lastUserId) clearUserLocalCache(lastUserId);
      clearActiveUserId();
      setSession(null);
      setUser(null);
      setProfile(null);
      setStatus('guest');
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message || '退出登录失败。');
    }
  }, []);

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
      openAuthModal: () => {
        setAuthError('');
        setAuthModalOpen(true);
      },
      closeAuthModal: () => setAuthModalOpen(false),
    }),
    [
      authError,
      authModalOpen,
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
      <AuthModal />
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
