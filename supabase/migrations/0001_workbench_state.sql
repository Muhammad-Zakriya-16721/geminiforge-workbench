-- One row per user holds that user's whole workbench state (questions, notes, tracker, settings).
-- The browser uses only the publishable key; row level security limits every request to the signed-in user's own row.
create table if not exists public.workbench_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  rev        bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint workbench_state_size check (pg_column_size(data) < 5000000)
);

alter table public.workbench_state enable row level security;

create policy "workbench_state select own" on public.workbench_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "workbench_state insert own" on public.workbench_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "workbench_state update own" on public.workbench_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- No delete policy on purpose: the app never deletes the row; deleting an account removes it through the foreign key.
