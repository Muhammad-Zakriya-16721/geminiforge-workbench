// #region 5k. ORGANIZATIONS AND PROJECTS (invited-only access). Switcher, organization page (projects, members, invitations), project page, invitation links.
// Roles: organization owner / admin / member; project manager / editor / viewer. An organization member sees only the projects they are invited to; owners and admins see all.
const ROLE_NAME: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Member", manager: "Manager", editor: "Editor", viewer: "Viewer" };
const dbProjectRole = (r: string) => (r === "manager" ? "owner" : r); // the database calls a project manager "owner"
const inviteLink = (token: string) => `${window.location.origin}${window.location.pathname}#/join/${token}`;

// the spec chapters, Library and Tracker belong to the GeminiForge project only
function useSpecVisible(): boolean {
  return useStore((s) => { const cur = s.workspace?.projects.find((p) => p.id === s.projectId); return !cur || cur.slug === "geminiforge"; });
}

function ProjectSwitcher() {
  const { workspace, projectId, setProject, go } = useStore(useShallow((s) => ({ workspace: s.workspace, projectId: s.projectId, setProject: s.setProject, go: s.go })));
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open]);
  if (!workspace || workspace.projects.length === 0) return null;
  const cur = workspace.projects.find((p) => p.id === projectId);
  const orgName = (id: string | null) => workspace.orgs.find((o) => o.id === id)?.name ?? "";
  return (
    <div className="psw" ref={box} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
      <style>{ORGS_CSS}</style>
      <button type="button" className="psw-b" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="psw-t"><b>{cur?.name ?? "Choose a project"}</b><small>{orgName(cur?.org_id ?? null)}{cur ? ` · ${ROLE_NAME[cur.role]}` : ""}</small></span>
        <ChevronDown size={15} aria-hidden />
      </button>
      {open && (
        <div className="psw-m" role="listbox" aria-label="Projects">
          {workspace.projects.map((p) => (
            <button key={p.id} type="button" role="option" aria-selected={p.id === projectId} className="psw-i" onClick={() => { setProject(p.id); setOpen(false); go({ kind: "home" }); }}>
              <span><b>{p.name}</b><small>{orgName(p.org_id)}</small></span><span className="chip">{ROLE_NAME[p.role]}</span>
            </button>
          ))}
          <button type="button" className="psw-i psw-foot" onClick={() => { setOpen(false); go({ kind: "orgs" }); }}>Organizations and members…</button>
        </div>
      )}
    </div>
  );
}

const ORGS_CSS = `
.psw{position:relative;margin:0 10px 8px;font-family:var(--sans)}
.psw-b{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--raise);color:var(--tx);cursor:pointer;text-align:left}
.psw-b:hover{background:var(--hover)}.psw-t{display:flex;flex-direction:column;min-width:0;flex:1}.psw-t b{font:600 13.5px var(--sans);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.psw-t small,.psw-i small{font:400 11.5px var(--sans);color:var(--tx4)}
.psw-m{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:40;background:#1d1c1a;border:1px solid var(--line2);border-radius:12px;padding:6px;box-shadow:0 12px 36px rgba(0,0,0,.5);max-height:60vh;overflow:auto}
.psw-i{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:8px 10px;border:0;border-radius:8px;background:none;color:var(--tx2);cursor:pointer;text-align:left;font:400 13.5px var(--sans)}
.psw-i span:first-child{display:flex;flex-direction:column;min-width:0}.psw-i b{font-weight:500;color:var(--tx)}.psw-i:hover,.psw-i[aria-selected=true]{background:var(--hover)}.psw-foot{margin-top:4px;border-top:1px solid var(--line);border-radius:0 0 8px 8px;color:var(--tx3)}
.org-link{display:block;width:100%;padding:8px 10px;border-radius:10px;border:1px dashed var(--line2);background:#161513;font:500 12.5px var(--mono);word-break:break-all;color:var(--tx);margin:6px 0}
`;

interface OrgOverview {
  members: { user_id: string; email: string; role: string; since: string; projects: { project_id: string; name: string; role: string }[] }[];
  invites: { id: string; email: string; org_role: string; project_id: string | null; project: string | null; project_role: string | null; expires_at: string; created_at: string }[];
  projects: { id: string; slug: string; name: string; visibility: string }[];
  events: { action: string; at: string; detail: Record<string, unknown>; actor: string | null }[];
}
const EVENT_TEXT: Record<string, string> = { org_created: "created the organization", project_created: "created a project", invite_created: "sent an invitation", invite_accepted: "accepted an invitation", invite_revoked: "revoked an invitation", org_role_changed: "changed an organization role", member_removed: "removed a member", left_org: "left the organization", project_role_set: "set a project role", project_access_removed: "removed project access" };

