// #region 5k. ORGANIZATIONS AND PROJECTS (invited-only access). Root page = organizations; organization page (projects, people, invitations, activity, settings); project settings; invitation links.
// Roles: organization owner / admin / member; project manager / editor / viewer. An organization member sees only the projects they are invited to; owners and admins see all.
const ROLE_NAME: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Member", manager: "Manager", editor: "Editor", viewer: "Viewer" };
const dbProjectRole = (r: string) => (r === "manager" ? "owner" : r); // the database calls a project manager "owner"
const uiProjectRole = (r: string | null | undefined) => (r === "owner" ? "manager" : r ?? "viewer");
const inviteLink = (token: string) => `${window.location.origin}${window.location.pathname}#/join/${token}`;
const PROJECT_ROLES: Opt[] = [{ value: "viewer", label: "Viewer", hint: "Reads" }, { value: "editor", label: "Editor", hint: "Reads, edits, reviews AI edits" }, { value: "manager", label: "Manager", hint: "Also people, tokens, settings" }];
const VIS_OPTS: Opt[] = [{ value: "private", label: "Private", hint: "Only invited people" }, { value: "unlisted", label: "Unlisted", hint: "Anyone with the address can read" }, { value: "public", label: "Public", hint: "Anyone can read" }];
const DAY_OPTS: Opt[] = ["1", "3", "7", "14", "30"].map((d) => ({ value: d, label: d === "1" ? "1 day" : `${d} days` }));

// the spec chapters, Library and Tracker belong to the GeminiForge project only
function useSpecVisible(): boolean {
  return useStore((s) => { const cur = s.workspace?.projects.find((p) => p.id === s.projectId); return !cur || cur.slug === "geminiforge"; });
}

function usePref(key: string, def: string): [string, (v: string) => void] {
  const [v, setV] = useState<string>(() => { try { return window.localStorage.getItem(key) || def; } catch { return def; } });
  return [v, (n: string) => { setV(n); try { window.localStorage.setItem(key, n); } catch { /* not remembered */ } }];
}

const hueOf = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
function OrgTile({ name, size = 34 }: { name: string; size?: number }) {
  const h = hueOf(name);
  return <span className="otile" aria-hidden style={{ width: size, height: size, background: `hsl(${h} 36% 22%)`, color: `hsl(${h} 70% 78%)`, fontSize: Math.round(size * 0.42) }}>{(name.trim()[0] || "?").toUpperCase()}</span>;
}

// the compact project chooser at the top of the sidebar
function ProjectSwitcher() {
  const { workspace, projectId, setProject, go } = useStore(useShallow((s) => ({ workspace: s.workspace, projectId: s.projectId, setProject: s.setProject, go: s.go })));
  if (!workspace || workspace.projects.length === 0) return null;
  const cur = workspace.projects.find((p) => p.id === projectId);
  const orgName = (id: string | null) => workspace.orgs.find((o) => o.id === id)?.name ?? "";
  const items: MenuEntry[] = [];
  for (const o of workspace.orgs) {
    const ps = workspace.projects.filter((p) => p.org_id === o.id);
    if (!ps.length) continue;
    items.push({ label: o.name, heading: true, run: () => undefined });
    ps.forEach((p) => items.push({ label: p.name, hint: ROLE_NAME[p.role], current: p.id === projectId, run: () => { setProject(p.id); go({ kind: "home" }); } }));
  }
  items.push({ label: "", sep: true, run: () => undefined }, { label: "All organizations", icon: Building2, run: () => go({ kind: "orgs" }) });
  return (
    <div className="psw">
      <ActionMenu items={items} label="Switch project" className="psw-b" align="start" minW={240}>
        {cur ? <OrgTile name={cur.name} size={22} /> : <FolderKanban size={16} aria-hidden />}
        <span className="psw-t"><b>{cur?.name ?? "Choose a project"}</b><small>{orgName(cur?.org_id ?? null)}{cur ? ` · ${ROLE_NAME[cur.role]}` : ""}</small></span>
        <ChevronsUpDown size={14} aria-hidden style={{ color: "var(--tx4)" }} />
      </ActionMenu>
    </div>
  );
}

const ORGS_CSS = `
.psw{position:relative;margin:0 0 6px;font-family:var(--sans)}
.psw .psw-b{display:flex;align-items:center;gap:8px;width:100%;height:38px;padding:4px 8px;border:1px solid var(--line);border-radius:8px;background:var(--raise);color:var(--tx);cursor:pointer;text-align:left}
.psw .psw-b:hover{background:var(--hover)}.psw-t{display:flex;flex-direction:column;min-width:0;flex:1;line-height:1.2}.psw-t b{font:600 13px var(--sans);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.psw-t small{font:400 11.5px var(--sans);color:var(--tx4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.org-link{display:block;width:100%;padding:8px 10px;border-radius:10px;border:1px dashed var(--line2);background:#161513;font:500 12.5px var(--mono);word-break:break-all;color:var(--tx);margin:6px 0}
.signin{max-width:380px;margin:9vh auto 0;padding:22px;border:1px solid var(--line);border-radius:16px;background:var(--raise);display:flex;flex-direction:column;gap:12px;font-family:var(--sans)}
.signin h1{font:500 26px/1.15 var(--serif);color:var(--tx)}.signin label{display:flex;flex-direction:column;gap:4px;font:500 12px var(--sans);color:var(--tx3)}.signin .set-in{width:100%}
.dz{margin-top:26px;padding:14px;border:1px solid rgba(240,138,138,.3);border-radius:12px;background:rgba(240,138,138,.04)}
.dz h3{font:600 14px var(--sans);color:var(--bad);margin:0 0 4px}
.row2{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 12px;border:1px solid var(--line);border-radius:12px;background:var(--raise);margin-bottom:6px;font:400 13.5px var(--sans);color:var(--tx2)}
.row2 b{font-weight:500;color:var(--tx)}.row2 .sp{flex:1}
`;

function SignInCard({ title = "Sign in to your workspace", note }: { title?: string; note?: string }) {
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form className="signin enter" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setErr(await cloudSignIn(em, pw)); setBusy(false); setPw(""); }}>
      <style>{ORGS_CSS}</style>
      <h1>{title}</h1>
      <p className="meta" style={{ margin: 0 }}>{note ?? "Use the account that was created for you. People join an organization by invitation only."}</p>
      <label>Email<input className="set-in" type="email" autoComplete="username" required value={em} onChange={(e) => setEm(e.target.value)} /></label>
      <label>Password<input className="set-in" type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></label>
      {err && <p className="banner" data-k="conflict" role="alert" style={{ margin: 0 }}>{err}</p>}
      <button type="submit" className="btn btn-primary" style={{ height: 34, justifyContent: "center" }} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

