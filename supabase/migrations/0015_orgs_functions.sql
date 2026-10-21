-- 0015 part 2: organization / project / invitation functions (applied live after 0015_orgs.sql; this is the final text incl. the NULL-logic fixes found by tests/rls-matrix.sql).
-- NOTE: in PL/pgSQL `if not (a or b)` does NOT fire when the condition is NULL; every authorisation test below wraps nullable parts in coalesce(...).
-- Also: the AI SQL tool hangs on unqualified UPDATE, DROP and plain `delete from ...;` statements; deletes inside functions are written as `with x as (delete ... returning 1) select count(*) into n from x;`.

create or replace function private.log_member(o uuid, p uuid, a text, s uuid, d jsonb default '{}') returns void
language sql security definer set search_path = '' as $$
  insert into public.membership_events (org_id, project_id, actor, action, subject, detail) values (o, p, (select auth.uid()), a, s, d);
$$;
revoke all on function private.log_member(uuid, uuid, text, uuid, jsonb) from public, anon, authenticated;

create or replace function public.create_org(p_name text, p_slug text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); s text; o uuid; n text := btrim(coalesce(p_name, ''));
begin
  if me is null or not private.is_admin() then raise exception 'Only the administrator can create organizations.'; end if;
  if length(n) not between 1 and 80 then raise exception 'The name must be 1 to 80 characters.'; end if;
  if private.bad_chars(n) is not null then raise exception '%', private.bad_chars(n); end if;
  s := coalesce(nullif(btrim(p_slug), ''), lower(n));
  s := regexp_replace(regexp_replace(lower(s), '[^a-z0-9]+', '-', 'g'), '^-+|-+$', '', 'g');
  if s = '' then s := 'org-' || substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6); end if;
  s := left(s, 41);
  if s !~ '^[a-z0-9][a-z0-9-]{1,40}$' then s := 'org-' || s; s := left(s, 41); end if;
  begin
    insert into public.organizations (slug, name, created_by) values (s, n, me) returning id into o;
  exception when unique_violation then raise exception 'An organization with the address "%" already exists. Choose another address.', s;
  end;
  insert into public.org_members (org_id, user_id, role) values (o, me, 'owner');
  perform private.log_member(o, null, 'org_created', me, jsonb_build_object('name', n));
  return o;
end;
$$;

create or replace function public.create_project(p_org uuid, p_name text, p_slug text default null, p_description text default '', p_visibility text default 'private') returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); s text; pid uuid; n text := btrim(coalesce(p_name, ''));
begin
  if me is null or not private.is_org_admin(p_org) then raise exception 'Only an organization owner or admin can create projects.'; end if;
  if not exists (select 1 from public.organizations where id = p_org and deleted_at is null) then raise exception 'No such organization.'; end if;
  if length(n) not between 1 and 120 then raise exception 'The name must be 1 to 120 characters.'; end if;
  if private.bad_chars(n) is not null then raise exception '%', private.bad_chars(n); end if;
  if p_visibility not in ('private', 'unlisted', 'public') then raise exception 'Visibility must be private, unlisted or public.'; end if;
  if length(coalesce(p_description, '')) > 500 then raise exception 'The description can be at most 500 characters.'; end if;
  s := coalesce(nullif(btrim(p_slug), ''), lower(n));
  s := regexp_replace(regexp_replace(lower(s), '[^a-z0-9]+', '-', 'g'), '^-+|-+$', '', 'g');
  if s = '' then s := 'project-' || substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6); end if;
  s := left(s, 41);
  if s !~ '^[a-z0-9][a-z0-9-]{1,40}$' then s := left('p-' || s, 41); end if;
  begin
    insert into public.projects (slug, name, description, visibility, owner_id, org_id) values (s, n, coalesce(p_description, ''), p_visibility, me, p_org) returning id into pid;
  exception when unique_violation then raise exception 'A project with the address "%" already exists. Choose another address.', s;
  end;
  perform private.log_member(p_org, pid, 'project_created', me, jsonb_build_object('name', n, 'visibility', p_visibility));
  return pid;
