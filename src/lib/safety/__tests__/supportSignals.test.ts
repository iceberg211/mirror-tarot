import { describe, expect, it } from 'vitest';
import { isSupportMessage } from '../supportSignals';

describe('isSupportMessage', () => {
  it('不把日常语境里的「安全感」误判为危机兜底', () => {
    expect(isSupportMessage('这段关系让你感到不安全，你需要的是一份稳定的安全感。')).toBe(false);
    expect(isSupportMessage('先确认环境安全，再决定要不要推进这个项目。')).toBe(false);
    expect(isSupportMessage('你的直觉很准，但财务安全垫需要再厚一些。')).toBe(false);
  });

  it('识别安全兜底文案里的资源标题', () => {
    expect(isSupportMessage('【可参考资源】\n- 全国心理援助热线：400-161-9995')).toBe(true);
    expect(isSupportMessage('如果你愿意，可以先联系全国心理援助热线。')).toBe(true);
  });

  it('识别带分隔符与不带分隔符的热线号码', () => {
    expect(isSupportMessage('请拨打 400-161-9995 或 010-82951332。')).toBe(true);
    expect(isSupportMessage('请拨打 4001619995。')).toBe(true);
    expect(isSupportMessage('请拨打 400 161 9995 转接。')).toBe(true);
  });

  it('号码被更长数字串包裹时不误判', () => {
    expect(isSupportMessage('订单号 40016199950 已生成，请勿泄露。')).toBe(false);
  });

  it('空值与普通文本返回 false', () => {
    expect(isSupportMessage('')).toBe(false);
    expect(isSupportMessage(null)).toBe(false);
    expect(isSupportMessage(undefined)).toBe(false);
    expect(isSupportMessage('抽到了愚人，代表重新开始。')).toBe(false);
  });
});