export function OrgsView() {
  const { workspace, projectId, notify, cloudState, setProject, go } = useStore(useShallow((s) => ({ workspace: s.workspace, projectId: s.projectId, notify: s.notify, cloudState: s.cloudState, setProject: s.setProject, go: s.go })));
  const { ask, node } = useConfirm();
  const [orgId, setOrgId] = useState("");
  const [ov, setOv] = useState<OrgOverview | null>(null);
  const [err, setErr] = useState("");
  const [link, setLink] = useState<{ url: string; email: string } | null>(null);
  const [newOrg, setNewOrg] = useState("");
  const [np, setNp] = useState({ name: "", description: "", visibility: "private" });
  const [inv, setInv] = useState({ email: "", orgRole: "member", project: "", projectRole: "viewer", days: "7" });
  const me = workspace?.orgs.find((o) => o.id === orgId);
  const isOrgAdmin = !!workspace && (workspace.super || me?.role === "owner" || me?.role === "admin");
  const isOwner = !!workspace && (workspace.super || me?.role === "owner");

  useEffect(() => { if (workspace && !workspace.orgs.some((o) => o.id === orgId)) setOrgId(workspace.orgs[0]?.id ?? ""); }, [workspace, orgId]);
  const load = useCallback(async () => {
    if (!supabase || !orgId || !isOrgAdmin) { setOv(null); return; }
    const { data, error } = await supabase.rpc("org_overview", { p_org: orgId });
    if (error) { setErr(error.message); return; }
    setErr(""); setOv(data as OrgOverview);
  }, [orgId, isOrgAdmin]);
  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    const { error } = await fn();
    notify(error ? error.message : ok);
    await load(); void refreshAi();
    return !error;
  };
  if (!CLOUD_AVAILABLE || (cloudState !== "synced" && cloudState !== "syncing" && cloudState !== "error")) return <div className="col enter"><h1 className="view-h">Organizations</h1><p className="meta">Sign in under Settings, then Sync, to use organizations.</p></div>;
  if (!workspace) return <div className="col enter"><h1 className="view-h">Organizations</h1><p className="meta" role="status">Loading…</p></div>;

  const createOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !newOrg.trim()) return;
    const { data, error } = await supabase.rpc("create_org", { p_name: newOrg.trim() });
    if (error) { notify(error.message); return; }
    setNewOrg(""); setOrgId(data as string); notify("Organization created"); void refreshAi();
  };
  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !np.name.trim() || !orgId) return;
    const { error } = await supabase.rpc("create_project", { p_org: orgId, p_name: np.name.trim(), p_description: np.description.trim(), p_visibility: np.visibility });
    if (error) { notify(error.message); return; }
    setNp({ name: "", description: "", visibility: "private" }); notify("Project created"); await load(); void refreshAi();
  };
  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !orgId) return;
    const { data, error } = await supabase.rpc("create_invite", { p_org: orgId, p_project: inv.project || null, p_email: inv.email.trim(), p_org_role: inv.orgRole, p_project_role: inv.project ? dbProjectRole(inv.projectRole) : null, p_days: Number(inv.days) });
    if (error) { notify(error.message); return; }
    setLink({ url: inviteLink(data as string), email: inv.email.trim() });
    setInv({ ...inv, email: "" }); await load();
  };
  const removeMember = async (m: OrgOverview["members"][number]) => {
    if (!supabase) return;
    if (await ask({ title: `Remove ${m.email}?`, body: <>They lose access to the organization and to all its projects at once. They can be invited again later.</>, confirmLabel: "Remove", danger: true }))
      await run(() => supabase!.rpc("remove_org_member", { p_org: orgId, p_user: m.user_id }), "Member removed");
  };
  const revokeInvite = async (id: string) => { if (supabase) await run(() => supabase!.rpc("revoke_invite", { p_id: id }), "Invitation revoked"); };

  const mailto = link ? `mailto:${encodeURIComponent(link.email)}?subject=${encodeURIComponent("Invitation to a documentation workspace")}&body=${encodeURIComponent(`You are invited. Open this link, sign in with this email address, and accept:\n${link.url}\n\nThe link works once and expires.`)}` : "";
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)" }}>
      <style>{AI_CSS}{ORGS_CSS}</style>
      {node}
      <h1 className="view-h">Organizations</h1>
      <p className="meta">An organization holds projects and people. Owners and admins see every project of the organization; other members see only the projects they are invited to. People join by invitation only.</p>
      {err && <p className="banner" data-k="conflict" role="alert">{err}</p>}
      {workspace.super && (
        <form className="ai-bar" onSubmit={createOrg}>
          <input className="set-in" style={{ width: 260 }} aria-label="New organization name" placeholder="New organization name" maxLength={80} value={newOrg} onChange={(e) => setNewOrg(e.target.value)} />
          <button type="submit" className="btn" disabled={!newOrg.trim()}><Plus size={14} aria-hidden />New organization</button>
        </form>
      )}
      {workspace.orgs.length === 0 && <p className="meta">You are not a member of any organization yet. Ask an organization owner to invite you.</p>}
      {workspace.orgs.length > 1 && (
        <div className="seg" role="group" aria-label="Organization">
          {workspace.orgs.map((o) => <button key={o.id} type="button" aria-pressed={o.id === orgId} onClick={() => { setOrgId(o.id); setLink(null); }}>{o.name}</button>)}
        </div>
      )}
      {me && <p className="meta"><b>{me.name}</b> <span className="chip">{ROLE_NAME[me.role]}</span> · address <span className="mono">{me.slug}</span></p>}

      {me && (<>
        <h2 className="set-h">Projects</h2>
        {workspace.projects.filter((p) => p.org_id === orgId).length === 0 && !isOrgAdmin && <p className="meta">You are not invited to any project of this organization yet.</p>}
        {(isOrgAdmin ? (ov?.projects ?? []).map((p) => ({ id: p.id, name: p.name, visibility: p.visibility, role: workspace.projects.find((x) => x.id === p.id)?.role ?? "manager" })) : workspace.projects.filter((p) => p.org_id === orgId).map((p) => ({ id: p.id, name: p.name, visibility: p.visibility, role: p.role }))).map((p) => (
          <div key={p.id} className="ai-tok">
            <b>{p.name}</b><span className="chip">{p.visibility}</span><span className="chip">{ROLE_NAME[p.role] ?? p.role}</span><span className="sp" />
            <button type="button" className="btn" onClick={() => { setProject(p.id); go({ kind: "project" }); }}>Open</button>
          </div>
        ))}
        {isOrgAdmin && (
          <form onSubmit={createProject}>
            <div className="ai-form">
              <label>Project name<input className="set-in" required maxLength={120} value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} /></label>
              <label>Short description (optional)<input className="set-in" maxLength={500} value={np.description} onChange={(e) => setNp({ ...np, description: e.target.value })} /></label>
              <label>Visibility<select className="set-in" value={np.visibility} onChange={(e) => setNp({ ...np, visibility: e.target.value })}><option value="private">Private: only invited people</option><option value="unlisted">Unlisted: anyone with the address can read</option><option value="public">Public: anyone can read</option></select></label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={!np.name.trim()}>Create project</button>
          </form>
        )}
      </>)}

      {me && isOrgAdmin && ov && (<>
        <h2 className="set-h">Invite someone</h2>
        <form onSubmit={invite}>
          <div className="ai-form">
            <label>Email address<input className="set-in" type="email" required maxLength={254} value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} placeholder="name@example.com" /></label>
            <label>Project (optional)<select className="set-in" value={inv.project} onChange={(e) => setInv({ ...inv, project: e.target.value })}><option value="">Organization only, no project</option>{ov.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            {inv.project && <label>Role in the project<select className="set-in" value={inv.projectRole} onChange={(e) => setInv({ ...inv, projectRole: e.target.value })}><option value="viewer">Viewer: reads</option><option value="editor">Editor: reads, edits, reviews AI edits</option><option value="manager">Manager: also members, tokens, settings</option></select></label>}
            {isOwner && <label>Role in the organization<select className="set-in" value={inv.orgRole} onChange={(e) => setInv({ ...inv, orgRole: e.target.value })}><option value="member">Member: sees invited projects only</option><option value="admin">Admin: sees and manages every project</option></select></label>}
            <label>Valid for<select className="set-in" value={inv.days} onChange={(e) => setInv({ ...inv, days: e.target.value })}><option value="1">1 day</option><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={!inv.email.trim()}>Create invitation link</button>
        </form>
        {link && (
          <div className="trk" style={{ marginTop: 12 }}>
            <b>Send this link to {link.email}: it is shown only once.</b>
            <code className="org-link" aria-label="Invitation link">{link.url}</code>
            <div className="actions">
              <button type="button" className="btn" onClick={async () => notify((await copyText(link.url)) ? "Link copied" : "Could not copy")}><Copy size={14} aria-hidden />Copy link</button>
              <a className="btn" href={mailto}>Write an email</a>
              <button type="button" className="btn btn-ghost" onClick={() => setLink(null)}>I sent it</button>
            </div>
            <p className="meta">The person must sign in with exactly this email address. The link works once. Anyone who has the link and that account can join, so send it privately.</p>
          </div>
        )}
        {ov.invites.length > 0 && (<>
          <h2 className="set-h">Open invitations</h2>
          {ov.invites.map((v) => (
            <div key={v.id} className="ai-tok">
              <b>{v.email}</b><span className="chip">{v.project ? `${v.project}: ${ROLE_NAME[v.project_role === "owner" ? "manager" : v.project_role ?? ""] ?? v.project_role}` : `Organization ${ROLE_NAME[v.org_role]}`}</span>
              <span className="meta" style={{ margin: 0 }}>expires {new Date(v.expires_at).toLocaleDateString()}</span><span className="sp" />
              <button type="button" className="btn btn-danger" onClick={() => void revokeInvite(v.id)}>Revoke</button>
            </div>
          ))}
        </>)}

        <h2 className="set-h">Members</h2>
        {ov.members.map((m) => (
          <div key={m.user_id} className="ai-tok">
            <b>{m.email}</b>
            {isOwner ? (
              <select className="set-in" style={{ width: 120 }} aria-label={`Organization role of ${m.email}`} value={m.role} onChange={(e) => void run(() => supabase!.rpc("set_org_role", { p_org: orgId, p_user: m.user_id, p_role: e.target.value }), "Role changed")}>
                <option value="owner">Owner</option><option value="admin">Admin</option><option value="member">Member</option>
              </select>
            ) : <span className="chip">{ROLE_NAME[m.role]}</span>}
            {m.role === "member" && m.projects.length === 0 && <span className="meta" style={{ margin: 0 }}>no project access yet</span>}
            {m.projects.map((p) => <span key={p.project_id} className="chip">{p.name}: {ROLE_NAME[p.role === "owner" ? "manager" : p.role]}</span>)}
            <span className="sp" />
            <button type="button" className="btn btn-danger" onClick={() => void removeMember(m)}>Remove</button>
          </div>
        ))}

        <h2 className="set-h">Recent changes</h2>
        {ov.events.length === 0 ? <p className="meta">Nothing yet.</p> : (
          <table className="ai-tbl"><thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead>
            <tbody>{ov.events.map((e, i) => <tr key={i}><td>{ago(e.at)}</td><td>{e.actor ?? "someone"}</td><td>{EVENT_TEXT[e.action] ?? e.action}{typeof e.detail.email === "string" ? `: ${e.detail.email}` : ""}</td></tr>)}</tbody>
          </table>
        )}
      </>)}
      {me && !isOrgAdmin && <p className="meta">You can leave this organization at any time. <button type="button" className="btn btn-ghost" onClick={async () => { if (supabase && (await ask({ title: "Leave this organization?", body: <>You lose access to all its projects. An owner has to invite you again.</>, confirmLabel: "Leave", danger: true }))) { const { data: u } = await supabase.auth.getUser(); if (u.user) await run(() => supabase!.rpc("remove_org_member", { p_org: orgId, p_user: u.user!.id }), "You left the organization"); } }}>Leave</button></p>}
      {projectId === "" && workspace.projects.length > 0 && <p className="meta">Choose a project from the switcher in the sidebar.</p>}
    </div>
  );
}

