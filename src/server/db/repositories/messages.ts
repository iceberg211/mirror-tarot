import { getSupabaseAdmin } from '../supabase-admin';

export async function insertReadingMessage(input: {
  userId: string;
  readingId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin || !input.userId || !input.readingId) return false;

  const content = input.content.trim().slice(0, 2000);
  if (!content) return false;

  try {
    const { error } = await admin.from('reading_messages').insert({
      user_id: input.userId,
      reading_id: input.readingId,
      role: input.role,
      content,
    });

    if (error) {
      console.warn('[messages] insert failed (fail-soft):', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[messages] insert exception (fail-soft):', e);
    return false;
  }
}
