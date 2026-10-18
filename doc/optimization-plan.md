# mirror-tarot 优化方案

> 原则：**不重写、不追新技术，分四阶段收敛风险**。每个阶段结束时 `pnpm ci`（lint + typecheck + test + build）必须全绿，且可独立上线、可独立回滚。

---

## 阶段 0 · 止血（约 0.5 天，低风险，先做）

### 0.1 限流从「只按 IP」改为「按用户 + 按 IP」

现状：`enforceRateLimit(req, route, userKey?)` 的第三个参数全站 5 个调用点都没传，实际只按 IP 计数；`x-forwarded-for` 可伪造，且桶是进程内 `Map`，多实例下形同虚设。

改动（`src/app/api/**/route.ts` 共 5 处）：

```ts
// 调整顺序：先解析身份，再限流
const userId = await resolveUserIdFromRequest(req);   // 无 token 时直接返回 null，不发网络请求
const rate = enforceRateLimit(req, 'reading', userId ?? undefined);
```

`src/server/ai/rate-limit.ts` 增加匿名档位：

```ts
export const AI_RATE_LIMITS = {
  reading:  { limit: 10, windowMs: 60_000, anonLimit: 2 },
  followUp: { limit: 20, windowMs: 60_000, anonLimit: 3 },
  dream:    { limit: 8,  windowMs: 60_000, anonLimit: 2 },
  report:   { limit: 5,  windowMs: 60_000, anonLimit: 1 },
  draw:     { limit: 60, windowMs: 60_000, anonLimit: 10 },
} as const;
// checkRateLimit 内按 userKey 是否存在选择 limit
```

**这一条只解决「同一 IP 抠同一用户额度」和「游客被过度放行」，跨实例问题留给阶段 2。**

### 0.2 本地存储配额兜底（优先级最高的数据安全问题）

现状：`writeJsonArray()` 是裸 `localStorage.setItem`，全站日记塞在一个 key 的完整数组里，无 `QuotaExceededError` 处理。虽然 `saveLocalReading` 有 try/catch，但结果是 `return ''`——用户看到的是「解读生成了，但记录没了」，且没有任何提示。

改动一：`src/lib/db/local-storage.ts`

```ts
export class StorageQuotaError extends Error {
  constructor(public readonly key: string) {
    super(`localStorage quota exceeded: ${key}`);
    this.name = 'StorageQuotaError';
  }
}

export function writeJsonArray<T>(key: string, value: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e instanceof DOMException && /QuotaExceeded|NS_ERROR_DOM_QUOTA/i.test(e.name + e.message)) {
      throw new StorageQuotaError(key);
    }
    throw e;
  }
}
```

改动二：把 `saveLocalReading` 的返回值从 `string` 改为可判别的结果（4 个调用点，可控）：

```ts
export type SaveReadingsResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'quota' | 'unknown' };

// reading/new/page.tsx、reading/daily/page.tsx、NightReflectionsModal.tsx 分别处理
// reason === 'quota' → 弹「本地空间不足，请先导出备份」并跳转 journal 的 BackupSection（导出能力已存在）
```

改动三：`useJournalData` 增加 `storageWarning` 状态，在日记页顶部常驻一条提示 + 一键跳「备份/导出」。

> 说明：这里只做「不丢数据 + 说清楚」，真正的容量问题由阶段 3 的 IndexedDB 解决。

### 0.3 清理死代码（降低后续改动噪音）

| 对象 | 处理 |
|---|---|
| `src/server/ai/provider/router.ts` 的 `withModelFallback` | 阶段 2 才会真正接入，暂保留并在文件头加 TODO，不删 |
| `langsmith` 依赖 | `pnpm remove langsmith`（`src` 零引用，白搭冷启动）；与 lockfile 一并提交 |
| `getHistoricalContextForAI` | 删除函数与 `localJournal.ts` 的导出（AI 上下文已改服务端 `listActiveMemory`） |
| `public/{next,vercel,file,globe,window}.svg` | 删除模板残留 |

---

## 阶段 1 · 一致性与可感知体验（1–2 天）

### 1.1 主题 token 化（浅色模式目前是坏的）

现状：24 个文件、52 处硬编码 `bg-[#0...]`，而 light 主题把 `--foreground` 改成 `#2A251E`——深底深字，对比度约 1.3:1。`reading/[id]/page.tsx` 一页就有 8 处。

两类处理，不要一刀切：

