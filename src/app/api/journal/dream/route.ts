import { NextResponse } from 'next/server';
import { createAIJsonCompletion } from '@/lib/ai/client';
import { AI_PROMPT_VERSIONS, buildDreamSystemPrompt, buildDreamUserPrompt } from '@/lib/ai/prompts';

interface DreamAnalysisResult {
  dreamAnalysis: string;
  tarotMetaphor: string;
  questionForSubconscious: string;
  dreamColors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeDreamAnalysisResult(value: unknown): DreamAnalysisResult | null {
  if (!isRecord(value)) return null;

  const dreamAnalysis = typeof value.dreamAnalysis === 'string' ? value.dreamAnalysis.trim() : '';
  const tarotMetaphor = typeof value.tarotMetaphor === 'string' ? value.tarotMetaphor.trim() : '';
  const questionForSubconscious = typeof value.questionForSubconscious === 'string'
    ? value.questionForSubconscious.trim()
    : '';

  if (!dreamAnalysis || !tarotMetaphor || !questionForSubconscious) {
    return null;
  }

  const dreamColors = Array.isArray(value.dreamColors)
    ? value.dreamColors.filter(isHexColor).slice(0, 3)
    : [];

  return {
    dreamAnalysis,
    tarotMetaphor,
    questionForSubconscious,
    dreamColors: dreamColors.length === 3 ? dreamColors : ['#2A2540', '#4B3F72', '#A68A64'],
  };
}

function isDreamAnalysisResult(value: unknown): value is DreamAnalysisResult {
  return normalizeDreamAnalysisResult(value) !== null;
}

export async function POST(req: Request) {
  try {
    const { dreamText } = await req.json();

    if (!dreamText || !dreamText.trim()) {
      return NextResponse.json({ error: 'Dream text is empty' }, { status: 400 });
    }

    const systemPrompt = await buildDreamSystemPrompt();
    const userPrompt = await buildDreamUserPrompt(dreamText.trim());
    const result = await createAIJsonCompletion<DreamAnalysisResult>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.7,
        requestName: 'dream',
        promptVersion: AI_PROMPT_VERSIONS.dream,
        validate: isDreamAnalysisResult,
      }
    );
    const normalized = normalizeDreamAnalysisResult(result.data);

    if (!normalized) {
      return NextResponse.json({
        success: false,
        error: 'AI 返回的数据结构不正确，请重新尝试',
        requestId: result.meta.requestId,
        rawContent: result.rawContent,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ...normalized,
      meta: result.meta,
    });

  } catch (error) {
    console.error('API /api/journal/dream Error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
