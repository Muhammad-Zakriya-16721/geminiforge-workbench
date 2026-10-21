// #region 11. SHELL PIECES + VIEWS
const nowGreeting = () => {
  const h = new Date().getHours();
  return h >= 5 && h < 12 ? "Good morning" : h >= 12 && h < 18 ? "Good afternoon" : h >= 18 && h < 22 ? "Good evening" : "Hello, night owl";
};

const viewKey = (v: View) => (v.kind === "chapter" ? `chapter:${v.id}` : v.kind === "thread" ? `thread:${v.id}` : v.kind === "pages" ? `pages:${v.ref ?? ""}` : v.kind === "join" ? "join" : v.kind);

function pinInfo(key: string, threads: Thread[]): { title: string; run: () => void } | null {
  const st = useStore.getState();
  if (key.startsWith("chapter:")) {
    const c = CHAPTERS.find((x) => x.id === key.slice(8));
    return c ? { title: c.title, run: () => st.go({ kind: "chapter", id: c.id }) } : null;
  }
  if (key.startsWith("thread:")) {
    const t = threads.find((x) => x.id === key.slice(7));
    return t ? { title: t.title, run: () => st.go({ kind: "thread", id: t.id }) } : null;
  }
  const r = refFromKey(key);
  const pc = r ? paneContent(r) : null;
  return r && pc ? { title: pc.title, run: () => st.openPane(r) } : null;
}

function ThreadMenu({ thread, onClose, onRename }: { thread: Thread; onClose: () => void; onRename: () => void }) {
  const { patchThread, deleteThread, togglePin, pins, view, go, notify } = useStore(useShallow((s) => ({ patchThread: s.patchThread, deleteThread: s.deleteThread, togglePin: s.togglePin, pins: s.pins, view: s.view, go: s.go, notify: s.notify })));
  const ref = useRef<HTMLDivElement | null>(null);
  useOutside(ref, onClose, true);
  useMenuNav(ref);
  const key = `thread:${thread.id}`;
  const act = {
    p: () => togglePin(key),
    r: onRename,
    c: async () => { const ok = await copyText(window.location.href.split("#")[0] + toHash({ kind: "thread", id: thread.id }, null)); if (!ok) notify("Could not copy the link"); },
    a: () => { patchThread(thread.id, { archived: true }); notify("Question archived. Find it under All questions.", () => patchThread(thread.id, { archived: false })); if (view.kind === "thread" && view.id === thread.id) go({ kind: "home" }); },
    d: () => { deleteThread(thread.id); if (view.kind === "thread" && view.id === thread.id) go({ kind: "home" }); }
  };
  const run = (k: keyof typeof act) => { act[k](); onClose(); };
  return (
    <div className="menu" style={{ top: "100%", right: 4 }} ref={ref} role="menu" onKeyDown={(e) => { const k = e.key.toLowerCase(); if (k in act && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); run(k as keyof typeof act); } }}>
      <button type="button" role="menuitem" className="menu-i" onClick={() => run("p")}><span>{pins.includes(key) ? "Unpin" : "Pin"}</span><kbd>P</kbd></button>
      <button type="button" role="menuitem" className="menu-i" onClick={() => run("r")}><span>Rename</span><kbd>R</kbd></button>
      <button type="button" role="menuitem" className="menu-i" onClick={() => run("c")}><span>Copy link</span><kbd>C</kbd></button>
      <div className="menu-sep" />
      <button type="button" role="menuitem" className="menu-i" onClick={() => run("a")}><span>Archive</span><kbd>A</kbd></button>
      <button type="button" role="menuitem" className="menu-i del" onClick={() => run("d")}><span>Delete</span><kbd>D</kbd></button>
    </div>
  );
}

function ThreadNav({ thread, active }: { thread: Thread; active: boolean }) {
  const { go, patchThread } = useStore(useShallow((s) => ({ go: s.go, patchThread: s.patchThread })));
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(thread.title);
  if (renaming) {
    return (
      <div className="nav">
        <input className="field" style={{ width: "100%", height: 28 }} autoFocus aria-label="Rename thread" value={name} onChange={(e) => setName(e.target.value)}
          onBlur={() => { if (name.trim()) patchThread(thread.id, { title: name.trim() }); setRenaming(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setName(thread.title); setRenaming(false); } }} />
      </div>
    );
  }
  return (
    <div style={{ position: "relative" }} onContextMenu={(e) => { e.preventDefault(); setMenu(true); }}>
      <button type="button" className="nav" aria-current={active ? "page" : undefined} onClick={() => go({ kind: "thread", id: thread.id })}>
        <span className="nav-t">{thread.title}</span>
      </button>
      <button type="button" className="icon-btn nav-more" aria-label={`Actions for ${thread.title}`} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}><span aria-hidden>···</span></button>
      {menu && <ThreadMenu thread={thread} onClose={() => setMenu(false)} onRename={() => { setName(thread.title); setRenaming(true); }} />}
    </div>
  );
}

function initials(name: string) { const w = name.trim().split(/\s+/).filter(Boolean); return w.length ? (w[0][0] + (w[1]?.[0] ?? "")).toUpperCase() : "GF"; }

