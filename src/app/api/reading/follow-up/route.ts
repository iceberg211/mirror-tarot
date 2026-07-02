import { createAIChatStream } from '@/lib/ai/client';
import { AI_PROMPT_VERSIONS, buildFollowUpSystemPrompt, buildFollowUpUserPrompt } from '@/lib/ai/prompts';

export async function POST(req: Request) {
  try {
    const {
      question,
      mood,
      spreadName,
      cards,
      previousReading,
      chatHistory,
      newQuestion,
      style = 'gentle',
      historyContext = '',
    } = await req.json();

    if (!question || !cards || !previousReading || !newQuestion) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = await buildFollowUpSystemPrompt(style);
    const userPrompt = await buildFollowUpUserPrompt(
      question,
      mood,
      spreadName,
      cards,
      previousReading,
      chatHistory || [],
      newQuestion,
      historyContext
    );

    // 调起公用流请求，传递双角色设定，确保 AI 保持客观睿智和字数约束
    return await createAIChatStream([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.7,
      requestName: 'follow-up',
      promptVersion: AI_PROMPT_VERSIONS.followUp,
    });

  } catch (error) {
    console.error('API /api/reading/follow-up Error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
