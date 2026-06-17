import { NextResponse } from 'next/server';
import { getAIConfig } from '@/lib/ai/qwen';

export async function POST(req: Request) {
  try {
    const { dreamText } = await req.json();

    if (!dreamText || !dreamText.trim()) {
      return NextResponse.json({ error: 'Dream text is empty' }, { status: 400 });
    }

    const { apiKey, baseURL, modelName } = getAIConfig();

    if (!apiKey) {
      return NextResponse.json({ error: 'DASHSCOPE_API_KEY is not configured' }, { status: 500 });
    }

    const systemPrompt = `你是一位资深的荣格心理学派释梦分析师与情绪专家。你的任务是分析用户的梦境，帮助其理清梦境背后的潜在情绪符号。
请直接返回一个 JSON 对象，不得包含任何 Markdown 格式包裹（即不要有 \`\`\`json 开头），并且不能有任何前言后记。
确保返回的 JSON 结构严格为：
{
  "dreamAnalysis": "针对梦境符号的简要心理学解读与情绪隐喻，字数控制在 80-120 字。语气要真诚温暖。",
  "tarotMetaphor": "解释该梦境所对应的塔罗能量或牌组（如：对应圣杯的水元素或宝剑的焦虑感），字数控制在 40-60 字。",
  "questionForSubconscious": "生成一个针对其潜意识的追问，作为抽牌的问题（例如：关于在梦中被野兽追赶的焦虑，我的潜意识想提醒我什么？），字数 20-30 字。"
}`;

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `这是我昨晚做的梦，请帮我分析：\n“ ${dreamText} ”` }
        ],
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `LLM Endpoint error: ${errText}` }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // 清理可能存在的 markdown 标记 (以防大模型不遵守指令)
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    try {
      const parsed = JSON.parse(cleanedContent);
      return NextResponse.json({ success: true, ...parsed });
    } catch (parseErr) {
      console.error('Failed to parse AI JSON:', cleanedContent);
      return NextResponse.json({ 
        success: false, 
        error: 'AI 返回的数据格式不正确，请重新尝试', 
        rawContent: cleanedContent 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('API /api/journal/dream Error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
