-- 0015: Organizations > Projects with INVITED-ONLY access.
--   * organizations, org_members (owner|admin|member), projects.org_id, invites (hashed single-use tokens), membership_events (audit).
--   * Access: an organization owner/admin sees and manages every project of the organization; a plain member sees only projects they are invited to
--     (project_members: owner = "Manager", editor, viewer). app_admins stays the super-admin. All rules live in private.project_role(); can_read/can_edit/is_project_owner call it.
--   * All writes to memberships go through definer RPCs (no direct insert/update/delete on org_members, invites, project_members).
--   * New projects are private. The Trash timer default becomes "keep until I delete it" (trash_days null).
-- Rollback: 0015_down.sql

alter table public.projects alter column trash_days set default null;
update public.projects set trash_days = null;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  name text not null check (length(name) between 1 and 80),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table public.org_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index org_members_user_idx on public.org_members (user_id, org_id);
alter table public.projects add column org_id uuid references public.organizations (id) on delete restrict;
create index projects_org_idx on public.projects (org_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  email text not null check (length(email) between 3 and 254 and email = lower(email)),
  org_role text not null default 'member' check (org_role in ('admin', 'member')),
  project_role text check (project_role in ('owner', 'editor', 'viewer')),
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  check ((project_id is null) = (project_role is null))
);
create index invites_org_idx on public.invites (org_id, created_at desc);
create unique index invites_pending_uidx on public.invites (org_id, email, coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid)) where accepted_at is null and revoked_at is null;

create table public.membership_events (
  id bigint generated always as identity primary key,
  org_id uuid references public.organizations (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  actor uuid,
  action text not null,
  subject uuid,
  detail jsonb not null default '{}',
  at timestamptz not null default now()
);
create index membership_events_org_idx on public.membership_events (org_id, at desc);

alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.invites enable row level security;
alter table public.membership_events enable row level security;

-- ---------- helpers (private schema, definer, pinned search_path) ----------
create or replace function private.org_role(o uuid) returns text
language sql stable security definer set search_path = '' as $$
  select m.role from public.org_members m where m.org_id = o and m.user_id = (select auth.uid());
$$;
create or replace function private.is_org_admin(o uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (private.is_admin() or coalesce(private.org_role(o) in ('owner', 'admin'), false));
$$;
-- the single place that decides what a user is on a project: manager | editor | viewer | null
create or replace function private.project_role(p uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when (select auth.uid()) is null then null
    when exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())) then 'manager'
    when exists (select 1 from public.projects x join public.org_members om on om.org_id = x.org_id where x.id = p and om.user_id = (select auth.uid()) and om.role in ('owner', 'admin')) then 'manager'
    else (select case m.role when 'owner' then 'manager' else m.role end from public.project_members m where m.project_id = p and m.user_id = (select auth.uid()))
  end;
$$;
create or replace function private.can_read_project(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.projects x where x.id = p and x.archived_at is null
    and (x.visibility in ('public', 'unlisted') or private.project_role(x.id) is not null));
$$;
create or replace function private.can_edit_project(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.project_role(p) in ('manager', 'editor'), false);
$$;
create or replace function private.is_project_owner(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.project_role(p) = 'manager', false);
$$;
revoke all on function private.org_role(uuid), private.is_org_admin(uuid), private.project_role(uuid) from public, anon;
grant execute on function private.org_role(uuid), private.is_org_admin(uuid), private.project_role(uuid) to authenticated;

-- ---------- policies: read only; every write is an RPC ----------
create policy "orgs read" on public.organizations for select to authenticated
  using (deleted_at is null and ((select private.org_role(id)) is not null or (select private.is_admin())));
create policy "org members read" on public.org_members for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_org_admin(org_id)));
create policy "invites read" on public.invites for select to authenticated
  using ((select private.is_org_admin(org_id)));
create policy "membership events read" on public.membership_events for select to authenticated
  using ((select private.is_org_admin(org_id)));
alter policy "members insert" on public.project_members with check (false);
alter policy "members update" on public.project_members using (false) with check (false);
alter policy "members delete" on public.project_members using (false);
revoke all on public.organizations, public.org_members, public.invites, public.membership_events from anon;
revoke insert, update, delete, truncate on public.organizations, public.org_members, public.invites, public.membership_events from authenticated;
