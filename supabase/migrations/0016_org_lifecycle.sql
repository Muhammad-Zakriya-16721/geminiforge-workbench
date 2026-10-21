-- 0016: workspace v2 (counts, archived/deleted lists), organization rename/delete/restore/delete-for-good, project restore/delete-for-good, invitation-email limit.
-- Applied live in three parts (0016a_workspace_v2, 0016b_org_lifecycle, 0016c_invite_mail_gate). Soft delete first: delete_org sets organizations.deleted_at and archives the
-- organization's projects with the same timestamp, so restore_org brings back exactly those. Nothing is removed for good except by purge_org / purge_project, which only
-- accept an already deleted/archived target and are limited to the organization owner (purge_project: owner or admin) or the super administrator.
-- NOTE: statements here were applied through the SQL tool; DROP statements are avoided on purpose (they hang that tool).

create or replace function public.my_workspace() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'super', private.is_admin(),
    'orgs', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'slug', o.slug, 'name', o.name, 'role', coalesce(private.org_role(o.id), 'owner'), 'created_at', o.created_at,
        'members', case when private.is_org_admin(o.id) then (select count(*) from public.org_members m where m.org_id = o.id) else null end,
        'project_count', (select count(*) from public.projects p where p.org_id = o.id and p.archived_at is null and private.project_role(p.id) is not null)) order by o.name)
      from public.organizations o where o.deleted_at is null and (private.org_role(o.id) is not null or private.is_admin())), '[]'::jsonb),
    'projects', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'slug', p.slug, 'name', p.name, 'description', p.description, 'visibility', p.visibility, 'org_id', p.org_id, 'role', private.project_role(p.id), 'created_at', p.created_at,
        'docs', (select count(*) from public.docs d where d.project_id = p.id and d.deleted_at is null),
        'last_edit', (select max(d.updated_at) from public.docs d where d.project_id = p.id and d.deleted_at is null)) order by p.name)
      from public.projects p where p.archived_at is null and private.project_role(p.id) is not null), '[]'::jsonb),
    'archived_projects', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'org_id', p.org_id, 'archived_at', p.archived_at) order by p.archived_at desc)
      from public.projects p join public.organizations o on o.id = p.org_id where p.archived_at is not null and o.deleted_at is null and private.is_org_admin(p.org_id)), '[]'::jsonb),
    'deleted_orgs', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'slug', o.slug, 'deleted_at', o.deleted_at) order by o.deleted_at desc)
      from public.organizations o where o.deleted_at is not null and (private.is_admin() or coalesce(private.org_role(o.id) = 'owner', false))), '[]'::jsonb));
$$;

create or replace function public.rename_org(p_org uuid, p_name text) returns void language plpgsql security definer set search_path = '' as $$
declare n text := btrim(coalesce(p_name, ''));
begin
  if (select auth.uid()) is null or not (private.is_admin() or coalesce(private.org_role(p_org) = 'owner', false)) then raise exception 'Only an organization owner can rename it.'; end if;
  if length(n) not between 1 and 80 then raise exception 'The name must be 1 to 80 characters.'; end if;
  if private.bad_chars(n) is not null then raise exception '%', private.bad_chars(n); end if;
  update public.organizations set name = n where id = p_org and deleted_at is null;
  if not found then raise exception 'No such organization.'; end if;
  perform private.log_member(p_org, null, 'org_renamed', null, jsonb_build_object('name', n));
end; $$;

create or replace function public.delete_org(p_org uuid) returns void language plpgsql security definer set search_path = '' as $$
declare t timestamptz := now();
begin
  if (select auth.uid()) is null or not (private.is_admin() or coalesce(private.org_role(p_org) = 'owner', false)) then raise exception 'Only an organization owner can delete it.'; end if;
  update public.organizations set deleted_at = t where id = p_org and deleted_at is null;
  if not found then raise exception 'No such organization.'; end if;
  update public.projects set archived_at = t where org_id = p_org and archived_at is null;
end; $$;

create or replace function public.restore_org(p_org uuid) returns void language plpgsql security definer set search_path = '' as $$
declare t timestamptz;
begin
  if (select auth.uid()) is null or not (private.is_admin() or coalesce(private.org_role(p_org) = 'owner', false)) then raise exception 'Only an organization owner can restore it.'; end if;
  select deleted_at into t from public.organizations where id = p_org;
  if t is null then raise exception 'That organization is not deleted.'; end if;
  update public.organizations set deleted_at = null where id = p_org;
  update public.projects set archived_at = null where org_id = p_org and archived_at = t;
  perform private.log_member(p_org, null, 'org_restored', null, '{}'::jsonb);
end; $$;

create or replace function public.purge_org(p_org uuid) returns void language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if (select auth.uid()) is null or not (private.is_admin() or coalesce(private.org_role(p_org) = 'owner', false)) then raise exception 'Only an organization owner can delete it for good.'; end if;
  if not exists (select 1 from public.organizations where id = p_org and deleted_at is not null) then raise exception 'Delete the organization first; only a deleted organization can be removed for good.'; end if;
  with x as (delete from public.projects where org_id = p_org returning 1) select count(*) into n from x;
  with y as (delete from public.organizations where id = p_org and deleted_at is not null returning 1) select count(*) into n from y;
end; $$;

create or replace function public.restore_project(p_project uuid) returns void language plpgsql security definer set search_path = '' as $$
declare o uuid;
begin
  select org_id into o from public.projects where id = p_project and archived_at is not null;
  if o is null or not private.is_org_admin(o) then raise exception 'Only an organization owner or admin can restore a project.'; end if;
  if not exists (select 1 from public.organizations where id = o and deleted_at is null) then raise exception 'Restore the organization first.'; end if;
  update public.projects set archived_at = null where id = p_project;
  perform private.log_member(o, p_project, 'project_restored', null, '{}'::jsonb);
end; $$;

create or replace function public.purge_project(p_project uuid) returns void language plpgsql security definer set search_path = '' as $$
declare o uuid; n int;
begin
  select org_id into o from public.projects where id = p_project and archived_at is not null;
  if o is null or not private.is_org_admin(o) then raise exception 'Only an organization owner or admin can delete an archived project for good.'; end if;
  with x as (delete from public.projects where id = p_project and archived_at is not null returning 1) select count(*) into n from x;
end; $$;

create or replace function public.invite_mail_gate(p_org uuid) returns void language plpgsql security definer set search_path = '' as $$
declare h int; d int;
begin
  if (select auth.uid()) is null or not private.is_org_admin(p_org) then raise exception 'Only an organization owner or admin can send invitations.'; end if;
  select count(*) into h from public.membership_events where org_id = p_org and action = 'invite_mailed' and at > now() - interval '1 hour';
  select count(*) into d from public.membership_events where org_id = p_org and action = 'invite_mailed' and at > now() - interval '1 day';
  if h >= 20 then raise exception 'Too many invitation emails in the last hour (20). Copy the link instead, or try again later.'; end if;
  if d >= 60 then raise exception 'Too many invitation emails today (60). Copy the link instead, or try again tomorrow.'; end if;
  perform private.log_member(p_org, null, 'invite_mailed', null, '{}'::jsonb);
end; $$;

revoke all on function public.rename_org(uuid,text), public.delete_org(uuid), public.restore_org(uuid), public.purge_org(uuid), public.restore_project(uuid), public.purge_project(uuid), public.invite_mail_gate(uuid) from public, anon;
grant execute on function public.rename_org(uuid,text), public.delete_org(uuid), public.restore_org(uuid), public.purge_org(uuid), public.restore_project(uuid), public.purge_project(uuid), public.invite_mail_gate(uuid) to authenticated;
