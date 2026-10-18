export function compactText(
  value: string,
  maxChars: number,
  options: { preserveEnd?: boolean } = {}
): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) return normalized;
  if (maxChars <= 1) return normalized.slice(0, maxChars);

  const marker = '…';
  if (!options.preserveEnd || maxChars < 40) {
    return `${normalized.slice(0, maxChars - marker.length)}${marker}`;
  }

  const available = maxChars - marker.length;
  const headLength = Math.ceil(available * 0.7);
  const tailLength = available - headLength;
  return `${normalized.slice(0, headLength)}${marker}${normalized.slice(-tailLength)}`;
}

export function compactChatHistory(
  history: { role: 'user' | 'assistant'; content: string }[],
  options: {
    maxMessages?: number;
    maxMessageChars?: number;
    maxTotalChars?: number;
  } = {}
): { role: 'user' | 'assistant'; content: string }[] {
  const maxMessages = options.maxMessages ?? 8;
  const maxMessageChars = options.maxMessageChars ?? 420;
  const maxTotalChars = options.maxTotalChars ?? 2_400;
  const recent = history.slice(-maxMessages);
  const result: { role: 'user' | 'assistant'; content: string }[] = [];
  let usedChars = 0;

  for (let index = recent.length - 1; index >= 0; index -= 1) {
    const message = recent[index];
    const remaining = maxTotalChars - usedChars;
    if (remaining <= 0) break;

    const content = compactText(
      message.content,
      Math.min(maxMessageChars, remaining),
      { preserveEnd: true }
    );
    if (!content) continue;

    result.unshift({ role: message.role, content });
    usedChars += content.length;
  }

  return result;
}
