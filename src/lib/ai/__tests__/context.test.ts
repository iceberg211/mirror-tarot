import { describe, expect, it } from 'vitest';
import { compactChatHistory, compactText } from '@/lib/ai/context';

describe('AI 上下文压缩', () => {
  it('长文本保留开头和结尾', () => {
    const compacted = compactText(
      `开头${'中'.repeat(200)}结尾`,
      60,
      { preserveEnd: true }
    );

    expect(compacted).toHaveLength(60);
    expect(compacted.startsWith('开头')).toBe(true);
    expect(compacted.endsWith('结尾')).toBe(true);
    expect(compacted).toContain('…');
  });

  it('对话只保留最近消息并限制总长度', () => {
    const history = Array.from({ length: 20 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: `消息${index}-${'内容'.repeat(300)}`,
    }));

    const compacted = compactChatHistory(history);
    const totalLength = compacted.reduce(
      (sum, message) => sum + message.content.length,
      0
    );

    expect(compacted.length).toBeLessThanOrEqual(8);
    expect(compacted.at(-1)?.content).toContain('消息19');
    expect(compacted.some((message) => message.content.includes('消息0-'))).toBe(false);
    expect(totalLength).toBeLessThanOrEqual(2_400);
  });
});
