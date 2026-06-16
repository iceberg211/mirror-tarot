import { createQwenChatStream } from '@/lib/ai/qwen';
import { buildFollowUpPrompt } from '@/lib/ai/prompts';

export async function POST(req: Request) {
  try {
    const { question, mood, spreadName, cards, previousReading, chatHistory, newQuestion } = await req.json();

    if (!question || !cards || !previousReading || !newQuestion) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const promptText = buildFollowUpPrompt(
      question,
      mood,
      spreadName,
      cards,
      previousReading,
      chatHistory || [],
      newQuestion
    );

    // 一键调起公用流请求与 SSE 解析助手
    return await createQwenChatStream([{ role: 'user', content: promptText }], 0.7);

  } catch (error: any) {
    console.error('API /api/reading/follow-up Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
