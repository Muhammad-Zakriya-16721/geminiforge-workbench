-- Multi-project documentation layer (additive: the typed GeminiForge tables and get_content_bundle() are untouched, so the live app keeps working).
--   projects / project_members  who can see and edit which project
--   docs                         one searchable row per document; GeminiForge rows are DERIVED from the typed tables (kept in sync by a trigger),
--                                other projects write here directly (source = 'native')
--   doc_revisions                history (one row per revision); cross-references are computed on demand by mcp_refs
--   doc_drafts                   edits proposed by AI clients (MCP); a human approves them
--   mcp_tokens + mcp_* functions the remote MCP server's data access (executable by service_role only)
-- Rollback: supabase/migrations/0003_down.sql. Applied to the live project in chunks with execute_sql (the Supabase MCP tool stalls on SQL that contains delete/drop statements),
-- then the final function definitions below were exported from the database with pg_get_functiondef so this file matches what is live.

create extension if not exists pgcrypto with schema extensions;
grant usage on schema private to anon;

-- ---------------------------------------------------------------- projects
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  name        text not null,
  description text not null default '',
  visibility  text not null default 'private' check (visibility in ('public', 'unlisted', 'private')),
  owner_id    uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  archived_at timestamptz
);
create index projects_owner_idx on public.projects (owner_id);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('owner', 'editor', 'viewer')),
  primary key (project_id, user_id)
);
create index project_members_user_idx on public.project_members (user_id, project_id);

create or replace function private.can_read_project(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects x
    where x.id = p and x.archived_at is null
      and (
        x.visibility in ('public', 'unlisted')
        or (
          (select auth.uid()) is not null
          and (
            exists (select 1 from public.project_members m where m.project_id = x.id and m.user_id = (select auth.uid()))
            or exists (select 1 from public.app_admins a where a.user_id = (select auth.uid()))
          )
        )
      )
  );
$$;
create or replace function private.can_edit_project(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    exists (select 1 from public.app_admins a where a.user_id = (select auth.uid()))
    or exists (select 1 from public.project_members m where m.project_id = p and m.user_id = (select auth.uid()) and m.role in ('owner', 'editor'))
  );
$$;
create or replace function private.is_project_owner(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    exists (select 1 from public.app_admins a where a.user_id = (select auth.uid()))
    or exists (select 1 from public.project_members m where m.project_id = p and m.user_id = (select auth.uid()) and m.role = 'owner')
  );
$$;
revoke all on function private.can_read_project(uuid), private.can_edit_project(uuid), private.is_project_owner(uuid) from public;
grant execute on function private.can_read_project(uuid) to anon, authenticated;
grant execute on function private.can_edit_project(uuid), private.is_project_owner(uuid) to authenticated;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
create policy "projects read" on public.projects for select to anon, authenticated using ((select private.can_read_project(id)));
create policy "projects create" on public.projects for insert to authenticated with check ((select private.is_admin()));
create policy "projects update" on public.projects for update to authenticated using ((select private.is_project_owner(id))) with check ((select private.is_project_owner(id)));
create policy "projects delete" on public.projects for delete to authenticated using ((select private.is_admin()));
create policy "members read" on public.project_members for select to authenticated using (user_id = (select auth.uid()) or (select private.is_project_owner(project_id)));
create policy "members insert" on public.project_members for insert to authenticated with check ((select private.is_project_owner(project_id)));
create policy "members update" on public.project_members for update to authenticated using ((select private.is_project_owner(project_id))) with check ((select private.is_project_owner(project_id)));
create policy "members delete" on public.project_members for delete to authenticated using ((select private.is_project_owner(project_id)));

-- ---------------------------------------------------------------- docs, revisions, links
create table public.docs (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  ref          text not null,
  kind         text not null,
  title        text not null,
  body         text not null default '' check (length(body) <= 200000),
  data         jsonb,
  parent_ref   text,
  position     int  not null default 0,
  key          text,
  rev          int  not null default 1,
  content_hash text not null default '',
  source       text not null default 'native' check (source in ('native', 'derived')),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  unique (project_id, ref)
);
create index docs_project_kind_idx on public.docs (project_id, kind, position) where deleted_at is null;

