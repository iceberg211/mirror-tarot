export * from './prompts/formatters';
export * from './prompts/reading';
export * from './prompts/dream';
export * from './prompts/report';

export const AI_PROMPT_VERSIONS = {
  reading: 'reading-v2.1.0',
  followUp: 'follow-up-v1.1.0',
  dream: 'dream-v1.1.0',
  monthlyReport: 'monthly-report-v1.0.0',
} as const;
