import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveUserIdFromRequest } from '@/server/ai/auth';
import { handleRouteError, jsonError, ApiError } from '@/server/ai/errors';
import {
  listActiveMemory,
  softDeleteMemoryItem,
  upsertMemoryItem,
  type MemoryCategory,
} from '@/server/db/repositories/memory';
import { getSupabaseAdmin } from '@/server/db/supabase-admin';

const createSchema = z.object({
  category: z.enum([
    'style_pref',
    'recurring_theme',
    'confirmed_goal',
    'action_outcome',
    'note',
  ]),
  content: z.string().trim().min(1).max(200),
  sourceReadingId: z.string().max(128).optional(),
  confidence: z.number().min(0).max(1).optional(),
  consentScope: z.enum(['user_explicit', 'inferred_low', 'system']).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

async function requireUser(req: Request): Promise<string> {
  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    throw new ApiError('UNAUTHORIZED', '需要登录后才能管理长期记忆', 401);
  }
  if (!getSupabaseAdmin()) {
    throw new ApiError(
      'INTERNAL_ERROR',
      '服务端未配置 SUPABASE_SERVICE_ROLE_KEY，暂无法管理记忆',
      503
    );
  }
  return userId;
}

export async function GET(req: Request) {
  try {
    const userId = await requireUser(req);
    const items = await listActiveMemory(userId);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return handleRouteError(error, 'API /api/memory GET');
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUser(req);
    const body = createSchema.parse(await req.json());
    const ok = await upsertMemoryItem({
      userId,
      category: body.category as MemoryCategory,
      content: body.content,
      sourceReadingId: body.sourceReadingId,
      confidence: body.confidence ?? 0.8,
      consentScope: body.consentScope ?? 'user_explicit',
      expiresAt: body.expiresAt,
    });

    if (!ok) {
      return jsonError('INTERNAL_ERROR', '写入记忆失败', 500);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError('VALIDATION_ERROR', '请求参数校验失败', 400, {
        issues: error.issues,
      });
    }
    return handleRouteError(error, 'API /api/memory POST');
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return jsonError('VALIDATION_ERROR', '缺少 id', 400);
    }
    const ok = await softDeleteMemoryItem(userId, id);
    if (!ok) {
      return jsonError('INTERNAL_ERROR', '删除记忆失败', 500);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'API /api/memory DELETE');
  }
}
