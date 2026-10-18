import { supabase } from '@/lib/supabaseClient';

/** 提前刷新的时间窗口：剩余有效期小于该值时先换新 token */
const REFRESH_THRESHOLD_MS = 30_000;

/**
 * 客户端请求 AI 路由时附带 Bearer，便于服务端解析 userId 做 memory / generation。
 *
 * 注意：getSession() 在 token 即将过期时可能仍返回旧值，直接发出会让服务端
 * 解析失败并静默降级为游客（记忆不落库）。所以这里显式做一次提前刷新。
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!supabase) return headers;

  try {
    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token;
    const expiresAt = (data.session?.expires_at ?? 0) * 1000;

    if (token && expiresAt > 0 && expiresAt - Date.now() < REFRESH_THRESHOLD_MS) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed.session?.access_token ?? token;
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    /* guest 或刷新失败：不阻断请求 */
  }

  return headers;
}