interface ProjectOverview { members: { user_id: string; email: string; org_role: string; role: string | null; implicit: boolean }[]; candidates: { user_id: string; email: string }[]; invites: { id: string; email: string; project_role: string; expires_at: string }[] }

export function ProjectView() {
  const { workspace, projectId, isManager, notify, go } = useStore(useShallow((s) => ({ workspace: s.workspace, projectId: s.projectId, isManager: s.isManager, notify: s.notify, go: s.go })));
  const { ask, node } = useConfirm();
  const cur = workspace?.projects.find((p) => p.id === projectId);
  const [f, setF] = useState({ name: "", description: "", visibility: "private" });
  const [ov, setOv] = useState<ProjectOverview | null>(null);
  const [add, setAdd] = useState({ user: "", role: "viewer" });
  const [inv, setInv] = useState({ email: "", role: "viewer", days: "7" });
  const [link, setLink] = useState("");
  useEffect(() => { if (cur) setF({ name: cur.name, description: cur.description ?? "", visibility: cur.visibility }); }, [cur?.id, cur?.name, cur?.description, cur?.visibility]); // eslint-disable-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    if (!supabase || !projectId || !isManager) { setOv(null); return; }
    const { data, error } = await supabase.rpc("project_overview", { p_project: projectId });
    if (!error) setOv(data as ProjectOverview);
  }, [projectId, isManager]);
  useEffect(() => { void load(); }, [load]);
  if (!cur) return <div className="col enter"><h1 className="view-h">Project</h1><p className="meta">No project selected.</p></div>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !f.name.trim()) return;
    const { error } = await supabase.from("projects").update({ name: f.name.trim(), description: f.description.trim(), visibility: f.visibility }).eq("id", cur.id);
    notify(error ? error.message : "Project saved"); void refreshAi();
  };
  const setRole = async (userId: string, role: string | null, ok: string) => {
    if (!supabase) return;
    const { error } = await supabase.rpc("set_project_member", { p_project: cur.id, p_user: userId, p_role: role });
    notify(error ? error.message : ok); await load(); void refreshAi();
  };
  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !cur.org_id) return;
    const { data, error } = await supabase.rpc("create_invite", { p_org: cur.org_id, p_project: cur.id, p_email: inv.email.trim(), p_org_role: "member", p_project_role: dbProjectRole(inv.role), p_days: Number(inv.days) });
    if (error) { notify(error.message); return; }
    setLink(inviteLink(data as string)); setInv({ ...inv, email: "" }); await load();
  };
  const archive = async () => {
    if (!supabase || !(await ask({ title: `Archive “${cur.name}”?`, body: <>The project disappears from the switcher and nobody can open it. Its content is kept; an administrator can bring it back in the database.</>, confirmLabel: "Archive project", danger: true, type: "ARCHIVE" }))) return;
    const { error } = await supabase.from("projects").update({ archived_at: new Date().toISOString() }).eq("id", cur.id);
    notify(error ? error.message : "Project archived"); if (!error) { try { window.localStorage.removeItem("gf_project"); } catch { /* ignore */ } useStore.setState({ projectId: "" }); void refreshAi(); go({ kind: "orgs" }); }
  };
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)" }}>
      <style>{AI_CSS}{ORGS_CSS}</style>
      {node}
      <h1 className="view-h">{cur.name}</h1>
      <p className="meta">Your role here: <span className="chip">{ROLE_NAME[cur.role]}</span> · address <span className="mono">{cur.slug}</span> · {cur.visibility}</p>
      {!isManager && <p className="meta">Only a project manager can change settings or members. You can ask a manager for a different role.</p>}
      {isManager && (<>
        <h2 className="set-h">Settings</h2>
        <form onSubmit={save}>
          <div className="ai-form">
            <label>Name<input className="set-in" required maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <label>Short description<input className="set-in" maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
            <label>Visibility<select className="set-in" value={f.visibility} onChange={(e) => setF({ ...f, visibility: e.target.value })}><option value="private">Private: only invited people</option><option value="unlisted">Unlisted: anyone with the address can read</option><option value="public">Public: anyone can read</option></select></label>
          </div>
          <button type="submit" className="btn btn-primary">Save</button>
        </form>
        <p className="meta">The Trash timer is on the Trash page, AI tokens and the message for AI tools are under AI access.</p>

        <h2 className="set-h">People with access</h2>
        {ov?.members.map((m) => (
          <div key={m.user_id} className="ai-tok">
            <b>{m.email}</b>
            {m.implicit ? <span className="chip" title="Organization owners and admins manage every project">{ROLE_NAME[m.org_role]} of the organization · Manager</span> : (
              <select className="set-in" style={{ width: 130 }} aria-label={`Project role of ${m.email}`} value={m.role ?? "viewer"} onChange={(e) => void setRole(m.user_id, dbProjectRole(e.target.value), "Role changed")}>
                <option value="viewer">Viewer</option><option value="editor">Editor</option><option value="manager">Manager</option>
              </select>
            )}
            <span className="sp" />
            {!m.implicit && <button type="button" className="btn btn-danger" onClick={() => void setRole(m.user_id, null, "Access removed")}>Remove access</button>}
          </div>
        ))}
        {ov && ov.candidates.length > 0 && (
          <div className="ai-bar">
            <select className="set-in" style={{ width: 240 }} aria-label="Organization member to add" value={add.user} onChange={(e) => setAdd({ ...add, user: e.target.value })}><option value="">Add an organization member…</option>{ov.candidates.map((c) => <option key={c.user_id} value={c.user_id}>{c.email}</option>)}</select>
            <select className="set-in" style={{ width: 130 }} aria-label="Role to give" value={add.role} onChange={(e) => setAdd({ ...add, role: e.target.value })}><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="manager">Manager</option></select>
            <button type="button" className="btn" disabled={!add.user} onClick={() => { void setRole(add.user, dbProjectRole(add.role), "Access given"); setAdd({ ...add, user: "" }); }}>Give access</button>
          </div>
        )}
        <h2 className="set-h">Invite by email</h2>
        <form onSubmit={invite}>
          <div className="ai-form">
            <label>Email address<input className="set-in" type="email" required maxLength={254} value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} /></label>
            <label>Role<select className="set-in" value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value })}><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="manager">Manager</option></select></label>
            <label>Valid for<select className="set-in" value={inv.days} onChange={(e) => setInv({ ...inv, days: e.target.value })}><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option></select></label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={!inv.email.trim()}>Create invitation link</button>
        </form>
        {link && <div className="trk" style={{ marginTop: 10 }}><b>Send this link: it is shown only once.</b><code className="org-link" aria-label="Invitation link">{link}</code><div className="actions"><button type="button" className="btn" onClick={async () => notify((await copyText(link)) ? "Link copied" : "Could not copy")}><Copy size={14} aria-hidden />Copy link</button><button type="button" className="btn btn-ghost" onClick={() => setLink("")}>I sent it</button></div></div>}
        {ov && ov.invites.length > 0 && ov.invites.map((v) => (
          <div key={v.id} className="ai-tok"><b>{v.email}</b><span className="chip">invited as {ROLE_NAME[v.project_role === "owner" ? "manager" : v.project_role]}</span><span className="meta" style={{ margin: 0 }}>expires {new Date(v.expires_at).toLocaleDateString()}</span><span className="sp" />
            <button type="button" className="btn btn-danger" onClick={async () => { if (supabase) { const { error } = await supabase.rpc("revoke_invite", { p_id: v.id }); notify(error ? error.message : "Invitation revoked"); await load(); } }}>Revoke</button></div>
        ))}

        <h2 className="set-h">Archive</h2>
        <button type="button" className="btn btn-danger" onClick={() => void archive()}>Archive this project…</button>
      </>)}
    </div>
  );
}

