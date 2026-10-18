import type { UsageMetadata } from '@langchain/core/messages';
import type { AIConfig, AIUsageReport, ModelTier } from './config';

interface ModelPricing {
  inputCnyPerMillion: number;
  cachedInputCnyPerMillion: number;
  outputCnyPerMillion: number;
  version: string;
}

const MILLION = 1_000_000;

function readPositiveNumber(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function getTierPriceOverride(tier: ModelTier): ModelPricing | null {
  const prefix = `AI_PRICE_${tier.toUpperCase()}`;
  const input = readPositiveNumber(`${prefix}_INPUT_CNY_PER_MILLION`);
  const output = readPositiveNumber(`${prefix}_OUTPUT_CNY_PER_MILLION`);
  if (input === null || output === null) return null;

  return {
    inputCnyPerMillion: input,
    cachedInputCnyPerMillion:
      readPositiveNumber(`${prefix}_CACHED_INPUT_CNY_PER_MILLION`) ?? input,
    outputCnyPerMillion: output,
    version: 'env-tier-price',
  };
}

function getCatalogPricing(config: AIConfig): ModelPricing | null {
  const model = config.modelName.toLowerCase();

  if (model.startsWith('qwen-flash')) {
    return {
      inputCnyPerMillion: 0.15,
      cachedInputCnyPerMillion: 0.15,
      outputCnyPerMillion: 1.5,
      version: 'catalog-2026-07-18',
    };
  }
  if (model.startsWith('qwen-turbo')) {
    return {
      inputCnyPerMillion: 0.3,
      cachedInputCnyPerMillion: 0.3,
      outputCnyPerMillion: 0.6,
      version: 'catalog-2026-07-18',
    };
  }
  if (model.startsWith('qwen-plus')) {
    return {
      inputCnyPerMillion: 0.8,
      cachedInputCnyPerMillion: 0.8,
      outputCnyPerMillion: 2,
      version: 'catalog-2026-07-18',
    };
  }
  if (model.startsWith('qwen-max')) {
    return {
      inputCnyPerMillion: 2.4,
      cachedInputCnyPerMillion: 2.4,
      outputCnyPerMillion: 9.6,
      version: 'catalog-2026-07-18',
    };
  }

  const usdToCny = readPositiveNumber('AI_USD_TO_CNY_RATE') ?? 7.2;
  if (model.startsWith('deepseek-v4-flash')) {
    return {
      inputCnyPerMillion: 0.14 * usdToCny,
      cachedInputCnyPerMillion: 0.0028 * usdToCny,
      outputCnyPerMillion: 0.28 * usdToCny,
      version: `deepseek-usd-2026-07-18@${usdToCny}`,
    };
  }
  if (model.startsWith('deepseek-v4-pro')) {
    return {
      inputCnyPerMillion: 0.435 * usdToCny,
      cachedInputCnyPerMillion: 0.003625 * usdToCny,
      outputCnyPerMillion: 0.87 * usdToCny,
      version: `deepseek-usd-2026-07-18@${usdToCny}`,
    };
  }

  return null;
}

function roundCost(value: number): number {
  return Math.round(value * 100_000_000) / 100_000_000;
}

export function buildAIUsageReport(
  config: AIConfig,
  usage: UsageMetadata | undefined
): AIUsageReport {
  const inputTokens = usage?.input_tokens ?? 0;
  const outputTokens = usage?.output_tokens ?? 0;
  const totalTokens = usage?.total_tokens ?? inputTokens + outputTokens;
  const cachedInputTokens = Math.min(
    inputTokens,
    Math.max(0, usage?.input_token_details?.cache_read ?? 0)
  );
  const pricing = getTierPriceOverride(config.tier) || getCatalogPricing(config);

  if (!pricing) {
    return {
      provider: config.provider,
      modelName: config.modelName,
      inputTokens,
      cachedInputTokens,
      outputTokens,
      totalTokens,
      inputCostCny: null,
      outputCostCny: null,
      totalCostCny: null,
      pricingVersion: null,
    };
  }

  const uncachedInputTokens = inputTokens - cachedInputTokens;
  const inputCostCny = roundCost(
    (uncachedInputTokens * pricing.inputCnyPerMillion +
      cachedInputTokens * pricing.cachedInputCnyPerMillion) /
      MILLION
  );
  const outputCostCny = roundCost(
    (outputTokens * pricing.outputCnyPerMillion) / MILLION
  );

  return {
    provider: config.provider,
    modelName: config.modelName,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    totalTokens,
    inputCostCny,
    outputCostCny,
    totalCostCny: roundCost(inputCostCny + outputCostCny),
    pricingVersion: pricing.version,
  };
}

export function combineAIUsageReports(reports: AIUsageReport[]): AIUsageReport {
  const validCosts = reports.every((report) => report.totalCostCny !== null);
  const pricingVersions = [...new Set(
    reports.map((report) => report.pricingVersion).filter(Boolean)
  )];

  return {
    provider: [...new Set(reports.map((report) => report.provider))].join('+'),
    modelName: reports.map((report) => report.modelName).join('+'),
    inputTokens: reports.reduce((sum, report) => sum + report.inputTokens, 0),
    cachedInputTokens: reports.reduce(
      (sum, report) => sum + report.cachedInputTokens,
      0
    ),
    outputTokens: reports.reduce((sum, report) => sum + report.outputTokens, 0),
    totalTokens: reports.reduce((sum, report) => sum + report.totalTokens, 0),
    inputCostCny: validCosts
      ? roundCost(
          reports.reduce((sum, report) => sum + (report.inputCostCny ?? 0), 0)
        )
      : null,
    outputCostCny: validCosts
      ? roundCost(
          reports.reduce((sum, report) => sum + (report.outputCostCny ?? 0), 0)
        )
      : null,
    totalCostCny: validCosts
      ? roundCost(
          reports.reduce((sum, report) => sum + (report.totalCostCny ?? 0), 0)
        )
      : null,
    pricingVersion: pricingVersions.length ? pricingVersions.join('+') : null,
  };
}