end;
$$;

create or replace function public.create_invite(p_org uuid, p_project uuid, p_email text, p_org_role text default 'member', p_project_role text default null, p_days int default 7) returns text
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); em text := lower(btrim(coalesce(p_email, ''))); tok text; orole text := coalesce(p_org_role, 'member'); pr record;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  if em !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(em) > 254 then raise exception 'That does not look like an email address.'; end if;
  if p_days is null or p_days < 1 or p_days > 30 then raise exception 'An invitation can last 1 to 30 days.'; end if;
  if orole not in ('admin', 'member') then raise exception 'The organization role must be admin or member.'; end if;
  if not exists (select 1 from public.organizations where id = p_org and deleted_at is null) then raise exception 'No such organization.'; end if;
  if p_project is null then
    if not private.is_org_admin(p_org) then raise exception 'Only an organization owner or admin can invite people.'; end if;
    if p_project_role is not null then raise exception 'Choose a project or leave the project role empty.'; end if;
  else
    select * into pr from public.projects where id = p_project and org_id = p_org and archived_at is null;
    if pr.id is null then raise exception 'That project is not part of this organization.'; end if;
    if not (private.is_org_admin(p_org) or private.is_project_owner(p_project)) then raise exception 'Only a project manager or an organization admin can invite people to a project.'; end if;
    if p_project_role is null or p_project_role not in ('owner', 'editor', 'viewer') then raise exception 'Choose the project role: manager, editor or viewer.'; end if;
  end if;
  if orole = 'admin' and not (private.is_admin() or coalesce(private.org_role(p_org) = 'owner', false)) then raise exception 'Only an organization owner can invite an admin.'; end if;
  if exists (select 1 from auth.users u join public.org_members m on m.user_id = u.id where lower(u.email) = em and m.org_id = p_org
             and (p_project is null or m.role in ('owner', 'admin') or exists (select 1 from public.project_members pm where pm.project_id = p_project and pm.user_id = u.id))) then
    raise exception 'That person already has this access.';
  end if;
  if (select count(*) from public.invites where org_id = p_org and accepted_at is null and revoked_at is null and expires_at > now()) >= 100 then raise exception 'Too many open invitations. Revoke some first.'; end if;
  tok := 'iv_' || encode(extensions.gen_random_bytes(32), 'hex');
  begin
    insert into public.invites (org_id, project_id, email, org_role, project_role, token_hash, invited_by, expires_at)
    values (p_org, p_project, em, orole, p_project_role, encode(extensions.digest(tok, 'sha256'), 'hex'), me, now() + make_interval(days => p_days));
  exception when unique_violation then raise exception 'An invitation for this email and project is already open. Revoke it first to send a new one.';
  end;
  perform private.log_member(p_org, p_project, 'invite_created', null, jsonb_build_object('email', em, 'org_role', orole, 'project_role', p_project_role, 'days', p_days));
  return tok;
end;
$$;

