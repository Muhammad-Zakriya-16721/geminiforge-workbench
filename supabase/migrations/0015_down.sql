-- Rollback of 0015 (SQL editor; DROP statements). Restore the old can_read_project / can_edit_project / is_project_owner from 0003 first.
-- alter table public.projects drop column org_id;
-- drop table public.membership_events, public.invites, public.org_members, public.organizations;
-- drop function public.create_org, create_project, create_invite, invite_preview, accept_invite, revoke_invite, set_org_role, remove_org_member, set_project_member, org_overview, my_workspace;
-- alter policy "members insert"/"members update"/"members delete" on public.project_members: restore the is_project_owner(project_id) rules from 0003.
select 1;
