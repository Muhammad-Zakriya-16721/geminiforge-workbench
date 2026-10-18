-- 0009: delete and Trash. Edits (change sets) and added pages are moved to Trash (30 days), can be restored, and are deleted for good from the Trash page.
--   Rules: pending edits must be decided first; edits that were accepted and not undone are kept as history (AI provenance);
--   revoked/expired tokens are deleted for good (never restorable); every move, restore and permanent delete is written to trash_log.
--   Permanent delete goes through row security (delete policies that only match rows already in Trash / already revoked), not a function.
-- Rollback: 0009_down.sql (drop statements, run in the dashboard).

alter table public.change_sets add column deleted_at timestamptz, add column deleted_by uuid, add column purge_after timestamptz;
alter table public.docs add column deleted_by uuid, add column purge_after timestamptz;

create table public.trash_log (
  id         bigint generated always as identity primary key,
  project_id uuid not null,
  item_type  text not null check (item_type in ('edit', 'page', 'token')),
  item_id    text not null,
  title      text not null,
  action     text not null check (action in ('trashed', 'restored', 'purged')),
  actor      uuid,
  at         timestamptz not null default now()
);
create index trash_log_project_idx on public.trash_log (project_id, at desc);
alter table public.trash_log enable row level security;
create policy "trash log read" on public.trash_log for select to authenticated using ((select private.can_edit_project(project_id)));

-- the owner can see pages that are in Trash (the normal read policy hides them)
create policy "docs read trash" on public.docs for select to authenticated using (deleted_at is not null and source = 'native' and (select private.can_edit_project(project_id)));
create policy "change sets purge" on public.change_sets for delete to authenticated using (
  deleted_at is not null and (select private.can_edit_project(project_id))
  and not exists (select 1 from public.doc_drafts d where d.change_set_id = change_sets.id and d.reverted_at is null and d.status in ('pending', 'applied', 'approved')));
create policy "tokens purge" on public.mcp_tokens for delete to authenticated using (
  (select private.can_edit_project(project_id)) and (revoked_at is not null or (expires_at is not null and expires_at < now())));

create or replace function private.log_purge() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'change_sets' then insert into public.trash_log (project_id, item_type, item_id, title, action, actor) values (old.project_id, 'edit', old.id::text, old.title, 'purged', (select auth.uid()));
  elsif tg_table_name = 'docs' then insert into public.trash_log (project_id, item_type, item_id, title, action, actor) values (old.project_id, 'page', old.ref, old.title, 'purged', (select auth.uid()));
  else insert into public.trash_log (project_id, item_type, item_id, title, action, actor) values (old.project_id, 'token', old.id::text, old.label, 'purged', (select auth.uid()));
  end if;
  return old;
end;
$$;
revoke all on function private.log_purge() from public;
create trigger change_sets_log_purge before delete on public.change_sets for each row execute function private.log_purge();
create trigger docs_log_purge before delete on public.docs for each row execute function private.log_purge();
create trigger tokens_log_purge before delete on public.mcp_tokens for each row execute function private.log_purge();

create or replace function public.trash_edits(p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare i uuid; cs public.change_sets; done jsonb := '[]'; refused jsonb := '[]';
begin
  if cardinality(p_ids) > 200 then raise exception 'too many at once'; end if;
  foreach i in array p_ids loop
    select * into cs from public.change_sets x where x.id = i and x.deleted_at is null;
    if cs.id is null or not private.can_edit_project(cs.project_id) then refused := refused || jsonb_build_object('id', i, 'reason', 'Not found.');
    elsif exists (select 1 from public.doc_drafts d where d.change_set_id = i and d.status = 'pending') then refused := refused || jsonb_build_object('id', i, 'reason', 'Still waiting for a decision.');
    elsif exists (select 1 from public.doc_drafts d where d.change_set_id = i and d.status in ('applied', 'approved') and d.reverted_at is null) then refused := refused || jsonb_build_object('id', i, 'reason', 'Accepted edits are kept as history. Undo them first.');
    else
      update public.change_sets set deleted_at = now(), deleted_by = (select auth.uid()), purge_after = now() + interval '30 days' where id = i;
      insert into public.trash_log (project_id, item_type, item_id, title, action, actor) values (cs.project_id, 'edit', i::text, cs.title, 'trashed', (select auth.uid()));
      done := done || to_jsonb(i);
    end if;
  end loop;
  return jsonb_build_object('done', done, 'refused', refused);
end;
$$;

create or replace function public.restore_edits(p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare i uuid; cs public.change_sets; done jsonb := '[]';
begin
  foreach i in array p_ids loop
    select * into cs from public.change_sets x where x.id = i and x.deleted_at is not null;
    if cs.id is not null and private.can_edit_project(cs.project_id) then
      update public.change_sets set deleted_at = null, deleted_by = null, purge_after = null where id = i;
      insert into public.trash_log (project_id, item_type, item_id, title, action, actor) values (cs.project_id, 'edit', i::text, cs.title, 'restored', (select auth.uid()));
      done := done || to_jsonb(i);
    end if;
  end loop;
  return jsonb_build_object('done', done);
end;
$$;

create or replace function public.trash_pages(p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare i uuid; d public.docs; done jsonb := '[]'; refused jsonb := '[]';
begin
  foreach i in array p_ids loop
    select * into d from public.docs x where x.id = i and x.deleted_at is null;
    if d.id is null or not private.can_edit_project(d.project_id) then refused := refused || jsonb_build_object('id', i, 'reason', 'Not found.');
    elsif d.source <> 'native' then refused := refused || jsonb_build_object('id', i, 'reason', 'Generated pages cannot be deleted.');
    else
      update public.docs set deleted_at = now(), deleted_by = (select auth.uid()), purge_after = now() + interval '30 days' where id = i;
      insert into public.trash_log (project_id, item_type, item_id, title, action, actor) values (d.project_id, 'page', d.ref, d.title, 'trashed', (select auth.uid()));
      done := done || to_jsonb(i);
    end if;
  end loop;
  return jsonb_build_object('done', done, 'refused', refused);
end;
$$;

create or replace function public.restore_pages(p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare i uuid; d public.docs; done jsonb := '[]';
begin
  foreach i in array p_ids loop
    select * into d from public.docs x where x.id = i and x.deleted_at is not null and x.source = 'native';
    if d.id is not null and private.can_edit_project(d.project_id) then
      update public.docs set deleted_at = null, deleted_by = null, purge_after = null where id = i;
      insert into public.trash_log (project_id, item_type, item_id, title, action, actor) values (d.project_id, 'page', d.ref, d.title, 'restored', (select auth.uid()));
      done := done || to_jsonb(i);
    end if;
  end loop;
  return jsonb_build_object('done', done);
end;
$$;
revoke all on function public.trash_edits(uuid[]), public.restore_edits(uuid[]), public.trash_pages(uuid[]), public.restore_pages(uuid[]) from public, anon;
grant execute on function public.trash_edits(uuid[]), public.restore_edits(uuid[]), public.trash_pages(uuid[]), public.restore_pages(uuid[]) to authenticated;

-- undoing an accepted new page puts it in Trash with a purge date
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
    update public.docs set deleted_at = now(), deleted_by = (select auth.uid()), purge_after = now() + interval '30 days' where id = d.id;
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
update public.docs set purge_after = deleted_at + interval '30 days' where deleted_at is not null and purge_after is null and source = 'native';
