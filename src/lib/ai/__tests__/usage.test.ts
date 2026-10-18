import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UsageMetadata } from '@langchain/core/messages';
import type { AIConfig } from '@/lib/ai/config';
import {
  buildAIUsageReport,
  combineAIUsageReports,
} from '@/lib/ai/usage';

afterEach(() => {
  vi.unstubAllEnvs();
});

function createConfig(
  provider: AIConfig['provider'],
  modelName: string,
  tier: AIConfig['tier'] = 'deep'
): AIConfig {
  return {
    provider,
    modelName,
    tier,
    apiKey: 'test',
    baseURL: 'https://example.com',
  };
}

describe('AI 用量成本', () => {
  it('按 qwen-plus 价格计算人民币成本', () => {
    const usage: UsageMetadata = {
      input_tokens: 1_000,
      output_tokens: 500,
      total_tokens: 1_500,
    };

    const report = buildAIUsageReport(
      createConfig('qwen', 'qwen-plus'),
      usage
    );

    expect(report.inputTokens).toBe(1_000);
    expect(report.outputTokens).toBe(500);
    expect(report.inputCostCny).toBe(0.0008);
    expect(report.outputCostCny).toBe(0.001);
    expect(report.totalCostCny).toBe(0.0018);
  });

  it('DeepSeek 成本区分缓存命中 Token', () => {
    vi.stubEnv('AI_USD_TO_CNY_RATE', '7.2');
    const usage: UsageMetadata = {
      input_tokens: 1_000,
      output_tokens: 500,
      total_tokens: 1_500,
      input_token_details: { cache_read: 200 },
    };

    const report = buildAIUsageReport(
      createConfig('deepseek', 'deepseek-v4-flash'),
      usage
    );

    expect(report.cachedInputTokens).toBe(200);
    expect(report.inputCostCny).toBe(0.00081043);
    expect(report.outputCostCny).toBe(0.001008);
    expect(report.totalCostCny).toBe(0.00181843);
  });

  it('未知模型保留真实 Token，但不猜测价格', () => {
    const report = buildAIUsageReport(
      createConfig('qwen', 'custom-model'),
      {
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
      }
    );

    expect(report.totalTokens).toBe(150);
    expect(report.totalCostCny).toBeNull();
  });

  it('合并两阶段请求的用量与成本', () => {
    const first = buildAIUsageReport(
      createConfig('qwen', 'qwen-turbo', 'fast'),
      {
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
      }
    );
    const second = buildAIUsageReport(
      createConfig('qwen', 'qwen-plus', 'deep'),
      {
        input_tokens: 200,
        output_tokens: 80,
        total_tokens: 280,
      }
    );

    const combined = combineAIUsageReports([first, second]);

    expect(combined.inputTokens).toBe(300);
    expect(combined.outputTokens).toBe(130);
    expect(combined.totalTokens).toBe(430);
    expect(combined.modelName).toBe('qwen-turbo+qwen-plus');
  });
});
