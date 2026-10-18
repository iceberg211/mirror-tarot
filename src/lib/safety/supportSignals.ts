/**
 * 判断一段解读文本是否来自「安全兜底」路径（危机干预）。
 *
 * 只认稳定标识：求助资源标题、机构名、热线号码。
 * 千万不要用「安全」这类日常词判断——正常解读里「安全感」「让你不安全的关系」
 * 极其常见，一旦误判就会给普通用户弹出心理援助热线，既打扰也稀释了真正的危机提示。
 */

const SUPPORT_MARKERS = ['【可参考资源】', '全国心理援助热线', '危机研究与干预中心'] as const;

/** 归一化为纯数字后比对，兼容 400-161-9995 / 400 161 9995 等写法 */
const SUPPORT_HOTLINES = new Set(['4001619995', '01082951332']);

function extractPhoneTokens(text: string): string[] {
  const matches = text.match(/\d[\d\s-]{6,}\d/g) ?? [];
  return matches.map((token) => token.replace(/\D/g, ''));
}

export function isSupportMessage(text: string | null | undefined): boolean {
  if (!text) return false;

  if (SUPPORT_MARKERS.some((marker) => text.includes(marker))) {
    return true;
  }

  return extractPhoneTokens(text).some((digits) => SUPPORT_HOTLINES.has(digits));
}
