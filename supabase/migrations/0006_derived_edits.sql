-- 0006: edits to generated documents. The GeminiForge pages are generated from typed tables; accepting an AI edit now writes the change back
-- into the source field (crate, pack, prompt, confirmation, patch, spike or claim text, or a chapter paragraph), bumps the content version and
-- lets the existing sync regenerate the page. Only find_replace and insert_after are allowed, and the text must sit inside ONE source field,
-- so the result is exactly what the reviewer saw in the diff. Undo does the reverse replacement while the page is unchanged since.
-- Also adds mcp_list_drafts so an AI client can read the reviewer's feedback on its earlier proposals.
-- Rollback: 0006_down.sql restores the 0004 versions of the functions below (run in the dashboard).

create or replace function private.docs_after_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare did uuid := nullif(current_setting('gf.draft_id', true), '')::uuid; rk text := nullif(current_setting('gf.rev_kind', true), '');
begin
  insert into public.doc_revisions (doc_id, project_id, ref, rev, content_hash, title, body, data, kind, author_id, draft_id)
  select new.id, new.project_id, new.ref, new.rev, new.content_hash, new.title, new.body, new.data,
         case when did is not null then coalesce(rk, 'ai') when new.source = 'derived' then 'sync' else 'edit' end, (select auth.uid()), did
  where not exists (select 1 from public.doc_revisions r where r.doc_id = new.id and r.rev = new.rev);
  return null;
end;
$$;

