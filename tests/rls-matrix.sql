-- RLS / membership matrix for organizations > projects (invited-only). Runs inside one transaction that ENDS WITH AN EXCEPTION, so nothing is kept.
-- Run it in the Supabase SQL editor or through the SQL tool; the last line of the error text lists PASS/FAIL per check.
do $$
declare
  admin_id uuid; o uuid; o2 uuid; p uuid; p2 uuid; tok text; res text := ''; fails int := 0; n int; b boolean; t text; j jsonb;
  bob uuid := gen_random_uuid(); carol uuid := gen_random_uuid(); dave uuid := gen_random_uuid(); erin uuid := gen_random_uuid();
begin
  select user_id into admin_id from public.app_admins order by created_at limit 1;
  insert into auth.users (id, email, email_confirmed_at, aud, role, instance_id) values
    (bob, 'bob@example.test', now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (carol, 'carol@example.test', now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (dave, 'dave@example.test', now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (erin, 'erin@example.test', now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

  -- as the administrator: organization, two projects, invitations
  perform set_config('request.jwt.claims', jsonb_build_object('sub', admin_id, 'email', 'admin@example.test', 'role', 'authenticated')::text, true);
  set local role authenticated;
  o := public.create_org('Matrix Org', 'matrix-org');
  p := public.create_project(o, 'Matrix Project', 'matrix-project');
  p2 := public.create_project(o, 'Second Project', 'matrix-second');
  select visibility into t from public.projects where id = p;
  res := res || case when t = 'private' then 'PASS new projects are private; ' else 'FAIL new project visibility ' || t || '; ' end;
  tok := public.create_invite(o, p, 'bob@example.test', 'member', 'viewer', 7);
  res := res || case when tok like 'iv_%' and length(tok) = 67 then 'PASS invite token shape; ' else 'FAIL invite token; ' end;
  select count(*) into n from public.invites where token_hash = tok;
  res := res || case when n = 0 then 'PASS the plain token is not stored; ' else 'FAIL plain token stored; ' end;
  begin perform public.create_invite(o, p, 'bob@example.test', 'member', 'viewer', 7); res := res || 'FAIL duplicate open invite allowed; '; exception when others then res := res || 'PASS duplicate open invite refused; '; end;

  -- bob accepts (wrong email first)
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', carol, 'email', 'carol@example.test', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.accept_invite(tok); res := res || 'FAIL wrong person accepted; '; exception when others then res := res || 'PASS another email cannot accept; '; end;
  j := public.invite_preview(tok);
  res := res || case when (j ->> 'valid')::boolean and not (j ->> 'email_matches')::boolean and j ->> 'email_hint' like 'bo***@%' then 'PASS preview masks the email and says it does not match; ' else 'FAIL preview ' || j::text || '; ' end;
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', bob, 'email', 'bob@example.test', 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.accept_invite(tok);
  begin perform public.accept_invite(tok); res := res || 'FAIL token reused; '; exception when others then res := res || 'PASS a token works once; '; end;

  -- bob: viewer
  res := res || case when private.can_read_project(p) and not private.can_edit_project(p) and not private.is_project_owner(p) then 'PASS viewer reads, cannot edit or manage; ' else 'FAIL viewer rights; ' end;
  res := res || case when not private.can_read_project(p2) then 'PASS invited-only: the other project is invisible; ' else 'FAIL member sees a project without invite; ' end;
  select count(*) into n from public.projects where id in (p, p2);
  res := res || case when n = 1 then 'PASS REST select shows only the invited project; ' else 'FAIL REST select shows ' || n || '; ' end;
  begin perform public.create_invite(o, p, 'x@example.test', 'member', 'viewer', 7); res := res || 'FAIL viewer invited someone; '; exception when others then res := res || 'PASS viewer cannot invite; '; end;
  begin perform public.org_overview(o); res := res || 'FAIL viewer saw org overview; '; exception when others then res := res || 'PASS viewer cannot open the member list; '; end;
  begin perform public.set_project_member(p, bob, 'owner'); res := res || 'FAIL self-promotion; '; exception when others then res := res || 'PASS cannot promote yourself; '; end;
  begin insert into public.project_members (project_id, user_id, role) values (p, bob, 'owner'); res := res || 'FAIL direct insert into project_members; '; exception when others then res := res || 'PASS direct membership writes are blocked; '; end;
  begin insert into public.org_members (org_id, user_id, role) values (o, bob, 'owner'); res := res || 'FAIL direct insert into org_members; '; exception when others then res := res || 'PASS direct org membership writes are blocked; '; end;
  begin perform public.create_org('Mine', 'mine-org'); res := res || 'FAIL non-admin created an org; '; exception when others then res := res || 'PASS only the administrator creates organizations; '; end;
  j := public.my_workspace();
  res := res || case when jsonb_array_length(j -> 'projects') = 1 and (j -> 'projects' -> 0 ->> 'role') = 'viewer' and jsonb_array_length(j -> 'orgs') = 1 then 'PASS my_workspace shows one project as viewer; ' else 'FAIL my_workspace ' || j::text || '; ' end;

  -- carol: org member without project access (invited to the org only)
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', admin_id, 'email', 'admin@example.test', 'role', 'authenticated')::text, true);
  set local role authenticated;
  tok := public.create_invite(o, null, 'carol@example.test', 'member', null, 7);
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', carol, 'email', 'carol@example.test', 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.accept_invite(tok);
  select count(*) into n from public.projects where org_id = o;
  res := res || case when n = 0 and not private.can_read_project(p) then 'PASS org member without invitation sees no project; ' else 'FAIL org member sees ' || n || ' projects; ' end;
  select count(*) into n from public.org_members where org_id = o;
  res := res || case when n = 1 then 'PASS a member sees only their own membership row; ' else 'FAIL member sees ' || n || ' membership rows; ' end;

  -- dave: outsider
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', dave, 'email', 'dave@example.test', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.organizations where id = o;
  res := res || case when n = 0 and not private.can_read_project(p) and jsonb_array_length((public.my_workspace()) -> 'projects') = 0 then 'PASS outsider sees nothing; ' else 'FAIL outsider sees data; ' end;
  begin perform public.remove_org_member(o, bob); res := res || 'FAIL outsider removed a member; '; exception when others then res := res || 'PASS outsider cannot remove members; '; end;
  begin perform public.set_org_role(o, bob, 'owner'); res := res || 'FAIL outsider changed a role; '; exception when others then res := res || 'PASS outsider cannot change roles; '; end;
  begin perform public.set_project_member(p, bob, 'owner'); res := res || 'FAIL outsider changed project access; '; exception when others then res := res || 'PASS outsider cannot change project access; '; end;
  begin perform public.revoke_invite(gen_random_uuid()); res := res || 'FAIL revoke of nothing; '; exception when others then res := res || 'PASS revoke needs a real open invitation; '; end;

  -- erin: organization admin (invited by the administrator)
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', admin_id, 'email', 'admin@example.test', 'role', 'authenticated')::text, true);
  set local role authenticated;
  tok := public.create_invite(o, null, 'erin@example.test', 'admin', null, 7);
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', erin, 'email', 'erin@example.test', 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.accept_invite(tok);
  res := res || case when private.is_project_owner(p) and private.is_project_owner(p2) and private.can_edit_project(p2) then 'PASS org admin manages every project; ' else 'FAIL org admin rights; ' end;
  j := public.org_overview(o);
  res := res || case when jsonb_array_length(j -> 'members') = 4 and jsonb_array_length(j -> 'projects') = 2 then 'PASS org admin sees members and projects; ' else 'FAIL overview ' || left(j::text, 80) || '; ' end;
  begin perform public.set_org_role(o, carol, 'admin'); res := res || 'FAIL admin changed roles; '; exception when others then res := res || 'PASS only an owner changes org roles; '; end;
  begin perform public.create_invite(o, null, 'z@example.test', 'admin', null, 7); res := res || 'FAIL admin invited an admin; '; exception when others then res := res || 'PASS only an owner invites admins; '; end;
  begin perform public.remove_org_member(o, admin_id); res := res || 'FAIL admin removed the owner; '; exception when others then res := res || 'PASS an admin cannot remove the owner; '; end;
  perform public.set_project_member(p, carol, 'editor');
  begin perform public.set_project_member(p, erin, 'viewer'); res := res || 'FAIL set role of an org admin; '; exception when others then res := res || 'PASS org admins need no project role; '; end;
  perform public.remove_org_member(o, bob);
  select count(*) into n from public.project_members where project_id = p and user_id = bob;
  res := res || case when n = 0 and not exists (select 1 from public.org_members where user_id = bob) then 'PASS removing a member removes their project access; ' else 'FAIL project access remained; ' end;

  -- carol is now an editor
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', carol, 'email', 'carol@example.test', 'role', 'authenticated')::text, true);
  set local role authenticated;
  res := res || case when private.can_edit_project(p) and not private.is_project_owner(p) then 'PASS editor edits but does not manage; ' else 'FAIL editor rights; ' end;
  begin perform public.remove_org_member(o, erin); res := res || 'FAIL member removed an admin; '; exception when others then res := res || 'PASS a member cannot remove others; '; end;
  perform public.remove_org_member(o, carol);
  res := res || case when not private.can_read_project(p) then 'PASS leaving the organization ends project access; ' else 'FAIL access after leaving; ' end;

  -- owner guards and anon
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', admin_id, 'email', 'admin@example.test', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.remove_org_member(o, admin_id); res := res || 'FAIL last owner left; '; exception when others then res := res || 'PASS the last owner cannot leave; '; end;
  begin perform public.set_org_role(o, admin_id, 'member'); res := res || 'FAIL last owner demoted; '; exception when others then res := res || 'PASS the last owner cannot be demoted; '; end;
  -- organization lifecycle (rename, delete, restore, delete for good) and the invitation-mail limit
  o2 := public.create_org('Temp Org', 'temp-org-x');
  perform public.create_project(o2, 'Temp Project', 'temp-project-x');
  perform public.rename_org(o2, 'Temp Org Renamed');
  select name into t from public.organizations where id = o2;
  res := res || case when t = 'Temp Org Renamed' then 'PASS an owner can rename the organization; ' else 'FAIL rename; ' end;
  perform public.delete_org(o2);
  reset role; -- archived projects are hidden from the read policy, so count them as the table owner
  select count(*) into n from public.projects where org_id = o2 and archived_at is not null;
  set local role authenticated;
  res := res || case when n = 1 and not exists (select 1 from jsonb_array_elements(public.my_workspace() -> 'orgs') x where x ->> 'id' = o2::text) and exists (select 1 from jsonb_array_elements(public.my_workspace() -> 'deleted_orgs') x where x ->> 'id' = o2::text) then 'PASS delete hides the organization, archives its projects and lists it as deleted; ' else 'FAIL delete_org; ' end;
  begin perform public.rename_org(o2, 'x'); res := res || 'FAIL renamed a deleted org; '; exception when others then res := res || 'PASS a deleted organization cannot be renamed; '; end;
  perform public.restore_org(o2);
  select count(*) into n from public.projects where org_id = o2 and archived_at is null;
  res := res || case when n = 1 then 'PASS restore brings the projects back; ' else 'FAIL restore_org; ' end;
  begin perform public.purge_org(o2); res := res || 'FAIL purged a live org; '; exception when others then res := res || 'PASS only a deleted organization can be removed for good; '; end;
  perform public.delete_org(o2);
  perform public.purge_org(o2);
  select count(*) into n from public.organizations where id = o2;
  res := res || case when n = 0 then 'PASS delete for good removes the organization and its projects; ' else 'FAIL purge_org; ' end;
  for n in 1..20 loop perform public.invite_mail_gate(o); end loop;
  begin perform public.invite_mail_gate(o); res := res || 'FAIL 21st invitation email in an hour allowed; '; exception when others then res := res || 'PASS the invitation email limit holds; '; end;
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', bob, 'email', 'bob@example.test', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.delete_org(o); res := res || 'FAIL a former member deleted the org; '; exception when others then res := res || 'PASS a former member cannot delete the organization; '; end;
  begin perform public.rename_org(o, 'Hijack'); res := res || 'FAIL a former member renamed the org; '; exception when others then res := res || 'PASS a former member cannot rename the organization; '; end;
  begin perform public.invite_mail_gate(o); res := res || 'FAIL a former member passed the mail gate; '; exception when others then res := res || 'PASS a former member cannot send invitation emails; '; end;
  begin perform public.purge_project(p); res := res || 'FAIL a former member purged a project; '; exception when others then res := res || 'PASS a former member cannot delete a project for good; '; end;
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', dave, 'email', 'dave@example.test', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.delete_org(o); res := res || 'FAIL an outsider deleted the org; '; exception when others then res := res || 'PASS an outsider cannot delete the organization; '; end;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin perform public.my_workspace(); res := res || 'FAIL anon called my_workspace; '; exception when others then res := res || 'PASS anon cannot call the workspace functions; '; end;
  begin select count(*) into n from public.org_members; res := res || 'FAIL anon read org_members; '; exception when others then res := res || 'PASS anon cannot read memberships; '; end;
  reset role;
  fails := (length(res) - length(replace(res, 'FAIL', ''))) / 4;
  raise exception 'RESULT fails=% | %', fails, res;
end $$;
