-- Mirror Tarot 当前前端同步所需的 Supabase 初始化脚本。
-- 说明：
-- 1. 当前应用使用浏览器本地生成的 device_id 做数据分组，没有登录账号体系。
-- 2. 为了让匿名前端可以同步数据，本脚本开放 anon/authenticated 读写策略。
-- 3. device_id 只能用于体验隔离，不是安全边界；上线账号体系后应改为 auth.uid() 级别的 RLS。

create table if not exists public.readings (
  id text primary key,
  device_id text not null,
  question text not null,
  mood text not null,
  spread_type text not null,
  cards jsonb not null default '[]'::jsonb,
  reading jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_dream boolean not null default false,
  constraint readings_spread_type_check check (
    spread_type in (
      'one_card',
      'three_cards',
      'relationship',
      'career',
      'shadow',
      'choice'
    )
  ),
  constraint readings_cards_is_array check (jsonb_typeof(cards) = 'array'),
  constraint readings_reading_is_object check (jsonb_typeof(reading) = 'object')
);

create index if not exists readings_device_id_created_at_idx
  on public.readings (device_id, created_at desc);

create index if not exists readings_device_id_spread_type_idx
  on public.readings (device_id, spread_type);

create table if not exists public.checkins (
  device_id text not null,
  date date not null,
  mood text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (device_id, date)
);

create index if not exists checkins_device_id_date_idx
  on public.checkins (device_id, date desc);

create table if not exists public.monthly_reports (
  device_id text primary key,
  report text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists readings_set_updated_at on public.readings;
create trigger readings_set_updated_at
  before update on public.readings
  for each row
  execute function public.set_updated_at();

drop trigger if exists checkins_set_updated_at on public.checkins;
create trigger checkins_set_updated_at
  before update on public.checkins
  for each row
  execute function public.set_updated_at();

drop trigger if exists monthly_reports_set_updated_at on public.monthly_reports;
create trigger monthly_reports_set_updated_at
  before update on public.monthly_reports
  for each row
  execute function public.set_updated_at();

alter table public.readings enable row level security;
alter table public.checkins enable row level security;
alter table public.monthly_reports enable row level security;

drop policy if exists "readings_device_sync_access" on public.readings;
create policy "readings_device_sync_access"
  on public.readings
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "checkins_device_sync_access" on public.checkins;
create policy "checkins_device_sync_access"
  on public.checkins
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "monthly_reports_device_sync_access" on public.monthly_reports;
create policy "monthly_reports_device_sync_access"
  on public.monthly_reports
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.readings to anon, authenticated;
grant select, insert, update, delete on public.checkins to anon, authenticated;
grant select, insert, update, delete on public.monthly_reports to anon, authenticated;

notify pgrst, 'reload schema';
