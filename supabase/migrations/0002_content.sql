-- Documentation content for the workbench, stored as real tables so it can be edited in the Supabase Table Editor,
-- by SQL, or in the app's content editor. The app reads everything with ONE call: select public.get_content_bundle().
-- Readable by everyone (the site is public). Writable only by users listed in public.app_admins.

-- ---------------------------------------------------------------- admin helpers (private schema: not exposed through the API)
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.app_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_admins where user_id = (select auth.uid()));
$$;
create or replace function private.no_admin_yet() returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.app_admins);
$$;
revoke all on function private.is_admin(), private.no_admin_yet() from public;
grant execute on function private.is_admin(), private.no_admin_yet() to authenticated;

-- A signed-in user can see only their own admin row, and can add themselves only while there is no admin yet (first sign-in claims it).
create policy "app_admins select own" on public.app_admins
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "app_admins claim first" on public.app_admins
  for insert to authenticated with check ((select auth.uid()) = user_id and (select private.no_admin_yet()));

-- ---------------------------------------------------------------- version counter (lets the app know when content changed)
create table if not exists public.content_meta (
  id         boolean primary key default true check (id),
  version    bigint not null default 1,
  updated_at timestamptz not null default now()
);
insert into public.content_meta (id) values (true) on conflict do nothing;
alter table public.content_meta enable row level security;
create policy "content_meta read" on public.content_meta for select to anon, authenticated using (true);

create or replace function private.bump_content_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.content_meta set version = version + 1, updated_at = now() where id;
  return null;
end;
$$;
revoke all on function private.bump_content_version() from public;

-- ---------------------------------------------------------------- content tables
create table public.chapters (
  id       text primary key,
  position int  not null unique,
  num      text not null,
  title    text not null,
  subtitle text not null,
  icon     text not null default 'BookOpen'
);

create table public.chapter_blocks (
  id         bigint generated always as identity primary key,
  chapter_id text not null references public.chapters (id) on update cascade on delete cascade,
  position   int  not null,
  kind       text not null check (kind in ('badge','h1','h2','p','rows','cards','chips','chart','table','crates','packs','prompts','confirms','patches','tasks','roster')),
  anchor     text,
  text       text,
  data       jsonb,
  unique (chapter_id, position)
);

create table public.crates (
  name            text primary key,
  position        int  not null unique,
  layer           text not null,
  plane           text not null,
  plain_summary   text not null,
  why_it_matters  text not null,
  deps            text not null,
  badge           text not null,
  code            text not null
);

create table public.agents (
  id                    text primary key,
  position              int  not null unique,
  role                  text not null,
  reports_to            text not null,
  tier                  text not null,
  plain_role_explanation text not null,
  budget_micros         bigint not null,
  spent_micros          bigint not null,
  paused                boolean not null default false
);

create table public.swarm_tasks (
  task_id            text primary key,
  position           int  not null unique,
  ancestry           text not null,
  title              text not null,
  plain_explanation  text not null,
  assignee           text not null,
  status             text not null check (status in ('PENDING','RUNNING','IN_REVIEW','COMPLETED')),
  checked_out_run_id text,
  confidence         numeric not null,
  plan_hash          text not null
);

create table public.packs (
  id            text primary key,
  position      int  not null unique,
  cat           text not null check (cat in ('CAT1','CAT2','CAT3','CAT4','CAT5')),
  cat_label     text not null,
  name          text not null,
  size          text not null,
  min_tier      text not null check (min_tier in ('E','C','B','A','S')),
  plain_purpose text not null,
  tools         text not null
);

create table public.deep_prompts (
  id          text primary key,
  position    int  not null unique,
  files       text not null,
  title       text not null,
  plain_goal  text not null,
  why_needed  text not null,
  full_prompt text not null
);

create table public.confirmations (
  id        text primary key,
  position  int  not null unique,
  title     text not null,
  plain_why text not null
);

create table public.patches (
  id       text primary key,
  position int  not null unique,
  target   text not null,
  summary  text not null,
  code     text not null
);

create table public.spikes (
  id       text primary key,
  position int  not null unique,
  target   text not null,
  cand_a   text not null,
  cand_b   text not null,
  gate     text not null
);

create table public.os_parity_rows (
  position       int primary key,
  dim            text not null,
  mint_x11       text not null,
  mint_wayland   text not null,
  ubuntu_wayland text not null,
  win_x64        text not null,
  macos          text not null
);

create table public.tier_chart (
  position    int primary key,
  tier        text not null unique,
  overhead_gb numeric not null,
  model_gb    numeric not null
);

create table public.pss_chart (
  position int primary key,
  name     text not null unique,
  s1       numeric not null,
  s10      numeric not null
);

create table public.anti_bloat_rows (
  position int primary key,
  layer    text not null,
  retained text not null,
  pruned   text not null,
  impact   text not null
);

