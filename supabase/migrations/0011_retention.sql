-- 0011: retention, activity clearing, audit v2 (error text) and a prompt-injection risk flag.
--   * pg_cron job "gf-purge" (daily 03:17 UTC) runs private.purge_expired(): removes trashed edits/pages whose purge_after has passed,
--     MCP call log older than 180 days, daily counters older than 35 days, trash log and token change log older than 365 days.
--     Accepted (applied) edits are never purged, as in the RLS delete policy. On the free plan a paused project does not run jobs;
--     the Trash page still purges expired rows when it is opened.
--   * public.clear_activity(slug, days): the owner clears the MCP call log older than N days (0 = all).
--   * public.mcp_audit_log(slug, limit): like mcp_audit_recent plus the detail column (the old function stays).
--   * private.mcp_audit.detail: the error hint of a failed call, shown in the activity table.
--   * risk_of gets the flag 'injection_phrases' (text that tells a reader/AI to ignore rules, hide things from the owner, etc.).
-- Rollback: 0011_down.sql.

create extension if not exists pg_cron with schema pg_catalog;

alter table private.mcp_audit add column if not exists detail text;

create or replace function private.mcp_fail(tl text, tok uuid, e text, h text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.mcp_audit (token_id, project_id, tool, ref, status, detail) values (tok, null, tl, null, e, left(h, 300));
  return jsonb_build_object('error', e, 'hint', h);
end;
$$;

create or replace function public.mcp_audit_log(p_slug text, p_limit int default 100)
returns table (ts timestamptz, token_label text, tool text, ref text, status text, detail text)
language plpgsql security definer set search_path = '' as $$
declare pid uuid;
begin
  select id into pid from public.projects where slug = p_slug;
  if pid is null or not private.can_edit_project(pid) then raise exception 'not allowed'; end if;
  return query
    select a.ts, t.label, a.tool, a.ref, a.status, a.detail
    from private.mcp_audit a left join public.mcp_tokens t on t.id = a.token_id
    where a.project_id = pid or t.project_id = pid
    order by a.ts desc limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;
revoke all on function public.mcp_audit_log(text, int) from public, anon;
grant execute on function public.mcp_audit_log(text, int) to authenticated;

create or replace function public.clear_activity(p_slug text, p_days int default 0) returns int
language plpgsql security definer set search_path = '' as $$
declare pid uuid; n int;
begin
  select id into pid from public.projects where slug = p_slug;
  if pid is null or not private.can_edit_project(pid) then raise exception 'not allowed'; end if;
  if p_days is null or p_days < 0 then raise exception 'days must be 0 or more'; end if;
  with gone as (
    delete from private.mcp_audit a
    where a.ts < now() - make_interval(days => p_days)
      and (a.project_id = pid or a.token_id in (select t.id from public.mcp_tokens t where t.project_id = pid))
    returning 1)
  select count(*) into n from gone;
  insert into public.token_events (project_id, token_id, action, detail, actor)
    values (pid, '00000000-0000-0000-0000-000000000000', 'activity_cleared', jsonb_build_object('older_than_days', p_days, 'rows', n), (select auth.uid()));
  return n;
end;
$$;
revoke all on function public.clear_activity(text, int) from public, anon;
grant execute on function public.clear_activity(text, int) to authenticated;

create or replace function private.purge_expired() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a int; b int; c int; d int; e int; f int;
begin
  with x as (delete from public.change_sets s where s.deleted_at is not null and s.purge_after < now()
      and not exists (select 1 from public.doc_drafts q where q.change_set_id = s.id and q.reverted_at is null and q.status in ('pending', 'applied', 'approved')) returning 1)
    select count(*) into a from x;
  with x as (delete from public.docs d where d.deleted_at is not null and d.purge_after < now() and d.source = 'native' returning 1) select count(*) into b from x;
  with x as (delete from private.mcp_audit where ts < now() - interval '180 days' returning 1) select count(*) into c from x;
  with x as (delete from private.mcp_usage where day < current_date - 35 returning 1) select count(*) into d from x;
  with x as (delete from public.trash_log where at < now() - interval '365 days' returning 1) select count(*) into e from x;
  with x as (delete from public.token_events where at < now() - interval '365 days' returning 1) select count(*) into f from x;
  return jsonb_build_object('edits', a, 'pages', b, 'audit', c, 'usage', d, 'trash_log', e, 'token_events', f);
end;
$$;
revoke all on function private.purge_expired() from public, anon, authenticated;

select cron.schedule('gf-purge', '17 3 * * *', $job$select private.purge_expired()$job$);

-- prompt-injection phrases: flagged when the new text has them and the old text did not
create or replace function private.risk_of(p_old text, p_new text, p_new_doc boolean, p_whole boolean)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare f text[] := '{}'; s int := 0; o text := coalesce(p_old, ''); n text := coalesce(p_new, ''); lo int; ln int; a text[]; b text[];
  inv text := '[' || chr(8203) || '-' || chr(8205) || chr(8288) || chr(65279) || ']';
  tag text := '<[a-zA-Z/!][^>]*>';
  inj text := '(ignore|disregard|forget|override)\s+(all\s+|any\s+|the\s+|your\s+)?(previous|prior|above|earlier|system|safety)\s+(instructions|rules|prompts?|guidelines)|you\s+are\s+now\s+(a|an|in)\s|do\s+not\s+(tell|inform|mention|show|reveal)[^.]{0,30}(user|owner|human)|(call|invoke|run|execute)\s+the\s+[a-z_]{3,40}\s+tool|system\s+prompt|<\s*/?\s*(system|instructions?)\s*>';
begin
  lo := length(o); ln := length(n);
  if p_new_doc then f := array_append(f, 'new_doc'); s := s + 1;
  else
    if p_whole then f := array_append(f, 'whole_doc'); s := s + 2; end if;
    if abs(ln - lo) > 1500 or (abs(ln - lo) > 200 and abs(ln - lo) > lo * 0.4) then f := array_append(f, 'large_change'); s := s + 2; end if;
    if lo - ln > 100 and ln < lo * 0.7 then f := array_append(f, 'deletes_content'); s := s + 3; end if;
    a := array(select m[1] from regexp_matches(o, '(\d+(?:[.,]\d+)?)', 'g') m order by 1);
    b := array(select m[1] from regexp_matches(n, '(\d+(?:[.,]\d+)?)', 'g') m order by 1);
    if a is distinct from b then f := array_append(f, 'numbers_changed'); s := s + 2; end if;
    if (lo - length(replace(o, '```', ''))) <> (ln - length(replace(n, '```', ''))) then f := array_append(f, 'code_changed'); s := s + 1; end if;
  end if;
  a := array(select m[1] from regexp_matches(o, '(https?://[^\s)>\]]+)', 'g') m);
  b := array(select m[1] from regexp_matches(n, '(https?://[^\s)>\]]+)', 'g') m);
  if exists (select 1 from unnest(b) u where u <> all (a)) then f := array_append(f, 'new_url'); s := s + 2; end if;
  if cardinality(array(select m[1] from regexp_matches(n, '(' || tag || ')', 'g') m)) > cardinality(array(select m[1] from regexp_matches(o, '(' || tag || ')', 'g') m)) then f := array_append(f, 'html'); s := s + 2; end if;
  if n ~ '\]\((?!https?:|#|/|mailto:)[a-zA-Z][a-zA-Z0-9+.-]*:' and not o ~ '\]\((?!https?:|#|/|mailto:)[a-zA-Z][a-zA-Z0-9+.-]*:' then f := array_append(f, 'odd_link'); s := s + 3; end if;
  if n ~ inv and not o ~ inv then f := array_append(f, 'invisible_chars'); s := s + 3; end if;
  if n ~* inj and not o ~* inj then f := array_append(f, 'injection_phrases'); s := s + 4; end if;
  return jsonb_build_object('score', s, 'flags', to_jsonb(f));
end;
$$;

-- the Trash page asks the server to purge expired items (the browser clock is never trusted)
create or replace function public.purge_trash() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a int; b int;
begin
  if (select auth.uid()) is null then raise exception 'not allowed'; end if;
  with x as (delete from public.change_sets s where s.deleted_at is not null and s.purge_after < now() and private.can_edit_project(s.project_id)
      and not exists (select 1 from public.doc_drafts q where q.change_set_id = s.id and q.reverted_at is null and q.status in ('pending', 'applied', 'approved')) returning 1)
    select count(*) into a from x;
  with x as (delete from public.docs d where d.deleted_at is not null and d.purge_after < now() and d.source = 'native' and private.can_edit_project(d.project_id) returning 1)
    select count(*) into b from x;
  return jsonb_build_object('edits', a, 'pages', b);
end;
$$;
revoke all on function public.purge_trash() from public, anon;
grant execute on function public.purge_trash() to authenticated;
