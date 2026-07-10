/**
 * 从 Authorization Bearer 解析用户 id（可选）。
 * 无 service role / 无效 token 时返回 null，不阻断游客 AI。
 */

import { createClient } from '@supabase/supabase-js';

export async function resolveUserIdFromRequest(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.toLowerCase().startsWith('bearer ')) return null;

  const token = auth.slice(7).trim();
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
  if (!url || !anon) return null;

  try {
    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}
