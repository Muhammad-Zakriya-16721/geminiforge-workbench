-- 0005: AI access controls for the app: a pause switch per project and a recent-activity view for the owner.
--   projects.ai_paused   while true, every token request is refused with mcp:paused (anonymous reads of public projects still work)
--   mcp_audit_recent()   the owner reads the latest MCP calls for a project (token label, tool, document, outcome)
-- Rollback: 0005_down.sql (drop statements, run in the dashboard), then re-run mcp_gate from 0003.

alter table public.projects add column ai_paused boolean not null default false;

create or replace function private.mcp_gate(p_token text, p_ip text, p_project text, p_write boolean default false)
returns table(project_id uuid, token_id uuid, prefixes text[], err text, hint text)
language plpgsql security definer set search_path = '' as $$
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
    if pr.ai_paused then
      return query select null::uuid, t.id, null::text[], 'mcp:paused', 'The owner paused AI access to this project. Try again later.'; return;
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
$$;

create or replace function public.mcp_audit_recent(p_slug text, p_limit int default 100)
returns table (ts timestamptz, token_label text, tool text, ref text, status text)
language plpgsql security definer set search_path = '' as $$
declare pid uuid;
begin
  select id into pid from public.projects where slug = p_slug;
  if pid is null or not private.can_edit_project(pid) then raise exception 'not allowed'; end if;
  return query
    select a.ts, t.label, a.tool, a.ref, a.status
    from private.mcp_audit a left join public.mcp_tokens t on t.id = a.token_id
    where a.project_id = pid or t.project_id = pid
    order by a.ts desc limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;
revoke all on function public.mcp_audit_recent(text, int) from public, anon;
grant execute on function public.mcp_audit_recent(text, int) to authenticated;
