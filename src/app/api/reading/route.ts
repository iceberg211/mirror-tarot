import { streamText } from 'ai';
import { qwenModel } from '@/lib/ai/qwen';
import { buildReadingPrompt } from '@/lib/ai/prompts';
import { getCardMeaning } from '@/lib/tarot/meanings';
import { getSpreadByType } from '@/lib/tarot/spreads';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { question, mood, spreadType, cards } = await req.json();

    if (!question || !spreadType || !cards || !Array.isArray(cards)) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const spread = getSpreadByType(spreadType);
    if (!spread) {
      return new Response(JSON.stringify({ error: `Unknown spread type: ${spreadType}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 装配带有具体牌义快照的上下文，发给大模型
    const cardsWithMeanings = cards.map((c: any) => ({
      card: c,
      meaning: getCardMeaning(c.id, c.orientation),
    }));

    const promptText = buildReadingPrompt(question, mood, spread.name, cardsWithMeanings);

    // 调用通义千问进行流式文本生成
    const result = await streamText({
      model: qwenModel,
      prompt: promptText,
      temperature: 0.75,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
