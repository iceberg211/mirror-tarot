import { createQwenChatStream } from '@/lib/ai/qwen';
import { AI_PROMPT_VERSIONS, buildReadingSystemPrompt, buildReadingUserPrompt } from '@/lib/ai/prompts';
import { getCardMeaning } from '@/lib/tarot/meanings';
import { getSpreadByType } from '@/lib/tarot/spreads';
import { SelectedCard } from '@/lib/tarot/types';

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
    const cardsWithMeanings = cards.map((c: SelectedCard) => ({
      card: c,
      meaning: getCardMeaning(c.id, c.orientation),
    }));

    // 生成分离架构的 System 与 User Prompts
    const systemPrompt = buildReadingSystemPrompt(cards.length);
    const userPrompt = buildReadingUserPrompt(question, mood, spread.name, cardsWithMeanings);

    // 调起公用流请求与 SSE 解析助手，传递双消息角色，提高生成质量与输出格式稳定性
    return await createQwenChatStream([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.75,
      requestName: 'reading',
      promptVersion: AI_PROMPT_VERSIONS.reading,
    });

  } catch (error) {
    console.error('API /api/reading Error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
