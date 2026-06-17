#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const crypto = require('crypto');
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
    columns: 'id,device_id,question,mood,spread_type,cards,reading,created_at,updated_at,is_dream',
  },
  {
    name: 'checkins',
    columns: 'device_id,date,mood,created_at,updated_at',
  },
  {
    name: 'monthly_reports',
    columns: 'device_id,report,created_at,updated_at',
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

async function runWriteCheck(supabase) {
  const nonce = crypto.randomUUID();
  const deviceId = `codex-healthcheck-${nonce}`;
  const readingId = `local-${nonce}`;
  const createdAt = new Date().toISOString();
  const date = createdAt.slice(0, 10);

  const readingPayload = {
    id: readingId,
    device_id: deviceId,
    question: 'Codex 数据库写入健康检查',
    mood: '平静',
    spread_type: 'one_card',
    cards: [
      {
        id: 'major-0',
        number: 0,
        name: 'The Fool',
        zhName: '愚人',
        arcana: 'major',
        image: '/cards/major-0.jpg',
        keywords: {
          upright: ['开始'],
          reversed: ['鲁莽'],
        },
        orientation: 'upright',
        positionName: '今日提示',
        positionOrder: 0,
      },
    ],
    reading: {
      questionSummary: '健康检查',
      intuitiveSummary: '健康检查',
      cardReadings: [
        {
          positionName: '今日提示',
          cardName: 'The Fool',
          cardZhName: '愚人',
          orientation: 'upright',
          interpretation: '健康检查',
        },
      ],
      contradiction: '',
      overlookedFactor: '',
      actionAdvice: '',
      gentleReminder: '',
      followUpSuggestions: [],
    },
    created_at: createdAt,
    is_dream: false,
  };

  const checks = [
    [
      'readings 写入',
      () => supabase.from('readings').insert(readingPayload).select('id').single(),
    ],
    [
      'checkins 写入',
      () =>
        supabase
          .from('checkins')
          .upsert(
            {
              device_id: deviceId,
              date,
              mood: '平静',
            },
            { onConflict: 'device_id,date' },
          )
          .select('device_id')
          .single(),
    ],
    [
      'monthly_reports 写入',
      () =>
        supabase
          .from('monthly_reports')
          .upsert(
            {
              device_id: deviceId,
              report: 'Codex 数据库写入健康检查',
              updated_at: createdAt,
            },
            { onConflict: 'device_id' },
          )
          .select('device_id')
          .single(),
    ],
  ];

  const cleanupChecks = [
    ['readings 清理', () => supabase.from('readings').delete().eq('id', readingId)],
    ['checkins 清理', () => supabase.from('checkins').delete().eq('device_id', deviceId)],
    [
      'monthly_reports 清理',
      () => supabase.from('monthly_reports').delete().eq('device_id', deviceId),
    ],
  ];

  let hasError = false;

  console.log('正在执行写入健康检查...');

  for (const [label, run] of checks) {
    const { error } = await run();
    if (error) {
      hasError = true;
      console.error(`- ${label}: 失败 ${error.code || ''} ${error.message}`);
    } else {
      console.log(`- ${label}: 正常`);
    }
  }

  console.log('正在清理健康检查临时数据...');

  for (const [label, run] of cleanupChecks) {
    const { error } = await run();
    if (error) {
      hasError = true;
      console.error(`- ${label}: 失败 ${error.code || ''} ${error.message}`);
    } else {
      console.log(`- ${label}: 正常`);
    }
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
    const writeOk = await runWriteCheck(supabase);
    if (!writeOk) process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
