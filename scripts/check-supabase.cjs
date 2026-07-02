#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const ENV_FILE = '.env.local';

function loadLocalEnv() {
  if (!fs.existsSync(ENV_FILE)) return {};

  const env = {};
  const lines = fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/);

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

function createSupabaseClient() {
  const localEnv = loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || localEnv.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    localEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY。');
  }

  return createClient(supabaseUrl, supabaseKey);
}

const tableChecks = [
  {
    name: 'readings',
    columns: 'id,user_id,device_id,question,mood,spread_type,cards,reading,created_at,updated_at,is_dream',
  },
  {
    name: 'checkins',
    columns: 'user_id,device_id,date,mood,created_at,updated_at',
  },
  {
    name: 'monthly_reports',
    columns: 'user_id,device_id,report,created_at,updated_at',
  },
  {
    name: 'profiles',
    columns: 'id,email,display_name,onboarding_state,privacy_settings,created_at,updated_at',
  },
  {
    name: 'insight_snapshots',
    columns: 'user_id,period_days,metrics,summary,created_at,updated_at',
  },
];

async function checkTables(supabase) {
  let hasError = false;
  let missingTableCount = 0;

  console.log('正在检查 Supabase 表结构...');

  for (const table of tableChecks) {
    const { error } = await supabase
      .from(table.name)
      .select(table.columns)
      .limit(1);

    if (error) {
      hasError = true;
      if (error.code === 'PGRST205') missingTableCount += 1;
      console.error(`- ${table.name}: 失败 ${error.code || ''} ${error.message}`);
    } else {
      console.log(`- ${table.name}: 正常`);
    }
  }

  if (missingTableCount > 0) {
    console.error('');
    console.error('检测到 Supabase 远端表尚未初始化。');
    console.error('请先在 Supabase SQL Editor 执行：');
    console.error('  supabase/migrations/202606170001_init_journal_sync.sql');
    console.error('');
    console.error('也可以配置 SUPABASE_DB_URL 后运行：');
    console.error('  npm run db:init');
  }

  return !hasError;
}

async function main() {
  const shouldWrite = process.argv.includes('--write');
  const supabase = createSupabaseClient();
  const tablesOk = await checkTables(supabase);

  if (!tablesOk) {
    process.exitCode = 1;
    return;
  }

  if (shouldWrite) {
    console.error('');
    console.error('账号级 RLS 已开启，匿名 publishable key 不能执行写入健康检查。');
    console.error('请登录应用进行真实写入验证，或在 Supabase 控制台检查 RLS 策略。');
    console.error('结构检查已覆盖 readings、checkins、monthly_reports、profiles、insight_snapshots。');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
