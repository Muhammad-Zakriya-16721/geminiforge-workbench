-- 0010: edit tokens in place, per-token message, message versions, token change log.
--   Only label, ai_note (token message), mode, path_prefixes, daily_limit, max_pending, expires_at and revoked_at can be updated by the signed-in role (column grants);
--   a trigger also refuses changes to the hash/id/project/creator and re-activating a revoked token. Messages must be at most 3500 characters and contain no
--   hidden or control characters. Every message save is kept in instruction_versions; every change of a token setting is written to token_events.
--   mcp_guide returns the token's own message when it has one, otherwise the project message.
-- Rollback: 0010_down.sql (drop statements, run in the dashboard), then re-run mcp_guide from 0007.

alter table public.mcp_tokens add column ai_note text not null default '' check (length(ai_note) <= 3500);
grant select (ai_note) on public.mcp_tokens to authenticated;

create table public.token_events (
  id         bigint generated always as identity primary key,
  project_id uuid not null,
  token_id   uuid not null,
  action     text not null,
  detail     jsonb not null default '{}',
  actor      uuid,
  at         timestamptz not null default now()
);
create index token_events_project_idx on public.token_events (project_id, at desc);
alter table public.token_events enable row level security;
create policy "token events read" on public.token_events for select to authenticated using ((select private.can_edit_project(project_id)));

create table public.instruction_versions (
  id         bigint generated always as identity primary key,
  project_id uuid not null,
  token_id   uuid,
  body       text not null,
  author     uuid,
  at         timestamptz not null default now()
);
create index instruction_versions_idx on public.instruction_versions (project_id, token_id, at desc);
alter table public.instruction_versions enable row level security;
create policy "instruction versions read" on public.instruction_versions for select to authenticated using ((select private.can_edit_project(project_id)));

create or replace function private.hidden_text(t text) returns text
language sql immutable set search_path = '' as $$
  select coalesce(private.bad_chars(t), case when t ~ ('[' || chr(8203) || '-' || chr(8205) || chr(8288) || chr(65279) || ']') then 'Invisible characters are not allowed.' end)
$$;
revoke all on function private.hidden_text(text) from public;

create or replace function private.tokens_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.token_hash is distinct from old.token_hash or new.id is distinct from old.id or new.project_id is distinct from old.project_id
     or new.created_at is distinct from old.created_at or new.created_by is distinct from old.created_by then
    raise exception 'These token fields cannot be changed. Create a new token instead.';
  end if;
  if old.revoked_at is not null and new.revoked_at is null then raise exception 'A revoked token cannot be activated again. Create a new token.'; end if;
  if new.ai_note is distinct from old.ai_note and private.hidden_text(new.ai_note) is not null then raise exception '%', private.hidden_text(new.ai_note); end if;
  return new;
end;
$$;
create or replace function private.tokens_after_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare d jsonb := '{}';
begin
  if new.label is distinct from old.label then d := d || jsonb_build_object('label', jsonb_build_array(old.label, new.label)); end if;
  if new.mode is distinct from old.mode then d := d || jsonb_build_object('mode', jsonb_build_array(old.mode, new.mode)); end if;
  if new.path_prefixes is distinct from old.path_prefixes then d := d || jsonb_build_object('prefixes', jsonb_build_array(to_jsonb(old.path_prefixes), to_jsonb(new.path_prefixes))); end if;
  if new.daily_limit is distinct from old.daily_limit then d := d || jsonb_build_object('daily_limit', jsonb_build_array(old.daily_limit, new.daily_limit)); end if;
  if new.max_pending is distinct from old.max_pending then d := d || jsonb_build_object('max_pending', jsonb_build_array(old.max_pending, new.max_pending)); end if;
  if new.expires_at is distinct from old.expires_at then d := d || jsonb_build_object('expires_at', jsonb_build_array(old.expires_at, new.expires_at)); end if;
  if new.revoked_at is distinct from old.revoked_at then d := d || jsonb_build_object('revoked', true); end if;
  if new.ai_note is distinct from old.ai_note then d := d || jsonb_build_object('message', true); end if;
  if d <> '{}'::jsonb then insert into public.token_events (project_id, token_id, action, detail, actor) values (new.project_id, new.id, 'changed', d, (select auth.uid())); end if;
  if new.ai_note is distinct from old.ai_note then insert into public.instruction_versions (project_id, token_id, body, author) values (new.project_id, new.id, new.ai_note, (select auth.uid())); end if;
  return null;
end;
$$;
revoke all on function private.tokens_before_update(), private.tokens_after_update() from public;
create trigger tokens_before_update before update on public.mcp_tokens for each row execute function private.tokens_before_update();
create trigger tokens_after_update after update on public.mcp_tokens for each row execute function private.tokens_after_update();

create or replace function private.projects_guide_check() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.ai_guide is distinct from old.ai_guide then
    if length(new.ai_guide) > 3500 then raise exception 'The message can be at most 3500 characters.'; end if;
    if private.hidden_text(new.ai_guide) is not null then raise exception '%', private.hidden_text(new.ai_guide); end if;
    insert into public.instruction_versions (project_id, token_id, body, author) values (new.id, null, new.ai_guide, (select auth.uid()));
  end if;
  return new;
end;
$$;
revoke all on function private.projects_guide_check() from public;
create trigger projects_guide_check before update on public.projects for each row execute function private.projects_guide_check();

revoke update on public.mcp_tokens from authenticated;
grant update (label, ai_note, mode, path_prefixes, daily_limit, max_pending, expires_at, revoked_at) on public.mcp_tokens to authenticated;

create or replace function public.mcp_guide(p_token text, p_ip text, p_project text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s record; g text; src text := 'project'; tk public.mcp_tokens; pend int := 0; kinds jsonb;
begin
  select * into s from private.mcp_gate(p_token, p_ip, p_project);
  if s.err is not null then return private.mcp_fail('get_guide', s.token_id, s.err, s.hint); end if;
  select p.ai_guide into g from public.projects p where p.id = s.project_id;
  if s.token_id is not null then
    select * into tk from public.mcp_tokens t where t.id = s.token_id;
    select count(*) into pend from public.doc_drafts q where q.token_id = s.token_id and q.status = 'pending';
    if tk.ai_note <> '' then g := tk.ai_note; src := 'token'; end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('kind', q.kind, 'edit', q.edit, 'docs', q.n) order by q.edit, q.kind), '[]') into kinds
  from (select d.kind, private.edit_mode(d.kind, d.source) edit, count(*) n from public.docs d
        where d.project_id = s.project_id and d.deleted_at is null and private.ref_ok(s.prefixes, d.ref) group by 1, 2) q;
  perform private.mcp_log(s.token_id, s.project_id, 'get_guide', null, 'ok');
  return jsonb_build_object('owner_message', coalesce(g, ''), 'message_source', src, 'access', case when tk.id is null then 'public read-only' when tk.mode = 'propose' then 'read and propose' else 'read-only' end,
    'max_pending', tk.max_pending, 'pending', pend, 'prefixes', coalesce(s.prefixes, '{}'), 'kinds', kinds);
end;
$$;
revoke all on function public.mcp_guide(text, text, text) from public, anon, authenticated;
grant execute on function public.mcp_guide(text, text, text) to service_role;
