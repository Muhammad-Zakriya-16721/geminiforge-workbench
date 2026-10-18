-- 0004: AI space. Everything an AI client proposes through MCP waits here as a change set until a human accepts it in the app.
--   change_sets      one proposal from one AI call: a title, a summary and 1 to 20 edits
--   doc_drafts       one edit each; result_body is computed and validated when the edit is PROPOSED, so the AI gets errors at once
--                    and the app can show a diff without re-implementing the edit logic
--   risk_score/flags computed in SQL (size, numbers, code, links, html, invisible text); the inbox sorts by it
--   applied_rev      revision the accepted edit produced; revert_draft only undoes it while the document is still at that revision
-- Hidden-text attacks are refused at proposal time (tag characters, bidi controls, control characters).
-- Rollback: 0004_down.sql. Run each part of this file in order; part 1 must run first.

-- ---------------------------------------------------------------- 1. tables and columns
create table public.change_sets (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null check (length(title) between 1 and 200),
  summary     text not null default '' check (length(summary) <= 4000),
  token_id    uuid,
  proposed_by text not null default 'anonymous',
  client      text check (length(client) <= 80),
  idem_key    text,
  created_at  timestamptz not null default now(),
  unique (project_id, idem_key)
);
create index change_sets_project_idx on public.change_sets (project_id, created_at desc);
alter table public.change_sets enable row level security;
create policy "change sets read" on public.change_sets for select to authenticated using ((select private.can_edit_project(project_id)));

alter table public.doc_drafts
  add column change_set_id uuid references public.change_sets (id) on delete cascade,
  add column new_doc       boolean not null default false,
  add column result_title  text,
  add column result_body   text check (length(result_body) <= 200000),
  add column risk_score    int not null default 0,
  add column risk_flags    text[] not null default '{}',
  add column token_id      uuid,
  add column applied_rev   int,
  add column reject_reason text check (length(reject_reason) <= 1000),
  add column reverted_at   timestamptz;
create index doc_drafts_set_idx on public.doc_drafts (change_set_id);

alter table public.mcp_tokens add column max_pending int not null default 20 check (max_pending between 1 and 200), add column last_client text;
grant select (max_pending, last_client) on public.mcp_tokens to authenticated;

alter table public.doc_revisions add column draft_id uuid;

-- ---------------------------------------------------------------- 2. revisions remember which AI change produced them
create or replace function private.docs_after_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare did uuid := nullif(current_setting('gf.draft_id', true), '')::uuid; rk text := nullif(current_setting('gf.rev_kind', true), '');
begin
  insert into public.doc_revisions (doc_id, project_id, ref, rev, content_hash, title, body, data, kind, author_id, draft_id)
  select new.id, new.project_id, new.ref, new.rev, new.content_hash, new.title, new.body, new.data,
         case when new.source = 'derived' then 'sync' when did is not null then coalesce(rk, 'ai') else 'edit' end, (select auth.uid()), did
  where not exists (select 1 from public.doc_revisions r where r.doc_id = new.id and r.rev = new.rev);
  return null;
end;
$$;

-- ---------------------------------------------------------------- 3. checks that run when an edit is proposed
create or replace function private.bad_chars(t text) returns text
language sql immutable set search_path = '' as $$
  select case
    when t ~ ('[' || chr(917504) || '-' || chr(917631) || ']') then 'Tag characters (hidden text) are not allowed.'
    when t ~ ('[' || chr(8234) || '-' || chr(8238) || chr(8294) || '-' || chr(8297) || ']') then 'Bidirectional control characters are not allowed.'
    when t ~ ('[' || chr(1) || '-' || chr(8) || chr(11) || chr(12) || chr(14) || '-' || chr(31) || chr(127) || ']') then 'Control characters are not allowed.'
  end
$$;

create or replace function private.risk_of(p_old text, p_new text, p_new_doc boolean, p_whole boolean) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare f text[] := '{}'; s int := 0; o text := coalesce(p_old, ''); n text := coalesce(p_new, ''); lo int; ln int; a text[]; b text[];
  inv text := '[' || chr(8203) || '-' || chr(8205) || chr(8288) || chr(65279) || ']';
  tag text := '<[a-zA-Z/!][^>]*>';
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
  return jsonb_build_object('score', s, 'flags', to_jsonb(f));
end;
$$;