create or replace function private.jcount(j jsonb, f text) returns int
language plpgsql immutable set search_path = '' as $$
declare n int := 0; e jsonb;
begin
  if jsonb_typeof(j) = 'string' then return (length(j #>> '{}') - length(replace(j #>> '{}', f, ''))) / length(f);
  elsif jsonb_typeof(j) = 'array' then for e in select value from jsonb_array_elements(j) loop n := n + private.jcount(e, f); end loop;
  elsif jsonb_typeof(j) = 'object' then for e in select value from jsonb_each(j) loop n := n + private.jcount(e, f); end loop;
  end if;
  return n;
end;
$$;

create or replace function private.jreplace(j jsonb, f text, r text) returns jsonb
language plpgsql immutable set search_path = '' as $$
begin
  if jsonb_typeof(j) = 'string' then return to_jsonb(replace(j #>> '{}', f, r));
  elsif jsonb_typeof(j) = 'array' then return coalesce((select jsonb_agg(private.jreplace(v, f, r) order by o) from jsonb_array_elements(j) with ordinality t(v, o)), '[]'::jsonb);
  elsif jsonb_typeof(j) = 'object' then return coalesce((select jsonb_object_agg(k, private.jreplace(v, f, r)) from jsonb_each(j) t(k, v)), '{}'::jsonb);
  end if;
  return j;
end;
$$;

-- find p_find inside exactly one source field of a generated document; with p_commit, replace it there and bump the content version
create or replace function private.derived_edit(p_doc uuid, p_find text, p_repl text, p_commit boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d public.docs; tbl text; kc text; cols text[]; col text; val text; n int; total int := 0; hit_col text; hit_block bigint; hit_kind text; cid text; anc text; cur text; b record; hit_sub boolean := false;
  none_msg text := 'That text is not inside one editable field of this generated page (it may span two fields or be computed). Use a shorter phrase that sits inside a single sentence or field.';
begin
  if coalesce(p_find, '') = '' then return jsonb_build_object('err', 'Nothing to find.'); end if;
  select * into d from public.docs x where x.id = p_doc;
  if d.id is null or d.source <> 'derived' then return jsonb_build_object('err', 'Not a generated document.'); end if;
  if d.kind = 'section' then
    cid := split_part(substr(d.ref, 9), '#', 1); anc := nullif(split_part(d.ref, '#', 2), '');
    if anc is null then
      select (length(subtitle) - length(replace(subtitle, p_find, ''))) / length(p_find) into n from public.chapters where id = cid;
      if coalesce(n, 0) > 0 then total := total + n; hit_sub := true; end if;
    end if;
    for b in select * from public.chapter_blocks x where x.chapter_id = cid order by x.position loop
      if b.kind = 'h2' then cur := b.anchor; continue; end if;
      if cur is not distinct from anc then
        n := coalesce((length(b.text) - length(replace(b.text, p_find, ''))) / length(p_find), 0);
        if n > 0 then total := total + n; hit_block := b.id; hit_kind := 'text'; end if;
        n := case when b.data is null then 0 else private.jcount(b.data, p_find) end;
        if n > 0 then total := total + n; hit_block := b.id; hit_kind := 'data'; end if;
      end if;
    end loop;
    if total <> 1 then return jsonb_build_object('err', case when total = 0 then none_msg else format('That text appears %s times in this section; use a longer, unique phrase.', total) end); end if;
    if p_commit then
      if hit_sub then update public.chapters set subtitle = replace(subtitle, p_find, p_repl) where id = cid;
      elsif hit_kind = 'text' then update public.chapter_blocks set text = replace(text, p_find, p_repl) where id = hit_block;
      else update public.chapter_blocks set data = private.jreplace(data, p_find, p_repl) where id = hit_block;
      end if;
    end if;
  else
    select v.t, v.k, v.c into tbl, kc, cols from (values
      ('crate', 'crates', 'name', array['plain_summary', 'why_it_matters', 'deps', 'badge', 'code']),
      ('pack', 'packs', 'id', array['name', 'plain_purpose', 'tools']),
      ('prompt', 'deep_prompts', 'id', array['title', 'plain_goal', 'why_needed', 'full_prompt']),
      ('confirmation', 'confirmations', 'id', array['title', 'plain_why']),
      ('patch', 'patches', 'id', array['target', 'summary', 'code']),
      ('spike', 'spikes', 'id', array['target', 'cand_a', 'cand_b', 'gate']),
      ('claim', 'claims', 'id', array['where_text', 'claim', 'found', 'action'])
    ) as v(kind, t, k, c) where v.kind = d.kind;
    if tbl is null then return jsonb_build_object('err', 'This kind of document is live data, not documentation text; it cannot be edited here.'); end if;
    foreach col in array cols loop
      execute format('select %I from public.%I where %I = $1', col, tbl, kc) into val using d.key;
      n := coalesce((length(val) - length(replace(val, p_find, ''))) / length(p_find), 0);
      if n > 0 then total := total + n; hit_col := col; end if;
    end loop;
    if total <> 1 then return jsonb_build_object('err', case when total = 0 then none_msg else format('That text appears %s times in this document; use a longer, unique phrase.', total) end); end if;
    if p_commit then execute format('update public.%I set %I = replace(%I, $1, $2) where %I = $3', tbl, hit_col, hit_col, kc) using p_find, p_repl, d.key; end if;
  end if;
  -- the version-bump triggers on these tables re-run the sync inside this statement
  return jsonb_build_object('ok', true);
end;
$$;

-- reason an edit to a generated document is not allowed, or null
create or replace function private.derived_check(p_doc public.docs, p_op text, p_pay jsonb, p_title text) returns text
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  if p_title is not null then return 'The title of a generated document cannot be changed here.'; end if;
  if p_op = 'replace' then return 'Generated documents can only be edited with find_replace or insert_after, not by replacing the whole text.'; end if;
  if p_op = 'find_replace' and coalesce((p_pay ->> 'expected')::int, 1) <> 1 then return 'For generated documents the text to find must appear exactly once; leave expected unset.'; end if;
  r := private.derived_edit(p_doc.id, case when p_op = 'find_replace' then p_pay ->> 'find' else p_pay ->> 'anchor' end, null, false);
  return r ->> 'err';
end;
$$;
revoke all on function private.jcount(jsonb, text), private.jreplace(jsonb, text, text), private.derived_edit(uuid, text, text, boolean), private.derived_check(public.docs, text, jsonb, text) from public;
grant execute on function private.derived_edit(uuid, text, text, boolean) to authenticated;

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
        elsif exists (select 1 from public.docs x where x.project_id = s.project_id and x.source = 'derived' and starts_with(x.ref, split_part(ref, ':', 1) || ':')) then
          msg := format('The prefix "%s:" is reserved for generated pages in this project. Use page:, note: or decision: for new documents.', split_part(ref, ':', 1));
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
          if d.source = 'derived' then msg := private.derived_check(d, op, pay, ttl); end if;
          r := case when msg is null then private.draft_result(d.body, op, pay) else jsonb_build_object('err', msg) end;
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

create or replace function private.apply_draft(p_id uuid, p_actor uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare dr public.doc_drafts; d public.docs; nd public.docs; rv int; r jsonb;
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
    r := private.derived_edit(d.id, case when dr.op = 'insert_after' then dr.payload ->> 'anchor' else dr.payload ->> 'find' end,
      case when dr.op = 'insert_after' then (dr.payload ->> 'anchor') || (dr.payload ->> 'text') else coalesce(dr.payload ->> 'replace', '') end, true);
    if r ? 'err' then
      update public.doc_drafts set status = 'stale', note = r ->> 'err', decided_at = now(), decided_by = p_actor where id = p_id;
      return 'stale';
    end if;
    select x.rev into rv from public.docs x where x.id = d.id;
    if rv = d.rev then raise exception 'The generated page did not update; nothing was changed.'; end if;
    update public.doc_drafts set status = 'applied', applied_rev = rv, decided_at = now(), decided_by = p_actor where id = p_id;
    return 'applied';
  end if;
  update public.docs set body = dr.result_body, title = coalesce(dr.result_title, title) where id = d.id returning rev into rv;
  update public.doc_drafts set status = 'applied', applied_rev = rv, decided_at = now(), decided_by = p_actor where id = p_id;
  return 'applied';
end;
$$;

-- security definer: a plain update that soft-deletes a document fails row security (the new row no longer passes the read policy)
create or replace function public.revert_draft(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare dr public.doc_drafts; d public.docs; old public.doc_revisions; r jsonb;
begin
  select * into dr from public.doc_drafts x where x.id = p_id;
  if dr.id is null or not private.can_edit_project(dr.project_id) then raise exception 'no such draft'; end if;
  if dr.status <> 'applied' or dr.reverted_at is not null then raise exception 'only an applied change that was not undone yet can be undone'; end if;
  select * into d from public.docs x where x.project_id = dr.project_id and x.ref = dr.doc_ref;
  if d.id is null or d.rev <> dr.applied_rev then raise exception 'The document changed after this edit was applied. Restore an older version from its history instead.'; end if;
  perform set_config('gf.draft_id', dr.id::text, true);
  perform set_config('gf.rev_kind', 'revert', true);
  if dr.new_doc then
    update public.docs set deleted_at = now() where id = d.id;
  elsif d.source = 'derived' then
    if coalesce(dr.payload ->> 'replace', 'x') = '' and dr.op = 'find_replace' then raise exception 'This edit deleted text, so it cannot be undone automatically. Propose the text back instead.'; end if;
    r := private.derived_edit(d.id, case when dr.op = 'insert_after' then (dr.payload ->> 'anchor') || (dr.payload ->> 'text') else coalesce(dr.payload ->> 'replace', '') end,
      case when dr.op = 'insert_after' then dr.payload ->> 'anchor' else dr.payload ->> 'find' end, true);
    if r ? 'err' then raise exception 'Could not undo automatically: %', r ->> 'err'; end if;
  else
    select * into old from public.doc_revisions r where r.doc_id = d.id and r.rev = dr.base_rev;
    if old.id is null then raise exception 'the earlier revision is no longer available'; end if;
    update public.docs set body = old.body, title = old.title where id = d.id;
  end if;
  update public.doc_drafts set reverted_at = now() where id = p_id;
  return 'reverted';
end;
$$;
revoke all on function public.revert_draft(uuid) from public, anon;
grant execute on function public.revert_draft(uuid) to authenticated;

create or replace function public.mcp_list_drafts(p_token text, p_ip text, p_project text, p_status text default null, p_limit int default 20)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s record; lim int := least(greatest(coalesce(p_limit, 20), 1), 50); res jsonb;
begin
  select * into s from private.mcp_gate(p_token, p_ip, p_project);
  if s.err is not null then return private.mcp_fail('list_drafts', s.token_id, s.err, s.hint); end if;
  if s.token_id is null then return private.mcp_fail('list_drafts', null, 'mcp:forbidden', 'Listing your proposals needs an access token.'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('draft_id', q.id, 'change_set_id', q.change_set_id, 'id', q.doc_ref, 'status', case when q.reverted_at is not null then 'reverted' else q.status end,
      'feedback', coalesce(q.reject_reason, q.note), 'proposed_at', q.created_at, 'decided_at', q.decided_at) order by q.created_at desc), '[]') into res
  from (select * from public.doc_drafts x where x.token_id = s.token_id and x.project_id = s.project_id
          and (p_status is null or (case when x.reverted_at is not null then 'reverted' else x.status end) = p_status) order by x.created_at desc limit lim) q;
  perform private.mcp_log(s.token_id, s.project_id, 'list_drafts', null, 'ok');
  return jsonb_build_object('drafts', res);
end;
$$;
revoke all on function public.mcp_list_drafts(text, text, text, text, int) from public, anon, authenticated;
grant execute on function public.mcp_list_drafts(text, text, text, text, int) to service_role;
