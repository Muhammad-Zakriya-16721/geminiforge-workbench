-- 0007: tell AI clients what they may edit. projects.ai_guide = the owner's message; mcp_guide() returns it with the edit mode of every kind
-- (free = any edit and new documents, field = generated page, find_replace/insert_after inside one source field, locked = live data);
-- mcp_read and mcp_outline now carry an `edit` field per document. Rollback: 0007_down.sql (drop statements) then re-run mcp_read/mcp_outline from 0003.
alter table public.projects add column ai_guide text not null default '' check (length(ai_guide) <= 4000);

create or replace function private.edit_mode(p_kind text, p_source text) returns text
language sql immutable set search_path = '' as $$
  select case when p_source = 'native' then 'free' when p_kind in ('agent', 'task') then 'locked' else 'field' end
$$;
revoke all on function private.edit_mode(text, text) from public;

create or replace function public.mcp_guide(p_token text, p_ip text, p_project text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s record; g text; tk public.mcp_tokens; pend int := 0; kinds jsonb;
begin
  select * into s from private.mcp_gate(p_token, p_ip, p_project);
  if s.err is not null then return private.mcp_fail('get_guide', s.token_id, s.err, s.hint); end if;
  select p.ai_guide into g from public.projects p where p.id = s.project_id;
  if s.token_id is not null then
    select * into tk from public.mcp_tokens t where t.id = s.token_id;
    select count(*) into pend from public.doc_drafts q where q.token_id = s.token_id and q.status = 'pending';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('kind', q.kind, 'edit', q.edit, 'docs', q.n) order by q.edit, q.kind), '[]') into kinds
  from (select d.kind, private.edit_mode(d.kind, d.source) edit, count(*) n from public.docs d
        where d.project_id = s.project_id and d.deleted_at is null and private.ref_ok(s.prefixes, d.ref) group by 1, 2) q;
  perform private.mcp_log(s.token_id, s.project_id, 'get_guide', null, 'ok');
  return jsonb_build_object('owner_message', coalesce(g, ''), 'access', case when tk.id is null then 'public read-only' when tk.mode = 'propose' then 'read and propose' else 'read-only' end,
    'max_pending', tk.max_pending, 'pending', pend, 'prefixes', coalesce(s.prefixes, '{}'), 'kinds', kinds);
end;
$$;
revoke all on function public.mcp_guide(text, text, text) from public, anon, authenticated;
grant execute on function public.mcp_guide(text, text, text) to service_role;

create or replace function public.mcp_read(p_token text, p_ip text, p_project text, p_refs text[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s record; found_docs jsonb; missing jsonb;
begin
  select * into s from private.mcp_gate(p_token, p_ip, p_project);
  if s.err is not null then return private.mcp_fail('read_doc', s.token_id, s.err, s.hint); end if;
  if p_refs is null or cardinality(p_refs) = 0 or cardinality(p_refs) > 20 then return private.mcp_fail('read_doc', s.token_id, 'mcp:bad_request', 'Pass between 1 and 20 document ids.'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', d.ref, 'kind', d.kind, 'title', d.title, 'body', d.body, 'data', d.data, 'parent', d.parent_ref, 'rev', d.rev, 'updated_at', d.updated_at, 'edit', private.edit_mode(d.kind, d.source)) order by d.position, d.ref), '[]') into found_docs
  from public.docs d where d.project_id = s.project_id and d.deleted_at is null and d.ref = any (p_refs) and private.ref_ok(s.prefixes, d.ref);
  select coalesce(jsonb_agg(r), '[]') into missing from unnest(p_refs) r
  where not exists (select 1 from public.docs d where d.project_id = s.project_id and d.deleted_at is null and d.ref = r and private.ref_ok(s.prefixes, d.ref));
  perform private.mcp_log(s.token_id, s.project_id, 'read_doc', p_refs[1], 'ok');
  return jsonb_build_object('docs', found_docs, 'missing', missing);
end;
$$;

create or replace function public.mcp_outline(p_token text, p_ip text, p_project text, p_kind text default null, p_parent text default null, p_limit integer default 100, p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s record; items jsonb; total int; lim int := least(greatest(coalesce(p_limit, 100), 1), 200); off int := greatest(coalesce(p_offset, 0), 0);
begin
  select * into s from private.mcp_gate(p_token, p_ip, p_project);
  if s.err is not null then return private.mcp_fail('get_outline', s.token_id, s.err, s.hint); end if;
  select count(*) into total from public.docs d where d.project_id = s.project_id and d.deleted_at is null and private.ref_ok(s.prefixes, d.ref)
    and (p_kind is null or d.kind = p_kind) and (p_parent is null or d.parent_ref = p_parent or d.ref = p_parent);
  select coalesce(jsonb_agg(jsonb_build_object('id', q.ref, 'kind', q.kind, 'title', q.title, 'parent', q.parent_ref, 'rev', q.rev, 'edit', private.edit_mode(q.kind, q.source)) order by q.position, q.ref), '[]') into items
  from (select d.* from public.docs d where d.project_id = s.project_id and d.deleted_at is null and private.ref_ok(s.prefixes, d.ref)
          and (p_kind is null or d.kind = p_kind) and (p_parent is null or d.parent_ref = p_parent or d.ref = p_parent)
        order by d.position, d.ref limit lim offset off) q;
  perform private.mcp_log(s.token_id, s.project_id, 'get_outline', coalesce(p_parent, p_kind), 'ok');
  return jsonb_build_object('items', items, 'total', total, 'next_offset', case when off + lim < total then off + lim end);
end;
$$;
