import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getAIConfig,
  getReadingDetailOutputLimit,
} from '@/lib/ai/config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('AI 模型配置', () => {
  it('默认深度模型使用 qwen-plus', () => {
    vi.stubEnv('AI_PROVIDER', '');
    vi.stubEnv('QWEN_MODEL', '');

    const config = getAIConfig('deep');

    expect(config.provider).toBe('qwen');
    expect(config.modelName).toBe('qwen-plus');
  });

  it('支持按层级切换到 DeepSeek', () => {
    vi.stubEnv('AI_PROVIDER_FAST', 'deepseek');
    vi.stubEnv('DEEPSEEK_API_KEY', 'test-key');
    vi.stubEnv('DEEPSEEK_MODEL_FAST', '');

    const config = getAIConfig('fast');

    expect(config.provider).toBe('deepseek');
    expect(config.modelName).toBe('deepseek-v4-flash');
    expect(config.baseURL).toBe('https://api.deepseek.com');
  });

  it('逐牌输出上限随牌数增长但不超过总上限', () => {
    expect(getReadingDetailOutputLimit(1)).toBe(570);
    expect(getReadingDetailOutputLimit(10)).toBe(1_800);
    expect(getReadingDetailOutputLimit(100)).toBe(1_800);
  });
});
