#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const { spawnSync } = require('child_process');

const migrationFile = 'supabase/migrations/202606170001_init_journal_sync.sql';

function loadLocalEnv() {
  if (!fs.existsSync('.env.local')) return {};

  const env = {};
  const lines = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex);
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }

  return env;
}

function main() {
  const localEnv = loadLocalEnv();
  const databaseUrl = process.env.SUPABASE_DB_URL || localEnv.SUPABASE_DB_URL || process.env.DATABASE_URL;

  if (!fs.existsSync(migrationFile)) {
    console.error(`找不到初始化 SQL：${migrationFile}`);
    process.exitCode = 1;
    return;
  }

  if (!databaseUrl) {
    console.error('缺少 SUPABASE_DB_URL。');
    console.error('');
    console.error('方式一：打开 Supabase SQL Editor，复制并执行：');
    console.error(`  ${migrationFile}`);
    console.error('');
    console.error('方式二：从 Supabase Project Settings -> Database 复制连接串后运行：');
    console.error("  SUPABASE_DB_URL='postgresql://...' npm run db:init");
    process.exitCode = 1;
    return;
  }

  const psqlVersion = spawnSync('psql', ['--version'], {
    stdio: 'ignore',
  });

  if (psqlVersion.error) {
    console.error('本机未找到 psql 命令，无法从命令行执行 SQL。');
    console.error('');
    console.error('请改用 Supabase SQL Editor 执行：');
    console.error(`  ${migrationFile}`);
    process.exitCode = 1;
    return;
  }

  console.log('正在执行 Supabase 初始化 SQL...');

  const result = spawnSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', migrationFile], {
    stdio: 'inherit',
  });

  if (result.status === 0) {
    console.log('');
    console.log('Supabase 初始化完成。建议继续运行：');
    console.log('  npm run db:check');
    console.log('  npm run db:check:write');
    return;
  }

  process.exitCode = result.status || 1;
}

main();
