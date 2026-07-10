import { supabase } from '@/lib/supabaseClient';

/**
 * 客户端请求 AI 路由时附带 Bearer，便于服务端解析 userId 做 memory / generation。
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!supabase) return headers;

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    /* guest */
  }

  return headers;
}