create or replace function public.invite_preview(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare i record; me_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
begin
  if (select auth.uid()) is null then raise exception 'Sign in first.'; end if;
  select v.*, o.name as org_name, p.name as project_name into i from public.invites v join public.organizations o on o.id = v.org_id left join public.projects p on p.id = v.project_id
    where v.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex') and v.accepted_at is null and v.revoked_at is null and v.expires_at > now() and o.deleted_at is null;
  if i.id is null then return jsonb_build_object('valid', false); end if;
  return jsonb_build_object('valid', true, 'org', i.org_name, 'project', i.project_name, 'org_role', i.org_role, 'project_role', i.project_role,
    'email_hint', left(i.email, 2) || '***' || substr(i.email, strpos(i.email, '@')), 'email_matches', i.email = me_email, 'expires_at', i.expires_at);
end;
$$;

create or replace function public.accept_invite(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); em text := lower(coalesce((select auth.jwt() ->> 'email'), '')); i public.invites; confirmed boolean;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  select (u.email_confirmed_at is not null) into confirmed from auth.users u where u.id = me;
  if not coalesce(confirmed, false) then raise exception 'Confirm your email address first.'; end if;
  select * into i from public.invites where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex') and accepted_at is null and revoked_at is null and expires_at > now() for update;
  if i.id is null then raise exception 'This invitation is not valid any more.'; end if;
  if i.email <> em then raise exception 'This invitation was sent to a different email address. Sign in with that address.'; end if;
  insert into public.org_members (org_id, user_id, role) values (i.org_id, me, i.org_role)
    on conflict (org_id, user_id) do update set role = case when public.org_members.role = 'member' and excluded.role = 'admin' then 'admin' else public.org_members.role end;
  if i.project_id is not null then
    insert into public.project_members (project_id, user_id, role) values (i.project_id, me, i.project_role)
      on conflict (project_id, user_id) do update set role = case
        when array_position(array['viewer', 'editor', 'owner'], excluded.role) > array_position(array['viewer', 'editor', 'owner'], public.project_members.role) then excluded.role else public.project_members.role end;
  end if;
  update public.invites set accepted_at = now(), accepted_by = me where id = i.id;
  perform private.log_member(i.org_id, i.project_id, 'invite_accepted', me, jsonb_build_object('org_role', i.org_role, 'project_role', i.project_role));
  return jsonb_build_object('org_id', i.org_id, 'project_id', i.project_id);
end;
$$;

create or replace function public.revoke_invite(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare i public.invites;
begin
  select * into i from public.invites where id = p_id and accepted_at is null and revoked_at is null;
  if i.id is null then raise exception 'No such open invitation.'; end if;
  if not (private.is_org_admin(i.org_id) or coalesce(i.invited_by = (select auth.uid()), false) or (i.project_id is not null and private.is_project_owner(i.project_id))) then raise exception 'You cannot revoke this invitation.'; end if;
  update public.invites set revoked_at = now() where id = p_id;
  perform private.log_member(i.org_id, i.project_id, 'invite_revoked', null, jsonb_build_object('email', i.email));
end;
$$;

create or replace function public.set_org_role(p_org uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare cur text;
begin
  if p_role not in ('owner', 'admin', 'member') then raise exception 'The role must be owner, admin or member.'; end if;
  if not (private.is_admin() or coalesce(private.org_role(p_org) = 'owner', false)) then raise exception 'Only an organization owner can change roles.'; end if;
  select role into cur from public.org_members where org_id = p_org and user_id = p_user for update;
  if cur is null then raise exception 'That person is not a member of this organization.'; end if;
  if cur = 'owner' and p_role <> 'owner' and (select count(*) from public.org_members where org_id = p_org and role = 'owner') <= 1 then raise exception 'An organization needs at least one owner.'; end if;
  update public.org_members set role = p_role where org_id = p_org and user_id = p_user;
  perform private.log_member(p_org, null, 'org_role_changed', p_user, jsonb_build_object('from', cur, 'to', p_role));
end;
$$;

create or replace function public.remove_org_member(p_org uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); cur text; mine text := private.org_role(p_org); n int;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  if not (p_user = me or private.is_admin() or coalesce(mine = 'owner', false) or (coalesce(mine = 'admin', false) and coalesce((select m.role = 'member' from public.org_members m where m.org_id = p_org and m.user_id = p_user), false))) then
    raise exception 'You cannot remove this person.';
  end if;
  select role into cur from public.org_members where org_id = p_org and user_id = p_user for update;
  if cur is null then raise exception 'That person is not a member of this organization.'; end if;
  if cur = 'owner' and (select count(*) from public.org_members where org_id = p_org and role = 'owner') <= 1 then raise exception 'An organization needs at least one owner. Make someone else an owner first.'; end if;
  with x as (delete from public.project_members pm using public.projects pr where pm.project_id = pr.id and pr.org_id = p_org and pm.user_id = p_user returning 1) select count(*) into n from x;
  with x as (delete from public.org_members where org_id = p_org and user_id = p_user returning 1) select count(*) into n from x;
  perform private.log_member(p_org, null, case when p_user = me then 'left_org' else 'member_removed' end, p_user, jsonb_build_object('role', cur));
end;
$$;

create or replace function public.set_project_member(p_project uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare o uuid; orole text; n int;
begin
  select org_id into o from public.projects where id = p_project and archived_at is null;
  if o is null then raise exception 'No such project.'; end if;
  if not private.is_project_owner(p_project) then raise exception 'Only a project manager can change who has access.'; end if;
  select role into orole from public.org_members where org_id = o and user_id = p_user;
  if orole is null then raise exception 'Invite the person to the organization first.'; end if;
  if orole in ('owner', 'admin') then raise exception 'Organization owners and admins already manage every project.'; end if;
  if p_role is null then
    with x as (delete from public.project_members where project_id = p_project and user_id = p_user returning 1) select count(*) into n from x;
  else
    if p_role not in ('owner', 'editor', 'viewer') then raise exception 'The role must be manager, editor or viewer.'; end if;
    insert into public.project_members (project_id, user_id, role) values (p_project, p_user, p_role) on conflict (project_id, user_id) do update set role = excluded.role;
  end if;
  perform private.log_member(o, p_project, case when p_role is null then 'project_access_removed' else 'project_role_set' end, p_user, jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.org_overview(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_org_admin(p_org) then raise exception 'Only an organization owner or admin can see this.'; end if;
  return jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'email', u.email, 'role', m.role, 'since', m.created_at,
        'projects', coalesce((select jsonb_agg(jsonb_build_object('project_id', pm.project_id, 'name', pr.name, 'role', pm.role) order by pr.name) from public.project_members pm join public.projects pr on pr.id = pm.project_id where pm.user_id = m.user_id and pr.org_id = p_org), '[]'::jsonb)) order by m.created_at)
      from public.org_members m join auth.users u on u.id = m.user_id where m.org_id = p_org), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'email', v.email, 'org_role', v.org_role, 'project_id', v.project_id, 'project', pr.name, 'project_role', v.project_role, 'expires_at', v.expires_at, 'created_at', v.created_at) order by v.created_at desc)
      from public.invites v left join public.projects pr on pr.id = v.project_id where v.org_id = p_org and v.accepted_at is null and v.revoked_at is null and v.expires_at > now()), '[]'::jsonb),
    'projects', coalesce((select jsonb_agg(jsonb_build_object('id', pr.id, 'slug', pr.slug, 'name', pr.name, 'visibility', pr.visibility) order by pr.name) from public.projects pr where pr.org_id = p_org and pr.archived_at is null), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(e) from (select jsonb_build_object('action', ev.action, 'at', ev.at, 'detail', ev.detail, 'actor', (select u2.email from auth.users u2 where u2.id = ev.actor)) e from public.membership_events ev where ev.org_id = p_org order by ev.at desc limit 30) z), '[]'::jsonb));
