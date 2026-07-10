import { getSupabaseAdmin } from '../supabase-admin';

export type ActionItemStatus = 'pending' | 'completed' | 'failed' | 'dismissed';

export async function upsertActionItem(input: {
  userId: string;
  readingId?: string;
  seedText: string;
  status?: ActionItemStatus;
  dueDate?: string | null;
}): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin || !input.userId) return false;

  const seedText = input.seedText.trim().slice(0, 200);
  if (!seedText) return false;

  try {
    // 同 reading 下尽量保持一条 pending，用 insert 简化（缺唯一约束时允许多条）
    const { error } = await admin.from('action_items').insert({
      user_id: input.userId,
      reading_id: input.readingId ?? null,
      seed_text: seedText,
      status: input.status ?? 'pending',
      due_date: input.dueDate ?? null,
    });

    if (error) {
      console.warn('[action_items] insert failed (fail-soft):', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[action_items] insert exception (fail-soft):', e);
    return false;
  }
}
