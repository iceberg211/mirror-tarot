-- Phase C: generation tracking, structured memory, action items, reading messages.
-- Additive; RLS uses auth.uid() = user_id.

-- ---------------------------------------------------------------------------
-- reading_generations
-- ---------------------------------------------------------------------------
create table if not exists public.reading_generations (
  id uuid primary key default gen_random_uuid(),
  reading_id text not null,
  user_id uuid references auth.users(id) on delete cascade,
  generation_no integer not null default 1,
  model text not null default '',
  prompt_version text not null default '',
  input_hash text not null default '',
  output_jsonb jsonb not null default '{}'::jsonb,
  status text not null default 'success',
  safety_labels text[] not null default '{}',
  ttft_ms integer,
  duration_ms integer,
  input_tokens integer,
  output_tokens integer,
  error_code text,
  request_id text,
  created_at timestamptz not null default now(),
  constraint reading_generations_status_check check (
    status in ('success', 'error', 'blocked', 'partial')
  ),
  constraint reading_generations_output_is_object check (jsonb_typeof(output_jsonb) = 'object')
);

create index if not exists reading_generations_user_id_created_at_idx
  on public.reading_generations (user_id, created_at desc);

create index if not exists reading_generations_reading_id_idx
  on public.reading_generations (reading_id, generation_no desc);

create index if not exists reading_generations_request_id_idx
  on public.reading_generations (request_id);

-- ---------------------------------------------------------------------------
-- reading_messages
-- ---------------------------------------------------------------------------
create table if not exists public.reading_messages (
  id uuid primary key default gen_random_uuid(),
  reading_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint reading_messages_role_check check (role in ('user', 'assistant', 'system'))
);

create index if not exists reading_messages_reading_id_created_at_idx
  on public.reading_messages (reading_id, created_at asc);

create index if not exists reading_messages_user_id_idx
  on public.reading_messages (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- user_memory
-- ---------------------------------------------------------------------------
create table if not exists public.user_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  content text not null,
  source_reading_id text,
  confidence real not null default 0.5,
  consent_scope text not null default 'user_explicit',
  expires_at timestamptz,
  user_editable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint user_memory_category_check check (
    category in ('style_pref', 'recurring_theme', 'confirmed_goal', 'action_outcome', 'note')
  ),
  constraint user_memory_consent_check check (
    consent_scope in ('user_explicit', 'inferred_low', 'system')
  ),
  constraint user_memory_confidence_check check (confidence >= 0 and confidence <= 1)
);

create index if not exists user_memory_user_id_active_idx
  on public.user_memory (user_id, updated_at desc)
  where deleted_at is null;

drop trigger if exists user_memory_set_updated_at on public.user_memory;
create trigger user_memory_set_updated_at
  before update on public.user_memory
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- action_items
-- ---------------------------------------------------------------------------
create table if not exists public.action_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_id text,
  seed_text text not null,
  status text not null default 'pending',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint action_items_status_check check (
    status in ('pending', 'completed', 'failed', 'dismissed')
  )
);

create index if not exists action_items_user_id_status_idx
  on public.action_items (user_id, status, updated_at desc);

drop trigger if exists action_items_set_updated_at on public.action_items;
create trigger action_items_set_updated_at
  before update on public.action_items
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.reading_generations enable row level security;
alter table public.reading_messages enable row level security;
alter table public.user_memory enable row level security;
alter table public.action_items enable row level security;

drop policy if exists "reading_generations_user_access" on public.reading_generations;
create policy "reading_generations_user_access"
  on public.reading_generations
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "reading_messages_user_access" on public.reading_messages;
create policy "reading_messages_user_access"
  on public.reading_messages
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_memory_user_access" on public.user_memory;
create policy "user_memory_user_access"
  on public.user_memory
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "action_items_user_access" on public.action_items;
create policy "action_items_user_access"
  on public.action_items
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.reading_generations to authenticated;
grant select, insert, update, delete on public.reading_messages to authenticated;
grant select, insert, update, delete on public.user_memory to authenticated;
grant select, insert, update, delete on public.action_items to authenticated;

-- service role bypasses RLS by default; no anon write grants

notify pgrst, 'reload schema';