end;
$$;

create or replace function public.my_workspace() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'orgs', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'slug', o.slug, 'name', o.name, 'role', coalesce(private.org_role(o.id), 'owner')) order by o.name)
      from public.organizations o where o.deleted_at is null and (private.org_role(o.id) is not null or private.is_admin())), '[]'::jsonb),
    'projects', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'slug', p.slug, 'name', p.name, 'description', p.description, 'visibility', p.visibility, 'org_id', p.org_id, 'role', private.project_role(p.id)) order by p.name)
      from public.projects p where p.archived_at is null and private.project_role(p.id) is not null), '[]'::jsonb));
$$;

revoke all on function public.create_org(text, text), public.create_project(uuid, text, text, text, text), public.create_invite(uuid, uuid, text, text, text, int), public.invite_preview(text), public.accept_invite(text), public.revoke_invite(uuid),
  public.set_org_role(uuid, uuid, text), public.remove_org_member(uuid, uuid), public.set_project_member(uuid, uuid, text), public.org_overview(uuid), public.my_workspace() from public, anon;
grant execute on function public.create_org(text, text), public.create_project(uuid, text, text, text, text), public.create_invite(uuid, uuid, text, text, text, int), public.invite_preview(text), public.accept_invite(text), public.revoke_invite(uuid),
  public.set_org_role(uuid, uuid, text), public.remove_org_member(uuid, uuid), public.set_project_member(uuid, uuid, text), public.org_overview(uuid), public.my_workspace() to authenticated;

