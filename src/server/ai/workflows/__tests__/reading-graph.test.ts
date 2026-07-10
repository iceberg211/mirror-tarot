import { describe, expect, it } from 'vitest';
import { runReadingWorkflow } from '@/server/ai/workflows/reading-graph';

describe('runReadingWorkflow', () => {
  it('blocks crisis content before card resolution', async () => {
    const result = await runReadingWorkflow({
      question: '我想自杀',
      mood: '崩溃',
      spreadType: 'one_card',
      style: 'gentle',
      cardRefs: [{ id: 'major-00-the-fool', orientation: 'upright' }],
      requestId: 'test-crisis',
    });

    expect(result.status).toBe('blocked');
    expect(result.supportText).toBeTruthy();
    expect(result.safetyLevel).toBe('crisis');
  });

  it('builds context for normal questions', async () => {
    const result = await runReadingWorkflow({
      question: '工作上有点迷茫',
      mood: '迷茫',
      spreadType: 'one_card',
      style: 'gentle',
      cardRefs: [{ id: 'major-00-the-fool', orientation: 'upright' }],
      requestId: 'test-ok',
    });

    expect(result.status).toBe('ready_to_stream');
    expect(result.context?.spreadName).toBeTruthy();
    expect(result.context?.cardsWithMeanings).toHaveLength(1);
    expect(result.context?.inputHash).toHaveLength(64);
  });
});
