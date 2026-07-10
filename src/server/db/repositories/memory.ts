import { getSupabaseAdmin } from '../supabase-admin';

export type MemoryCategory =
  | 'style_pref'
  | 'recurring_theme'
  | 'confirmed_goal'
  | 'action_outcome'
  | 'note';

export interface UserMemoryItem {
  id: string;
  userId: string;
  category: MemoryCategory;
  content: string;
  sourceReadingId?: string | null;
  confidence: number;
  consentScope: string;
  expiresAt?: string | null;
  userEditable: boolean;
  createdAt: string;
  updatedAt: string;
}

const MAX_MEMORY_ITEMS = 12;
const MAX_CONTENT_LEN = 200;

export async function listActiveMemory(userId: string): Promise<UserMemoryItem[]> {
  const admin = getSupabaseAdmin();
  if (!admin || !userId) return [];

  try {
    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('user_memory')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('updated_at', { ascending: false })
      .limit(MAX_MEMORY_ITEMS);

    if (error) {
      console.warn('[memory] list failed (fail-soft):', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      category: row.category,
      content: String(row.content || '').slice(0, MAX_CONTENT_LEN),
      sourceReadingId: row.source_reading_id,
      confidence: row.confidence ?? 0.5,
      consentScope: row.consent_scope,
      expiresAt: row.expires_at,
      userEditable: row.user_editable !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (e) {
    console.warn('[memory] list exception (fail-soft):', e);
    return [];
  }
}

/**
 * 拼装进 prompt 的短摘要；不含敏感长文。
 */
export function buildMemoryContextPrompt(items: UserMemoryItem[]): string {
  if (!items.length) return '';

  const lines = items.map((item) => {
    const conf = Math.round((item.confidence || 0) * 100);
    return `- [${item.category}|${conf}%] ${item.content.slice(0, MAX_CONTENT_LEN)}`;
  });

  return `【用户允许的长期记忆摘要（结构化，非完整日记）】\n${lines.join('\n')}\n（说明：仅作语气与主题参考；不要当作不可更改的事实，不要复述隐私细节）`;
}

export async function upsertMemoryItem(input: {
  userId: string;
  category: MemoryCategory;
  content: string;
  sourceReadingId?: string;
  confidence?: number;
  consentScope?: 'user_explicit' | 'inferred_low' | 'system';
  expiresAt?: string | null;
}): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin || !input.userId) return false;

  const content = input.content.trim().slice(0, MAX_CONTENT_LEN);
  if (!content) return false;

  try {
    const { error } = await admin.from('user_memory').insert({
      user_id: input.userId,
      category: input.category,
      content,
      source_reading_id: input.sourceReadingId ?? null,
      confidence: input.confidence ?? 0.4,
      consent_scope: input.consentScope ?? 'inferred_low',
      expires_at: input.expiresAt ?? null,
      user_editable: true,
    });

    if (error) {
      console.warn('[memory] insert failed (fail-soft):', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[memory] insert exception (fail-soft):', e);
    return false;
  }
}

export async function softDeleteMemoryItem(userId: string, id: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin || !userId || !id) return false;

  try {
    const { error } = await admin
      .from('user_memory')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.warn('[memory] soft delete failed (fail-soft):', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[memory] soft delete exception (fail-soft):', e);
    return false;
  }
}
