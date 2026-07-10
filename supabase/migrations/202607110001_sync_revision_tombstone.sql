-- Phase B: revision-based sync + soft-delete tombstones for readings.
-- Additive only; compatible with existing rows (revision defaults to 1).

alter table if exists public.readings
  add column if not exists deleted_at timestamptz;

alter table if exists public.readings
  add column if not exists revision integer not null default 1;

alter table if exists public.readings
  add column if not exists client_id text;

-- updated_at already exists on readings from init migration; ensure present
alter table if exists public.readings
  add column if not exists updated_at timestamptz not null default now();

create index if not exists readings_user_id_updated_at_idx
  on public.readings (user_id, updated_at desc);

create index if not exists readings_user_id_active_idx
  on public.readings (user_id, created_at desc)
  where deleted_at is null;

notify pgrst, 'reload schema';