// "signed in and workspace loaded", "loading", or "needs sign-in", for every screen that needs the account
function useGate(): "off" | "loading" | "signin" | "ready" {
  const { workspace, cloudState } = useStore(useShallow((s) => ({ workspace: s.workspace, cloudState: s.cloudState })));
  const [has, setHas] = useState<boolean | null>(null);
  useEffect(() => { if (supabase) void supabase.auth.getSession().then(({ data }) => setHas(!!data.session)); }, [cloudState]);
  if (!CLOUD_AVAILABLE) return "off";
  if (has === false) return "signin";
  if (has === null || !workspace) return "loading";
  return "ready";
}

interface OrgOverview {
  members: { user_id: string; email: string; role: string; since: string; projects: { project_id: string; name: string; role: string }[] }[];
  invites: { id: string; email: string; org_role: string; project_id: string | null; project: string | null; project_role: string | null; expires_at: string; created_at: string }[];
  projects: { id: string; slug: string; name: string; visibility: string }[];
  events: { action: string; at: string; detail: Record<string, unknown>; actor: string | null }[];
}
const EVENT_TEXT: Record<string, string> = { org_created: "created the organization", org_renamed: "renamed the organization", org_restored: "restored the organization", project_created: "created a project", project_restored: "restored a project", invite_created: "sent an invitation", invite_accepted: "accepted an invitation", invite_revoked: "revoked an invitation", org_role_changed: "changed an organization role", member_removed: "removed a member", left_org: "left the organization", project_role_set: "set a project role", project_access_removed: "removed project access" };

