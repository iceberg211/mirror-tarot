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
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    localEnv.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    localEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 API Key。');
  }

  return createClient(supabaseUrl, supabaseKey);
}

const tableChecks = [
  {
    name: 'readings',
    // Phase B: revision / deleted_at / client_id
    columns:
      'id,user_id,device_id,question,mood,spread_type,cards,reading,created_at,updated_at,is_dream,revision,deleted_at,client_id',
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
  // Phase C
  {
    name: 'reading_generations',
    columns:
      'id,reading_id,user_id,generation_no,model,prompt_version,input_hash,output_jsonb,status,safety_labels,duration_ms,request_id,created_at',
  },
  {
    name: 'reading_messages',
    columns: 'id,reading_id,user_id,role,content,created_at',
  },
  {
    name: 'user_memory',
    columns:
      'id,user_id,category,content,source_reading_id,confidence,consent_scope,expires_at,user_editable,created_at,updated_at,deleted_at',
  },
  {
    name: 'action_items',
    columns: 'id,user_id,reading_id,seed_text,status,due_date,created_at,updated_at',
  },
];

async function checkTables(supabase) {
  let hasError = false;
  let missingTableCount = 0;

  console.log('正在检查 Supabase 表结构...');

  for (const table of tableChecks) {
    const { error } = await supabase.from(table.name).select(table.columns).limit(1);

    if (error) {
      hasError = true;
      if (error.code === 'PGRST205' || /schema cache|does not exist|Could not find/i.test(error.message)) {
        missingTableCount += 1;
      }
      console.error(`- ${table.name}: 失败 ${error.code || ''} ${error.message}`);
    } else {
      console.log(`- ${table.name}: 正常`);
    }
  }

  if (missingTableCount > 0) {
    console.error('');
    console.error('检测到表/字段缺失。请执行：');
    console.error('  pnpm db:init   # 需配置 SUPABASE_DB_URL');
    console.error('或在 SQL Editor 中按序运行 supabase/migrations/*.sql');
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

  console.log('');
  console.log('结构检查通过（含 Phase B revision 与 Phase C 新表）。');

  if (shouldWrite) {
    console.error('');
    console.error('账号级 RLS 已开启，匿名 publishable key 不能执行写入健康检查。');
    console.error('请登录应用进行真实写入验证，或在 Supabase 控制台检查 RLS 策略。');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