create table public.claims (
  id         text primary key,
  position   int  not null unique,
  where_text text not null,
  claim      text not null,
  found      text not null,
  action     text not null
);

create table public.claim_notes (
  kind     text not null check (kind in ('confirmed','outdated','unchecked')),
  position int  not null,
  text     text not null,
  primary key (kind, position)
);

-- ---------------------------------------------------------------- row level security + version triggers
do $$
declare t text;
begin
  foreach t in array array['chapters','chapter_blocks','crates','agents','swarm_tasks','packs','deep_prompts','confirmations','patches','spikes','os_parity_rows','tier_chart','pss_chart','anti_bloat_rows','claims','claim_notes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || ' read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.is_admin()))', t || ' admin insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t || ' admin update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.is_admin()))', t || ' admin delete', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each statement execute function private.bump_content_version()', t || '_version', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- the single read call used by the app
create or replace function public.get_content_bundle() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'version', (select version from public.content_meta),
    'chapters', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'num', num, 'title', title, 'subtitle', subtitle, 'icon', icon) order by position) from public.chapters), '[]'::jsonb),
    'chapterBlocks', coalesce((select jsonb_object_agg(chapter_id, blocks) from (
        select chapter_id,
               jsonb_agg(jsonb_strip_nulls(jsonb_build_object('t', kind, 'id', anchor, 'text', text)) || coalesce(data, '{}'::jsonb) order by position) as blocks
        from public.chapter_blocks group by chapter_id) b), '{}'::jsonb),
    'crates', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'layer', layer, 'plane', plane, 'plainSummary', plain_summary, 'whyItMatters', why_it_matters, 'deps', deps, 'badge', badge, 'code', code) order by position) from public.crates), '[]'::jsonb),
    'roster', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'role', role, 'reportsTo', reports_to, 'tier', tier, 'plainRoleExplanation', plain_role_explanation, 'budgetMicros', budget_micros, 'spentMicros', spent_micros, 'paused', paused) order by position) from public.agents), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('taskId', task_id, 'ancestry', ancestry, 'title', title, 'plainExplanation', plain_explanation, 'assignee', assignee, 'status', status, 'checkedOutRunId', checked_out_run_id, 'confidence', confidence, 'planHash', plan_hash) order by position) from public.swarm_tasks), '[]'::jsonb),
    'packs', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'cat', cat, 'catLabel', cat_label, 'name', name, 'size', size, 'minTier', min_tier, 'plainPurpose', plain_purpose, 'tools', tools) order by position) from public.packs), '[]'::jsonb),
    'prompts', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'files', files, 'title', title, 'plainGoal', plain_goal, 'whyNeeded', why_needed, 'fullPrompt', full_prompt) order by position) from public.deep_prompts), '[]'::jsonb),
    'confirmations', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'plainWhy', plain_why) order by position) from public.confirmations), '[]'::jsonb),
    'patches', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'target', target, 'summary', summary, 'code', code) order by position) from public.patches), '[]'::jsonb),
    'spikes', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'target', target, 'candA', cand_a, 'candB', cand_b, 'gate', gate) order by position) from public.spikes), '[]'::jsonb),
    'osRows', coalesce((select jsonb_agg(jsonb_build_object('dim', dim, 'mint_x11', mint_x11, 'mint_wayland', mint_wayland, 'ubuntu_wayland', ubuntu_wayland, 'win_x64', win_x64, 'macos', macos) order by position) from public.os_parity_rows), '[]'::jsonb),
    'tierChart', coalesce((select jsonb_agg(jsonb_build_object('tier', tier, 'overheadGb', overhead_gb, 'modelGb', model_gb) order by position) from public.tier_chart), '[]'::jsonb),
    'pssChart', coalesce((select jsonb_agg(jsonb_build_object('name', name, 's1', s1, 's10', s10) order by position) from public.pss_chart), '[]'::jsonb),
    'antiBloat', coalesce((select jsonb_agg(jsonb_build_object('layer', layer, 'retained', retained, 'pruned', pruned, 'impact', impact) order by position) from public.anti_bloat_rows), '[]'::jsonb),
    'claims', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'where', where_text, 'claim', claim, 'found', found, 'action', action) order by position) from public.claims), '[]'::jsonb),
    'claimsConfirmed', coalesce((select jsonb_agg(text order by position) from public.claim_notes where kind = 'confirmed'), '[]'::jsonb),
    'claimsOutdated', coalesce((select text from public.claim_notes where kind = 'outdated' order by position limit 1), ''),
    'claimsUnchecked', coalesce((select text from public.claim_notes where kind = 'unchecked' order by position limit 1), '')
  );
$$;
grant execute on function public.get_content_bundle() to anon, authenticated;

-- ---------------------------------------------------------------- platform helper flagged by the advisor: an event trigger, must not be callable through the API
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