-- the text an edit would produce, or an error message for the AI
create or replace function private.draft_result(p_body text, p_op text, p_payload jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare nb text := coalesce(p_body, ''); f text; cnt int; exp_ int; pos_ int;
begin
  if p_op = 'replace' then
    if coalesce(p_payload ->> 'body', '') = '' then return jsonb_build_object('err', 'replace needs a non-empty body.'); end if;
    return jsonb_build_object('body', p_payload ->> 'body');
  elsif p_op = 'find_replace' then
    f := p_payload ->> 'find';
    if coalesce(f, '') = '' then return jsonb_build_object('err', 'find_replace needs a non-empty find.'); end if;
    exp_ := coalesce((p_payload ->> 'expected')::int, 1);
    cnt := (length(nb) - length(replace(nb, f, ''))) / length(f);
    if cnt = 0 then return jsonb_build_object('err', 'The text to find was not found. Re-read the document and copy it exactly.'); end if;
    if cnt <> exp_ then return jsonb_build_object('err', format('The text to find appears %s times, expected %s. Make it longer or set expected.', cnt, exp_)); end if;
    return jsonb_build_object('body', replace(nb, f, coalesce(p_payload ->> 'replace', '')));
  elsif p_op = 'insert_after' then
    f := p_payload ->> 'anchor';
    if coalesce(f, '') = '' or coalesce(p_payload ->> 'text', '') = '' then return jsonb_build_object('err', 'insert_after needs anchor and text.'); end if;
    cnt := (length(nb) - length(replace(nb, f, ''))) / length(f);
    if cnt = 0 then return jsonb_build_object('err', 'The anchor text was not found. Re-read the document and copy it exactly.'); end if;
    if cnt > 1 then return jsonb_build_object('err', format('The anchor appears %s times; use a longer, unique anchor.', cnt)); end if;
    pos_ := position(f in nb);
    return jsonb_build_object('body', substr(nb, 1, pos_ - 1 + length(f)) || (p_payload ->> 'text') || substr(nb, pos_ + length(f)));
  end if;
  return jsonb_build_object('err', 'op must be replace, find_replace or insert_after.');
end;
$$;
revoke all on function private.bad_chars(text), private.risk_of(text, text, boolean, boolean), private.draft_result(text, text, jsonb) from public;

-- ---------------------------------------------------------------- 4. propose a change set (MCP, service_role only)
create or replace function public.mcp_propose_set(p_token text, p_ip text, p_project text, p_title text, p_summary text, p_edits jsonb, p_idem text default null, p_client text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s record; cs public.change_sets; e jsonb; i int := 0; n int; errs jsonb := '[]'; prep jsonb := '[]'; d public.docs; r jsonb; ref text; op text; nd boolean; pay jsonb; nb text; msg text;
  seen text[] := '{}'; pend int; mx int; out jsonb := '[]'; dr public.doc_drafts; rk jsonb; br int; ttl text;
begin
  select * into s from private.mcp_gate(p_token, p_ip, p_project, true);
  if s.err is not null then return private.mcp_fail('propose_changes', s.token_id, s.err, s.hint); end if;
  if jsonb_typeof(p_edits) is distinct from 'array' or jsonb_array_length(p_edits) not between 1 and 20 then
    return private.mcp_fail('propose_changes', s.token_id, 'mcp:bad_request', 'edits must be a list of 1 to 20 edits.');
  end if;
  if length(coalesce(p_title, '')) not between 1 and 200 or length(coalesce(p_summary, '')) > 4000 then
    return private.mcp_fail('propose_changes', s.token_id, 'mcp:bad_request', 'title must be 1 to 200 characters and summary at most 4000.');
  end if;
  if coalesce(private.bad_chars(p_title), private.bad_chars(p_summary)) is not null then
    return private.mcp_fail('propose_changes', s.token_id, 'mcp:bad_request', 'The title or summary contains characters that are not allowed.');
  end if;
  if p_idem is not null then
    select * into cs from public.change_sets x where x.project_id = s.project_id and x.idem_key = p_idem;
    if cs.id is not null then
      return jsonb_build_object('change_set_id', cs.id, 'duplicate', true,
        'drafts', coalesce((select jsonb_agg(jsonb_build_object('draft_id', q.id, 'id', q.doc_ref, 'status', q.status) order by q.created_at) from public.doc_drafts q where q.change_set_id = cs.id), '[]'));
    end if;
  end if;
  n := jsonb_array_length(p_edits);
  select t.max_pending into mx from public.mcp_tokens t where t.id = s.token_id;
  select count(*) into pend from public.doc_drafts q where q.token_id = s.token_id and q.status = 'pending';
  if pend + n > mx then
    return private.mcp_fail('propose_changes', s.token_id, 'mcp:too_many_pending', format('This token already has %s pending edits (limit %s). Wait for the owner to review them.', pend, mx));
  end if;

  for e in select jsonb_array_elements(p_edits) loop
    i := i + 1; msg := null; nb := null; d := null;
    ref := e ->> 'id'; op := coalesce(e ->> 'op', 'replace'); nd := coalesce((e ->> 'new_doc')::boolean, false); pay := coalesce(e -> 'payload', '{}'::jsonb);
    br := coalesce((e ->> 'base_rev')::int, 0); ttl := nullif(pay ->> 'title', '');
    if ref is null or length(ref) not between 2 and 200 or ref ~ ('[' || chr(1) || '-' || chr(31) || ']') then msg := 'id is missing or malformed.';
    elsif ref = any (seen) then msg := 'Only one edit per document in a change set; combine them.';
    elsif not private.ref_ok(s.prefixes, ref) then msg := 'No such document, or this token cannot touch it.';
    else
      msg := coalesce(private.bad_chars(pay ->> 'body'), private.bad_chars(pay ->> 'find'), private.bad_chars(pay ->> 'replace'), private.bad_chars(pay ->> 'anchor'), private.bad_chars(pay ->> 'text'), private.bad_chars(ttl), private.bad_chars(e ->> 'rationale'));
    end if;
    if msg is null then
      select * into d from public.docs x where x.project_id = s.project_id and x.ref = e ->> 'id';
      if nd then
        if d.id is not null then msg := 'A document with this id already exists; choose another id or edit it.';
        elsif ref !~ '^[a-z][a-z0-9_-]{1,20}:[A-Za-z0-9][A-Za-z0-9._ /#-]{0,150}$' then msg := 'A new document id looks like kind:name, for example page:release-notes.';
        elsif ttl is null or length(ttl) > 200 then msg := 'A new document needs a title (payload.title, up to 200 characters).';
        elsif coalesce(pay ->> 'body', '') = '' or length(pay ->> 'body') > 40000 then msg := 'A new document needs a body of 1 to 40000 characters.';
        else
          nb := pay ->> 'body'; op := 'replace'; br := 0;
          rk := private.risk_of('', nb, true, false);
        end if;
      else
        if d.id is null or d.deleted_at is not null then msg := 'No such document. Use search_docs or get_outline for valid ids.';
        elsif br < 1 then msg := 'base_rev is required (the rev from read_doc).';
        elsif d.rev <> br then msg := format('The document is at revision %s, not %s. Read it again and redo this edit.', d.rev, br);
        else
          r := private.draft_result(d.body, op, pay);
          if r ? 'err' then msg := r ->> 'err';
          else
            nb := r ->> 'body';
            if length(nb) > 200000 then msg := 'The result would be longer than 200000 characters.';
            elsif nb = d.body and ttl is not distinct from null then msg := 'This edit changes nothing.';
            else rk := private.risk_of(d.body, nb, false, op = 'replace'); end if;
          end if;
        end if;
      end if;
    end if;
    if msg is not null then
      errs := errs || jsonb_build_object('index', i, 'id', ref, 'error', msg);
    else
      seen := seen || ref;
      prep := prep || jsonb_build_object('ref', ref, 'base_rev', br, 'op', op, 'new_doc', nd, 'payload', pay, 'rationale', left(coalesce(e ->> 'rationale', ''), 2000),
        'result_body', nb, 'result_title', ttl, 'score', rk -> 'score', 'flags', rk -> 'flags', 'derived', coalesce(d.source = 'derived', false));
    end if;
  end loop;

  if jsonb_array_length(errs) > 0 then
    perform private.mcp_log(s.token_id, s.project_id, 'propose_changes', null, 'invalid_edits');
    return jsonb_build_object('error', 'mcp:invalid_edits', 'hint', 'Nothing was saved. Fix the listed edits and send the whole change set again.', 'details', errs);
  end if;

  insert into public.change_sets (project_id, title, summary, token_id, proposed_by, client, idem_key)
  values (s.project_id, p_title, coalesce(p_summary, ''), s.token_id, coalesce('token:' || left(s.token_id::text, 8), 'anonymous'), left(p_client, 80), p_idem)
  returning * into cs;
  if s.token_id is not null and p_client is not null then
    update public.mcp_tokens set last_client = left(p_client, 80) where id = s.token_id;
  end if;
  for e in select jsonb_array_elements(prep) loop
    insert into public.doc_drafts (project_id, doc_ref, base_rev, op, payload, rationale, proposed_by, change_set_id, new_doc, result_title, result_body, risk_score, risk_flags, token_id)
    values (s.project_id, e ->> 'ref', (e ->> 'base_rev')::int, e ->> 'op', e -> 'payload', e ->> 'rationale', cs.proposed_by, cs.id, (e ->> 'new_doc')::boolean,
            e ->> 'result_title', e ->> 'result_body', (e ->> 'score')::int, array(select jsonb_array_elements_text(e -> 'flags')), s.token_id)
    returning * into dr;
    out := out || jsonb_build_object('draft_id', dr.id, 'id', dr.doc_ref, 'risk', dr.risk_flags, 'generated_doc', (e ->> 'derived')::boolean);
  end loop;
  perform private.mcp_log(s.token_id, s.project_id, 'propose_changes', null, 'ok');
  return jsonb_build_object('change_set_id', cs.id, 'status', 'pending', 'drafts', out);
end;
$$;

-- single-edit form kept for older callers
create or replace function public.mcp_propose(p_token text, p_ip text, p_project text, p_ref text, p_base_rev integer, p_op text, p_payload jsonb, p_rationale text default ''::text, p_idem text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  return public.mcp_propose_set(p_token, p_ip, p_project, left(coalesce(nullif(p_rationale, ''), 'Edit ' || coalesce(p_ref, '')), 200), coalesce(p_rationale, ''),
    jsonb_build_array(jsonb_build_object('id', p_ref, 'base_rev', p_base_rev, 'op', p_op, 'payload', p_payload, 'rationale', p_rationale)), p_idem, null);
end;
$$;

-- an AI client looks up what happened to its own draft or change set
create or replace function public.mcp_get_draft(p_token text, p_ip text, p_project text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s record; dr public.doc_drafts; cs public.change_sets;
begin
  select * into s from private.mcp_gate(p_token, p_ip, p_project);
  if s.err is not null then return private.mcp_fail('get_draft', s.token_id, s.err, s.hint); end if;
  select * into dr from public.doc_drafts x where x.id = p_id and x.project_id = s.project_id and s.token_id is not null and x.token_id = s.token_id;
  if dr.id is not null then
    perform private.mcp_log(s.token_id, s.project_id, 'get_draft', dr.doc_ref, 'ok');
    return jsonb_build_object('draft_id', dr.id, 'doc', dr.doc_ref, 'status', case when dr.reverted_at is not null then 'reverted' else dr.status end, 'note', dr.note, 'reject_reason', dr.reject_reason, 'risk', dr.risk_flags, 'decided_at', dr.decided_at);
  end if;
  select * into cs from public.change_sets x where x.id = p_id and x.project_id = s.project_id and s.token_id is not null and x.token_id = s.token_id;
  if cs.id is not null then
    perform private.mcp_log(s.token_id, s.project_id, 'get_draft', null, 'ok');
    return jsonb_build_object('change_set_id', cs.id, 'title', cs.title,
      'drafts', coalesce((select jsonb_agg(jsonb_build_object('draft_id', q.id, 'id', q.doc_ref, 'status', case when q.reverted_at is not null then 'reverted' else q.status end, 'note', coalesce(q.reject_reason, q.note)) order by q.created_at) from public.doc_drafts q where q.change_set_id = cs.id), '[]'));
  end if;
  return private.mcp_fail('get_draft', s.token_id, 'mcp:not_found', 'No such draft or change set for this token.');
end;
$$;

-- ---------------------------------------------------------------- 5. a human decides (authenticated; row security still applies)
create or replace function private.apply_draft(p_id uuid, p_actor uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare dr public.doc_drafts; d public.docs; nd public.docs; rv int;
begin
  select * into dr from public.doc_drafts where id = p_id for update;
  if dr.id is null or dr.status <> 'pending' then raise exception 'draft is not pending'; end if;
  if (select auth.uid()) is not null and not private.can_edit_project(dr.project_id) then raise exception 'not allowed'; end if;
  perform set_config('gf.draft_id', dr.id::text, true);
  perform set_config('gf.rev_kind', 'ai', true);
  if dr.new_doc then
    if exists (select 1 from public.docs x where x.project_id = dr.project_id and x.ref = dr.doc_ref) then
      update public.doc_drafts set status = 'stale', note = 'A document with this id exists now.', decided_at = now(), decided_by = p_actor where id = p_id;
      return 'stale';
    end if;
    insert into public.docs (project_id, ref, kind, title, body, parent_ref, source)
    values (dr.project_id, dr.doc_ref, coalesce(dr.payload ->> 'kind', split_part(dr.doc_ref, ':', 1)), dr.result_title, dr.result_body, dr.payload ->> 'parent_ref', 'native') returning * into nd;
    update public.doc_drafts set status = 'applied', applied_rev = nd.rev, decided_at = now(), decided_by = p_actor where id = p_id;
    return 'applied';
  end if;
  select * into d from public.docs x where x.project_id = dr.project_id and x.ref = dr.doc_ref and x.deleted_at is null for update;
  if d.id is null or d.rev <> dr.base_rev then
    update public.doc_drafts set status = 'stale', note = 'The document changed after this edit was proposed.', decided_at = now(), decided_by = p_actor where id = p_id;
    return 'stale';
  end if;
  if d.source = 'derived' then
    update public.doc_drafts set status = 'approved', note = 'Approved. This document is generated from the typed tables, so apply the change there.', decided_at = now(), decided_by = p_actor where id = p_id;
    return 'approved';
  end if;
  update public.docs set body = dr.result_body, title = coalesce(dr.result_title, title) where id = d.id returning rev into rv;
  update public.doc_drafts set status = 'applied', applied_rev = rv, decided_at = now(), decided_by = p_actor where id = p_id;
  return 'applied';
end;
$$;

create or replace function public.decide_drafts(p_ids uuid[], p_approve boolean, p_reason text default null) returns jsonb
language plpgsql set search_path = '' as $$
declare i uuid; res jsonb := '[]'; st text; dr public.doc_drafts;
begin
  if cardinality(p_ids) > 100 then raise exception 'too many drafts at once'; end if;
  foreach i in array p_ids loop
    select * into dr from public.doc_drafts x where x.id = i;
    if dr.id is null then res := res || jsonb_build_object('id', i, 'status', 'missing');
    elsif dr.status <> 'pending' then res := res || jsonb_build_object('id', i, 'status', dr.status);
    else
      if p_approve then st := private.apply_draft(i, (select auth.uid()));
      else
        update public.doc_drafts set status = 'rejected', reject_reason = left(p_reason, 1000), decided_at = now(), decided_by = (select auth.uid()) where id = i and status = 'pending';
        st := 'rejected';
      end if;
      res := res || jsonb_build_object('id', i, 'status', st);
    end if;
  end loop;
  return res;
end;
$$;

create or replace function public.decide_draft(p_id uuid, p_approve boolean) returns text
language sql set search_path = '' as $$ select public.decide_drafts(array[p_id], p_approve) -> 0 ->> 'status' $$;

-- undo an accepted edit by writing the earlier text as a NEW revision; refuses when the document has moved on since
create or replace function public.revert_draft(p_id uuid) returns text
language plpgsql set search_path = '' as $$
declare dr public.doc_drafts; d public.docs; old public.doc_revisions;
begin
  select * into dr from public.doc_drafts x where x.id = p_id;
  if dr.id is null then raise exception 'no such draft'; end if;
  if dr.status <> 'applied' or dr.reverted_at is not null then raise exception 'only an applied change that was not undone yet can be undone'; end if;
  select * into d from public.docs x where x.project_id = dr.project_id and x.ref = dr.doc_ref;
  if d.id is null or d.rev <> dr.applied_rev then raise exception 'The document changed after this edit was applied. Restore an older version from its history instead.'; end if;
  perform set_config('gf.draft_id', dr.id::text, true);
  perform set_config('gf.rev_kind', 'revert', true);
  if dr.new_doc then
    update public.docs set deleted_at = now() where id = d.id;
  else
    select * into old from public.doc_revisions r where r.doc_id = d.id and r.rev = dr.base_rev;
    if old.id is null then raise exception 'the earlier revision is no longer available'; end if;
    update public.docs set body = old.body, title = old.title where id = d.id;
  end if;
  update public.doc_drafts set reverted_at = now() where id = p_id;
  return 'reverted';
end;
$$;

-- ---------------------------------------------------------------- 6. grants
revoke all on function public.decide_drafts(uuid[], boolean, text), public.revert_draft(uuid), public.decide_draft(uuid, boolean) from public, anon;
grant execute on function public.decide_drafts(uuid[], boolean, text), public.revert_draft(uuid), public.decide_draft(uuid, boolean) to authenticated;
revoke all on function public.mcp_propose_set(text, text, text, text, text, jsonb, text, text), public.mcp_propose(text, text, text, text, int, text, jsonb, text, text), public.mcp_get_draft(text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.mcp_propose_set(text, text, text, text, text, jsonb, text, text), public.mcp_propose(text, text, text, text, int, text, jsonb, text, text), public.mcp_get_draft(text, text, text, uuid) to service_role;
