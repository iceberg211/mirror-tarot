This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
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

当前应用的日记同步依赖三张 Supabase 表：

- `readings`
- `checkins`
- `monthly_reports`

初始化步骤：

1. 打开 Supabase 项目的 SQL Editor。
2. 复制并执行 [supabase/migrations/202606170001_init_journal_sync.sql](./supabase/migrations/202606170001_init_journal_sync.sql)。
3. 在项目根目录运行检查命令：

```bash
npm run db:check
npm run db:check:write
```

`db:check` 会检查表和字段是否可访问；`db:check:write` 会写入一组临时健康检查数据并立即删除，用来确认前端同步路径可用。

注意：当前同步模式使用浏览器生成的 `device_id` 分组数据，适合未登录阶段的数据恢复体验。它不是账号级权限体系，正式账号功能上线后应改为基于 `auth.uid()` 的 RLS 策略。
