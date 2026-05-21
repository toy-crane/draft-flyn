-- Flyn — initial schema
-- 3 tables (scenarios, conversations, messages) owned by auth.users.
-- RLS-only access pattern: every row carries user_id, every policy checks auth.uid().

set check_function_bodies = off;

-- =====================================================================
-- scenarios
-- =====================================================================

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  situation text not null,
  their_role text not null,
  my_role text not null,
  memo text,
  summary text not null default '',
  goals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scenarios_user_id_created_at_idx
  on public.scenarios (user_id, created_at desc);

alter table public.scenarios enable row level security;

create policy scenarios_select_own on public.scenarios
  for select to authenticated
  using (auth.uid() = user_id);

create policy scenarios_insert_own on public.scenarios
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy scenarios_update_own on public.scenarios
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy scenarios_delete_own on public.scenarios
  for delete to authenticated
  using (auth.uid() = user_id);

-- =====================================================================
-- conversations
-- user_id denormalized from scenarios so RLS policies don't need JOINs.
-- One scenario can have at most one in_progress conversation at a time
-- (decisions.md §6, spec scenario 18).
-- =====================================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed')),
  goals_achieved jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index conversations_user_id_created_at_idx
  on public.conversations (user_id, created_at desc);

create index conversations_scenario_id_idx
  on public.conversations (scenario_id);

create unique index conversations_one_in_progress_per_scenario_idx
  on public.conversations (scenario_id)
  where status = 'in_progress';

alter table public.conversations enable row level security;

create policy conversations_select_own on public.conversations
  for select to authenticated
  using (auth.uid() = user_id);

create policy conversations_insert_own on public.conversations
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy conversations_update_own on public.conversations
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy conversations_delete_own on public.conversations
  for delete to authenticated
  using (auth.uid() = user_id);

-- =====================================================================
-- messages
-- =====================================================================

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  original_text text not null,
  english_text text,
  correction jsonb,
  goals_achieved jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at asc);

create index messages_user_id_idx
  on public.messages (user_id);

alter table public.messages enable row level security;

create policy messages_select_own on public.messages
  for select to authenticated
  using (auth.uid() = user_id);

create policy messages_insert_own on public.messages
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy messages_update_own on public.messages
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy messages_delete_own on public.messages
  for delete to authenticated
  using (auth.uid() = user_id);
