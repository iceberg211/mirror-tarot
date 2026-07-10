import { describe, expect, it } from 'vitest';
import { classifySafety } from '@/server/ai/safety/classify';

describe('classifySafety', () => {
  it('returns normal for ordinary tarot questions', () => {
    const result = classifySafety('最近工作有点焦虑，想看看事业方向');
    expect(result.level).toBe('normal');
    expect(result.blocked).toBe(false);
  });

  it('blocks crisis self-harm content', () => {
    const result = classifySafety('我不想活了，想自杀');
    expect(result.level).toBe('crisis');
    expect(result.blocked).toBe(true);
    expect(result.ruleIds.length).toBeGreaterThan(0);
  });

  it('blocks high_risk abuse content', () => {
    const result = classifySafety('家里有家暴，我该怎么办');
    expect(result.level).toBe('high_risk');
    expect(result.blocked).toBe(true);
  });
});
