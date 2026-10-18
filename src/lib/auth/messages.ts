/**
 * 把 Supabase Auth 的英文错误转成面向用户的中文提示。
 * 原则：不把服务端原文直接透给用户（既不可读，也可能泄漏内部细节）。
 */

interface AuthErrorLike {
  name?: string;
  message?: string;
  code?: string;
  status?: number;
}

/** 发送登录链接后的冷却秒数，避免用户连点触发服务端限流 */
export const AUTH_RESEND_COOLDOWN_SECONDS = 60;

function toErrorLike(error: unknown): AuthErrorLike {
  if (typeof error === 'string') return { message: error };
  if (typeof error === 'object' && error !== null) {
    const value = error as Record<string, unknown>;
    return {
      name: typeof value.name === 'string' ? value.name : undefined,
      message: typeof value.message === 'string' ? value.message : undefined,
      code: typeof value.code === 'string' ? value.code : undefined,
      status: typeof value.status === 'number' ? value.status : undefined,
    };
  }
  return {};
}

interface Rule {
  matches: (error: AuthErrorLike) => boolean;
  describe: string;
}

const RULES: Rule[] = [
  {
    // PKCE flow 下，链接在另一台设备打开时本机没有 code verifier
    matches: (e) =>
      e.name === 'AuthPKCECodeVerifierMissingError' ||
      /code verifier|pkce/i.test(e.message || ''),
    describe:
      '这个链接是在另一台设备申请的。请在申请登录的那台设备上打开，或回到首页重新发送链接。',
  },
  {
    matches: (e) => e.status === 429 || /rate limit|too many|for security purposes/i.test(e.message || ''),
    describe: '发送太频繁了，请等一分钟后再试。',
  },
  {
    matches: (e) => /expired|otp_expired|token has expired/i.test(e.message || '') || e.code === 'otp_expired',
    describe: '登录链接已过期，请重新发送一封。',
  },
  {
    matches: (e) => /invalid.*(token|link|grant)|already been used/i.test(e.message || ''),
    describe: '登录链接无效或已被使用过，请重新发送一封。',
  },
  {
    matches: (e) => /unable to validate email|invalid email|email address.*invalid/i.test(e.message || ''),
    describe: '邮箱地址格式不正确，请检查后再试。',
  },
  {
    matches: (e) => /failed to fetch|networkerror|network request failed|load failed/i.test(e.message || ''),
    describe: '网络连接失败，请检查网络后重试。',
  },
  {
    matches: (e) => /signups? not allowed|signup.*disabled/i.test(e.message || ''),
    describe: '当前暂不开放新账号注册，请稍后再试。',
  },
];

export function describeAuthError(error: unknown, fallback = '登录暂时失败，请稍后重试。'): string {
  const normalized = toErrorLike(error);
  if (!normalized.message && !normalized.name && !normalized.code && normalized.status === undefined) {
    return fallback;
  }

  const rule = RULES.find((item) => item.matches(normalized));
  return rule ? rule.describe : fallback;
}
