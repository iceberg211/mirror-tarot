import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // 回调页通过 code 交换会话，客户端必须和该流程保持一致。
        flowType: 'pkce',
        // 必须关闭自动解析：否则 supabase-js 会在初始化时先交换一次 code 并消耗
        // code_verifier，回调页再手动 exchangeCodeForSession 就会抛
        // AuthPKCECodeVerifierMissingError —— 表现为「已登录却显示链接失效」。
        detectSessionInUrl: false,
      },
    })
  : null;