export function JoinView({ token }: { token: string }) {
  const { cloudState, notify, setProject, go } = useStore(useShallow((s) => ({ cloudState: s.cloudState, notify: s.notify, setProject: s.setProject, go: s.go })));
  const [pre, setPre] = useState<{ valid: boolean; org?: string; project?: string | null; org_role?: string; project_role?: string | null; email_hint?: string; email_matches?: boolean; expires_at?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const signedIn = CLOUD_AVAILABLE && (cloudState === "synced" || cloudState === "syncing");
  useEffect(() => {
    if (!supabase || !signedIn) return;
    let off = false;
    void supabase.rpc("invite_preview", { p_token: token }).then(({ data, error }) => { if (!off) setPre(error ? { valid: false } : (data as typeof pre)); });
    return () => { off = true; };
  }, [token, signedIn]);
  const accept = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
    setBusy(false);
    if (error) { notify(error.message); return; }
    await refreshAi();
    const r = data as { project_id: string | null };
    notify("Invitation accepted");
    if (r.project_id) { setProject(r.project_id); go({ kind: "home" }); } else go({ kind: "orgs" });
  };
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)" }}>
      <style>{AI_CSS}</style>
      <h1 className="view-h">Invitation</h1>
      {!signedIn && <p className="meta">Sign in under Settings (use the email address the invitation was sent to), then open this link again. Nothing happens until you accept.</p>}
      {signedIn && pre === null && <p className="meta" role="status">Checking the invitation…</p>}
      {signedIn && pre && !pre.valid && <p className="banner" data-k="conflict" role="alert">This invitation is not valid any more. It may have been used, revoked or expired. Ask for a new one.</p>}
      {signedIn && pre?.valid && (
        <div className="trk">
          <p style={{ margin: "0 0 6px" }}>You are invited to <b>{pre.org}</b>{pre.project ? <> and the project <b>{pre.project}</b></> : null}.</p>
          <p className="meta">Role: {pre.project ? `${ROLE_NAME[pre.project_role === "owner" ? "manager" : pre.project_role ?? ""] ?? pre.project_role} in the project` : `${ROLE_NAME[pre.org_role ?? "member"]} of the organization`}{pre.project && pre.org_role === "admin" ? ", organization admin" : ""}. Sent to {pre.email_hint}. Valid until {pre.expires_at ? new Date(pre.expires_at).toLocaleDateString() : ""}.</p>
          {!pre.email_matches && <p className="banner" data-k="conflict" role="alert">You are signed in with a different email address than the one invited. Sign out and sign in with {pre.email_hint}.</p>}
          <div className="actions"><button type="button" className="btn btn-primary" disabled={busy || !pre.email_matches} onClick={() => void accept()}>{busy ? "Joining…" : "Accept invitation"}</button><button type="button" className="btn" onClick={() => go({ kind: "home" })}>Not now</button></div>
        </div>
      )}
    </div>
  );
}

