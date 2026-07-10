import { z } from 'zod';

export const spreadTypeSchema = z.enum([
  'one_card',
  'three_cards',
  'relationship',
  'career',
  'shadow',
  'choice',
  'mirror_cross',
  'custom',
]);

export const readingStyleSchema = z.enum(['gentle', 'direct', 'deep']);

export const cardRefSchema = z.object({
  id: z.string().trim().min(1).max(64),
  orientation: z.enum(['upright', 'reversed']),
});

export const readingRequestSchema = z.object({
  question: z.string().trim().min(1).max(500),
  mood: z.string().trim().min(1).max(50),
  spreadType: spreadTypeSchema,
  cards: z.array(cardRefSchema).min(1).max(10),
  style: readingStyleSchema.default('gentle'),
  readingId: z.string().trim().min(1).max(128).optional(),
  idempotencyKey: z.string().trim().min(1).max(128).optional(),
  recentMoodState: z.enum(['shadow', 'storm']).optional(),
});

export type ReadingRequest = z.infer<typeof readingRequestSchema>;

const previousCardReadingSchema = z.object({
  positionName: z.string().max(100).optional(),
  cardName: z.string().max(100).optional(),
  cardZhName: z.string().max(100).optional(),
  orientation: z.enum(['upright', 'reversed']).optional(),
  interpretation: z.string().max(2000),
});

export const previousReadingSchema = z.object({
  intuitiveSummary: z.string().max(500).default(''),
  cardReadings: z.array(previousCardReadingSchema).max(10).default([]),
  contradiction: z.string().max(1000).default(''),
  overlookedFactor: z.string().max(1000).default(''),
  actionAdvice: z.string().max(1000).default(''),
  gentleReminder: z.string().max(500).default(''),
});

export const followUpRequestSchema = z.object({
  question: z.string().trim().min(1).max(500),
  mood: z.string().trim().min(1).max(50),
  spreadType: spreadTypeSchema.optional(),
  spreadName: z.string().trim().max(100).optional(),
  cards: z.array(cardRefSchema).min(1).max(10),
  previousReading: previousReadingSchema,
  chatHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(1000),
      })
    )
    .max(20)
    .default([]),
  newQuestion: z.string().trim().min(1).max(500),
  style: readingStyleSchema.default('gentle'),
  idempotencyKey: z.string().trim().min(1).max(128).optional(),
});

export type FollowUpRequest = z.infer<typeof followUpRequestSchema>;

export const dreamRequestSchema = z.object({
  dreamText: z.string().trim().min(1).max(3000),
  idempotencyKey: z.string().trim().min(1).max(128).optional(),
});

export type DreamRequest = z.infer<typeof dreamRequestSchema>;

export const reportRequestSchema = z.object({
  checkins: z
    .array(
      z.object({
        date: z.string().max(32),
        mood: z.string().max(50),
      })
    )
    .max(62)
    .default([]),
  readings: z
    .array(
      z.object({
        question: z.string().max(500),
        mood: z.string().max(50),
        cards: z
          .array(
            z.object({
              zhName: z.string().max(50),
              orientation: z.enum(['upright', 'reversed']),
            })
          )
          .max(10),
      })
    )
    .max(40)
    .default([]),
  topCards: z
    .array(
      z.object({
        zhName: z.string().max(50),
        count: z.number().int().min(0).max(10_000),
      })
    )
    .max(20)
    .default([]),
  idempotencyKey: z.string().trim().min(1).max(128).optional(),
});

export type ReportRequest = z.infer<typeof reportRequestSchema>;

export const MAX_BODY_BYTES = 48 * 1024;
