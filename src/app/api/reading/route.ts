import { streamText } from 'ai';
import { getQwenModel } from '@/lib/ai/qwen';
import { buildReadingPrompt } from '@/lib/ai/prompts';
import { getCardMeaning } from '@/lib/tarot/meanings';
import { getSpreadByType } from '@/lib/tarot/spreads';

// 为了在本地开发中获得最准确的 Node.js 兼容性，暂时撤销 Edge Runtime
// export const runtime = 'edge';

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

    // 动态加载环境变量
    const apiKey = process.env.DASHSCOPE_API_KEY || '';
    const baseURL = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const modelName = process.env.QWEN_MODEL || 'qwen-plus';

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'DASHSCOPE_API_KEY is not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. 发起原生的 HTTP 请求，强制开启 stream: true
    const response = await fetch(`${baseURL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: promptText }],
        temperature: 0.75,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Qwen API Error:', errText);
      return new Response(JSON.stringify({ error: `LLM Endpoint error: ${errText}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!response.body) {
      return new Response(JSON.stringify({ error: 'Empty response body from LLM' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. 自定义 ReadableStream，将百炼的 SSE (Server-Sent Events) 流式数据提取并转换为纯文本流
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = response.body.getReader();

    const textStream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留不完整的一行

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === 'data: [DONE]') continue;
              if (trimmed.startsWith('data: ')) {
                try {
                  const jsonStr = trimmed.slice(6);
                  const data = JSON.parse(jsonStr);
                  const content = data.choices?.[0]?.delta?.content || '';
                  if (content) {
                    controller.enqueue(encoder.encode(content));
                  }
                } catch (e) {
                  // 忽略部分解析失败的 JSON 片段
                }
              }
            }
          }
        } catch (streamErr) {
          console.error('Stream processing error:', streamErr);
          controller.error(streamErr);
        }
      },
    });

    return new Response(textStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('API /api/reading Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