function ProfileMenu({ onClose }: { onClose: () => void }) {
  const { email, openSettings } = useStore(useShallow((s) => ({ email: s.cloudEmail, openSettings: s.openSettings })));
  const ref = useRef<HTMLDivElement | null>(null);
  useOutside(ref, onClose, true);
  useMenuNav(ref);
  const item = (label: string, kb: string | null, run: () => void, Icon?: React.ElementType, danger = false) => (
    <button type="button" role="menuitem" className={`menu-i ${danger ? "del" : ""}`} onClick={() => { onClose(); run(); }}><span className="mi-l">{Icon && <Icon size={15} aria-hidden />}{label}</span>{kb && <kbd>{kb}</kbd>}</button>
  );
  return (
    <div className="menu up pm" ref={ref} role="menu" aria-label="Account">
      <div className="menu-e">{email || "Not signed in"}</div>
      <div className="menu-sep" />
      {item("Settings", "Ctrl+,", () => openSettings("general"), Settings)}
      {item("Features and help", null, () => openSettings("features"), CircleHelp)}
      {item("Keyboard shortcuts", null, () => openSettings("shortcuts"), Keyboard)}
      {item("Release notes", null, () => openSettings("about"), Info)}
      <div className="menu-sep" />
      {item("Export backup", null, () => { exportBackup(); }, Download)}
      {item("Import backup", null, () => useStore.getState().setImportOpen(true), Upload)}
      {CLOUD_AVAILABLE && <div className="menu-sep" />}
      {CLOUD_AVAILABLE && (email ? item("Sign out", null, () => { void cloudSignOut().then(() => useStore.getState().go({ kind: "orgs" })); }, LogOut) : item("Sign in", null, () => useStore.getState().go({ kind: "orgs" }), LogOut))}
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick, badge, dim }: { icon?: React.ElementType; label: string; active?: boolean; onClick: () => void; badge?: React.ReactNode; dim?: boolean }) {
  return (
    <button type="button" className="nav" aria-current={active ? "page" : undefined} onClick={onClick}>
      {Icon && <Icon size={15} aria-hidden />}<span className={`nav-t ${dim ? "dim" : ""}`}>{label}</span>{badge}
    </button>
  );
}

// a collapsible group of sidebar items; the choice is remembered
function NavGroup({ id, label, count, dflt = true, force = false, children }: { id: string; label: string; count?: number; dflt?: boolean; force?: boolean; children: React.ReactNode }) {
  const open = useStore((s) => s.open[`sb:${id}`] ?? dflt);
  const toggle = useStore((s) => s.toggleOpen);
  const shown = open || force;
  return (
    <>
      <button type="button" className="nav-g" aria-expanded={shown} onClick={() => toggle(`sb:${id}`, dflt)}><ChevronDown size={12} aria-hidden />{label}{count != null && count > 0 && <span className="n">{count}</span>}</button>
      {shown && children}
    </>
  );
}

export function Sidebar() {
  const spec = useSpecVisible();
  const { view, go, setProject, pins, threads, sidebarOpen, set, menu, setMenu, tracker, name, email, isAdmin, isManager, projectId, workspace, inboxCount, trashCount } = useStore(useShallow((s) => ({ setProject: s.setProject, isManager: s.isManager, projectId: s.projectId, workspace: s.workspace, isAdmin: s.isAdmin, inboxCount: s.inboxCount, trashCount: s.trashCount, view: s.view, go: s.go, pins: s.pins, threads: s.threads, sidebarOpen: s.sidebarOpen, set: s.set, menu: s.menu, setMenu: s.setMenu, tracker: s.tracker, name: s.name, email: s.cloudEmail })));
  const [allRecents, setAllRecents] = useState(false);
  const live = threads.filter((t) => !t.archived).sort((a, b) => b.at - a.at);
  const recents = allRecents ? live.slice(0, 25) : live.slice(0, 5);
  const pinned = pins.map((k) => ({ k, info: pinInfo(k, threads) })).filter((x) => x.info);
  const done = DEEP_PROMPTS.filter((p) => tracker[p.id]?.status === "done").length;
  const cur = viewKey(view);
  const inProject = !["orgs", "org", "join"].includes(view.kind);
  const who = name || (email ? email.split("@")[0] : "GeminiForge V20");
  const tag = !CLOUD_AVAILABLE ? "Local" : workspace?.super ? "Owner" : email ? "Member" : "Signed out";
  return (
    <nav className="side" aria-label="Primary" ref={inertRef(!sidebarOpen)}>
      <div className="side-in">
        <div className="side-top">
          <span className="brand"><i aria-hidden>✦</i>GeminiForge <span className="mono dim" style={{ fontSize: 12 }}>V20</span></span>
          <button type="button" className="icon-btn" aria-label="Collapse sidebar" title="Collapse sidebar (Ctrl B)" onClick={() => set({ sidebarOpen: false })}><PanelLeft size={17} aria-hidden /></button>
        </div>
        {inProject && projectId && <ProjectSwitcher />}
        <div className="side-scroll">
          {CLOUD_AVAILABLE && <NavItem icon={Building2} label="Organizations" active={view.kind === "orgs" || view.kind === "org"} onClick={() => go({ kind: "orgs" })} />}
          {!inProject && workspace && workspace.orgs.length > 0 && (
            <NavGroup id="orgs" label="Your organizations" count={workspace.orgs.length}>
              {workspace.orgs.map((o) => <NavItem key={o.id} icon={Building2} label={o.name} active={view.kind === "org" && view.id === o.id} onClick={() => go({ kind: "org", id: o.id })} />)}
            </NavGroup>
          )}
          {!inProject && workspace && workspace.projects.length > 0 && (
            <NavGroup id="allp" label="Projects" count={workspace.projects.length}>
              {workspace.projects.map((p) => <NavItem key={p.id} icon={FolderKanban} label={p.name} badge={<span className="small dim">{workspace.orgs.find((o) => o.id === p.org_id)?.name}</span>} onClick={() => { setProject(p.id); go({ kind: "home" }); }} />)}
            </NavGroup>
          )}
          {inProject && (<>
            <NavGroup id="proj" label="Project">
              <NavItem icon={House} label="Overview" active={view.kind === "home"} onClick={() => go({ kind: "home" })} />
              {spec && <NavItem icon={FolderKanban} label="Library" active={view.kind === "library"} onClick={() => go({ kind: "library" })} />}
              {spec && <NavItem icon={List} label="Tracker" active={view.kind === "tracker"} onClick={() => go({ kind: "tracker" })} badge={<span className="mono dim small">{done}/{DEEP_PROMPTS.length}</span>} />}
              {spec && <NavItem icon={ListChecks} label="Claims review" active={view.kind === "audit"} onClick={() => go({ kind: "audit" })} />}
              {projectId && <NavItem icon={FileText} label="Added pages" active={view.kind === "pages"} onClick={() => go({ kind: "pages" })} />}
            </NavGroup>
            {spec && (
              <NavGroup id="chap" label="Chapters" count={CHAPTERS.length} dflt={false} force={view.kind === "chapter"}>
                {CHAPTERS.map((c, i) => (
                  <button key={c.id} type="button" className="nav" aria-current={cur === `chapter:${c.id}` ? "page" : undefined} onClick={() => go({ kind: "chapter", id: c.id })} title={c.subtitle}>
                    <span className="nav-n" aria-hidden>{i + 1}</span><span className="nav-t">{c.title}</span>
                  </button>
                ))}
              </NavGroup>
            )}
            {spec && pinned.length > 0 && (
              <NavGroup id="pins" label="Pinned" count={pinned.length}>
                {pinned.map(({ k, info }) => <NavItem key={k} icon={Bookmark} label={info!.title} active={cur === k} onClick={() => info!.run()} />)}
              </NavGroup>
            )}
            {spec && (
              <NavGroup id="ask" label="Questions" count={live.length}>
                {recents.length === 0 && <p className="side-empty">Questions you ask are saved here.</p>}
                {recents.map((t) => <ThreadNav key={t.id} thread={t} active={cur === `thread:${t.id}`} />)}
                {live.length > 5 && !allRecents && <NavItem label={`Show more (${Math.min(live.length, 25) - 5})`} dim onClick={() => setAllRecents(true)} />}
                {threads.length > 0 && <NavItem label={`All questions (${threads.length})`} dim active={view.kind === "history"} onClick={() => go({ kind: "history" })} />}
              </NavGroup>
            )}
            {isAdmin && (
              <NavGroup id="rev" label="Review">
                <NavItem icon={Inbox} label="Review inbox" active={view.kind === "inbox"} onClick={() => go({ kind: "inbox" })} badge={inboxCount > 0 ? <span className="mono small acc" aria-label={`${inboxCount} waiting`}>{inboxCount}</span> : undefined} />
                <NavItem icon={Trash2} label="Trash" active={view.kind === "trash"} onClick={() => go({ kind: "trash" })} badge={trashCount > 0 ? <span className="mono small dim" aria-label={`${trashCount} in the Trash`}>{trashCount}</span> : undefined} />
              </NavGroup>
            )}
            {isManager && (
              <NavGroup id="man" label="Manage">
                <NavItem icon={KeyRound} label="AI access" active={view.kind === "access"} onClick={() => go({ kind: "access" })} />
                <NavItem icon={Settings} label="Settings and people" active={view.kind === "project"} onClick={() => go({ kind: "project" })} />
              </NavGroup>
            )}
          </>)}
        </div>
        <div className="side-foot">
          {menu && <ProfileMenu onClose={() => setMenu(false)} />}
          <button type="button" className="foot-btn" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            <span className="avatar" aria-hidden>{initials(who)}</span>
            <span className="fb-n">{who}</span>
            <span className="fb-p">{tag}</span>
            <ChevronDown size={14} aria-hidden className="chev" />
          </button>
        </div>
      </div>
    </nav>
  );
}