// the home screen of a project that is not the specification: its role, shortcuts and latest pages
export function ProjectHome() {
  const { workspace, projectId, isAdmin, isManager, go, liveTick } = useStore(useShallow((s) => ({ workspace: s.workspace, projectId: s.projectId, isAdmin: s.isAdmin, isManager: s.isManager, go: s.go, liveTick: s.liveTick })));
  const cur = workspace?.projects.find((p) => p.id === projectId);
  const [pages, setPages] = useState<{ ref: string; title: string; updated_at: string }[]>([]);
  useEffect(() => {
    if (!supabase || !projectId) return;
    let off = false;
    void supabase.from("docs").select("ref,title,updated_at").eq("project_id", projectId).eq("source", "native").is("deleted_at", null).order("updated_at", { ascending: false }).limit(8).then(({ data }) => { if (!off) setPages((data ?? []) as typeof pages); });
    return () => { off = true; };
  }, [projectId, liveTick]);
  if (!cur) return <div className="col enter"><h1 className="view-h">Welcome</h1><p className="meta">Choose a project from the switcher in the sidebar, or open Organizations.</p><div className="actions"><button type="button" className="btn" onClick={() => go({ kind: "orgs" })}>Organizations</button></div></div>;
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)" }}>
      <style>{AI_CSS}</style>
      <h1 className="view-h">{cur.name}</h1>
      {cur.description && <p className="meta">{cur.description}</p>}
      <p className="meta">Your role: <span className="chip">{ROLE_NAME[cur.role]}</span> · {cur.visibility}</p>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={() => go({ kind: "pages" })}>Pages</button>
        {isAdmin && <button type="button" className="btn" onClick={() => go({ kind: "inbox" })}>Review inbox</button>}
        {isManager && <button type="button" className="btn" onClick={() => go({ kind: "access" })}>AI access</button>}
        <button type="button" className="btn" onClick={() => go({ kind: "project" })}>Project settings</button>
        <button type="button" className="btn" onClick={() => go({ kind: "orgs" })}>Organizations</button>
      </div>
      <h2 className="set-h">Latest pages</h2>
      {pages.length === 0 ? <p className="meta">No pages yet.{isAdmin ? " Create the first one under Pages." : ""}</p> : pages.map((p) => (
        <button key={p.ref} type="button" className="pg-row" onClick={() => go({ kind: "pages", ref: p.ref })}><b>{p.title}</b><span className="mono dim small">{p.ref}</span><span className="sp" /><span className="meta" style={{ margin: 0 }}>{ago(p.updated_at)}</span></button>
      ))}
    </div>
  );
}
// #endregion