// ---------- invitation dialog (reachable from the organization page, the project page and the palette) ----------
function InviteDialog({ orgId, orgName, projects, project, isOwner, onClose, onDone }: { orgId: string; orgName: string; projects: { id: string; name: string }[]; project?: string; isOwner: boolean; onClose: () => void; onDone: () => void }) {
  const notify = useStore((s) => s.notify);
  const [f, setF] = useState({ email: "", project: project ?? "", projectRole: "viewer", orgRole: "member", days: "7" });
  const [link, setLink] = useState<{ url: string; email: string; mailed: boolean; note: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [mailReady, setMailReady] = useState<boolean | null>(null);
  const [sendMail, setSendMail] = useState(true);
  useEffect(() => { let off = false; void fetch("/api/invite").then((r) => (r.ok ? r.json() : { configured: false })).then((j) => { if (!off) setMailReady(!!j.configured); }).catch(() => { if (!off) setMailReady(false); }); return () => { off = true; }; }, []);
  const scopeOpts: Opt[] = [...(project ? [] : [{ value: "", label: "Organization only", hint: "No project yet" }]), ...projects.map((p) => ({ value: p.id, label: p.name }))];
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    const email = f.email.trim();
    const args = { p_org: orgId, p_project: f.project || null, p_email: email, p_org_role: f.orgRole, p_project_role: f.project ? dbProjectRole(f.projectRole) : null, p_days: Number(f.days) };
    if (mailReady && sendMail) {
      // the server creates the invitation with the caller's own rights and sends the email
      const { data: sess } = await supabase.auth.getSession();
      try {
        const r = await fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token ?? ""}` }, body: JSON.stringify({ org: orgId, project: f.project || null, email, orgRole: f.orgRole, projectRole: f.project ? dbProjectRole(f.projectRole) : null, days: Number(f.days) }) });
        const j = await r.json();
        setBusy(false);
        if (!r.ok || j.error) { notify(j.error ?? "Could not create the invitation"); return; }
        setLink({ url: j.link, email, mailed: !!j.mailed, note: j.mailed ? `An email with the link was sent to ${email}.` : j.reason === "limit" ? `${j.detail} The invitation was created: copy the link.` : "The invitation was created, but the email could not be sent. Copy the link or write the email yourself." });
        onDone();
        return;
      } catch { /* the email service is not reachable: fall back to creating the invitation directly */ }
    }
    const { data, error } = await supabase.rpc("create_invite", args);
    setBusy(false);
    if (error) { notify(error.message); return; }
    setLink({ url: inviteLink(data as string), email, mailed: false, note: mailReady === false ? "Email sending is not set up yet, so copy the link or press “Write an email”." : "Copy the link or press “Write an email”." });
    onDone();
  };
  const what = f.project ? projects.find((p) => p.id === f.project)?.name ?? "a project" : orgName;
  const mailto = link ? `mailto:${encodeURIComponent(link.email)}?subject=${encodeURIComponent(`You are invited to ${what}`)}&body=${encodeURIComponent(`You are invited to ${what}.\n\nOpen this link, sign in with this email address, and press Accept:\n${link.url}\n\nThe link works once and expires in ${f.days} day(s). If you were not expecting this, ignore this email.`)}` : "";
  return (
    <Modal title={link ? "Invitation ready" : "Invite someone"} onClose={onClose} width={540}>
      {!link ? (
        <form onSubmit={submit}>
          <div className="ai-form" style={{ gridTemplateColumns: "1fr" }}>
            <label>Email address<input className="set-in" type="email" required maxLength={254} placeholder="name@example.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
            {!project && projects.length > 0 && <label>Give access to<Select label="Give access to" value={f.project} onChange={(v) => setF({ ...f, project: v })} options={scopeOpts} /></label>}
            {f.project && <label>Role in the project<Select label="Role in the project" value={f.projectRole} onChange={(v) => setF({ ...f, projectRole: v })} options={PROJECT_ROLES} /></label>}
            {isOwner && !project && <label>Role in the organization<Select label="Role in the organization" value={f.orgRole} onChange={(v) => setF({ ...f, orgRole: v })} options={[{ value: "member", label: "Member", hint: "Sees invited projects only" }, { value: "admin", label: "Admin", hint: "Sees and manages every project" }]} /></label>}
            <label>Valid for<Select label="Valid for" value={f.days} onChange={(v) => setF({ ...f, days: v })} options={DAY_OPTS} /></label>
          </div>
          <label className="hist-all" style={{ marginTop: 6 }}><input type="checkbox" checked={mailReady === true && sendMail} disabled={mailReady !== true} onChange={(e) => setSendMail(e.target.checked)} /><span>{mailReady === true ? "Email the invitation now" : mailReady === null ? "Checking email…" : "Email is not set up yet: you will get a link to send"}</span></label>
          <div className="actions" style={{ marginTop: 14 }}>
            <button type="submit" className="btn btn-primary" disabled={busy || !f.email.trim()}>{busy ? "Creating…" : "Create invitation"}</button>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <p className="meta" style={{ color: "var(--tx2)", margin: 0 }}>{link.mailed ? <span className="chip ok" style={{ marginRight: 8 }}>Email sent</span> : null}{link.note} The link is shown only once.</p>
          <code className="org-link" aria-label="Invitation link">{link.url}</code>
          <div className="actions">
            <button type="button" className={`btn ${link.mailed ? "" : "btn-primary"}`} onClick={async () => notify((await copyText(link.url)) ? "Link copied" : "Could not copy")}><Copy size={14} aria-hidden />Copy link</button>
            <a className="btn" href={mailto}><Mail size={14} aria-hidden />Write an email</a>
            <button type="button" className="btn btn-ghost" onClick={() => { setLink(null); setF({ ...f, email: "" }); }}>Invite another</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Done</button>
          </div>
          <p className="meta" style={{ margin: 0 }}>The person must sign in with exactly this email address and press Accept. The link works once. Anyone with the link and that account can join, so send it privately.</p>
        </>
      )}
    </Modal>
  );
}

// ---------- root page: all organizations ----------
export function OrgsView() {
  const { workspace, notify, go } = useStore(useShallow((s) => ({ workspace: s.workspace, notify: s.notify, go: s.go })));
  const gate = useGate();
  const { ask, node } = useConfirm();
  const [q, setQ] = useState("");
  const [sort, setSort] = usePref("gf_org_sort", "name");
  const [roleF, setRoleF] = useState("all");
  const [view, setView] = usePref("gf_org_view", "grid");
  const [tab, setTab] = useState<"active" | "deleted">("active");
  const [dlg, setDlg] = useState<"new" | { rename: WsOrg } | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  if (gate === "off") return null;
  if (gate === "signin") return <SignInCard />;
  if (gate === "loading" || !workspace) return <div className="col enter"><p className="meta" role="status">Loading your organizations…</p></div>;
  const orgs = workspace.orgs.filter((o) => (!q.trim() || o.name.toLowerCase().includes(q.trim().toLowerCase()) || o.slug.includes(q.trim().toLowerCase())) && (roleF === "all" || o.role === roleF));
  orgs.sort((a, b) => sort === "newest" ? (b.created_at ?? "").localeCompare(a.created_at ?? "") : sort === "projects" ? (b.project_count ?? 0) - (a.project_count ?? 0) : a.name.localeCompare(b.name));
  const deleted = workspace.deleted_orgs;
  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string, undo?: () => void) => {
    const { error } = await fn();
    notify(error ? error.message : ok, error ? undefined : undo);
    await refreshAi();
    return !error;
  };
  const canManage = (o: WsOrg) => workspace.super || o.role === "owner";
  const del = async (o: WsOrg) => {
    if (!supabase) return;
    if (await ask({ title: `Delete “${o.name}”?`, body: <>Its {o.project_count ?? 0} project(s) are archived with it and nobody can open them. You can restore the organization from the Deleted tab until you delete it for good.</>, confirmLabel: "Delete organization", danger: true, type: o.name }))
      await run(() => supabase!.rpc("delete_org", { p_org: o.id }), `“${o.name}” deleted`, () => void supabase!.rpc("restore_org", { p_org: o.id }).then(() => refreshAi()));
  };
  const purge = async (o: WsDeletedOrg) => {
    if (!supabase) return;
    if (await ask({ title: `Delete “${o.name}” for good?`, body: <>All its projects, pages, people and invitations are removed permanently. This cannot be undone.</>, confirmLabel: "Delete for good", danger: true, type: o.name }))
      await run(() => supabase!.rpc("purge_org", { p_org: o.id }), "Deleted for good");
  };
  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !name.trim() || busy) return;
    setBusy(true);
    if (dlg && dlg !== "new") {
      const ok = await run(() => supabase!.rpc("rename_org", { p_org: dlg.rename.id, p_name: name.trim() }), "Renamed");
      setBusy(false); if (ok) setDlg(null);
      return;
    }
    const { data, error } = await supabase.rpc("create_org", { p_name: name.trim() });
    setBusy(false);
    if (error) { notify(error.message); return; }
    setDlg(null); await refreshAi(); notify("Organization created"); go({ kind: "org", id: data as string });
  };
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)", width: "min(1040px,100%)" }}>
      <style>{AI_CSS}{ORGS_CSS}</style>
      {node}
      <div className="ph">
        <div className="ph-l"><div><h1>Organizations</h1><p className="meta">Pick an organization to see its projects and people. Everything is invited-only.</p></div></div>
        <div className="ph-r">{workspace.super && <button type="button" className="btn btn-primary" onClick={() => { setName(""); setDlg("new"); }}><Plus size={14} aria-hidden />New organization</button>}</div>
      </div>
      {(deleted.length > 0) && <div className="tabs" role="tablist" aria-label="Organizations"><button type="button" role="tab" aria-selected={tab === "active"} onClick={() => setTab("active")}>Active<span className="chip">{workspace.orgs.length}</span></button><button type="button" role="tab" aria-selected={tab === "deleted"} onClick={() => setTab("deleted")}>Deleted<span className="chip">{deleted.length}</span></button></div>}
      {tab === "active" && (<>
        <div className="tb">
          <SearchField value={q} onChange={setQ} placeholder="Search organizations" />
          <Select label="Filter by role" width={150} value={roleF} onChange={setRoleF} options={[{ value: "all", label: "All roles" }, { value: "owner", label: "Owner" }, { value: "admin", label: "Admin" }, { value: "member", label: "Member" }]} />
          <Select label="Sort organizations" width={160} value={sort} onChange={setSort} options={[{ value: "name", label: "Name A–Z" }, { value: "newest", label: "Newest first" }, { value: "projects", label: "Most projects" }]} />
          <span className="sp" />
          <div className="seg" role="group" aria-label="Layout"><button type="button" aria-pressed={view === "grid"} aria-label="Cards" title="Cards" onClick={() => setView("grid")}><LayoutGrid size={14} aria-hidden /></button><button type="button" aria-pressed={view === "list"} aria-label="List" title="List" onClick={() => setView("list")}><Rows3 size={14} aria-hidden /></button></div>
        </div>
        {workspace.orgs.length === 0 && <EmptyState icon={Building2} title="No organization yet" text="You are not a member of an organization. Ask an owner to invite you, then open the invitation link."> {workspace.super && <button type="button" className="btn btn-primary" onClick={() => { setName(""); setDlg("new"); }}>Create the first organization</button>}</EmptyState>}
        {workspace.orgs.length > 0 && orgs.length === 0 && <EmptyState icon={Search} title="No organization matches" text="Try another word or clear the filters."><button type="button" className="btn" onClick={() => { setQ(""); setRoleF("all"); }}>Clear filters</button></EmptyState>}
        <div className="ocards" data-v={view}>
          {orgs.map((o) => (
            <article key={o.id} className="ocard">
              <div className="oc-top">
                <OrgTile name={o.name} />
                <button type="button" className="oc-main" onClick={() => go({ kind: "org", id: o.id })}>{o.name}</button>
                <ActionMenu label={`Actions for ${o.name}`} items={[
                  { label: "Open", icon: FolderOpen, run: () => go({ kind: "org", id: o.id }) },
                  ...(canManage(o) ? [{ label: "Rename", icon: Pencil, run: () => { setName(o.name); setDlg({ rename: o }); } }, { label: "", sep: true, run: () => undefined }, { label: "Delete…", icon: Trash2, danger: true, run: () => void del(o) }] : [])
                ]} />
              </div>
              <p className="oc-d">Address <span className="oc-slug">{o.slug}</span></p>
              <div className="oc-f"><span className="chip">{ROLE_NAME[o.role]}</span><span>{o.project_count ?? 0} project{o.project_count === 1 ? "" : "s"}</span>{o.members != null && <span>{o.members} member{o.members === 1 ? "" : "s"}</span>}{o.created_at && <span>since {fmtDay(o.created_at)}</span>}</div>
            </article>
          ))}
          {workspace.super && view === "grid" && <button type="button" className="ocard" data-new="true" onClick={() => { setName(""); setDlg("new"); }}><Plus size={20} aria-hidden /><span>New organization</span></button>}
        </div>
      </>)}
      {tab === "deleted" && (<>
        <p className="meta">Deleted organizations are kept until you delete them for good. Restoring brings back their projects too.</p>
        {deleted.map((o) => (
          <div key={o.id} className="row2"><OrgTile name={o.name} size={26} /><b>{o.name}</b><span className="meta" style={{ margin: 0 }}>deleted {fmtDay(o.deleted_at)}</span><span className="sp" />
            <button type="button" className="btn" onClick={() => void run(() => supabase!.rpc("restore_org", { p_org: o.id }), "Organization restored")}><RotateCcw size={14} aria-hidden />Restore</button>
            <button type="button" className="btn btn-danger" onClick={() => void purge(o)}>Delete for good…</button>
          </div>
        ))}
      </>)}
      {dlg && (
        <Modal title={dlg === "new" ? "New organization" : "Rename organization"} onClose={() => setDlg(null)} width={460}>
          <form onSubmit={submitNew}>
            <label className="meta" style={{ display: "block" }}>Name<input className="set-in" style={{ display: "block", width: "100%", marginTop: 4 }} required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></label>
            {dlg === "new" && <p className="meta">You become its owner. The address in links is made from the name.</p>}
            <div className="actions" style={{ marginTop: 12 }}><button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>{dlg === "new" ? "Create" : "Save"}</button><button type="button" className="btn" onClick={() => setDlg(null)}>Cancel</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------- one organization: projects, people, invitations, activity, settings ----------
export function OrgView({ id, tab: tabIn }: { id: string; tab?: string }) {
  const { workspace, notify, go, setProject } = useStore(useShallow((s) => ({ workspace: s.workspace, notify: s.notify, go: s.go, setProject: s.setProject })));
  const gate = useGate();
  const { ask, node } = useConfirm();
  const org = workspace?.orgs.find((o) => o.id === id);
  const isOrgAdmin = !!workspace && !!org && (workspace.super || org.role === "owner" || org.role === "admin");
  const isOwner = !!workspace && !!org && (workspace.super || org.role === "owner");
  const [ov, setOv] = useState<OrgOverview | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = usePref("gf_proj_sort", "name");
  const [visF, setVisF] = useState("all");
  const [view, setView] = usePref("gf_proj_view", "grid");
  const [dlg, setDlg] = useState<"invite" | "project" | null>(null);
  const [np, setNp] = useState({ name: "", description: "", visibility: "private" });
  const [pq, setPq] = useState("");
  const [roleF, setRoleF] = useState("all");
  const [rn, setRn] = useState("");
  const [showArch, setShowArch] = useState(false);
  const tab = ["projects", "people", "invitations", "activity", "settings"].includes(tabIn ?? "") ? (tabIn as string) : "projects";
  const load = useCallback(async () => {
    if (!supabase || !id || !isOrgAdmin) { setOv(null); return; }
    const { data, error } = await supabase.rpc("org_overview", { p_org: id });
    if (!error) setOv(data as OrgOverview);
  }, [id, isOrgAdmin]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (org) setRn(org.name); }, [org?.id, org?.name]); // eslint-disable-line react-hooks/exhaustive-deps
  if (gate === "off") return null;
  if (gate === "signin") return <SignInCard />;
  if (gate === "loading" || !workspace) return <div className="col enter"><p className="meta" role="status">Loading…</p></div>;
  if (!org) return <div className="col enter"><EmptyState icon={Building2} title="This organization is not available" text="It may have been deleted, or you are not a member."><button type="button" className="btn" onClick={() => go({ kind: "orgs" })}>All organizations</button></EmptyState></div>;

  const setTab = (t: string) => go({ kind: "org", id, tab: t === "projects" ? undefined : t });
  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string, undo?: () => void) => {
    const { error } = await fn();
    notify(error ? error.message : ok, error ? undefined : undo);
    await load(); void refreshAi();
    return !error;
  };
  const projects = workspace.projects.filter((p) => p.org_id === id);
  let shown = projects.filter((p) => (!q.trim() || `${p.name} ${p.description ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())) && (visF === "all" || p.visibility === visF));
  shown = [...shown].sort((a, b) => sort === "edited" ? (b.last_edit ?? b.created_at ?? "").localeCompare(a.last_edit ?? a.created_at ?? "") : sort === "newest" ? (b.created_at ?? "").localeCompare(a.created_at ?? "") : sort === "docs" ? (b.docs ?? 0) - (a.docs ?? 0) : a.name.localeCompare(b.name));
  const archived = workspace.archived_projects.filter((p) => p.org_id === id);
  const open = (p: WsProject) => { setProject(p.id); go({ kind: "home" }); };
  const archive = async (p: WsProject) => {
    if (!supabase) return;
    if (await ask({ title: `Archive “${p.name}”?`, body: <>The project disappears from the lists and nobody can open it. Pages and history are kept. You can restore it under “Archived” on this page.</>, confirmLabel: "Archive project", danger: true }))
      await run(() => supabase!.from("projects").update({ archived_at: new Date().toISOString() }).eq("id", p.id), `“${p.name}” archived`, () => void supabase!.rpc("restore_project", { p_project: p.id }).then(() => refreshAi()));
  };
  const purgeP = async (p: WsArchived) => {
    if (!supabase) return;
    if (await ask({ title: `Delete “${p.name}” for good?`, body: <>All its pages, history, tokens and people are removed permanently. This cannot be undone.</>, confirmLabel: "Delete for good", danger: true, type: p.name }))
      await run(() => supabase!.rpc("purge_project", { p_project: p.id }), "Deleted for good");
  };
  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !np.name.trim()) return;
    const { error } = await supabase.rpc("create_project", { p_org: id, p_name: np.name.trim(), p_description: np.description.trim(), p_visibility: np.visibility });
    if (error) { notify(error.message); return; }
    setNp({ name: "", description: "", visibility: "private" }); setDlg(null); notify("Project created"); await load(); await refreshAi();
  };
  const members = (ov?.members ?? []).filter((m) => (!pq.trim() || m.email.toLowerCase().includes(pq.trim().toLowerCase())) && (roleF === "all" || m.role === roleF));
  const removeMember = async (m: OrgOverview["members"][number]) => {
    if (!supabase) return;
    if (await ask({ title: `Remove ${m.email}?`, body: <>They lose access to the organization and to all its projects at once. They can be invited again later.</>, confirmLabel: "Remove", danger: true }))
      await run(() => supabase!.rpc("remove_org_member", { p_org: id, p_user: m.user_id }), "Member removed");
  };
  const leave = async () => {
    if (!supabase || !(await ask({ title: "Leave this organization?", body: <>You lose access to all its projects. An owner has to invite you again.</>, confirmLabel: "Leave", danger: true }))) return;
    const { data: u } = await supabase.auth.getUser();
    if (u.user && (await run(() => supabase!.rpc("remove_org_member", { p_org: id, p_user: u.user!.id }), "You left the organization"))) go({ kind: "orgs" });
  };
  const delOrg = async () => {
    if (!supabase || !(await ask({ title: `Delete “${org.name}”?`, body: <>Its {projects.length} project(s) are archived with it. You can restore the organization from the Deleted tab on the Organizations page.</>, confirmLabel: "Delete organization", danger: true, type: org.name }))) return;
    if (await run(() => supabase!.rpc("delete_org", { p_org: id }), `“${org.name}” deleted`)) go({ kind: "orgs" });
  };
  const tabs: { id: string; label: string; n?: number }[] = [{ id: "projects", label: "Projects", n: projects.length }, ...(isOrgAdmin ? [{ id: "people", label: "People", n: ov?.members.length }, { id: "invitations", label: "Invitations", n: ov?.invites.length }, { id: "activity", label: "Activity" }] : []), { id: "settings", label: "Settings" }];
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)", width: "min(1040px,100%)" }}>
      <style>{AI_CSS}{ORGS_CSS}</style>
      {node}
      <div className="ph">
        <div className="ph-l"><OrgTile name={org.name} size={44} /><div><h1>{org.name}</h1><p className="meta"><span className="chip">{ROLE_NAME[org.role]}</span> <span className="oc-slug">{org.slug}</span></p></div></div>
        <div className="ph-r">
          {isOrgAdmin && <button type="button" className="btn btn-primary" onClick={() => setDlg("invite")}><UserPlus size={14} aria-hidden />Invite</button>}
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Organization sections">
        {tabs.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}{t.n != null && t.n > 0 && <span className="chip">{t.n}</span>}</button>)}
      </div>

      {tab === "projects" && (<>
        <div className="tb">
          <SearchField value={q} onChange={setQ} placeholder="Search projects" />
          <Select label="Filter by visibility" width={150} value={visF} onChange={setVisF} options={[{ value: "all", label: "All visibility" }, ...VIS_OPTS.map((o) => ({ value: o.value, label: o.label }))]} />
          <Select label="Sort projects" width={170} value={sort} onChange={setSort} options={[{ value: "name", label: "Name A–Z" }, { value: "edited", label: "Last edited" }, { value: "newest", label: "Newest first" }, { value: "docs", label: "Most pages" }]} />
          <span className="sp" />
          <div className="seg" role="group" aria-label="Layout"><button type="button" aria-pressed={view === "grid"} aria-label="Cards" title="Cards" onClick={() => setView("grid")}><LayoutGrid size={14} aria-hidden /></button><button type="button" aria-pressed={view === "list"} aria-label="List" title="List" onClick={() => setView("list")}><Rows3 size={14} aria-hidden /></button></div>
          {isOrgAdmin && <button type="button" className="btn btn-primary" onClick={() => setDlg("project")}><Plus size={14} aria-hidden />New project</button>}
        </div>
        {projects.length === 0 && <EmptyState icon={FolderKanban} title={isOrgAdmin ? "Create your first project" : "No project yet"} text={isOrgAdmin ? "A project holds documents. Invite people to it with a role." : "You are not invited to any project of this organization yet. Ask a manager."}>{isOrgAdmin && <button type="button" className="btn btn-primary" onClick={() => setDlg("project")}>New project</button>}</EmptyState>}
        {projects.length > 0 && shown.length === 0 && <EmptyState icon={Search} title="No project matches" text="Try another word or clear the filters."><button type="button" className="btn" onClick={() => { setQ(""); setVisF("all"); }}>Clear filters</button></EmptyState>}
        <div className="ocards" data-v={view}>
          {shown.map((p) => (
            <article key={p.id} className="ocard">
              <div className="oc-top">
                <OrgTile name={p.name} />
                <button type="button" className="oc-main" onClick={() => open(p)}>{p.name}</button>
                <ActionMenu label={`Actions for ${p.name}`} items={[
                  { label: "Open", icon: FolderOpen, run: () => open(p) },
                  ...(p.role === "manager" ? [{ label: "Settings and people", icon: Settings, run: () => { setProject(p.id); go({ kind: "project" }); } }] : []),
                  ...(isOrgAdmin ? [{ label: "", sep: true, run: () => undefined }, { label: "Archive…", icon: Archive, danger: true, run: () => void archive(p) }] : [])
                ]} />
              </div>
              <p className="oc-d">{p.description || "No description."}</p>
              <div className="oc-f"><span className="chip">{ROLE_NAME[p.role]}</span><span className="chip">{p.visibility}</span><span>{p.docs ?? 0} page{p.docs === 1 ? "" : "s"}</span>{p.last_edit && <span>edited {ago(p.last_edit)}</span>}</div>
            </article>
          ))}
          {isOrgAdmin && view === "grid" && projects.length > 0 && <button type="button" className="ocard" data-new="true" onClick={() => setDlg("project")}><Plus size={20} aria-hidden /><span>New project</span></button>}
        </div>
        {isOrgAdmin && archived.length > 0 && (<>
          <button type="button" className="nav-g" style={{ marginTop: 18, width: "auto" }} aria-expanded={showArch} onClick={() => setShowArch(!showArch)}><ChevronDown size={14} aria-hidden />Archived<span className="n" style={{ marginLeft: 6 }}>{archived.length}</span></button>
          {showArch && archived.map((p) => (
            <div key={p.id} className="row2"><b>{p.name}</b><span className="meta" style={{ margin: 0 }}>archived {fmtDay(p.archived_at)}</span><span className="sp" />
              <button type="button" className="btn" onClick={() => void run(() => supabase!.rpc("restore_project", { p_project: p.id }), "Project restored")}><RotateCcw size={14} aria-hidden />Restore</button>
              <button type="button" className="btn btn-danger" onClick={() => void purgeP(p)}>Delete for good…</button>
            </div>
          ))}
        </>)}
      </>)}

      {tab === "people" && isOrgAdmin && (<>
        <div className="tb">
          <SearchField value={pq} onChange={setPq} placeholder="Search people" />
          <Select label="Filter by role" width={150} value={roleF} onChange={setRoleF} options={[{ value: "all", label: "All roles" }, { value: "owner", label: "Owner" }, { value: "admin", label: "Admin" }, { value: "member", label: "Member" }]} />
          <span className="sp" />
          <button type="button" className="btn btn-primary" onClick={() => setDlg("invite")}><UserPlus size={14} aria-hidden />Invite</button>
        </div>
        {!ov && <p className="meta" role="status">Loading people…</p>}
        {ov && members.length === 0 && <EmptyState icon={Users} title="No one matches" text="Try another name or clear the role filter." />}
        {members.map((m) => (
          <div key={m.user_id} className="row2">
            <OrgTile name={m.email} size={26} /><b>{m.email}</b>
            {isOwner ? <Select label={`Organization role of ${m.email}`} width={120} value={m.role} onChange={(v) => void run(() => supabase!.rpc("set_org_role", { p_org: id, p_user: m.user_id, p_role: v }), "Role changed")} options={[{ value: "owner", label: "Owner" }, { value: "admin", label: "Admin" }, { value: "member", label: "Member" }]} /> : <span className="chip">{ROLE_NAME[m.role]}</span>}
            {m.role === "member" && m.projects.length === 0 && <span className="meta" style={{ margin: 0 }}>no project access yet</span>}
            {m.projects.map((p) => <span key={p.project_id} className="chip">{p.name}: {ROLE_NAME[uiProjectRole(p.role)]}</span>)}
            <span className="sp" /><span className="meta" style={{ margin: 0 }}>since {fmtDay(m.since)}</span>
            <ActionMenu label={`Actions for ${m.email}`} items={[{ label: "Remove from organization…", icon: Trash2, danger: true, run: () => void removeMember(m) }]} />
          </div>
        ))}
      </>)}

      {tab === "invitations" && isOrgAdmin && (<>
        <div className="tb"><p className="meta" style={{ margin: 0 }}>Open invitations work once and expire by themselves.</p><span className="sp" /><button type="button" className="btn btn-primary" onClick={() => setDlg("invite")}><UserPlus size={14} aria-hidden />Invite</button></div>
        {ov && ov.invites.length === 0 && <EmptyState icon={Mail} title="No open invitations" text="Invite someone by email. They get a one-time link."><button type="button" className="btn btn-primary" onClick={() => setDlg("invite")}>Invite someone</button></EmptyState>}
        {ov?.invites.map((v) => (
          <div key={v.id} className="row2"><b>{v.email}</b><span className="chip">{v.project ? `${v.project}: ${ROLE_NAME[uiProjectRole(v.project_role)]}` : `Organization ${ROLE_NAME[v.org_role]}`}</span>
            <span className="meta" style={{ margin: 0 }}>expires {fmtDay(v.expires_at)}</span><span className="sp" />
            <button type="button" className="btn btn-danger" onClick={() => void run(() => supabase!.rpc("revoke_invite", { p_id: v.id }), "Invitation revoked")}>Revoke</button>
          </div>
        ))}
      </>)}

      {tab === "activity" && isOrgAdmin && (ov && ov.events.length > 0 ? (
        <table className="ai-tbl"><thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead>
          <tbody>{ov.events.map((e, i) => <tr key={i}><td>{ago(e.at)}</td><td>{e.actor ?? "someone"}</td><td>{EVENT_TEXT[e.action] ?? e.action}{typeof e.detail.email === "string" ? `: ${e.detail.email}` : ""}</td></tr>)}</tbody>
        </table>
      ) : <EmptyState icon={Activity} title="Nothing yet" text="Invitations, role changes and new projects show up here." />)}

      {tab === "settings" && (<>
        {isOwner && (
          <form onSubmit={(e) => { e.preventDefault(); if (supabase && rn.trim() && rn.trim() !== org.name) void run(() => supabase!.rpc("rename_org", { p_org: id, p_name: rn.trim() }), "Renamed"); }}>
            <div className="ai-form" style={{ gridTemplateColumns: "minmax(200px,380px)" }}><label>Organization name<input className="set-in" required maxLength={80} value={rn} onChange={(e) => setRn(e.target.value)} /></label></div>
            <button type="submit" className="btn btn-primary" disabled={!rn.trim() || rn.trim() === org.name}>Save name</button>
          </form>
        )}
        <p className="meta" style={{ marginTop: 12 }}>Address <span className="oc-slug">{org.slug}</span>{org.created_at ? ` · created ${fmtDay(org.created_at)}` : ""}</p>
        {!isOrgAdmin && <div className="dz"><h3>Leave this organization</h3><p className="meta">You lose access to all its projects. An owner has to invite you again.</p><button type="button" className="btn btn-danger" onClick={() => void leave()}>Leave…</button></div>}
        {isOwner && <div className="dz"><h3>Delete this organization</h3><p className="meta">Its projects are archived with it. You can restore it later from the Deleted tab on the Organizations page.</p><button type="button" className="btn btn-danger" onClick={() => void delOrg()}>Delete organization…</button></div>}
      </>)}

      {dlg === "invite" && isOrgAdmin && <InviteDialog orgId={id} orgName={org.name} projects={(ov?.projects ?? projects).map((p) => ({ id: p.id, name: p.name }))} isOwner={isOwner} onClose={() => setDlg(null)} onDone={() => void load()} />}
      {dlg === "project" && (
        <Modal title="New project" onClose={() => setDlg(null)} width={500}>
          <form onSubmit={createProject}>
            <div className="ai-form" style={{ gridTemplateColumns: "1fr" }}>
              <label>Project name<input className="set-in" required maxLength={120} value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} /></label>
              <label>Short description (optional)<input className="set-in" maxLength={500} value={np.description} onChange={(e) => setNp({ ...np, description: e.target.value })} /></label>
              <label>Visibility<Select label="Visibility" value={np.visibility} onChange={(v) => setNp({ ...np, visibility: v })} options={VIS_OPTS} /></label>
            </div>
            <div className="actions" style={{ marginTop: 12 }}><button type="submit" className="btn btn-primary" disabled={!np.name.trim()}>Create project</button><button type="button" className="btn" onClick={() => setDlg(null)}>Cancel</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ---------- project settings and people ----------
interface ProjectOverview { members: { user_id: string; email: string; org_role: string; role: string | null; implicit: boolean }[]; candidates: { user_id: string; email: string }[]; invites: { id: string; email: string; project_role: string; expires_at: string }[] }

export function ProjectView() {
  const { workspace, projectId, isManager, notify, go } = useStore(useShallow((s) => ({ workspace: s.workspace, projectId: s.projectId, isManager: s.isManager, notify: s.notify, go: s.go })));
  const { ask, node } = useConfirm();
  const cur = workspace?.projects.find((p) => p.id === projectId);
  const [f, setF] = useState({ name: "", description: "", visibility: "private" });
  const [ov, setOv] = useState<ProjectOverview | null>(null);
  const [add, setAdd] = useState({ user: "", role: "viewer" });
  const [dlg, setDlg] = useState(false);
  useEffect(() => { if (cur) setF({ name: cur.name, description: cur.description ?? "", visibility: cur.visibility }); }, [cur?.id, cur?.name, cur?.description, cur?.visibility]); // eslint-disable-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    if (!supabase || !projectId || !isManager) { setOv(null); return; }
    const { data, error } = await supabase.rpc("project_overview", { p_project: projectId });
    if (!error) setOv(data as ProjectOverview);
  }, [projectId, isManager]);
  useEffect(() => { void load(); }, [load]);
  if (!cur) return <div className="col enter"><EmptyState icon={FolderKanban} title="No project selected" text="Open an organization and choose a project."><button type="button" className="btn" onClick={() => go({ kind: "orgs" })}>Organizations</button></EmptyState></div>;
  const org = workspace?.orgs.find((o) => o.id === cur.org_id);

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
  const archive = async () => {
    if (!supabase || !(await ask({ title: `Archive “${cur.name}”?`, body: <>The project disappears from the lists and nobody can open it. Its content is kept; an organization owner or admin can restore it from the organization page.</>, confirmLabel: "Archive project", danger: true, type: cur.name }))) return;
    const { error } = await supabase.from("projects").update({ archived_at: new Date().toISOString() }).eq("id", cur.id);
    notify(error ? error.message : "Project archived"); if (!error) { try { window.localStorage.removeItem("gf_project"); } catch { /* ignore */ } useStore.setState({ projectId: "" }); void refreshAi(); go(cur.org_id ? { kind: "org", id: cur.org_id } : { kind: "orgs" }); }
  };
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)" }}>
      <style>{AI_CSS}{ORGS_CSS}</style>
      {node}
      <div className="ph">
        <div className="ph-l"><OrgTile name={cur.name} size={44} /><div><h1>{cur.name}</h1><p className="meta"><span className="chip">{ROLE_NAME[cur.role]}</span> <span className="chip">{cur.visibility}</span> <span className="oc-slug">{cur.slug}</span></p></div></div>
        <div className="ph-r">{isManager && org && <button type="button" className="btn btn-primary" onClick={() => setDlg(true)}><UserPlus size={14} aria-hidden />Invite</button>}</div>
      </div>
      {!isManager && <p className="meta">Only a project manager can change settings or people. Ask a manager for a different role.</p>}
      {isManager && (<>
        <h2 className="sec-h">Settings</h2>
        <form onSubmit={save}>
          <div className="ai-form">
            <label>Name<input className="set-in" required maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <label>Short description<input className="set-in" maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
            <label>Visibility<Select label="Visibility" value={f.visibility} onChange={(v) => setF({ ...f, visibility: v })} options={VIS_OPTS} /></label>
          </div>
          <button type="submit" className="btn btn-primary">Save</button>
        </form>
        <p className="meta" style={{ marginTop: 8 }}>The Trash timer is on the Trash page. AI tokens and the message for AI tools are under AI access.</p>

        <h2 className="sec-h">People with access</h2>
        {ov?.members.map((m) => (
          <div key={m.user_id} className="row2">
            <OrgTile name={m.email} size={26} /><b>{m.email}</b>
            {m.implicit ? <span className="chip" title="Organization owners and admins manage every project">{ROLE_NAME[m.org_role]} of the organization · Manager</span> : (
              <Select label={`Project role of ${m.email}`} width={130} value={uiProjectRole(m.role)} onChange={(v) => void setRole(m.user_id, dbProjectRole(v), "Role changed")} options={PROJECT_ROLES.map((o) => ({ value: o.value, label: o.label }))} />
            )}
            <span className="sp" />
            {!m.implicit && <button type="button" className="btn btn-danger" onClick={() => void setRole(m.user_id, null, "Access removed")}>Remove access</button>}
          </div>
        ))}
        {ov && ov.candidates.length > 0 && (
          <div className="tb">
            <Select label="Organization member to add" width={250} value={add.user} onChange={(v) => setAdd({ ...add, user: v })} placeholder="Add an organization member…" options={ov.candidates.map((c) => ({ value: c.user_id, label: c.email }))} />
            <Select label="Role to give" width={130} value={add.role} onChange={(v) => setAdd({ ...add, role: v })} options={PROJECT_ROLES.map((o) => ({ value: o.value, label: o.label }))} />
            <button type="button" className="btn" disabled={!add.user} onClick={() => { void setRole(add.user, dbProjectRole(add.role), "Access given"); setAdd({ ...add, user: "" }); }}>Give access</button>
          </div>
        )}
        {ov && ov.invites.length > 0 && <h2 className="sec-h">Open invitations</h2>}
        {ov?.invites.map((v) => (
          <div key={v.id} className="row2"><b>{v.email}</b><span className="chip">invited as {ROLE_NAME[uiProjectRole(v.project_role)]}</span><span className="meta" style={{ margin: 0 }}>expires {fmtDay(v.expires_at)}</span><span className="sp" />
            <button type="button" className="btn btn-danger" onClick={async () => { if (supabase) { const { error } = await supabase.rpc("revoke_invite", { p_id: v.id }); notify(error ? error.message : "Invitation revoked"); await load(); } }}>Revoke</button></div>
        ))}

        <div className="dz"><h3>Archive this project</h3><p className="meta">It disappears from the lists. Content is kept and an organization owner or admin can restore it.</p><button type="button" className="btn btn-danger" onClick={() => void archive()}>Archive project…</button></div>
      </>)}
      {dlg && org && <InviteDialog orgId={org.id} orgName={org.name} projects={[{ id: cur.id, name: cur.name }]} project={cur.id} isOwner={false} onClose={() => setDlg(false)} onDone={() => void load()} />}
    </div>
  );
}

