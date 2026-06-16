import { getQwenModel } from '@/lib/ai/qwen';

export async function POST(req: Request) {
  try {
    const { checkins, readings, topCards } = await req.json();

    const apiKey = process.env.DASHSCOPE_API_KEY || '';
    const baseURL = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const modelName = process.env.QWEN_MODEL || 'qwen-plus';

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'DASHSCOPE_API_KEY is not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 组装大模型潜意识月度报告 Prompt
    const checkinText = checkins && checkins.length > 0
      ? checkins.map((c: any) => `* ${c.date}: ${c.mood}`).join('\n')
      : '无打卡历史';

    const readingsText = readings && readings.length > 0
      ? readings.map((r: any) => `* 问题: "${r.question}" | 情绪: ${r.mood} | 卡牌: ${r.cards.map((c: any) => `${c.zhName}(${c.orientation === 'reversed' ? '逆位' : '正位'})`).join(', ')}`).join('\n')
      : '无塔罗占卜记录';

    const topCardsText = topCards && topCards.length > 0
      ? topCards.map((tc: any, i: number) => `${i + 1}. ${tc.zhName} (出现 ${tc.count} 次)`).join('\n')
      : '暂无高频卡牌';

    const promptText = `你是一位融合了经典塔罗神秘学、潜意识释梦、以及人本主义心理咨询的深度心理学导师。
今天，有一位名为 "Mirror Tarot" 的用户向你呈递了他过去 30 天的意识活动轨迹与潜意识卡牌镜像，希望得到你的深度梳理：

下面是该用户最近 30 天的真实记录：
---
1. 【每日情绪签到轨迹】：
${checkinText}

2. 【塔罗测算与情绪日记列表】：
${readingsText}

3. 【频繁浮现的潜意识星卡 (Top 3)】：
${topCardsText}
---

请撰写一份高度疗愈、深刻且充满诗性与抚慰感的《月度镜面潜意识反射信札》。
请遵循以下排版锚点格式（必须严格包含以下标题锚点，以便前端提取解析渲染，且直接以 "#" 开头，不要输出任何额外的废话或包裹标记）：

# SUMMARY
用一段极为温柔、富有同理心且优美的语言（150字左右），总结他这一个月的灵魂状态和情绪脉搏，像一封信的开头，照亮他的镜中倒影。

# EMOTION_WATER
结合情绪轨迹和测算问题，深度解构他这一个月的“情绪水位起伏线”。探讨他是从纠结走向平静，还是频繁陷入焦虑？情绪背后代表了什么样的精神饥渴或安全感漏洞？

# SUB_SHADOW
重点剖析那几张“频繁浮现的潜意识星卡”。告诉他为什么这几张牌在不断敲击他的心智之镜？它们代表了他刻意逃避的什么“阴影 (Shadow)”，或是他体内被压抑却呼之欲出的强大“阿尼玛/阿尼姆斯”力量？

# THERAPY_SOUL
给用户开出 2~3 条极为切实、充满仪式感且温和的“灵性处方”（例如冥想方式、生活细节微调、或者自我接纳的练习），并以一小段充满希望的宇宙祝福语结束这封信。

请直接输出内容，语气要像对待一位在深夜里探寻方向的旅人，真诚、温润、深刻。`;

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
        temperature: 0.8,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Monthly report API Error:', errText);
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

    // 2. 流式传输 ReadableStream 自定义提取
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
                  // 忽略
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
    console.error('API /api/journal/report Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