-- token management is for project managers only (editors can still accept edits and use the Trash)
alter policy "tokens create" on public.mcp_tokens with check ((select private.is_project_owner(project_id)) and created_by = (select auth.uid()));
alter policy "tokens read" on public.mcp_tokens using ((select private.is_project_owner(project_id)));
alter policy "tokens revoke" on public.mcp_tokens using ((select private.is_project_owner(project_id))) with check ((select private.is_project_owner(project_id)));
alter policy "tokens purge" on public.mcp_tokens using ((select private.is_project_owner(project_id)) and (revoked_at is not null or (expires_at is not null and expires_at < now())));
alter policy "token events read" on public.token_events using ((select private.is_project_owner(project_id)));
alter policy "instruction versions read" on public.instruction_versions using ((select private.is_project_owner(project_id)));
-- clear_activity and mcp_audit_log: `not private.can_edit_project(pid)` became `not private.is_project_owner(pid)` (DO block with replace(), see 0012 for the technique)

-- part 3 (round 22): my_workspace also says whether the user is the super-administrator; project_overview is the member list for a project manager
create or replace function public.my_workspace() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'super', private.is_admin(),
    'orgs', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'slug', o.slug, 'name', o.name, 'role', coalesce(private.org_role(o.id), 'owner')) order by o.name)
      from public.organizations o where o.deleted_at is null and (private.org_role(o.id) is not null or private.is_admin())), '[]'::jsonb),
    'projects', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'slug', p.slug, 'name', p.name, 'description', p.description, 'visibility', p.visibility, 'org_id', p.org_id, 'role', private.project_role(p.id)) order by p.name)
      from public.projects p where p.archived_at is null and private.project_role(p.id) is not null), '[]'::jsonb));
$$;

create or replace function public.project_overview(p_project uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare o uuid;
begin
  select org_id into o from public.projects where id = p_project;
  if o is null or not private.is_project_owner(p_project) then raise exception 'Only a project manager can see this.'; end if;
  return jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'email', u.email, 'org_role', m.role,
        'role', case when m.role in ('owner', 'admin') then 'manager' else (select case pm.role when 'owner' then 'manager' else pm.role end from public.project_members pm where pm.project_id = p_project and pm.user_id = m.user_id) end,
        'implicit', m.role in ('owner', 'admin')) order by u.email)
      from public.org_members m join auth.users u on u.id = m.user_id
      where m.role in ('owner', 'admin') or exists (select 1 from public.project_members pm where pm.project_id = p_project and pm.user_id = m.user_id)), '[]'::jsonb),
    'candidates', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'email', u.email) order by u.email)
      from public.org_members m join auth.users u on u.id = m.user_id
      where m.org_id = o and m.role = 'member' and not exists (select 1 from public.project_members pm where pm.project_id = p_project and pm.user_id = m.user_id)), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'email', v.email, 'project_role', v.project_role, 'expires_at', v.expires_at) order by v.created_at desc)
      from public.invites v where v.project_id = p_project and v.accepted_at is null and v.revoked_at is null and v.expires_at > now()), '[]'::jsonb));
end;
$$;
revoke all on function public.project_overview(uuid), public.my_workspace() from public, anon;
grant execute on function public.project_overview(uuid), public.my_workspace() to authenticated;