1. **UI 底色**：`#07090F → bg-background`、`#11131A → bg-card`。建立映射表后脚本批量替换，人工过一遍 diff。
2. **四元素氛围色**（`#050912`/`#0C0604`/`#07090C`/`#040805`）：这是有意的情绪配色，不该被 light 抹平。新增独立变量，只调明度：

```css
:root {
  --element-water: #050912; --element-fire: #0C0604;
  --element-wind:  #07090C; --element-earth: #040805;
}
html.light {
  --element-water: #EEF3FA; --element-fire: #FBF1EC;
  --element-wind:  #F1F3F5; --element-earth: #EFF6F0;
}
@theme { --color-element-water: var(--element-water); /* ... */ }
```

3. **必须固定深色的场景**：`SharePoster`（导出成图，跟着 light 翻白会毁掉海报）和 `BreathingZen`（冥想氛围）。给容器加 `data-surface="fixed-dark"`，文本用 `text-on-dark` 而非 `text-foreground`，避免被主题变量带跑。

验收：light 模式下逐页过一遍 `/`、`/journal`、`/reading/[id]`、`/deck`、`/zen`、`/account`，正文对比度 ≥ 4.5:1。

### 1.2 补错误边界

`src/app` 目前没有 `error.tsx` / `not-found.tsx` / `loading.tsx`，任何异常都掉到 Next 默认英文错误页。

新增 4 个文件（中文文案、沿用 `bg-background text-foreground`）：

- `src/app/error.tsx`（`'use client'`，`reset()` + 展示 `error.digest` 便于对日志）
- `src/app/global-error.tsx`（layout 本身崩溃的兜底）
- `src/app/not-found.tsx`（「这面镜子没有映出内容」+ 返回首页）
- `src/app/loading.tsx`（骨架屏，替换各页 `✦ 加载中 ✦` 的硬编码）

### 1.3 图片与静态资源

```ts
// next.config.ts
images: { formats: ['image/avif', 'image/webp'], deviceSizes: [360, 414, 640, 768] }
```

- `public/cards/rws/*.jpg`（78 张，7.5MB）全部改 `next/image`，卡面统一 `sizes="(max-width: 768px) 45vw, 200px"`，删掉 4 处 `eslint-disable @next/next/no-img-element`。
- 首屏用的几张（`HomeHero`、各页 shell header）加 `priority`。

### 1.4 顺手拆分两个超大组件（可选，若时间允许）

`AnalyticsTab.tsx`（532 行）与 `BreathingZen.tsx`（526 行）按 AGENTS.md 的规范拆成「容器 + 展示子组件 + 专属 hook」（如 `useAnalyticsData`、`useBreathCycle`）。不做也不影响上面任何一项。

---

## 阶段 2 · 成本控制面（3–5 天）

### 2.1 共享限流：用 Supabase 而不是新供应商

已有 `pg` + Supabase，不要再引 Upstash。新增迁移：

```sql
create table if not exists public.ai_quota_counters (
  key text primary key,
  window_start timestamptz not null,
  count integer not null default 0
);
alter table public.ai_quota_counters enable row level security;

create or replace function public.consume_ai_quota(
  p_key text, p_limit integer, p_window_seconds integer
) returns table(allowed boolean, remaining integer, reset_at timestamptz)
language sql security definer as $$
  insert into public.ai_quota_counters as c (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when c.window_start < now() - make_interval(secs => p_window_seconds)
                 then 1 else c.count + 1 end,
    window_start = case when c.window_start < now() - make_interval(secs => p_window_seconds)
                        then now() else c.window_start end
  returning c.count <= p_limit, greatest(p_limit - c.count, 0),
            c.window_start + make_interval(secs => p_window_seconds);
$$;
```

`checkRateLimit` 改为 `async`，`fire-and-forget` 不成立（必须等结果），代价约 5–15ms/次，可接受。**DB 异常时降级为内存限流 + 记日志（fail-open，不阻断用户）**。

### 2.2 每日预算熔断

成本字段已经齐了（`reading_generations.total_cost_cny`，`202607180001_ai_usage_cost.sql`），不需要新表：

```ts
// src/server/ai/budget.ts —— 结果缓存 60s，避免每次请求都聚合
const spent = await admin.rpc('sum_ai_cost_since', { p_since: startOfToday() });
if (budget > 0 && spent >= budget) throw new ApiError('SERVICE_BUSY', '今日额度已用完，请明天再来', 503);
```

