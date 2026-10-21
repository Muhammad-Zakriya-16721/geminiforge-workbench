-- 0014: Trash timer. The owner chooses how long removed edits and pages stay in the Trash.
--   projects.trash_days  1..3650 days; NULL = never delete automatically (only by hand). Default 30.
--   purge_after on each trashed row is set from that setting when the item is trashed; NULL = kept until deleted by hand.
--   public.set_trash_timer(edit_ids, page_ids, days) changes the timer of items already in the Trash (days NULL = keep until deleted by hand).
--   The daily job and purge_trash() only remove rows whose purge_after is set and in the past, so NULL rows are never removed automatically.
-- Rollback: 0014_down.sql

alter table public.projects add column trash_days int default 30 check (trash_days is null or trash_days between 1 and 3650);
grant update (trash_days) on public.projects to authenticated;

create or replace function private.trash_until(p uuid) returns timestamptz
language plpgsql stable security definer set search_path = '' as $$
declare d int;
begin
  select x.trash_days into d from public.projects x where x.id = p;
  if not found then return now() + interval '30 days'; end if;
  if d is null then return null; end if;
  return now() + make_interval(days => d);
end;
$$;
revoke all on function private.trash_until(uuid) from public, anon;
grant execute on function private.trash_until(uuid) to authenticated;

create or replace function public.set_trash_timer(p_edit_ids uuid[], p_page_ids uuid[], p_days int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a int := 0; b int := 0; at timestamptz;
begin
  if (select auth.uid()) is null then raise exception 'not allowed'; end if;
  if p_days is not null and (p_days < 1 or p_days > 3650) then raise exception 'days must be between 1 and 3650, or empty to keep the item until you delete it'; end if;
  if cardinality(coalesce(p_edit_ids, '{}')) + cardinality(coalesce(p_page_ids, '{}')) > 500 then raise exception 'too many at once'; end if;
  at := case when p_days is null then null else now() + make_interval(days => p_days) end;
  with x as (update public.change_sets s set purge_after = at where s.id = any (coalesce(p_edit_ids, '{}')) and s.deleted_at is not null and private.can_edit_project(s.project_id) returning 1) select count(*) into a from x;
  with x as (update public.docs d set purge_after = at where d.id = any (coalesce(p_page_ids, '{}')) and d.deleted_at is not null and d.source = 'native' and private.can_edit_project(d.project_id) returning 1) select count(*) into b from x;
  return jsonb_build_object('edits', a, 'pages', b, 'purge_after', at);
end;
$$;
revoke all on function public.set_trash_timer(uuid[], uuid[], int) from public, anon;
grant execute on function public.set_trash_timer(uuid[], uuid[], int) to authenticated;

-- the three places that fixed the time at 30 days now use the project setting
do $$ declare def text; d2 text; begin
  select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'trash_edits';
  d2 := replace(def, 'purge_after = now() + interval ''30 days'' where id = i;', 'purge_after = private.trash_until(cs.project_id) where id = i;');
  if d2 = def then raise exception 'replace failed trash_edits'; end if; execute d2;
  select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'trash_pages';
  d2 := replace(def, 'purge_after = now() + interval ''30 days'' where id = i;', 'purge_after = private.trash_until((select z.project_id from public.docs z where z.id = i)) where id = i;');
  if d2 = def then raise exception 'replace failed trash_pages'; end if; execute d2;
  select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'revert_draft';
  d2 := replace(def, 'purge_after = now() + interval ''30 days'' where id = d.id;', 'purge_after = private.trash_until(d.project_id) where id = d.id;');
  if d2 = def then raise exception 'replace failed revert_draft'; end if; execute d2;
end $$;

-- purge in batches of 200 with SKIP LOCKED (a restore in the same moment wins) and only rows that still have a purge date in the past (NULL = never)
-- (see the live functions private.purge_expired() and public.purge_trash(); they replace the versions from 0011)