export function JoinView({ token }: { token: string }) {
  const { cloudState, notify, setProject, go } = useStore(useShallow((s) => ({ cloudState: s.cloudState, notify: s.notify, setProject: s.setProject, go: s.go })));
  const gate = useGate();
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
  if (gate === "signin") return <SignInCard title="Sign in to accept the invitation" note="Use the email address the invitation was sent to. Nothing happens until you press Accept." />;
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)" }}>
      <style>{AI_CSS}{ORGS_CSS}</style>
      <h1 className="view-h">Invitation</h1>
      {gate === "off" && <p className="meta">Invitations need the online version of the app.</p>}
      {signedIn && pre === null && <p className="meta" role="status">Checking the invitation…</p>}
      {signedIn && pre && !pre.valid && <p className="banner" data-k="conflict" role="alert">This invitation is not valid any more. It may have been used, revoked or expired. Ask for a new one.</p>}
      {signedIn && pre?.valid && (
        <div className="trk">
          <p style={{ margin: "0 0 6px" }}>You are invited to <b>{pre.org}</b>{pre.project ? <> and the project <b>{pre.project}</b></> : null}.</p>
          <p className="meta">Role: {pre.project ? `${ROLE_NAME[uiProjectRole(pre.project_role)]} in the project` : `${ROLE_NAME[pre.org_role ?? "member"]} of the organization`}{pre.project && pre.org_role === "admin" ? ", organization admin" : ""}. Sent to {pre.email_hint}. Valid until {pre.expires_at ? fmtDay(pre.expires_at) : ""}.</p>
          {!pre.email_matches && <p className="banner" data-k="conflict" role="alert">You are signed in with a different email address than the one invited. Sign out and sign in with {pre.email_hint}.</p>}
          <div className="actions"><button type="button" className="btn btn-primary" disabled={busy || !pre.email_matches} onClick={() => void accept()}>{busy ? "Joining…" : "Accept invitation"}</button><button type="button" className="btn" onClick={() => go({ kind: "orgs" })}>Not now</button></div>
        </div>
      )}
    </div>
  );
}

