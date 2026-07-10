import { getSupabaseAdmin } from '../supabase-admin';

export type GenerationStatus = 'success' | 'error' | 'blocked' | 'partial';

export interface GenerationRecordInput {
  readingId: string;
  userId?: string | null;
  generationNo?: number;
  model?: string;
  promptVersion?: string;
  inputHash?: string;
  output?: Record<string, unknown>;
  status?: GenerationStatus;
  safetyLabels?: string[];
  ttftMs?: number | null;
  durationMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  errorCode?: string | null;
  requestId?: string | null;
}

/**
 * 写入 generation 记录。无 admin 或无 userId 时跳过（不抛错）。
 */
export async function insertGeneration(input: GenerationRecordInput): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin || !input.userId) return false;

  try {
    const { error } = await admin.from('reading_generations').insert({
      reading_id: input.readingId,
      user_id: input.userId,
      generation_no: input.generationNo ?? 1,
      model: input.model ?? '',
      prompt_version: input.promptVersion ?? '',
      input_hash: input.inputHash ?? '',
      output_jsonb: input.output ?? {},
      status: input.status ?? 'success',
      safety_labels: input.safetyLabels ?? [],
      ttft_ms: input.ttftMs ?? null,
      duration_ms: input.durationMs ?? null,
      input_tokens: input.inputTokens ?? null,
      output_tokens: input.outputTokens ?? null,
      error_code: input.errorCode ?? null,
      request_id: input.requestId ?? null,
    });

    if (error) {
      console.warn('[generations] insert failed (fail-soft):', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[generations] insert exception (fail-soft):', e);
    return false;
  }
}