create table public.doc_revisions (
  id           bigint generated always as identity primary key,
  doc_id       uuid not null references public.docs (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  ref          text not null,
  rev          int  not null,
  content_hash text not null,
  title        text not null,
  body         text not null,
  data         jsonb,
  kind         text not null default 'edit',
  author_id    uuid,
  created_at   timestamptz not null default now(),
  unique (doc_id, rev)
);
create index doc_revisions_project_time_idx on public.doc_revisions (project_id, created_at desc);

create or replace function private.docs_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.content_hash := md5(coalesce(new.title, '') || E'\u0001' || coalesce(new.body, '') || E'\u0001' || coalesce(new.data::text, ''));
  if tg_op = 'INSERT' then
    new.rev := 1; new.updated_at := now();
  elsif new.content_hash is distinct from old.content_hash then
    new.rev := old.rev + 1; new.updated_at := now();
  else
    new.rev := old.rev; new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;
create or replace function private.docs_after_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.doc_revisions (doc_id, project_id, ref, rev, content_hash, title, body, data, kind, author_id)
  select new.id, new.project_id, new.ref, new.rev, new.content_hash, new.title, new.body, new.data,
         case when new.source = 'derived' then 'sync' else 'edit' end, (select auth.uid())
  where not exists (select 1 from public.doc_revisions r where r.doc_id = new.id and r.rev = new.rev);
  return null;
end;
$$;
revoke all on function private.docs_before_write(), private.docs_after_write() from public;
create trigger docs_before_write before insert or update on public.docs for each row execute function private.docs_before_write();
create trigger docs_after_write after insert or update on public.docs for each row execute function private.docs_after_write();

alter table public.docs enable row level security;
alter table public.doc_revisions enable row level security;
create policy "docs read" on public.docs for select to anon, authenticated using (deleted_at is null and (select private.can_read_project(project_id)));
create policy "docs insert" on public.docs for insert to authenticated with check (source = 'native' and (select private.can_edit_project(project_id)));
create policy "docs update" on public.docs for update to authenticated using (source = 'native' and (select private.can_edit_project(project_id))) with check (source = 'native' and (select private.can_edit_project(project_id)));
create policy "docs delete" on public.docs for delete to authenticated using (source = 'native' and (select private.can_edit_project(project_id)));
create policy "revisions read" on public.doc_revisions for select to anon, authenticated using ((select private.can_read_project(project_id)));

-- ---------------------------------------------------------------- drafts (edits proposed through MCP; applied only after a human approves)
create table public.doc_drafts (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  doc_ref     text not null,
  base_rev    int  not null,
  op          text not null check (op in ('replace', 'find_replace', 'insert_after')),
  payload     jsonb not null check (length(payload::text) <= 40000),
  rationale   text not null default '' check (length(rationale) <= 2000),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'applied', 'rejected', 'stale')),
  proposed_by text not null default 'anonymous',
  idem_key    text,
  note        text,
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,
  decided_by  uuid,
  unique (project_id, idem_key)
);
create index doc_drafts_project_status_idx on public.doc_drafts (project_id, status, created_at desc);
alter table public.doc_drafts enable row level security;
create policy "drafts read" on public.doc_drafts for select to authenticated using ((select private.can_edit_project(project_id)));
create policy "drafts update" on public.doc_drafts for update to authenticated using ((select private.can_edit_project(project_id))) with check ((select private.can_edit_project(project_id)));

-- ---------------------------------------------------------------- MCP access tokens (hashed; the plaintext is shown once at creation)
create table public.mcp_tokens (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  label         text not null check (length(label) between 1 and 80),
  token_hash    text not null unique,
  mode          text not null default 'read' check (mode in ('read', 'propose')),
  path_prefixes text[] not null default '{}',
  daily_limit   int  not null default 500 check (daily_limit between 1 and 100000),
  expires_at    timestamptz,
  revoked_at    timestamptz,
  last_used_at  timestamptz,
  created_by    uuid,
  created_at    timestamptz not null default now()
);
create index mcp_tokens_project_idx on public.mcp_tokens (project_id);
alter table public.mcp_tokens enable row level security;
create policy "tokens read" on public.mcp_tokens for select to authenticated using ((select private.can_edit_project(project_id)));
create policy "tokens revoke" on public.mcp_tokens for update to authenticated using ((select private.can_edit_project(project_id))) with check ((select private.can_edit_project(project_id)));
create policy "tokens create" on public.mcp_tokens for insert to authenticated with check ((select private.can_edit_project(project_id)) and created_by = (select auth.uid()));
-- the hash is useless without the plaintext, but admins never need to read it
revoke select on public.mcp_tokens from authenticated;
grant select (id, project_id, label, mode, path_prefixes, daily_limit, expires_at, revoked_at, last_used_at, created_by, created_at) on public.mcp_tokens to authenticated;

create or replace function public.create_mcp_token(p_project text, p_label text, p_mode text default 'read', p_prefixes text[] default '{}', p_ttl_days int default 90, p_daily_limit int default 500)
returns text language plpgsql security invoker set search_path = '' as $$
declare t text; pid uuid;
begin
  select id into pid from public.projects where slug = p_project;
  if pid is null then raise exception 'unknown project'; end if;
  t := 'dk_' || encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.mcp_tokens (project_id, label, token_hash, mode, path_prefixes, daily_limit, expires_at, created_by)
  values (pid, p_label, encode(extensions.digest(t, 'sha256'), 'hex'), p_mode, coalesce(p_prefixes, '{}'),
          p_daily_limit, case when p_ttl_days is null then null else now() + make_interval(days => p_ttl_days) end, (select auth.uid()));
  return t;
end;
$$;
revoke all on function public.create_mcp_token(text, text, text, text[], int, int) from public, anon;
grant execute on function public.create_mcp_token(text, text, text, text[], int, int) to authenticated;

-- ---------------------------------------------------------------- internal bookkeeping (private schema: not exposed through the API)
create table private.mcp_usage (day date not null, key text not null, calls int not null default 0, primary key (day, key));
create table private.mcp_audit (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  token_id uuid, project_id uuid, tool text not null, ref text, status text not null
);
create index mcp_audit_ts_idx on private.mcp_audit (ts desc);

