import { createQwenChatStream } from '@/lib/ai/qwen';
import { AI_PROMPT_VERSIONS, buildMonthlyReportPrompt } from '@/lib/ai/prompts';

interface ReportCheckIn {
  date: string;
  mood: string;
}

interface ReportCard {
  zhName: string;
  orientation: 'upright' | 'reversed';
}

interface ReportReading {
  question: string;
  mood: string;
  cards: ReportCard[];
}

interface ReportTopCard {
  zhName: string;
  count: number;
}

interface ReportRequestBody {
  checkins?: ReportCheckIn[];
  readings?: ReportReading[];
  topCards?: ReportTopCard[];
}

export async function POST(req: Request) {
  try {
    const { checkins = [], readings = [], topCards = [] } = (await req.json()) as ReportRequestBody;
    const promptText = buildMonthlyReportPrompt({ checkins, readings, topCards });

    // 一键调起公用流请求与 SSE 解析助手
    return await createQwenChatStream([{ role: 'user', content: promptText }], {
      temperature: 0.8,
      requestName: 'monthly-report',
      promptVersion: AI_PROMPT_VERSIONS.monthlyReport,
    });

  } catch (error) {
    console.error('API /api/journal/report Error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