interface Crumb { label: string; go?: () => void; menu?: MenuEntry[]; menuLabel?: string }

function useCrumbs(): Crumb[] {
  const { view, workspace, projectId, threads, go, setProject } = useStore(useShallow((s) => ({ view: s.view, workspace: s.workspace, projectId: s.projectId, threads: s.threads, go: s.go, setProject: s.setProject })));
  const app: Crumb = { label: "GeminiForge V20", go: () => go(CLOUD_AVAILABLE ? { kind: "orgs" } : { kind: "home" }) };
  if (view.kind === "orgs") return [app, { label: "Organizations" }];
  if (view.kind === "join") return [app, { label: "Invitation" }];
  const orgMenu = (cur: string): MenuEntry[] => (workspace?.orgs ?? []).map((o) => ({ label: o.name, current: o.id === cur, run: () => go({ kind: "org", id: o.id }) }));
  if (view.kind === "org") {
    const o = workspace?.orgs.find((x) => x.id === view.id);
    return [app, { label: o?.name ?? "Organization", menu: workspace && workspace.orgs.length > 1 ? orgMenu(view.id) : undefined, menuLabel: "Switch organization" }];
  }
  const p = workspace?.projects.find((x) => x.id === projectId);
  const o = workspace?.orgs.find((x) => x.id === p?.org_id);
  const chapter = view.kind === "chapter" ? CHAPTERS.find((c) => c.id === view.id) : undefined;
  const thread = view.kind === "thread" ? threads.find((t) => t.id === view.id) : undefined;
  const page = chapter ? `${chapter.num} · ${chapter.title}` : thread ? thread.title : ({ library: "Library", tracker: "Tracker", history: "All questions", audit: "Claims review", pages: "Added pages", trash: "Trash", inbox: "Review inbox", access: "AI access", project: "Settings and people" } as Record<string, string>)[view.kind];
  const out: Crumb[] = [app];
  if (p && o) {
    out.push({ label: o.name, go: () => go({ kind: "org", id: o.id }), menu: workspace!.orgs.length > 1 ? orgMenu(o.id) : undefined, menuLabel: "Switch organization" });
    out.push({ label: "Projects", go: () => go({ kind: "org", id: o.id }) });
    const sibs = workspace!.projects.filter((x) => x.org_id === o.id);
    out.push({ label: p.name, go: page ? () => go({ kind: "home" }) : undefined, menu: sibs.length > 1 ? sibs.map((x) => ({ label: x.name, current: x.id === p.id, run: () => { setProject(x.id); go({ kind: "home" }); } })) : undefined, menuLabel: "Switch project" });
  }
  if (page) out.push({ label: page });
  return out;
}

