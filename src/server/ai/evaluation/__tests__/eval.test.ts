import { describe, expect, it } from 'vitest';
import fixtures from '../fixtures/core.json';
import { runAllFixtures, runFixture, type EvalFixture } from '../checks';
import { hashUserId, logAiEvent } from '@/server/ai/telemetry/log';
import { buildMemoryContextPrompt } from '@/server/db/repositories/memory';

const all = fixtures as EvalFixture[];

describe('ai evaluation fixtures', () => {
  it('runs core fixtures (fatalism negative case expected to fail check)', () => {
    const positive = all.filter((f) => f.id !== 'structure-fatalism-fail');
    const summary = runAllFixtures(positive);
    expect(summary.failed).toBe(0);

    const fatalism = all.find((f) => f.id === 'structure-fatalism-fail')!;
    const bad = runFixture(fatalism);
    expect(bad.passed).toBe(false);
  });
});

describe('telemetry privacy', () => {
  it('hashes user ids and does not embed raw questions in hashUserId', () => {
    const h = hashUserId('user-123');
    expect(h).toHaveLength(16);
    expect(h).not.toContain('user-123');
  });

  it('logAiEvent is callable without throwing', () => {
    expect(() =>
      logAiEvent({
        requestId: 'test',
        route: 'reading',
        status: 'success',
        durationMs: 10,
        // 故意不传 question
      })
    ).not.toThrow();
  });
});

describe('memory context', () => {
  it('limits prompt content length', () => {
    const prompt = buildMemoryContextPrompt([
      {
        id: '1',
        userId: 'u',
        category: 'style_pref',
        content: 'x'.repeat(500),
        confidence: 0.8,
        consentScope: 'user_explicit',
        userEditable: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    expect(prompt.length).toBeLessThan(400);
    expect(prompt).toContain('style_pref');
  });
});
