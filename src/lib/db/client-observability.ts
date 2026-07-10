'use client';

import { supabase } from '@/lib/supabaseClient';

/**
 * 无 service role 时，登录用户可用 anon+RLS 双写 generation 摘要。
 * 不写入完整问题文本。
 */
export async function clientInsertGeneration(meta: {
  readingId: string;
  requestId?: string | null;
  model?: string | null;
  promptVersion?: string | null;
  inputHash?: string | null;
  safetyLevel?: string | null;
  durationMs?: number | null;
  status?: 'success' | 'error' | 'blocked' | 'partial';
}): Promise<void> {
  if (!supabase || !meta.readingId) return;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return;

    const { error } = await supabase.from('reading_generations').insert({
      reading_id: meta.readingId,
      user_id: userId,
      generation_no: 1,
      model: meta.model || '',
      prompt_version: meta.promptVersion || '',
      input_hash: meta.inputHash || '',
      output_jsonb: { client: true },
      status: meta.status || 'success',
      safety_labels: meta.safetyLevel ? [meta.safetyLevel] : [],
      duration_ms: meta.durationMs ?? null,
      request_id: meta.requestId || null,
    });

    if (error) {
      // 表未 migration 时静默
      console.warn('[client-observability] generation insert skipped:', error.message);
    }
  } catch (e) {
    console.warn('[client-observability] generation insert failed:', e);
  }
}

export async function clientUpsertActionItem(meta: {
  readingId: string;
  seedText: string;
  status?: 'pending' | 'completed' | 'failed' | 'dismissed';
}): Promise<void> {
  if (!supabase || !meta.seedText.trim()) return;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return;

    const { error } = await supabase.from('action_items').insert({
      user_id: userId,
      reading_id: meta.readingId,
      seed_text: meta.seedText.trim().slice(0, 200),
      status: meta.status || 'pending',
    });

    if (error) {
      console.warn('[client-observability] action_item insert skipped:', error.message);
    }
  } catch (e) {
    console.warn('[client-observability] action_item insert failed:', e);
  }
}