export function Header() {
  const { view, sidebarOpen, set, setPalette, pins, togglePin, threads, isAdmin, inboxCount, go, notify, openSettings } = useStore(useShallow((s) => ({ view: s.view, sidebarOpen: s.sidebarOpen, set: s.set, setPalette: s.setPalette, pins: s.pins, togglePin: s.togglePin, threads: s.threads, isAdmin: s.isAdmin, inboxCount: s.inboxCount, go: s.go, notify: s.notify, openSettings: s.openSettings })));
  const crumbs = useCrumbs();
  const spec = useSpecVisible();
  const chapter = view.kind === "chapter" ? CHAPTERS.find((c) => c.id === view.id) : undefined;
  const thread = view.kind === "thread" ? threads.find((t) => t.id === view.id) : undefined;
  const key = viewKey(view);
  const pinnable = !!chapter || !!thread;
  const inProject = !["orgs", "org", "join"].includes(view.kind);
  return (
    <header className="top">
      {!sidebarOpen && <button type="button" className="icon-btn" aria-label="Open sidebar" title="Open sidebar (Ctrl B)" onClick={() => set({ sidebarOpen: true })}><PanelLeft size={17} aria-hidden /></button>}
      <nav aria-label="Breadcrumb" style={{ minWidth: 0 }}>
        <ol className="crumbs">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <li key={i}>
                {i > 0 && <span className="crumb-sep" aria-hidden><ChevronRight size={13} /></span>}
                {last ? <span className="crumb-cur" aria-current="page" title={c.label}>{c.label}</span> : c.go ? <button type="button" className="crumb-b" title={c.label} onClick={c.go}>{c.label}</button> : <span className="crumb-b" style={{ pointerEvents: "none" }}>{c.label}</span>}
                {c.menu && <ActionMenu items={c.menu} label={c.menuLabel ?? "Switch"} className="crumb-sw" icon={ChevronsUpDown} align="start" minW={220} />}
              </li>
            );
          })}
        </ol>
      </nav>
      <span className="top-sp" />
      <button type="button" className="tsearch" aria-label="Search" title="Search (Ctrl K)" onClick={() => setPalette(true)}><Search size={14} aria-hidden /><span>Search</span><kbd>Ctrl K</kbd></button>
      {isAdmin && inProject && <button type="button" className="icon-btn bell" aria-label={inboxCount > 0 ? `Review inbox, ${inboxCount} waiting` : "Review inbox"} title="Review inbox" onClick={() => go({ kind: "inbox" })}><Bell size={16} aria-hidden />{inboxCount > 0 && <span className="bd" aria-hidden>{inboxCount > 99 ? "99+" : inboxCount}</span>}</button>}
      {pinnable && <button type="button" className="icon-btn" aria-pressed={pins.includes(key)} aria-label={pins.includes(key) ? "Unpin" : "Pin"} title={pins.includes(key) ? "Unpin" : "Pin"} onClick={() => togglePin(key)}><Bookmark size={16} aria-hidden fill={pins.includes(key) ? "currentColor" : "none"} /></button>}
      <ActionMenu label="More" items={[
        { label: "Copy link to this page", icon: Link2, run: () => void copyText(window.location.href).then((ok) => notify(ok ? "Link copied" : "Could not copy the link")) },
        { label: "Print", icon: Printer, kbd: "Ctrl+P", run: () => window.print() },
        ...(spec && inProject ? [{ label: "Export workbook (.md)", icon: Download, run: () => { void exportFile("geminiforge_v20_workbook.md", buildMarkdown(), "text/markdown"); } }] : []),
        { label: "", sep: true, run: () => undefined },
        { label: sidebarOpen ? "Hide sidebar" : "Show sidebar", icon: PanelLeft, kbd: "Ctrl+B", run: () => set({ sidebarOpen: !sidebarOpen }) },
        { label: "Keyboard shortcuts", icon: Keyboard, run: () => openSettings("shortcuts") },
        { label: "Features and help", icon: CircleHelp, run: () => openSettings("features") }
      ]} />
    </header>
  );
}

export function OutlineRail({ sections, active, onGo }: { sections: Section[]; active: string; onGo: (id: string) => void }) {
  if (sections.length < 2) return null;
  return (
    <nav className="rail" aria-label="Chapter outline">
      <button type="button" className="rail-dash" aria-label="Show outline">
        {sections.map((s) => <i key={s.id} data-a={s.id === active} />)}
      </button>
      <div className="rail-pop">
        {sections.map((s) => (
          <button key={s.id} type="button" className="rail-i" aria-current={s.id === active} onClick={() => onGo(s.id)}><b aria-hidden /><span>{s.title}</span></button>
        ))}
      </div>
    </nav>
  );
}

