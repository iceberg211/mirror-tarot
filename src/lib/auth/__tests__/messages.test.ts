import { describe, expect, it } from 'vitest';
import { describeAuthError } from '../messages';

describe('describeAuthError', () => {
  it('把 PKCE verifier 缺失解释为跨设备打开', () => {
    const message = describeAuthError({
      name: 'AuthPKCECodeVerifierMissingError',
      message: 'PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device.',
    });
    expect(message).toContain('设备');
  });

  it('识别限流错误', () => {
    expect(describeAuthError({ status: 429, message: 'Email rate limit exceeded' })).toContain(
      '频繁',
    );
    expect(
      describeAuthError({ message: 'For security purposes, you can only request this after 56 seconds.' }),
    ).toContain('频繁');
  });

  it('识别过期与失效链接', () => {
    expect(describeAuthError({ code: 'otp_expired', message: 'Token has expired' })).toContain(
      '过期',
    );
    expect(describeAuthError({ message: 'invalid grant' })).toContain('无效');
  });

  it('识别网络故障', () => {
    expect(describeAuthError({ message: 'Failed to fetch' })).toContain('网络');
  });

  it('未知错误回落到中文兜底，不透出英文原文', () => {
    const message = describeAuthError({ message: 'Something totally unexpected' });
    expect(message).toBe('登录暂时失败，请稍后重试。');
    expect(message).not.toContain('unexpected');
  });

  it('支持字符串输入与空值', () => {
    expect(describeAuthError('Email rate limit exceeded')).toContain('频繁');
    expect(describeAuthError(null)).toBe('登录暂时失败，请稍后重试。');
    expect(describeAuthError(undefined, '自定义兜底')).toBe('自定义兜底');
  });
});
