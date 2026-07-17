#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const migrationsDir = 'supabase/migrations';

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

function listMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`找不到迁移目录：${migrationsDir}`);
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => path.join(migrationsDir, file));

  if (migrationFiles.length === 0) {
    throw new Error(`迁移目录中没有 SQL 文件：${migrationsDir}`);
  }

  return migrationFiles;
}

function printMissingUrlHelp(migrationFiles) {
  console.error('缺少 SUPABASE_DB_URL（Postgres 连接串）。');
  console.error('');
  console.error('方式一：打开 Supabase Dashboard → SQL Editor，按顺序执行：');
  migrationFiles.forEach((file) => console.error(`  ${file}`));
  console.error('');
  console.error('方式二：Project Settings → Database → Connection string (URI)');
  console.error('  写入 .env.local：');
  console.error("  SUPABASE_DB_URL='postgresql://postgres.[ref]:[password]@aws-0-....pooler.supabase.com:6543/postgres'");
  console.error('  然后运行：pnpm db:init');
}

async function runWithPg(databaseUrl, migrationFiles) {
  let Client;
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    ({ Client } = require('pg'));
  } catch {
    throw new Error('未安装 pg，请先运行：pnpm add -D pg');
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('已连接数据库，开始执行迁移...');

  try {
    for (const migrationFile of migrationFiles) {
      const sql = fs.readFileSync(migrationFile, 'utf8');
      console.log(`- ${migrationFile}`);
      await client.query(sql);
      console.log(`  ✓ 完成`);
    }
  } finally {
    await client.end();
  }
}

function runWithPsql(databaseUrl, migrationFiles) {
  console.log('使用 psql 执行迁移...');
  for (const migrationFile of migrationFiles) {
    console.log(`- ${migrationFile}`);
    const result = spawnSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', migrationFile], {
      stdio: 'inherit',
    });
    if (result.status !== 0) {
      process.exitCode = result.status || 1;
      return false;
    }
  }
  return true;
}

async function main() {
  const localEnv = loadLocalEnv();
  const databaseUrl =
    process.env.SUPABASE_DB_URL ||
    localEnv.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    localEnv.DATABASE_URL;

  let migrationFiles;
  try {
    migrationFiles = listMigrationFiles();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  if (!databaseUrl) {
    printMissingUrlHelp(migrationFiles);
    process.exitCode = 1;
    return;
  }

  const psqlVersion = spawnSync('psql', ['--version'], { stdio: 'ignore' });
  const hasPsql = !psqlVersion.error && psqlVersion.status === 0;

  try {
    if (hasPsql) {
      if (!runWithPsql(databaseUrl, migrationFiles)) return;
    } else {
      console.log('本机未找到 psql，改用 node-postgres (pg) 执行...');
      await runWithPg(databaseUrl, migrationFiles);
    }

    console.log('');
    console.log('Supabase 迁移完成。建议继续运行：');
    console.log('  pnpm db:check');
  } catch (error) {
    console.error('迁移失败：', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();