新增 `AI_DAILY_BUDGET_CNY`（默认 `0` = 关闭），先观察一周真实花费再设阈值。

### 2.3 环境变量启动校验（fail fast）

现在的行为是：缺 key 时 `getAIConfig` 返回空字符串，直到用户点下「生成」才炸。新增 `src/lib/env/server.ts`：

```ts
const schema = z.object({
  AI_PROVIDER: z.enum(['qwen', 'deepseek']).default('qwen'),
  DASHSCOPE_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  // ...
}).refine(v => v.AI_PROVIDER === 'deepseek' ? !!v.DEEPSEEK_API_KEY : !!v.DASHSCOPE_API_KEY, {
  message: '当前 AI_PROVIDER 对应的 API Key 未配置',
});
// 首次调用时 parse 一次并缓存；CI build 不触发（保证无 key 也能 build）
```

### 2.4 把「模型降级」真正接上

`withModelFallback` 现在零调用方，`.env.example` 里的 `AI_PROVIDER_FALLBACK` 是空承诺。但流式场景不能简单套用——**已经吐字了再重试会产生重复内容**。

正确做法：只对「首 token 之前失败」重试：

```ts
async function streamWithRetry(run: (tier: ModelTier) => Promise<Response>, primary: ModelTier) {
  try {
    return await run(primary);
  } catch (e) {
    if (!isTransientAIError(e)) throw e;
    await sleep(nextRetryDelayMs(0));
    return await run('fallback');        // 此时还没开始输出，安全
  }
}
```

非流式（`createAIJsonCompletion`）直接套现有 `withModelFallback` 即可。

---

## 阶段 3 · 架构收敛（1–2 周，单独排期）

### 3.1 本地存储换 IndexedDB + outbox

- 用 `idb` 建库：`readings`（按 id 主键、`updatedAt` 索引）、`checkins`、`outbox`。
- 写入变单条 `put`，不再是「读全量 → 改数组 → 写全量」，同时解决容量与 O(n) 写放大。
- `outbox` 记录待同步操作，联网后 flush，天然支持离线。

### 3.2 单写入口（BFF）

现状是客户端 `src/lib/db/journal-crud.ts` 直连 Supabase 写 `readings`，服务端另一套 `src/server/db/repositories/*` 写 `reading_generations`/`user_memory`。两边 schema 各自演进，数据完整性交给浏览器。

目标：新增 `POST /api/journal/readings`，客户端只写本地 + outbox，由服务端统一落地（service role 写入，RLS 保留为纵深防御）。这样校验、审计、幂等都在一个地方。

> 这一步会动到同步链路，**必须有 E2E 兜底之后再动**。

### 3.3 E2E 补位

Playwright 三条主链路，跑在 CI 的 `test:e2e`：

1. 抽牌 → 流式生成 → 保存 → 刷新后仍在
2. 登录 → 本地数据合并上云 → 换「设备」（新 storage）→ 拉回
3. 本地空间写满（mock `setItem` 抛 QuotaExceeded）→ 出现提示且不丢失当前解读

---

## 验收与回滚

| 阶段 | 验收 | 回滚 |
|---|---|---|
| 0 | `pnpm ci` 绿；手工验证 3 个 AI 接口匿名第 3 次被 429；DevTools 把 storage 塞满后保存有明确提示 | 单文件改动，`git revert` 即可 |
| 1 | light 模式全页面对比度检查；断网/抛错时显示中文错误页；Lighthouse LCP 提升 | 独立 PR |
| 2 | 两个实例并发请求合计超过配额被拦；当日成本超阈值返回 503；删掉 key 后启动即报清晰错误 | 迁移可 drop 表；`AI_DAILY_BUDGET_CNY=0` 一键关闭 |
| 3 | E2E 三条链路绿；离线新增记录后联网自动同步 | 按 feature flag 灰度（`NEXT_PUBLIC_LOCAL_STORE=idb`） |

## 明确不做的事（避免过度工程）

- 不引入 Zustand / React Query：现有 hooks + `dataEpoch` 模式够用，换状态库只会增加迁移成本。
- 不把整站改 Server Components：核心是 localStorage 驱动的交互流，强行 SSR 收益极低。
- 不做 i18n：当前只服务中文用户，硬编码文案不是问题。
- 不拆 monorepo / 不换 ORM：9 张表、单一后端，Prisma/Drizzle 带来的收益小于迁移成本。