export function HomeView({ onSubmit }: { onSubmit: (t: string) => void }) {
  const { projectId, isAdmin, last, threads, tracker, go, openPane, userName, notes, lastExport, backupNudge, set } = useStore(useShallow((s) => ({ projectId: s.projectId, isAdmin: s.isAdmin, last: s.last, threads: s.threads, tracker: s.tracker, go: s.go, openPane: s.openPane, userName: s.name, notes: s.notes, lastExport: s.lastExport, backupNudge: s.backupNudge, set: s.set })));
  const greeting = useMemo(nowGreeting, []);
  const nextPrompt = DEEP_PROMPTS.find((p) => (tracker[p.id]?.status ?? "todo") !== "done");
  const lastChapter = last.kind === "chapter" ? CHAPTERS.find((c) => c.id === last.id) : undefined;
  const lastThread = threads.filter((t) => !t.archived).sort((a, b) => b.at - a.at)[0];
  const items: { icon: React.ReactNode; title: string; sub: string; run: () => void }[] = [];
  if (lastChapter) items.push({ icon: <BookOpen size={18} aria-hidden />, title: `Continue: ${lastChapter.title}`, sub: `Chapter ${lastChapter.num}`, run: () => go({ kind: "chapter", id: lastChapter.id }) });
  if (nextPrompt) items.push({ icon: <FileText size={18} aria-hidden />, title: `Next prompt to run: ${nextPrompt.id}`, sub: nextPrompt.title, run: () => { go({ kind: "tracker" }); openPane({ kind: "prompt", id: nextPrompt.id }); } });
  if (lastThread) items.push({ icon: <Sparkles size={18} aria-hidden />, title: lastThread.title, sub: "Recent question", run: () => go({ kind: "thread", id: lastThread.id }) });
  return (
    <div className="home enter">
      <h1 className="greet"><Sparkles size={34} aria-hidden /><span>{greeting}{userName.trim() ? `, ${userName.trim()}` : ""}</span></h1>
      <Composer placeholder="Ask about the architecture, or type / for commands" onSubmit={onSubmit} autoFocus />
      {(threads.length > 0 || notes.length > 0 || Object.keys(tracker).length > 0) && Date.now() > backupNudge && Date.now() - lastExport > 864e5 && (
        <div className="banner" data-k="info" role="note">
          <span>Your questions, notes and tracker are kept only in this browser session. In Gemini Canvas they can be gone after a reload, so export a backup now and then.</span>
          <span className="actions" style={{ margin: 0 }}>
            <button type="button" className="btn" onClick={exportBackup}>Export backup</button>
            <button type="button" className="btn btn-ghost" onClick={() => set({ backupNudge: Date.now() + 3 * 864e5 })}>Remind me later</button>
          </span>
        </div>
      )}
      {threads.length === 0 && notes.length === 0 && Object.keys(tracker).length === 0 && Date.now() > backupNudge && (
        <div className="banner" data-k="info" role="note">
          <span>Nothing is saved in this session yet. If you have a backup file from before, restore it.</span>
          <span className="actions" style={{ margin: 0 }}>
            <button type="button" className="btn" onClick={() => useStore.getState().setImportOpen(true)}>Restore a backup</button>
            <button type="button" className="btn btn-ghost" onClick={() => set({ backupNudge: Date.now() + 3 * 864e5 })}>Hide</button>
          </span>
        </div>
      )}
      <div className="try" aria-label="Example questions">
        {["How many packs are there?", "What does forge-db depend on?", "Which packs need Tier B?", "What is the largest pack?"].map((x) => (
          <button key={x} type="button" className="chipbtn" onClick={() => onSubmit(x)}>{x}</button>
        ))}
      </div>
      <section aria-label="Documents">
        <h2 className="sec-h" style={{ marginTop: 30 }}>Documents</h2>
        <div className="doccards">
          {CHAPTERS.map((c) => (
            <button key={c.id} type="button" className="dcard" onClick={() => go({ kind: "chapter", id: c.id })}><span className="dn">Chapter {c.num}</span><b>{c.title}</b><span>{c.subtitle}</span></button>
          ))}
        </div>
      </section>
      {projectId && <NativePages projectId={projectId} canCreate={isAdmin} />}
      {items.length > 0 && (
        <section aria-label="Jump back in">
          <h2 className="jb-h">Jump back in</h2>
          {items.map((it) => (
            <button key={it.title} type="button" className="jb" onClick={it.run}>
              <span className="jb-i">{it.icon}</span>
              <span><span className="jb-t" style={{ display: "block" }}>{it.title}</span><span className="jb-s">{it.sub}</span></span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}

function Sources({ keys }: { keys: string[] }) {
  const [open, setOpen] = useState(false);
  const infos = [...new Set(keys)].map((k) => ({ k, info: sourceInfo(k) })).filter((x) => x.info);
  if (!infos.length) return null;
  return (
    <div className="srcs">
      <button type="button" className="srcs-b" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>Used {infos.length} {infos.length === 1 ? "source" : "sources"}</span><ChevronRight size={14} aria-hidden style={{ transform: open ? "rotate(90deg)" : "none" }} />
      </button>
      {open && <ul className="srcs-l">{infos.map(({ k, info }) => <li key={k}><button type="button" onClick={() => info!.run()}>{info!.title}</button></li>)}</ul>}
    </div>
  );
}

function AnswerView({ a }: { a: Answer }) {
  return (
    <div className="ans" data-status={a.status ?? "exact"}>
      {a.understood && <p className="ans-u"><span>Understood as:</span> {a.understood}</p>}
      {a.blocks.map((b, i) => {
        if (b.t === "p") return <p key={i} className="ans-p"><Inline text={b.text} /></p>;
        if (b.t === "code") return <CodeBlock key={i} code={b.code} lang={b.lang} />;
        if (b.t === "kv") return <dl key={i} className="ans-kv">{b.rows.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>;
        return (
          <div key={i} className="ans-items">
            {b.items.map((it) => (
              <button key={it.key + it.title} type="button" className="ans-item" onClick={() => sourceInfo(it.key)?.run()}>
                <span className="ans-t">{it.title}</span><span className="ans-s">{it.sub}</span>
              </button>
            ))}
          </div>
        );
      })}
      <Sources keys={a.sources} />
    </div>
  );
}

export function ThreadView({ id, scroller }: { id: string; scroller: React.RefObject<HTMLDivElement | null> }) {
  const thread = useStore((s) => s.threads.find((t) => t.id === id));
  const go = useStore((s) => s.go);
  const reduced = useReduced();
  const n = thread?.turns.length ?? 0;
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [n, scroller, reduced]);
  if (!thread) {
    return (
      <div className="col enter">
        <h1 className="view-h">That question is gone</h1>
        <p className="meta">It may have been deleted or archived.</p>
        <button type="button" className="btn" onClick={() => go({ kind: "home" })}>Back to start</button>
      </div>
    );
  }
  return (
    <div className="col enter" role="log" aria-live="polite" aria-label="Conversation">
      <h1 className="sr">{thread.title}</h1>
      {thread.turns.map((t, i) =>
        t.role === "user" ? (
          <div key={t.id} className="turn-u"><div>{t.text}</div></div>
        ) : (
          <div key={t.id}>
            {t.answer ? <AnswerView a={t.answer} /> : <div className="turn-a">{t.text}</div>}
            <div className="turn-ac">
              <CopyBtn text={t.text} label="Copy" />
              <button type="button" className="btn btn-ghost" onClick={() => { useStore.getState().addNote(`thread:${thread.id}`, `${thread.turns[i - 1]?.text ?? ""}\n\n${t.text}`.trim()); useStore.getState().notify("Saved as a note. Find it in the Library."); }}>Save as note</button>
              {t.answer?.status !== "none" && <button type="button" className="btn btn-ghost" onClick={() => { useStore.getState().logMiss(thread.turns[i - 1]?.text ?? "", "reported"); useStore.getState().notify("Thanks. It is listed under Settings > Answer engine."); }}>Not what I meant</button>}
            </div>
          </div>
        )
      )}
    </div>
  );
}

export function LibraryView() {
  const openPane = useStore((s) => s.openPane);
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)" }}>
      <h1 className="view-h">Library</h1>
      <p className="meta">Every crate, pack, prompt, decision, patch, spike and lab in one place. Open an item in the side panel.</p>
      <section className="lib-g"><h2>Notes</h2><NotesList /></section>
      {GROUPS.filter((g) => g.id !== "chapter").map((g) => {
        const items = INDEX.filter((i) => i.group === g.id);
        return (
          <section key={g.id} className="lib-g">
            <h2>{g.label} <span className="chip">{items.length}</span></h2>
            <div className="grid2">
              {items.map((it) => (
                <button key={it.key} type="button" className="card card-btn" onClick={() => it.ref && openPane(it.ref)}>
                  <span className="card-t">{it.title}</span>
                  <span className="card-x">{it.sub}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const STATUS_LABEL: Record<PromptStatus, string> = { todo: "To do", running: "Running", done: "Done" };

const SPIKE_LABEL: Record<SpikeStatus, string> = { todo: "Not started", running: "Running", pass: "Passed", fail: "Failed" };

function SpikeTracker({ tabs }: { tabs: React.ReactNode }) {
  const { spikes, setSpike, openPane } = useStore(useShallow((s) => ({ spikes: s.spikes, setSpike: s.setSpike, openPane: s.openPane })));
  const count = (st: SpikeStatus) => PROTOTYPE_SPIKES.filter((x) => (spikes[x.id]?.status ?? "todo") === st).length;
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)" }}>
      <h1 className="view-h">Tracker</h1>
      {tabs}
      <p className="meta">{count("pass")} passed, {count("fail")} failed, {count("running")} running, {count("todo")} not started, out of {PROTOTYPE_SPIKES.length} prototype spikes. Saved in this browser.</p>
      {PROTOTYPE_SPIKES.map((sp) => {
        const e = spikes[sp.id] ?? { status: "todo" as SpikeStatus, note: "" };
        return (
          <div key={sp.id} className="trk">
            <div className="trk-top">
              <span className="trk-t">{sp.id}: {sp.target}</span>
              <div className="seg" role="group" aria-label={`Status of ${sp.id}`}>
                {(Object.keys(SPIKE_LABEL) as SpikeStatus[]).map((s) => <button key={s} type="button" aria-pressed={e.status === s} onClick={() => setSpike(sp.id, { status: s })}>{SPIKE_LABEL[s]}</button>)}
              </div>
            </div>
            <p className="meta" style={{ margin: 0 }}>A: {sp.candA} · B: {sp.candB} · Gate: {sp.gate}</p>
            <textarea aria-label={`Result notes for ${sp.id}`} placeholder="Measured result" value={e.note} onChange={(ev) => setSpike(sp.id, { note: ev.target.value })} />
            <div className="actions" style={{ margin: 0 }}><button type="button" className="btn" onClick={() => openPane({ kind: "spike", id: sp.id })}><Code2 size={14} aria-hidden /><span>Open spike</span></button></div>
          </div>
        );
      })}
    </div>
  );
}

export function TrackerView() {
  const { tracker, setTracker, openPane } = useStore(useShallow((s) => ({ tracker: s.tracker, setTracker: s.setTracker, openPane: s.openPane })));
  const [tab, setTab] = useState<"prompts" | "spikes">("prompts");
  const tabs = <div className="seg" role="group" aria-label="Tracker" style={{ marginBottom: 12 }}>{(["prompts", "spikes"] as const).map((t) => <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)}>{t === "prompts" ? "Research prompts" : "Prototype spikes"}</button>)}</div>;
  if (tab === "spikes") return <SpikeTracker tabs={tabs} />;
  const done = DEEP_PROMPTS.filter((p) => tracker[p.id]?.status === "done").length;
  const next = DEEP_PROMPTS.find((p) => (tracker[p.id]?.status ?? "todo") !== "done");
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)" }}>
      <h1 className="view-h">Tracker</h1>
      {tabs}
      <p className="meta">{done} of {DEEP_PROMPTS.length} prompts done. Statuses and notes are saved in this browser.</p>
      <div className="meter" role="img" aria-label={`${done} of ${DEEP_PROMPTS.length} done`} style={{ marginBottom: 16 }}><i style={{ width: `${pct(done, DEEP_PROMPTS.length)}%` }} /></div>
      {DEEP_PROMPTS.map((p) => {
        const e = tracker[p.id] ?? { status: "todo" as PromptStatus, note: "" };
        return (
          <div key={p.id} className="trk" data-next={next?.id === p.id}>
            <div className="trk-top">
              <span className="trk-t">{p.id}: {p.title}</span>
              <div className="seg" role="group" aria-label={`Status of ${p.id}`}>
                {(["todo", "running", "done"] as PromptStatus[]).map((s) => (
                  <button key={s} type="button" aria-pressed={e.status === s} onClick={() => setTracker(p.id, { status: s })}>{STATUS_LABEL[s]}</button>
                ))}
              </div>
            </div>
            <textarea aria-label={`Notes for ${p.id}`} placeholder="Result notes" value={e.note} onChange={(ev) => setTracker(p.id, { note: ev.target.value })} />
            <div className="actions" style={{ margin: 0 }}>
              <button type="button" className="btn" onClick={() => openPane({ kind: "prompt", id: p.id })}><Code2 size={14} aria-hidden /><span>Open prompt</span></button>
              <CopyBtn text={p.fullPrompt} label="Copy prompt" className="btn" />
              {next?.id === p.id && <span className="chip ok">Next to run</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type PalRow = { id: string; title: string; sub: string; group: string; sect: string; run: () => void };
const PAL_SCOPES: [string, string][] = [["all", "All"], ["docs", "Documents"], ["ask", "Questions"], ["notes", "Notes"], ["proj", "Projects"], ["act", "Actions"]];
const PAL_PREFIX: Record<string, string> = { ">": "act", "#": "docs", "@": "proj", "?": "act" };

export function Palette() {
  const { open, setPalette, go, openPane, set, motion: mm, resetAll, sidebarOpen, pane, threads, notes, contentRev, isAdmin, isManager, projectId, workspace, setProject, pins } = useStore(useShallow((s) => ({ isManager: s.isManager, projectId: s.projectId, workspace: s.workspace, setProject: s.setProject, pins: s.pins, contentRev: s.contentRev, isAdmin: s.isAdmin, open: s.palette, setPalette: s.setPalette, go: s.go, openPane: s.openPane, set: s.set, motion: s.motion, resetAll: s.resetAll, sidebarOpen: s.sidebarOpen, pane: s.pane, threads: s.threads, notes: s.notes })));
  const spec = useSpecVisible();
  const dlg = useRef<HTMLDialogElement | null>(null);
  const list = useRef<HTMLDivElement | null>(null);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState("all");
  const [sel, setSel] = useState(0);
  const [pageHits, setPageHits] = useState<{ ref: string; title: string }[]>([]);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) { setQ(""); setScope("all"); setSel(0); d.showModal(); }
    if (!open && d.open) d.close();
  }, [open]);

  const prefix = PAL_PREFIX[q[0] ?? ""];
  const sc = prefix ?? scope;
  const qq = (prefix ? q.slice(1) : q).trim();

  useEffect(() => {
    if (!open || !projectId || qq.length < 2) { setPageHits([]); return; }
    let off = false;
    const t = setTimeout(() => { void searchPages(projectId, qq).then((r) => { if (!off) setPageHits(r); }); }, 220);
    return () => { off = true; clearTimeout(t); };
  }, [open, projectId, qq]);

  const rows = useMemo(() => {
    const cur = workspace?.projects.find((p) => p.id === projectId);
    const curOrg = workspace?.orgs.find((o) => o.id === cur?.org_id);
    const R = (sect: string, id: string, title: string, sub: string, group: string, run: () => void): PalRow => ({ id, title, sub, group, sect, run });
    const actions: PalRow[] = [
      ...(CLOUD_AVAILABLE ? [R("Actions", "a-orgs", "Open organizations", "All your organizations", "Action", () => go({ kind: "orgs" }))] : []),
      ...(curOrg && (workspace?.super || curOrg.role === "owner" || curOrg.role === "admin") ? [R("Actions", "a-inv", "Invite someone", `To ${curOrg.name}`, "Action", () => go({ kind: "org", id: curOrg.id, tab: "invitations" })), R("Actions", "a-newp", "New project", `In ${curOrg.name}`, "Action", () => go({ kind: "org", id: curOrg.id }))] : []),
      ...(projectId ? [R("Actions", "a-new", spec ? "New question" : "Project overview", "Go to the project start page", "Action", () => go({ kind: "home" }))] : []),
      ...(spec ? [
        R("Actions", "a-lib", "Open library", "All crates, packs, prompts, patches and labs", "Action", () => go({ kind: "library" })),
        R("Actions", "a-trk", "Open tracker", "Prompts 01 to 14 and prototype spikes", "Action", () => go({ kind: "tracker" })),
        R("Actions", "a-his", "Open all questions", "Search, restore and delete saved questions", "Action", () => go({ kind: "history" })),
        R("Actions", "a-aud", "Open claims review", "Facts to re-check in the documentation", "Action", () => go({ kind: "audit" }))
      ] : []),
      ...(projectId ? [R("Actions", "a-pages", "Open added pages", "Pages you wrote or AI proposed", "Action", () => go({ kind: "pages" }))] : []),
      ...(isAdmin ? [
        R("Actions", "a-inbox", "Open the AI review inbox", "Edits proposed by AI tools, waiting for your decision", "Action", () => go({ kind: "inbox" })),
        R("Actions", "a-trash", "Open the Trash", "Deleted edits and pages, restore or delete for good", "Action", () => go({ kind: "trash" }))
      ] : []),
      ...(isManager ? [R("Actions", "a-access", "Open AI access", "Tokens, activity and the pause switch", "Action", () => go({ kind: "access" })), R("Actions", "a-proj", "Open project settings and people", "Name, visibility, who has access", "Action", () => go({ kind: "project" }))] : []),
      R("Actions", "a-sb", sidebarOpen ? "Collapse sidebar" : "Expand sidebar", "Ctrl B", "Action", () => set({ sidebarOpen: !sidebarOpen })),
      ...(pane ? [R("Actions", "a-pane", "Close side panel", "", "Action", () => openPane(null))] : []),
      R("Actions", "a-m1", "Animations: full motion", mm === "full" ? "Current setting" : "", "Action", () => set({ motion: "full" })),
      R("Actions", "a-m2", "Animations: reduced motion", mm === "reduced" ? "Current setting" : "", "Action", () => set({ motion: "reduced" })),
      R("Actions", "a-m3", "Animations: match system", mm === "system" ? "Current setting" : "", "Action", () => set({ motion: "system" })),
      R("Actions", "a-exj", "Export backup (.json)", "Pins, notes, tracker, questions, settings", "Action", () => { exportBackup(); }),
      ...(spec ? [R("Actions", "a-exm", "Export document (.md)", "Whole workbook as one Markdown file", "Action", () => { void exportFile("geminiforge_v20_workbook.md", buildMarkdown(), "text/markdown"); })] : []),
      R("Actions", "a-imp", "Import backup", "Replace data from a backup file", "Action", () => useStore.getState().setImportOpen(true)),
      R("Actions", "a-reset", "Reset saved data", "Erase pins, notes, tracker and questions", "Action", () => resetAll())
    ];
    const parts = qq.toLowerCase().split(/\s+/).filter(Boolean);
    const all = (t: string) => parts.every((w) => t.toLowerCase().includes(w));
    const projRows: PalRow[] = workspace ? [
      ...workspace.orgs.map((o) => R("Organizations and projects", `org:${o.id}`, o.name, `Organization · ${ROLE_NAME[o.role]}`, "Organization", () => go({ kind: "org", id: o.id }))),
      ...workspace.projects.map((p) => R("Organizations and projects", `proj:${p.id}`, p.name, `Project · ${workspace.orgs.find((o) => o.id === p.org_id)?.name ?? ""} · ${ROLE_NAME[p.role]}`, "Project", () => { setProject(p.id); go({ kind: "home" }); }))
    ] : [];
    const docRows: PalRow[] = spec ? searchIndex(qq).map((it) => R("Documents", it.key, it.title, it.sub, it.badge ?? "", () => { if (it.view) go(it.view); if (it.ref) openPane(it.ref); })) : [];
    const pageRows: PalRow[] = pageHits.map((h) => R("Added pages", `page:${h.ref}`, h.title, "Added page", "Page", () => go({ kind: "pages", ref: h.ref })));
    const askRows: PalRow[] = threads.filter((t) => all(`${t.title} ${t.turns.map((u) => u.text).join(" ")}`)).slice(0, 8).map((t) => R("Questions", `thread:${t.id}`, t.title, t.archived ? "Saved question (archived)" : "Saved question", "Question", () => go({ kind: "thread", id: t.id })));
    const noteRows: PalRow[] = notes.filter((n) => all(n.text)).slice(0, 8).map((n) => R("Notes", `note:${n.id}`, clip(n.text.replace(/\s+/g, " "), 70), `Note on ${sourceInfo(n.ref)?.title ?? n.ref}`, "Note", () => sourceInfo(n.ref)?.run()));
    if (!parts.length) {
      if (sc !== "all") {
        if (sc === "docs") return [...docRows.filter((f) => f.id.startsWith("chapter:") || f.id.startsWith("lab:")).slice(0, 14)];
        if (sc === "proj") return projRows;
        if (sc === "act") return actions;
        if (sc === "ask") return threads.slice(0, 20).map((t) => R("Questions", `thread:${t.id}`, t.title, "Saved question", "Question", () => go({ kind: "thread", id: t.id })));
        return notes.slice(0, 20).map((n) => R("Notes", `note:${n.id}`, clip(n.text.replace(/\s+/g, " "), 70), `Note on ${sourceInfo(n.ref)?.title ?? n.ref}`, "Note", () => sourceInfo(n.ref)?.run()));
      }
      const recentPins = pins.map((k) => ({ k, info: pinInfo(k, threads) })).filter((x) => x.info).slice(0, 3).map((x) => R("Recent", `pin:${x.k}`, x.info!.title, "Pinned", "Pinned", () => x.info!.run()));
      const recentThreads = threads.filter((t) => !t.archived).sort((a, b) => b.at - a.at).slice(0, 3).map((t) => R("Recent", `thread:${t.id}`, t.title, "Saved question", "Question", () => go({ kind: "thread", id: t.id })));
      return [...recentPins, ...recentThreads, ...projRows.slice(0, 6), ...docRows.filter((f) => f.id.startsWith("chapter:")).slice(0, 6), ...actions.slice(0, 6)];
    }
    const acts = actions.filter((a) => all(`${a.title} ${a.sub}`));
    const projHit = projRows.filter((r) => all(`${r.title} ${r.sub}`));
    if (sc === "docs") return [...pageRows, ...docRows.slice(0, 40)];
    if (sc === "ask") return askRows;
    if (sc === "notes") return noteRows;
    if (sc === "proj") return projHit;
    if (sc === "act") return acts;
    return [...projHit.slice(0, 4), ...pageRows, ...docRows.slice(0, 30), ...askRows.slice(0, 5), ...noteRows.slice(0, 5), ...acts].slice(0, 60);
  }, [qq, sc, go, openPane, set, mm, resetAll, sidebarOpen, pane, threads, notes, contentRev, isAdmin, isManager, projectId, workspace, setProject, pins, pageHits, spec]);

  useEffect(() => { setSel(0); }, [q, scope]);
  useEffect(() => { list.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" }); }, [sel]);

  const choose = (i: number) => { const r = rows[i]; if (!r) return; setPalette(false); r.run(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((i) => (rows.length ? (i + 1) % rows.length : 0)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0)); }
    else if (e.key === "Home") { e.preventDefault(); setSel(0); }
    else if (e.key === "End") { e.preventDefault(); setSel(Math.max(0, rows.length - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); choose(sel); }
    else if (e.key === "Backspace" && q === "" && scope !== "all") { e.preventDefault(); setScope("all"); }
  };

  return (
    <dialog ref={dlg} className="pal" aria-label="Search" onClose={() => setPalette(false)} onClick={(e) => { if (e.target === dlg.current) setPalette(false); }}>
      <div className="pal-in">
        <Search size={17} aria-hidden style={{ color: "var(--acc)" }} />
        <input role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" aria-activedescendant={rows[sel] ? `pal-${sel}` : undefined} aria-label="Search documents, questions, projects and actions" placeholder="Search, or type > actions  # documents  @ projects" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} autoFocus />
        <kbd>Esc</kbd>
      </div>
      <div className="pal-tabs" role="group" aria-label="Search in">
        {PAL_SCOPES.map(([id, label]) => <button key={id} type="button" aria-pressed={sc === id} onClick={() => { setScope(id); if (prefix) setQ(q.slice(1)); }}>{label}</button>)}
      </div>
      <div className="pal-list" id="pal-list" role="listbox" aria-label="Results" ref={list}>
        {rows.length === 0 && <p className="meta" style={{ padding: 16 }}>Nothing matches “{qq}”.</p>}
        {rows.map((r, i) => (
          <React.Fragment key={r.id}>
            {(i === 0 || rows[i - 1].sect !== r.sect) && <div className="pal-gh" aria-hidden>{r.sect}</div>}
            <div id={`pal-${i}`} data-i={i} role="option" aria-selected={i === sel} className="pal-i" onMouseMove={() => setSel(i)} onClick={() => choose(i)}>
              <div className="pal-t">{r.title}{r.sub && <small>{r.sub}</small>}</div>
              <span className="pal-g">{r.group}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
      <div className="pal-ft"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span aria-live="polite">{rows.length} results</span></div>
    </dialog>
  );
}
// #endregion
