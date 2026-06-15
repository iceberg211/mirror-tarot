import { streamText } from 'ai';
import { qwenModel } from '@/lib/ai/qwen';
import { buildFollowUpPrompt } from '@/lib/ai/prompts';

export const runtime = 'edge';

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

    const result = await streamText({
      model: qwenModel,
      prompt: promptText,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