-- ---------------------------------------------------------------- functions (exported from the live database)
-- mcp_take
CREATE OR REPLACE FUNCTION private.mcp_take(k text, lim integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n int;
begin
  insert into private.mcp_usage (day, key, calls) values (current_date, k, 1)
  on conflict (day, key) do update set calls = private.mcp_usage.calls + 1 returning calls into n;
  return n <= lim;
end;
$function$;

-- mcp_gate
CREATE OR REPLACE FUNCTION private.mcp_gate(p_token text, p_ip text, p_project text, p_write boolean DEFAULT false)
 RETURNS TABLE(project_id uuid, token_id uuid, prefixes text[], err text, hint text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.mcp_tokens; pr public.projects;
begin
  if not private.mcp_take('global', 30000) then
    return query select null::uuid, null::uuid, null::text[], 'mcp:rate_limited', 'The service is busy; retry later.'; return;
  end if;
  select * into pr from public.projects x where x.slug = p_project and x.archived_at is null;
  if p_token is not null then
    select * into t from public.mcp_tokens k where k.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
    if t.id is null or t.revoked_at is not null or (t.expires_at is not null and t.expires_at < now()) then
      return query select null::uuid, null::uuid, null::text[], 'mcp:invalid_token', 'The access token is unknown, revoked or expired. Ask the owner for a new one.'; return;
    end if;
    if not private.mcp_take('tok:' || t.id, t.daily_limit) then
      return query select null::uuid, t.id, null::text[], 'mcp:rate_limited', 'Daily request budget for this token is used up; retry after 00:00 UTC.'; return;
    end if;
    if t.last_used_at is null or t.last_used_at < now() - interval '1 minute' then
      update public.mcp_tokens set last_used_at = now() where id = t.id;
    end if;
    if pr.id is null or pr.id <> t.project_id then
      return query select null::uuid, t.id, null::text[], 'mcp:not_found', 'Unknown project, or this token does not cover it. Call list_projects.'; return;
    end if;
    if p_write and t.mode <> 'propose' then
      return query select null::uuid, t.id, null::text[], 'mcp:forbidden', 'This token is read-only.'; return;
    end if;
    return query select pr.id, t.id, t.path_prefixes, null::text, null::text;
  else
    if not private.mcp_take('ip:' || coalesce(p_ip, 'unknown'), 600) then
      return query select null::uuid, null::uuid, null::text[], 'mcp:rate_limited', 'Daily request budget for this address is used up; retry after 00:00 UTC.'; return;
    end if;
    if pr.id is null or pr.visibility not in ('public', 'unlisted') then
      return query select null::uuid, null::uuid, null::text[], 'mcp:not_found', 'Unknown project. Call list_projects.'; return;
    end if;
    if p_write then
      return query select null::uuid, null::uuid, null::text[], 'mcp:forbidden', 'Proposing edits needs an access token with propose mode.'; return;
    end if;
    return query select pr.id, null::uuid, '{}'::text[], null::text, null::text;
  end if;
end;
$function$;

-- mcp_fail
CREATE OR REPLACE FUNCTION private.mcp_fail(tl text, tok uuid, e text, h text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.mcp_log(tok, null, tl, null, e);
  return jsonb_build_object('error', e, 'hint', h);
end;
$function$;

-- ref_ok
CREATE OR REPLACE FUNCTION private.ref_ok(prefixes text[], r text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select cardinality(prefixes) = 0 or exists (select 1 from unnest(prefixes) p where starts_with(r, p));
$function$;

-- mcp_log
CREATE OR REPLACE FUNCTION private.mcp_log(tok uuid, proj uuid, tl text, r text, st text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  insert into private.mcp_audit (token_id, project_id, tool, ref, status) values (tok, proj, tl, left(r, 200), st);
$function$;

-- mcp_list_projects
CREATE OR REPLACE FUNCTION public.mcp_list_projects(p_token text DEFAULT NULL::text, p_ip text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r jsonb; t public.mcp_tokens;
begin
  if not private.mcp_take('global', 30000) then return private.mcp_fail('list_projects', null, 'mcp:rate_limited', 'The service is busy; retry later.'); end if;
  if p_token is not null then
    select * into t from public.mcp_tokens k where k.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
    if t.id is null or t.revoked_at is not null or (t.expires_at is not null and t.expires_at < now()) then
      return private.mcp_fail('list_projects', null, 'mcp:invalid_token', 'The access token is unknown, revoked or expired. Ask the owner for a new one.');
    end if;
    if not private.mcp_take('tok:' || t.id, t.daily_limit) then return private.mcp_fail('list_projects', t.id, 'mcp:rate_limited', 'Daily request budget for this token is used up; retry after 00:00 UTC.'); end if;
  elsif not private.mcp_take('ip:' || coalesce(p_ip, 'unknown'), 600) then
    return private.mcp_fail('list_projects', null, 'mcp:rate_limited', 'Daily request budget for this address is used up; retry after 00:00 UTC.');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('project', x.slug, 'name', x.name, 'description', x.description,
           'docs', (select count(*) from public.docs d where d.project_id = x.id and d.deleted_at is null),
           'access', case when t.id is not null then t.mode else 'read' end) order by x.name), '[]')
    into r
  from public.projects x
  where x.archived_at is null and (x.visibility = 'public' or (t.id is not null and x.id = t.project_id));
  perform private.mcp_log(t.id, null, 'list_projects', null, 'ok');
  return jsonb_build_object('projects', r);
end;
$function$;

-- mcp_outline
CREATE OR REPLACE FUNCTION public.mcp_outline(p_token text, p_ip text, p_project text, p_kind text DEFAULT NULL::text, p_parent text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s record; items jsonb; total int; lim int := least(greatest(coalesce(p_limit, 100), 1), 200); off int := greatest(coalesce(p_offset, 0), 0);
begin
  select * into s from private.mcp_gate(p_token, p_ip, p_project);
  if s.err is not null then return private.mcp_fail('get_outline', s.token_id, s.err, s.hint); end if;
  select count(*) into total from public.docs d where d.project_id = s.project_id and d.deleted_at is null and private.ref_ok(s.prefixes, d.ref)
    and (p_kind is null or d.kind = p_kind) and (p_parent is null or d.parent_ref = p_parent or d.ref = p_parent);
  select coalesce(jsonb_agg(jsonb_build_object('id', q.ref, 'kind', q.kind, 'title', q.title, 'parent', q.parent_ref, 'rev', q.rev) order by q.position, q.ref), '[]') into items
  from (select d.* from public.docs d where d.project_id = s.project_id and d.deleted_at is null and private.ref_ok(s.prefixes, d.ref)
          and (p_kind is null or d.kind = p_kind) and (p_parent is null or d.parent_ref = p_parent or d.ref = p_parent)
        order by d.position, d.ref limit lim offset off) q;
  perform private.mcp_log(s.token_id, s.project_id, 'get_outline', coalesce(p_parent, p_kind), 'ok');
  return jsonb_build_object('items', items, 'total', total, 'next_offset', case when off + lim < total then off + lim end);
end;
$function$;

-- mcp_search
CREATE OR REPLACE FUNCTION public.mcp_search(p_token text, p_ip text, p_project text, p_query text, p_kind text DEFAULT NULL::text, p_limit integer DEFAULT 8, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s record; terms text[]; res jsonb; lim int := least(greatest(coalesce(p_limit, 8), 1), 20); off int := greatest(coalesce(p_offset, 0), 0); total int;
begin
  select * into s from private.mcp_gate(p_token, p_ip, p_project);
  if s.err is not null then return private.mcp_fail('search_docs', s.token_id, s.err, s.hint); end if;
  terms := array(select w from unnest(string_to_array(lower(regexp_replace(left(coalesce(p_query, ''), 200), '[^[:alnum:]_.#-]+', ' ', 'g')), ' ')) w where length(w) > 1);
  if cardinality(terms) = 0 then return private.mcp_fail('search_docs', s.token_id, 'mcp:bad_request', 'The query needs at least one word of 2+ characters.'); end if;
  with hits as (
    select d.ref, d.kind, d.title, d.rev, sc.score,
           substr(d.body, greatest(1, coalesce(nullif(position(terms[1] in lower(d.body)), 0), 1) - 80), 300) as excerpt
    from public.docs d
    cross join lateral (
      select coalesce(sum((case when position(w in lower(d.title)) > 0 then 5 else 0 end)
        + least((length(lower(d.body)) - length(replace(lower(d.body), w, ''))) / length(w), 5)), 0)::int as score
      from unnest(terms) w
    ) sc
    where d.project_id = s.project_id and d.deleted_at is null and sc.score > 0 and private.ref_ok(s.prefixes, d.ref) and (p_kind is null or d.kind = p_kind)
  ), page as (select * from hits order by score desc, ref limit lim offset off)
  select (select count(*) from hits),
         coalesce((select jsonb_agg(jsonb_build_object('id', g.ref, 'kind', g.kind, 'title', g.title, 'score', g.score, 'excerpt', g.excerpt, 'rev', g.rev) order by g.score desc, g.ref) from page g), '[]')
    into total, res;
  perform private.mcp_log(s.token_id, s.project_id, 'search_docs', left(p_query, 100), 'ok');
  return jsonb_build_object('results', res, 'total', total, 'next_offset', case when off + lim < total then off + lim end);
end;
$function$;

-- mcp_read
CREATE OR REPLACE FUNCTION public.mcp_read(p_token text, p_ip text, p_project text, p_refs text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s record; found_docs jsonb; missing jsonb;
begin
  select * into s from private.mcp_gate(p_token, p_ip, p_project);
  if s.err is not null then return private.mcp_fail('read_doc', s.token_id, s.err, s.hint); end if;
  if p_refs is null or cardinality(p_refs) = 0 or cardinality(p_refs) > 20 then return private.mcp_fail('read_doc', s.token_id, 'mcp:bad_request', 'Pass between 1 and 20 document ids.'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', d.ref, 'kind', d.kind, 'title', d.title, 'body', d.body, 'data', d.data, 'parent', d.parent_ref, 'rev', d.rev, 'updated_at', d.updated_at) order by d.position, d.ref), '[]') into found_docs
  from public.docs d where d.project_id = s.project_id and d.deleted_at is null and d.ref = any (p_refs) and private.ref_ok(s.prefixes, d.ref);
  select coalesce(jsonb_agg(r), '[]') into missing from unnest(p_refs) r
  where not exists (select 1 from public.docs d where d.project_id = s.project_id and d.deleted_at is null and d.ref = r and private.ref_ok(s.prefixes, d.ref));
  perform private.mcp_log(s.token_id, s.project_id, 'read_doc', p_refs[1], 'ok');
  return jsonb_build_object('docs', found_docs, 'missing', missing);
end;
$function$;

-- mcp_dataset
CREATE OR REPLACE FUNCTION public.mcp_dataset(p_token text, p_ip text, p_project text, p_kind text, p_filter jsonb DEFAULT NULL::jsonb, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s record; rows_ jsonb; total int; lim int := least(greatest(coalesce(p_limit, 50), 1), 100); off int := greatest(coalesce(p_offset, 0), 0);
begin
  select * into s from private.mcp_gate(p_token, p_ip, p_project);
  if s.err is not null then return private.mcp_fail('query_dataset', s.token_id, s.err, s.hint); end if;
  select count(*) into total from public.docs d where d.project_id = s.project_id and d.deleted_at is null and d.kind = p_kind and private.ref_ok(s.prefixes, d.ref) and (p_filter is null or d.data @> p_filter);
  select coalesce(jsonb_agg(jsonb_build_object('id', q.ref, 'title', q.title, 'rev', q.rev, 'data', q.data) order by q.position), '[]') into rows_
  from (select d.* from public.docs d where d.project_id = s.project_id and d.deleted_at is null and d.kind = p_kind and private.ref_ok(s.prefixes, d.ref) and (p_filter is null or d.data @> p_filter) order by d.position limit lim offset off) q;
  perform private.mcp_log(s.token_id, s.project_id, 'query_dataset', p_kind, 'ok');
  return jsonb_build_object('rows', rows_, 'total', total, 'next_offset', case when off + lim < total then off + lim end);
end;
$function$;

-- mcp_refs
CREATE OR REPLACE FUNCTION public.mcp_refs(p_token text, p_ip text, p_project text, p_ref text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s record; me public.docs; outg jsonb; inc jsonb := '[]';
begin
  select * into s from private.mcp_gate(p_token, p_ip, p_project);
  if s.err is not null then return private.mcp_fail('get_references', s.token_id, s.err, s.hint); end if;
  select * into me from public.docs d where d.project_id = s.project_id and d.ref = p_ref and d.deleted_at is null and private.ref_ok(s.prefixes, d.ref);
  if me.id is null then return private.mcp_fail('get_references', s.token_id, 'mcp:not_found', 'No such document. Use search_docs or get_outline for valid ids.'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', b.ref, 'title', b.title) order by b.ref), '[]') into outg
  from public.docs b
  where b.project_id = s.project_id and b.deleted_at is null and b.key is not null and length(b.key) >= 4 and b.ref <> me.ref and private.ref_ok(s.prefixes, b.ref)
    and me.body ~* ('(^|[^A-Za-z0-9])' || regexp_replace(b.key, '([^A-Za-z0-9 ])', '\\\1', 'g') || '($|[^A-Za-z0-9])');
  if me.key is not null and length(me.key) >= 4 then
    select coalesce(jsonb_agg(jsonb_build_object('id', a.ref, 'title', a.title) order by a.ref), '[]') into inc
    from public.docs a
    where a.project_id = s.project_id and a.deleted_at is null and a.ref <> me.ref and private.ref_ok(s.prefixes, a.ref)
      and a.body ~* ('(^|[^A-Za-z0-9])' || regexp_replace(me.key, '([^A-Za-z0-9 ])', '\\\1', 'g') || '($|[^A-Za-z0-9])');
  end if;
  perform private.mcp_log(s.token_id, s.project_id, 'get_references', p_ref, 'ok');
  return jsonb_build_object('references', outg, 'referenced_by', inc);
end;
$function$;

-- mcp_changes
CREATE OR REPLACE FUNCTION public.mcp_changes(p_token text, p_ip text, p_project text, p_since timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s record; res jsonb; lim int := least(greatest(coalesce(p_limit, 30), 1), 100);
begin
  select * into s from private.mcp_gate(p_token, p_ip, p_project);
  if s.err is not null then return private.mcp_fail('get_changes', s.token_id, s.err, s.hint); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', q.ref, 'title', q.title, 'rev', q.rev, 'at', q.created_at, 'kind', q.kind) order by q.created_at desc), '[]') into res
  from (select r.* from public.doc_revisions r where r.project_id = s.project_id and r.rev > 1 and (p_since is null or r.created_at > p_since) and private.ref_ok(s.prefixes, r.ref) order by r.created_at desc limit lim) q;
  perform private.mcp_log(s.token_id, s.project_id, 'get_changes', null, 'ok');
  return jsonb_build_object('changes', res);
end;
$function$;

-- mcp_propose
CREATE OR REPLACE FUNCTION public.mcp_propose(p_token text, p_ip text, p_project text, p_ref text, p_base_rev integer, p_op text, p_payload jsonb, p_rationale text DEFAULT ''::text, p_idem text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s record; d public.docs; dr public.doc_drafts;
begin
  select * into s from private.mcp_gate(p_token, p_ip, p_project, true);
  if s.err is not null then return private.mcp_fail('propose_edit', s.token_id, s.err, s.hint); end if;
  if p_op not in ('replace', 'find_replace', 'insert_after') then return private.mcp_fail('propose_edit', s.token_id, 'mcp:bad_request', 'op must be replace, find_replace or insert_after.'); end if;
  select * into d from public.docs x where x.project_id = s.project_id and x.ref = p_ref and x.deleted_at is null and private.ref_ok(s.prefixes, x.ref);
  if d.id is null then return private.mcp_fail('propose_edit', s.token_id, 'mcp:not_found', 'No such document. Use search_docs or get_outline for valid ids.'); end if;
  if d.rev <> p_base_rev then return private.mcp_fail('propose_edit', s.token_id, 'mcp:stale', format('Document is at revision %s, not %s. Re-read it with read_doc and propose again.', d.rev, p_base_rev)); end if;
  if p_idem is not null then
    select * into dr from public.doc_drafts x where x.project_id = s.project_id and x.idem_key = p_idem;
    if dr.id is not null then return jsonb_build_object('draft_id', dr.id, 'status', dr.status, 'duplicate', true); end if;
  end if;
  insert into public.doc_drafts (project_id, doc_ref, base_rev, op, payload, rationale, proposed_by, idem_key)
  values (s.project_id, p_ref, p_base_rev, p_op, p_payload, left(coalesce(p_rationale, ''), 2000), coalesce('token:' || left(s.token_id::text, 8), 'anonymous'), p_idem)
  returning * into dr;
  perform private.mcp_log(s.token_id, s.project_id, 'propose_edit', p_ref, 'ok');
  return jsonb_build_object('draft_id', dr.id, 'status', dr.status, 'derived_doc', d.source = 'derived');
end;
$function$;

-- mcp_get_draft
CREATE OR REPLACE FUNCTION public.mcp_get_draft(p_token text, p_ip text, p_project text, p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s record; dr public.doc_drafts;
begin
  select * into s from private.mcp_gate(p_token, p_ip, p_project);
  if s.err is not null then return private.mcp_fail('get_draft', s.token_id, s.err, s.hint); end if;
  select * into dr from public.doc_drafts x where x.id = p_id and x.project_id = s.project_id and private.ref_ok(s.prefixes, x.doc_ref)
    and (s.token_id is not null and x.proposed_by = 'token:' || left(s.token_id::text, 8));
  if dr.id is null then return private.mcp_fail('get_draft', s.token_id, 'mcp:not_found', 'No such draft for this token.'); end if;
  perform private.mcp_log(s.token_id, s.project_id, 'get_draft', dr.doc_ref, 'ok');
  return jsonb_build_object('draft_id', dr.id, 'doc', dr.doc_ref, 'status', dr.status, 'note', dr.note, 'decided_at', dr.decided_at);
end;
$function$;

-- apply_draft
CREATE OR REPLACE FUNCTION private.apply_draft(p_id uuid, p_actor uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare dr public.doc_drafts; d public.docs; nb text; cnt int; pos_ int; exp_ int;
begin
  select * into dr from public.doc_drafts where id = p_id for update;
  if dr.id is null or dr.status <> 'pending' then raise exception 'draft is not pending'; end if;
  if p_actor is not null and not private.can_edit_project(dr.project_id) then raise exception 'not allowed'; end if;
  select * into d from public.docs where project_id = dr.project_id and ref = dr.doc_ref and deleted_at is null for update;
  if d.id is null or d.rev <> dr.base_rev then
    update public.doc_drafts set status = 'stale', note = 'The document changed after this edit was proposed.', decided_at = now(), decided_by = p_actor where id = p_id;
    return 'stale';
  end if;
  if d.source = 'derived' then
    update public.doc_drafts set status = 'approved', note = 'Approved. This document is generated from the typed tables, so apply the change there.', decided_at = now(), decided_by = p_actor where id = p_id;
    return 'approved';
  end if;
  nb := d.body;
  if dr.op = 'replace' then
    nb := dr.payload ->> 'body';
  elsif dr.op = 'find_replace' then
    exp_ := coalesce((dr.payload ->> 'expected')::int, 1);
    cnt := (length(nb) - length(replace(nb, dr.payload ->> 'find', ''))) / greatest(length(dr.payload ->> 'find'), 1);
    if cnt <> exp_ then
      update public.doc_drafts set status = 'stale', note = format('Found %s matches, expected %s.', cnt, exp_), decided_at = now(), decided_by = p_actor where id = p_id;
      return 'stale';
    end if;
    nb := replace(nb, dr.payload ->> 'find', dr.payload ->> 'replace');
  else
    pos_ := position((dr.payload ->> 'anchor') in nb);
    if pos_ = 0 then
      update public.doc_drafts set status = 'stale', note = 'Anchor text not found.', decided_at = now(), decided_by = p_actor where id = p_id;
      return 'stale';
    end if;
    nb := substr(nb, 1, pos_ - 1 + length(dr.payload ->> 'anchor')) || (dr.payload ->> 'text') || substr(nb, pos_ + length(dr.payload ->> 'anchor'));
  end if;
  if nb is null then raise exception 'draft has no usable content'; end if;
  update public.docs set body = nb where id = d.id;
  update public.doc_drafts set status = 'applied', decided_at = now(), decided_by = p_actor where id = p_id;
  return 'applied';
end;
$function$;

-- decide_draft
CREATE OR REPLACE FUNCTION public.decide_draft(p_id uuid, p_approve boolean)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare dr public.doc_drafts;
begin
  select * into dr from public.doc_drafts where id = p_id;
  if dr.id is null then raise exception 'no such draft'; end if;
  if not p_approve then
    update public.doc_drafts set status = 'rejected', decided_at = now(), decided_by = (select auth.uid()) where id = p_id and status = 'pending';
    return 'rejected';
  end if;
  return private.apply_draft(p_id, (select auth.uid()));
end;
$function$;

-- sync_derived_docs
CREATE OR REPLACE FUNCTION private.sync_derived_docs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pid uuid; b jsonb; ch jsonb; blk jsonb; it jsonb; x jsonb; rows_ jsonb := '[]'; cid text; cur_ref text; cur_title text; cur_parent text; parts text[];
  n int := 0; refs text[];
begin
  select id into pid from public.projects where slug = 'geminiforge';
  if pid is null then return; end if;
  b := public.get_content_bundle();
  for ch in select * from jsonb_array_elements(b -> 'chapters') loop
    cid := ch ->> 'id'; cur_ref := 'chapter:' || cid; cur_title := (ch ->> 'num') || ' ' || (ch ->> 'title'); cur_parent := null; parts := array[ch ->> 'subtitle'];
    for blk in select * from jsonb_array_elements(coalesce(b -> 'chapterBlocks' -> cid, '[]')) loop
      if blk ->> 't' = 'h2' then
        if cardinality(parts) > 0 then n := n + 1; rows_ := rows_ || jsonb_build_object('ref', cur_ref, 'kind', 'section', 'title', cur_title, 'body', array_to_string(parts, E'\n'), 'parent_ref', cur_parent, 'position', n); end if;
        cur_ref := 'chapter:' || cid || '#' || (blk ->> 'id'); cur_title := (ch ->> 'num') || ' ' || (ch ->> 'title') || ' / ' || (blk ->> 'text'); cur_parent := 'chapter:' || cid; parts := '{}';
      else
        if blk ->> 'text' is not null then parts := parts || (blk ->> 'text'); end if;
        for it in select * from jsonb_array_elements(coalesce(blk -> 'items', '[]')) loop
          parts := parts || array_to_string(array_remove(array[it ->> 'title', it ->> 'badge', it ->> 'tag', it ->> 'label', it ->> 'text',
                     (select string_agg(v, ' ') from jsonb_array_elements_text(coalesce(it -> 'body', '[]')) v)], null), ' - ');
        end loop;
        if blk ->> 't' = 'table' then
          parts := parts || array_to_string(array(select jsonb_array_elements_text(blk -> 'head')), ' | ');
          for x in select * from jsonb_array_elements(blk -> 'rows') loop parts := parts || array_to_string(array(select jsonb_array_elements_text(x)), ' | '); end loop;
        end if;
      end if;
    end loop;
    if cardinality(parts) > 0 then n := n + 1; rows_ := rows_ || jsonb_build_object('ref', cur_ref, 'kind', 'section', 'title', cur_title, 'body', array_to_string(parts, E'\n'), 'parent_ref', cur_parent, 'position', n); end if;
  end loop;

  for x in select * from jsonb_array_elements(b -> 'crates') loop n := n + 1;
    rows_ := rows_ || jsonb_build_object('ref', 'crate:' || (x ->> 'name'), 'kind', 'crate', 'title', x ->> 'name', 'key', x ->> 'name', 'data', x, 'position', n,
      'body', concat_ws(E'\n', x ->> 'plainSummary', x ->> 'whyItMatters', 'layer ' || (x ->> 'layer') || ' / plane ' || (x ->> 'plane') || ' / deps ' || (x ->> 'deps'), x ->> 'code')); end loop;
  for x in select * from jsonb_array_elements(b -> 'packs') loop n := n + 1;
    rows_ := rows_ || jsonb_build_object('ref', 'pack:' || (x ->> 'id'), 'kind', 'pack', 'title', x ->> 'name', 'key', x ->> 'id', 'data', x, 'position', n,
      'body', (x ->> 'catLabel') || '; size ' || (x ->> 'size') || '; min tier ' || (x ->> 'minTier') || E'\n' || (x ->> 'plainPurpose') || E'\ntools: ' || (x ->> 'tools')); end loop;
  for x in select * from jsonb_array_elements(b -> 'prompts') loop n := n + 1;
    rows_ := rows_ || jsonb_build_object('ref', 'prompt:' || (x ->> 'id'), 'kind', 'prompt', 'title', (x ->> 'id') || ' ' || (x ->> 'title'), 'key', x ->> 'id', 'data', x, 'position', n,
      'body', concat_ws(E'\n', x ->> 'plainGoal', x ->> 'whyNeeded', x ->> 'fullPrompt')); end loop;
  for x in select * from jsonb_array_elements(b -> 'confirmations') loop n := n + 1;
    rows_ := rows_ || jsonb_build_object('ref', 'confirm:' || (x ->> 'id'), 'kind', 'confirmation', 'title', (x ->> 'id') || ' ' || (x ->> 'title'), 'key', x ->> 'id', 'data', x, 'position', n, 'body', x ->> 'plainWhy'); end loop;
  for x in select * from jsonb_array_elements(b -> 'patches') loop n := n + 1;
    rows_ := rows_ || jsonb_build_object('ref', 'patch:' || (x ->> 'id'), 'kind', 'patch', 'title', (x ->> 'id') || ' ' || (x ->> 'target'), 'key', x ->> 'id', 'data', x, 'position', n, 'body', (x ->> 'summary') || E'\n' || (x ->> 'code')); end loop;
  for x in select * from jsonb_array_elements(b -> 'spikes') loop n := n + 1;
    rows_ := rows_ || jsonb_build_object('ref', 'spike:' || (x ->> 'id'), 'kind', 'spike', 'title', x ->> 'id', 'key', x ->> 'id', 'data', x, 'position', n,
      'body', (x ->> 'target') || ': ' || (x ->> 'candA') || ' vs ' || (x ->> 'candB') || '; gate: ' || (x ->> 'gate')); end loop;
  for x in select * from jsonb_array_elements(b -> 'claims') loop n := n + 1;
    rows_ := rows_ || jsonb_build_object('ref', 'claim:' || (x ->> 'id'), 'kind', 'claim', 'title', (x ->> 'id') || ' ' || (x ->> 'where'), 'key', x ->> 'id', 'data', x, 'position', n,
      'body', concat_ws(E'\n', x ->> 'claim', 'found: ' || (x ->> 'found'), 'action: ' || (x ->> 'action'))); end loop;
  for x in select * from jsonb_array_elements(b -> 'roster') loop n := n + 1;
    rows_ := rows_ || jsonb_build_object('ref', 'agent:' || (x ->> 'id'), 'kind', 'agent', 'title', (x ->> 'id') || ' ' || (x ->> 'role'), 'data', x, 'position', n,
      'body', (x ->> 'plainRoleExplanation') || '; reports to ' || (x ->> 'reportsTo') || '; tier ' || (x ->> 'tier')); end loop;
  for x in select * from jsonb_array_elements(b -> 'tasks') loop n := n + 1;
    rows_ := rows_ || jsonb_build_object('ref', 'task:' || (x ->> 'taskId'), 'kind', 'task', 'title', (x ->> 'taskId') || ' ' || (x ->> 'title'), 'data', x, 'position', n,
      'body', concat_ws(E'\n', x ->> 'plainExplanation', 'ancestry: ' || (x ->> 'ancestry'), 'status ' || (x ->> 'status'))); end loop;

  insert into public.docs as d (project_id, ref, kind, title, body, data, parent_ref, position, key, source)
  select pid, r.ref, r.kind, r.title, r.body, r.data, r.parent_ref, r.position, r.key, 'derived'
  from jsonb_to_recordset(rows_) as r(ref text, kind text, title text, body text, data jsonb, parent_ref text, position int, key text)
  on conflict (project_id, ref) do update
    set kind = excluded.kind, title = excluded.title, body = excluded.body, data = excluded.data, parent_ref = excluded.parent_ref,
        position = excluded.position, key = excluded.key, deleted_at = null
    where (d.kind, d.title, d.body, d.data, d.parent_ref, d.position, d.key, d.deleted_at)
          is distinct from (excluded.kind, excluded.title, excluded.body, excluded.data, excluded.parent_ref, excluded.position, excluded.key, null::timestamptz);

  refs := array(select jsonb_array_elements(rows_) ->> 'ref');
  update public.docs set deleted_at = now() where project_id = pid and source = 'derived' and deleted_at is null and ref <> all (refs);
end;
$function$;

-- on_content_version
CREATE OR REPLACE FUNCTION private.on_content_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  begin
    perform private.sync_derived_docs();
  exception when others then
    raise warning 'docs sync failed: %', sqlerrm;
  end;
  return null;
end;
$function$;

revoke all on function private.mcp_take(text, int), private.mcp_gate(text, text, text, boolean), private.mcp_fail(text, uuid, text, text), private.ref_ok(text[], text), private.mcp_log(uuid, uuid, text, text, text),
  private.apply_draft(uuid, uuid), private.sync_derived_docs(), private.on_content_version() from public;
revoke all on function public.decide_draft(uuid, boolean) from public, anon;
grant execute on function public.decide_draft(uuid, boolean) to authenticated;
grant execute on function private.apply_draft(uuid, uuid) to authenticated;

-- only the MCP server (secret key = service_role) may call the mcp_* functions
revoke all on function public.mcp_list_projects(text, text), public.mcp_outline(text, text, text, text, text, int, int), public.mcp_search(text, text, text, text, text, int, int),
  public.mcp_read(text, text, text, text[]), public.mcp_dataset(text, text, text, text, jsonb, int, int), public.mcp_refs(text, text, text, text),
  public.mcp_changes(text, text, text, timestamptz, int), public.mcp_propose(text, text, text, text, int, text, jsonb, text, text), public.mcp_get_draft(text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.mcp_list_projects(text, text), public.mcp_outline(text, text, text, text, text, int, int), public.mcp_search(text, text, text, text, text, int, int),
  public.mcp_read(text, text, text, text[]), public.mcp_dataset(text, text, text, text, jsonb, int, int), public.mcp_refs(text, text, text, text),
  public.mcp_changes(text, text, text, timestamptz, int), public.mcp_propose(text, text, text, text, int, text, jsonb, text, text), public.mcp_get_draft(text, text, text, uuid)
  to service_role;

-- the GeminiForge docs are derived from the typed tables whenever the content version changes
create trigger content_meta_sync after update of version on public.content_meta for each row execute function private.on_content_version();

insert into public.projects (slug, name, description, visibility)
values ('geminiforge', 'GeminiForge V20', 'The GeminiForge V20 specification: chapters, crates, packs, prompts, confirmations, patches, spikes and review claims.', 'public');
select private.sync_derived_docs();
