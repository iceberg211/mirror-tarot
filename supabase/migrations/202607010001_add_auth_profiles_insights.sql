-- Mirror Tarot 账号体系、账号级同步与长期画像初始化脚本。
-- 说明：
-- 1. user_id 是上线后的真实数据归属字段，device_id 仅保留为游客迁移来源。
-- 2. 匿名用户可以继续在浏览器本地使用应用，但不能读写云端私密数据。
-- 3. RLS 仅允许登录用户访问自己的 readings、checkins、monthly_reports、profiles 与 insight_snapshots。

alter table if exists public.readings
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists readings_user_id_created_at_idx
  on public.readings (user_id, created_at desc);

create index if not exists readings_user_id_spread_type_idx
  on public.readings (user_id, spread_type);

alter table if exists public.checkins
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table if exists public.checkins
  add constraint checkins_user_id_date_key unique (user_id, date);

create index if not exists checkins_user_id_date_idx
  on public.checkins (user_id, date desc);

alter table if exists public.monthly_reports
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table if exists public.monthly_reports
  drop constraint if exists monthly_reports_pkey;

alter table if exists public.monthly_reports
  add constraint monthly_reports_user_id_key unique (user_id);

create index if not exists monthly_reports_user_id_idx
  on public.monthly_reports (user_id);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default '镜面旅人',
  onboarding_state jsonb not null default '{}'::jsonb,
  privacy_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_onboarding_state_is_object check (jsonb_typeof(onboarding_state) = 'object'),
  constraint profiles_privacy_settings_is_object check (jsonb_typeof(privacy_settings) = 'object')
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create table if not exists public.insight_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_days integer not null,
  metrics jsonb not null default '{}'::jsonb,
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_days),
  constraint insight_snapshots_period_days_check check (period_days in (30, 90, 365)),
  constraint insight_snapshots_metrics_is_object check (jsonb_typeof(metrics) = 'object')
);

drop trigger if exists insight_snapshots_set_updated_at on public.insight_snapshots;
create trigger insight_snapshots_set_updated_at
  before update on public.insight_snapshots
  for each row
  execute function public.set_updated_at();

alter table public.readings enable row level security;
alter table public.checkins enable row level security;
alter table public.monthly_reports enable row level security;
alter table public.profiles enable row level security;
alter table public.insight_snapshots enable row level security;

drop policy if exists "readings_device_sync_access" on public.readings;
drop policy if exists "checkins_device_sync_access" on public.checkins;
drop policy if exists "monthly_reports_device_sync_access" on public.monthly_reports;

drop policy if exists "readings_user_access" on public.readings;
create policy "readings_user_access"
  on public.readings
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "checkins_user_access" on public.checkins;
create policy "checkins_user_access"
  on public.checkins
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "monthly_reports_user_access" on public.monthly_reports;
create policy "monthly_reports_user_access"
  on public.monthly_reports
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "profiles_user_access" on public.profiles;
create policy "profiles_user_access"
  on public.profiles
  for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "insight_snapshots_user_access" on public.insight_snapshots;
create policy "insight_snapshots_user_access"
  on public.insight_snapshots
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;
revoke insert, update, delete on public.readings from anon;
revoke insert, update, delete on public.checkins from anon;
revoke insert, update, delete on public.monthly_reports from anon;
grant select on public.readings to anon;
grant select on public.checkins to anon;
grant select on public.monthly_reports to anon;
grant select on public.profiles to anon;
grant select on public.insight_snapshots to anon;
grant select, insert, update, delete on public.readings to authenticated;
grant select, insert, update, delete on public.checkins to authenticated;
grant select, insert, update, delete on public.monthly_reports to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.insight_snapshots to authenticated;

notify pgrst, 'reload schema';
