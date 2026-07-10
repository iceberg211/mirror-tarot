import { z } from 'zod';

export const readingResultSchema = z.object({
  summary: z.string().min(1).max(500),
  cardReadings: z
    .array(
      z.object({
        cardId: z.string().min(1).max(64).optional(),
        position: z.string().min(1).max(100),
        interpretation: z.string().min(1).max(2000),
        confidenceNote: z.string().max(300).optional(),
      })
    )
    .max(10),
  contradiction: z.string().max(1000).default(''),
  overlookedFactor: z.string().max(1000).default(''),
  action: z.string().min(1).max(1000),
  gentleReminder: z.string().min(1).max(500),
});

export type ReadingResult = z.infer<typeof readingResultSchema>;

export function isReadingResult(value: unknown): value is ReadingResult {
  return readingResultSchema.safeParse(value).success;
}

/** 将结构化结果转回现有文本标记，便于前端渐进渲染兼容 */
export function readingResultToMarkedText(result: ReadingResult): string {
  const cards = result.cardReadings
    .map((c, idx) => `# CARD_READING_${idx + 1}\n[${c.position}]\n${c.interpretation}`)
    .join('\n\n');

  return [
    `# SUMMARY\n${result.summary}`,
    cards,
    `# CONTRADICTION\n${result.contradiction}`,
    `# OVERLOOKED_FACTOR\n${result.overlookedFactor}`,
    `# ACTION_ADVICE\n${result.action}`,
    `# GENTLE_REMINDER\n${result.gentleReminder}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}
