-- 0012: hardening from the round-17 audit. Applied live; every change was tested in a rolled-back transaction.
--   * mcp_gate: per-address limits run BEFORE the shared budget, failed tokens count per address (200/day), so one noisy client cannot lock everybody out.
--   * docs delete policy only matches trashed pages; doc_revisions are hidden from non-editors for trashed pages; mcp_changes skips trashed pages.
--   * bad_chars also refuses zero-width space, word joiner family, BOM and supplementary variation selectors (ZWNJ/ZWJ stay allowed: Persian/Urdu/emoji need them).
--   * apply_draft (generated pages): the page that results must equal the text the owner reviewed, otherwise the transaction rolls back.
--   * revert_draft locks the draft and the page row; idempotency keys are scoped per token; anon loses write/truncate table privileges.
-- Rollback: restore the previous function bodies from 0004-0011 and the old policies from 0003/0009.

create or replace function private.mcp_gate(p_token text, p_ip text, p_project text, p_write boolean default false)
returns table(project_id uuid, token_id uuid, prefixes text[], err text, hint text)
language plpgsql security definer set search_path = '' as $$
declare t public.mcp_tokens; pr public.projects; ipk text := coalesce(p_ip, 'unknown'); bad int;
begin
  select u.calls into bad from private.mcp_usage u where u.day = current_date and u.key = 'bad:' || ipk;
  if coalesce(bad, 0) >= 200 or not private.mcp_take(case when p_token is null then 'ip:' else 'ipt:' end || ipk, case when p_token is null then 600 else 5000 end) then
    return query select null::uuid, null::uuid, null::text[], 'mcp:rate_limited', 'Daily request budget for this address is used up; retry after 00:00 UTC.'; return;
  end if;
  if not private.mcp_take('global', 30000) then
    return query select null::uuid, null::uuid, null::text[], 'mcp:rate_limited', 'The service is busy; retry later.'; return;
  end if;
  select * into pr from public.projects x where x.slug = p_project and x.archived_at is null;
  if p_token is not null then
    select * into t from public.mcp_tokens k where k.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
    if t.id is null or t.revoked_at is not null or (t.expires_at is not null and t.expires_at < now()) then
      perform private.mcp_take('bad:' || ipk, 200);
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
    if pr.ai_paused then
      return query select null::uuid, t.id, null::text[], 'mcp:paused', 'The owner paused AI access to this project. Try again later.'; return;
    end if;
    if p_write and t.mode <> 'propose' then
      return query select null::uuid, t.id, null::text[], 'mcp:forbidden', 'This token is read-only.'; return;
    end if;
    return query select pr.id, t.id, t.path_prefixes, null::text, null::text;
  else
    if pr.id is null or pr.visibility not in ('public', 'unlisted') then
      return query select null::uuid, null::uuid, null::text[], 'mcp:not_found', 'Unknown project. Call list_projects.'; return;
    end if;
    if p_write then
      return query select null::uuid, null::uuid, null::text[], 'mcp:forbidden', 'Proposing edits needs an access token with propose mode.'; return;
    end if;
    return query select pr.id, null::uuid, '{}'::text[], null::text, null::text;
  end if;
end;
$$;

alter policy "docs delete" on public.docs using (source = 'native' and deleted_at is not null and (select private.can_edit_project(project_id)));
alter policy "revisions read" on public.doc_revisions using ((select private.can_read_project(project_id)) and (exists (select 1 from public.docs d where d.id = doc_id and d.deleted_at is null) or (select private.can_edit_project(project_id))));

create or replace function private.bad_chars(t text) returns text
language sql immutable set search_path = '' as $$
  select case
    when t ~ ('[' || chr(917504) || '-' || chr(917631) || ']') then 'Tag characters (hidden text) are not allowed.'
    when t ~ ('[' || chr(917760) || '-' || chr(917999) || chr(8203) || chr(8288) || '-' || chr(8292) || chr(65279) || ']') then 'Invisible characters (zero-width or variation selectors) are not allowed.'
    when t ~ ('[' || chr(8234) || '-' || chr(8238) || chr(8294) || '-' || chr(8297) || ']') then 'Bidirectional control characters are not allowed.'
    when t ~ ('[' || chr(1) || '-' || chr(8) || chr(11) || chr(12) || chr(14) || '-' || chr(31) || chr(127) || ']') then 'Control characters are not allowed.'
  end
$$;

revoke all on all tables in schema public from anon;
grant select on all tables in schema public to anon;
revoke all on public.mcp_tokens, public.token_events, public.instruction_versions, public.trash_log, public.change_sets, public.doc_drafts from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- in-place edits of existing functions (each fails loudly if the expected text is not there)
do $$ declare def text; d2 text; begin
  select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'mcp_propose_set';
  d2 := replace(def, 'x.idem_key = p_idem', 'x.idem_key = left(s.token_id::text, 8) || '':'' || p_idem');
  d2 := replace(d2, 'left(p_client, 80), p_idem)', 'left(p_client, 80), case when p_idem is null then null else left(s.token_id::text, 8) || '':'' || p_idem end)');
  if d2 = def then raise exception 'replace failed'; end if;
  execute d2;
end $$;
do $$ declare def text; d2 text; begin
  select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'revert_draft';
  d2 := replace(def, 'select * into dr from public.doc_drafts x where x.id = p_id;', 'select * into dr from public.doc_drafts x where x.id = p_id for update;');
  d2 := replace(d2, 'where x.project_id = dr.project_id and x.ref = dr.doc_ref;', 'where x.project_id = dr.project_id and x.ref = dr.doc_ref for update;');
  if d2 = def then raise exception 'replace failed'; end if;
  execute d2;
end $$;
do $$ declare def text; d2 text; begin
  select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'mcp_changes';
  d2 := replace(def, 'where r.project_id = s.project_id and r.rev > 1', 'where r.project_id = s.project_id and r.rev > 1 and exists (select 1 from public.docs dd where dd.id = r.doc_id and dd.deleted_at is null)');
  if d2 = def then raise exception 'replace failed'; end if;
  execute d2;
end $$;
do $$ declare def text; d2 text; begin
  select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname = 'apply_draft';
  d2 := replace(def, 'if rv = d.rev then raise exception ''The generated page did not update; nothing was changed.''; end if;', 'if rv = d.rev then raise exception ''The generated page did not update; nothing was changed.''; end if;
    if (select x.body from public.docs x where x.id = d.id) is distinct from dr.result_body then raise exception ''The generated page would differ from the version you reviewed; nothing was changed.''; end if;');
  if d2 = def then raise exception 'replace failed'; end if;
  execute d2;
end $$;