// palette: find added pages by title or text (the database applies the access rules)
async function searchPages(projectId: string, q: string): Promise<{ ref: string; title: string }[]> {
  if (!supabase) return [];
  const safe = q.replace(/[%,()*\\_]/g, " ").trim();
  if (safe.length < 2) return [];
  const { data } = await supabase.from("docs").select("ref,title").eq("project_id", projectId).eq("source", "native").is("deleted_at", null).or(`title.ilike.%${safe}%,body.ilike.%${safe}%`).limit(8);
  return (data ?? []) as { ref: string; title: string }[];
}

// the documents of a project that are not generated from the spec data: cards with search and sort
export function NativePages({ projectId, canCreate }: { projectId: string; canCreate: boolean }) {
  const { go, liveTick } = useStore(useShallow((s) => ({ go: s.go, liveTick: s.liveTick })));
  const [pages, setPages] = useState<{ ref: string; title: string; updated_at: string }[] | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = usePref("gf_page_sort", "edited");
  useEffect(() => {
    if (!supabase || !projectId) return;
    let off = false;
    void supabase.from("docs").select("ref,title,updated_at").eq("project_id", projectId).eq("source", "native").is("deleted_at", null).order("updated_at", { ascending: false }).limit(200).then(({ data }) => { if (!off) setPages((data ?? []) as { ref: string; title: string; updated_at: string }[]); });
    return () => { off = true; };
  }, [projectId, liveTick]);
  if (pages === null) return null;
  let shown = pages.filter((p) => !q.trim() || p.title.toLowerCase().includes(q.trim().toLowerCase()));
  if (sort === "name") shown = [...shown].sort((a, b) => a.title.localeCompare(b.title));
  return (
    <section aria-label="Added pages">
      <style>{ORGS_CSS}</style>
      <div className="tb" style={{ marginTop: 22, marginBottom: 8 }}>
        <h2 className="sec-h" style={{ margin: 0 }}>Added pages</h2><span className="sp" />
        {pages.length > 6 && <SearchField value={q} onChange={setQ} placeholder="Search pages" width={200} />}
        {pages.length > 1 && <Select label="Sort pages" width={140} value={sort} onChange={setSort} options={[{ value: "edited", label: "Last edited" }, { value: "name", label: "Name A–Z" }]} />}
        <button type="button" className="btn" onClick={() => go({ kind: "pages" })}>{canCreate ? "Open pages" : "All pages"}</button>
      </div>
      {pages.length === 0 ? <EmptyState icon={FileText} title="No pages yet" text={canCreate ? "Create the first page, or let an AI tool propose one. Proposals wait in the Review inbox." : "Nothing has been added to this project yet."}>{canCreate && <button type="button" className="btn btn-primary" onClick={() => go({ kind: "pages" })}>Open pages</button>}</EmptyState> : (
        <div className="doccards">{shown.map((p) => <button key={p.ref} type="button" className="dcard" onClick={() => go({ kind: "pages", ref: p.ref })}><b>{p.title}</b><span>edited {ago(p.updated_at)}</span></button>)}</div>
      )}
    </section>
  );
}

// the home screen of a project that is not the specification: its role, shortcuts and pages
export function ProjectHome() {
  const { workspace, projectId, isAdmin, go } = useStore(useShallow((s) => ({ workspace: s.workspace, projectId: s.projectId, isAdmin: s.isAdmin, go: s.go })));
  const cur = workspace?.projects.find((p) => p.id === projectId);
  if (!cur) return <div className="col enter"><EmptyState icon={FolderKanban} title="Choose a project" text="Open an organization and pick one of its projects."><button type="button" className="btn btn-primary" onClick={() => go({ kind: "orgs" })}>Organizations</button></EmptyState></div>;
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)", width: "min(980px,100%)" }}>
      <style>{AI_CSS}{ORGS_CSS}</style>
      <div className="ph">
        <div className="ph-l"><OrgTile name={cur.name} size={44} /><div><h1>{cur.name}</h1><p className="meta">{cur.description || "No description."}</p></div></div>
        <div className="ph-r"><span className="chip">{ROLE_NAME[cur.role]}</span><span className="chip">{cur.visibility}</span></div>
      </div>
      <NativePages projectId={cur.id} canCreate={isAdmin} />
    </div>
  );
}
// #endregion
