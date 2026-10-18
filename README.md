This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase 数据库初始化

当前应用的账号、日记同步和 AI 记录依赖以下 Supabase 表：

- `readings`
- `checkins`
- `monthly_reports`
- `profiles`
- `insight_snapshots`
- `reading_generations`
- `reading_messages`
- `user_memory`
- `action_items`

初始化步骤：

1. 将 Supabase 浏览器端配置写入 `.env.local`。
2. 配置 `SUPABASE_DB_URL` 后执行完整迁移：

```bash
pnpm db:init
```

也可以打开 Supabase 项目的 SQL Editor，按文件名顺序执行 `supabase/migrations/*.sql`。

3. 在项目根目录运行检查命令：

```bash
pnpm db:check
```

`db:check` 只读检查表和字段是否可访问，不会写入或删除业务数据。

登录回调地址需要在 Supabase Authentication 的 URL Configuration 中加入：

```text
http://localhost:3005/auth/callback
```

生产环境还需要加入对应的正式域名回调地址。

## AI 模型与成本配置

复制 `.env.example` 中需要的配置到本地或部署环境：

- 默认服务商为通义千问，深度模型默认使用 `qwen-plus`，快速模型使用 `qwen-turbo`。
- 将 `AI_PROVIDER` 设为 `deepseek` 并配置 `DEEPSEEK_API_KEY`，即可切换到 DeepSeek。
- 可分别设置 `AI_PROVIDER_FAST`、`AI_PROVIDER_DEEP` 和 `AI_PROVIDER_FALLBACK`，让不同层级使用不同服务商。
- 每类请求都在服务端设置了最大输出 Token，客户端不能扩大该限制。
- 模型返回的真实输入、缓存输入和输出 Token 会写入 `reading_generations`。
- 人民币成本由实际 Token 与价格表计算。未知模型不会猜测价格，成本字段会保留为空；可通过 `AI_PRICE_*` 环境变量配置实际合同价格。

部署前需要执行新增迁移：

```bash
supabase/migrations/202607180001_ai_usage_cost.sql
```

价格会随服务商调整，生产环境应定期核对价格，或通过环境变量覆盖内置价格。
