// #region 11. SHELL PIECES + VIEWS
const nowGreeting = () => {
  const h = new Date().getHours();
  return h >= 5 && h < 12 ? "Good morning" : h >= 12 && h < 18 ? "Good afternoon" : h >= 18 && h < 22 ? "Good evening" : "Hello, night owl";
};

const viewKey = (v: View) => (v.kind === "chapter" ? `chapter:${v.id}` : v.kind === "thread" ? `thread:${v.id}` : v.kind);

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
  const { name, openSettings, setPalette } = useStore(useShallow((s) => ({ name: s.name, openSettings: s.openSettings, setPalette: s.setPalette })));
  const ref = useRef<HTMLDivElement | null>(null);
  useOutside(ref, onClose, true);
  useMenuNav(ref);
  const item = (label: string, kb: string | null, run: () => void, Icon?: React.ElementType) => (
    <button type="button" role="menuitem" className="menu-i" onClick={() => { onClose(); run(); }}><span style={{ display: "flex", alignItems: "center", gap: 10 }}>{Icon && <Icon size={15} aria-hidden />}{label}</span>{kb && <kbd>{kb}</kbd>}</button>
  );
  return (
    <div className="menu up" ref={ref} role="menu" style={{ minWidth: 250 }}>
      <div className="menu-id"><span className="avatar" aria-hidden>{initials(name)}</span><span><b>{name || "GeminiForge V20"}</b><span className="meta" style={{ margin: 0 }}>Saved in this browser</span></span></div>
      <div className="menu-sep" />
      {item("Settings", "Ctrl+,", () => openSettings("general"), Settings)}
      {item("Features and help", null, () => openSettings("features"), ListChecks)}
      {item("Keyboard shortcuts", null, () => openSettings("shortcuts"), Keyboard)}
      {item("Release notes", null, () => openSettings("about"), Info)}
      <div className="menu-sep" />
      {item("Search", "Ctrl+K", () => setPalette(true), Search)}
      {item("Export backup", null, () => { exportBackup(); }, Download)}
      {item("Import backup", null, () => useStore.getState().setImportOpen(true), Upload)}
    </div>
  );
}

export function Sidebar() {
  const { view, go, pins, threads, sidebarOpen, set, setPalette, menu, setMenu, tracker, name } = useStore(useShallow((s) => ({ view: s.view, go: s.go, pins: s.pins, threads: s.threads, sidebarOpen: s.sidebarOpen, set: s.set, setPalette: s.setPalette, menu: s.menu, setMenu: s.setMenu, tracker: s.tracker, name: s.name })));
  const recents = threads.filter((t) => !t.archived).sort((a, b) => b.at - a.at).slice(0, 25);
  const pinned = pins.map((k) => ({ k, info: pinInfo(k, threads) })).filter((x) => x.info);
  const done = DEEP_PROMPTS.filter((p) => tracker[p.id]?.status === "done").length;
  const cur = viewKey(view);
  return (
    <nav className="side" aria-label="Primary" ref={inertRef(!sidebarOpen)}>
      <div className="side-in">
        <div className="side-top">
          <span className="brand"><i aria-hidden>✦</i>GeminiForge <span className="mono dim" style={{ fontSize: 12 }}>V20</span></span>
          <button type="button" className="icon-btn" aria-label="Collapse sidebar" title="Collapse sidebar (Ctrl B)" onClick={() => set({ sidebarOpen: false })}><PanelLeft size={17} aria-hidden /></button>
        </div>
        <button type="button" className="side-search" onClick={() => setPalette(true)}><Search size={15} aria-hidden /><span>Search</span><kbd>Ctrl K</kbd></button>
        <div className="side-scroll">
          <button type="button" className="nav" aria-current={view.kind === "home" ? "page" : undefined} onClick={() => go({ kind: "home" })}><Plus size={16} aria-hidden /><span className="nav-t">New question</span></button>
          <button type="button" className="nav" aria-current={view.kind === "library" ? "page" : undefined} onClick={() => go({ kind: "library" })}><FolderKanban size={16} aria-hidden /><span className="nav-t">Library</span></button>
          <button type="button" className="nav" aria-current={view.kind === "tracker" ? "page" : undefined} onClick={() => go({ kind: "tracker" })}><List size={16} aria-hidden /><span className="nav-t">Tracker</span><span className="mono dim small">{done}/{DEEP_PROMPTS.length}</span></button>
          <button type="button" className="nav" aria-current={view.kind === "audit" ? "page" : undefined} onClick={() => go({ kind: "audit" })}><ListChecks size={16} aria-hidden /><span className="nav-t">Claims review</span></button>

          {pinned.length > 0 && <div className="side-sec">Pinned</div>}
          {pinned.map(({ k, info }) => (
            <button key={k} type="button" className="nav" aria-current={cur === k ? "page" : undefined} onClick={() => info!.run()}><Bookmark size={14} aria-hidden /><span className="nav-t">{info!.title}</span></button>
          ))}

          <div className="side-sec">Chapters</div>
          {CHAPTERS.map((c, i) => (
            <button key={c.id} type="button" className="nav" aria-current={cur === `chapter:${c.id}` ? "page" : undefined} onClick={() => go({ kind: "chapter", id: c.id })} title={c.subtitle}>
              <span className="nav-n" aria-hidden>{i + 1}</span><span className="nav-t">{c.title}</span>
            </button>
          ))}

          <div className="side-sec">Recents</div>
          {recents.length === 0 && <p className="side-empty">Questions you ask are saved here.</p>}
          {recents.map((t) => <ThreadNav key={t.id} thread={t} active={cur === `thread:${t.id}`} />)}
          {threads.length > 0 && <button type="button" className="nav" aria-current={view.kind === "history" ? "page" : undefined} onClick={() => go({ kind: "history" })}><span className="nav-t dim">All questions ({threads.length})</span></button>}
        </div>
        <div className="side-foot">
          {menu && <ProfileMenu onClose={() => setMenu(false)} />}
          <button type="button" className="foot-btn" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            <span className="avatar" aria-hidden>{initials(name)}</span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontWeight: 500 }}>{name || "GeminiForge V20"}</span><span className="meta" style={{ margin: 0 }}>Specification workbench</span></span>
            <ChevronDown size={15} aria-hidden style={{ transform: "rotate(180deg)", color: "var(--tx3)" }} />
          </button>
        </div>
      </div>
    </nav>
  );
}

export function Header() {
  const { view, sidebarOpen, set, setPalette, pins, togglePin, threads } = useStore(useShallow((s) => ({ view: s.view, sidebarOpen: s.sidebarOpen, set: s.set, setPalette: s.setPalette, pins: s.pins, togglePin: s.togglePin, threads: s.threads })));
  const chapter = view.kind === "chapter" ? CHAPTERS.find((c) => c.id === view.id) : undefined;
  const thread = view.kind === "thread" ? threads.find((t) => t.id === view.id) : undefined;
  const title = chapter ? `${chapter.num} · ${chapter.title}` : thread ? thread.title : view.kind === "library" ? "Library" : view.kind === "tracker" ? "Tracker" : view.kind === "history" ? "All questions" : view.kind === "audit" ? "Claims review" : "New question";
  const key = viewKey(view);
  const pinnable = !!chapter || !!thread;
  return (
    <header className="top">
      {!sidebarOpen && <button type="button" className="icon-btn" aria-label="Open sidebar" title="Open sidebar (Ctrl B)" onClick={() => set({ sidebarOpen: true })}><PanelLeft size={17} aria-hidden /></button>}
      <div className="crumb">
        <span className="crumb-p">GeminiForge V20</span><span className="crumb-s" aria-hidden>/</span><span className="crumb-t">{title}</span>
      </div>
      <span className="top-sp" />
      {pinnable && <button type="button" className="icon-btn" aria-pressed={pins.includes(key)} aria-label={pins.includes(key) ? "Unpin" : "Pin"} title={pins.includes(key) ? "Unpin" : "Pin"} onClick={() => togglePin(key)}><Bookmark size={16} aria-hidden fill={pins.includes(key) ? "currentColor" : "none"} /></button>}
      <button type="button" className="icon-btn" aria-label="Search" title="Search (Ctrl K)" onClick={() => setPalette(true)}><Search size={16} aria-hidden /></button>
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
  const { last, threads, tracker, go, openPane, userName, notes, lastExport, backupNudge, set } = useStore(useShallow((s) => ({ last: s.last, threads: s.threads, tracker: s.tracker, go: s.go, openPane: s.openPane, userName: s.name, notes: s.notes, lastExport: s.lastExport, backupNudge: s.backupNudge, set: s.set })));
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

export function Palette() {
  const { open, setPalette, go, openPane, set, motion: mm, resetAll, sidebarOpen, pane, threads, notes } = useStore(useShallow((s) => ({ open: s.palette, setPalette: s.setPalette, go: s.go, openPane: s.openPane, set: s.set, motion: s.motion, resetAll: s.resetAll, sidebarOpen: s.sidebarOpen, pane: s.pane, threads: s.threads, notes: s.notes })));
  const dlg = useRef<HTMLDialogElement | null>(null);
  const list = useRef<HTMLDivElement | null>(null);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) { setQ(""); setSel(0); d.showModal(); }
    if (!open && d.open) d.close();
  }, [open]);

  const rows = useMemo(() => {
    const actions: { id: string; title: string; sub: string; group: string; run: () => void }[] = [
      { id: "a-new", title: "New question", sub: "Go to the start page", group: "Action", run: () => go({ kind: "home" }) },
      { id: "a-lib", title: "Open library", sub: "All crates, packs, prompts, patches and labs", group: "Action", run: () => go({ kind: "library" }) },
      { id: "a-trk", title: "Open tracker", sub: "Prompts 01 to 14 and prototype spikes", group: "Action", run: () => go({ kind: "tracker" }) },
      { id: "a-his", title: "Open all questions", sub: "Search, restore and delete saved questions", group: "Action", run: () => go({ kind: "history" }) },
      { id: "a-aud", title: "Open claims review", sub: "Facts to re-check in the documentation", group: "Action", run: () => go({ kind: "audit" }) },
      { id: "a-sb", title: sidebarOpen ? "Collapse sidebar" : "Expand sidebar", sub: "Ctrl B", group: "Action", run: () => set({ sidebarOpen: !sidebarOpen }) },
      ...(pane ? [{ id: "a-pane", title: "Close side panel", sub: "", group: "Action", run: () => openPane(null) }] : []),
      { id: "a-m1", title: "Animations: full motion", sub: mm === "full" ? "Current setting" : "", group: "Action", run: () => set({ motion: "full" }) },
      { id: "a-m2", title: "Animations: reduced motion", sub: mm === "reduced" ? "Current setting" : "", group: "Action", run: () => set({ motion: "reduced" }) },
      { id: "a-m3", title: "Animations: match system", sub: mm === "system" ? "Current setting" : "", group: "Action", run: () => set({ motion: "system" }) },
      { id: "a-exj", title: "Export backup (.json)", sub: "Pins, notes, tracker, questions, settings", group: "Action", run: () => { exportBackup(); } },
      { id: "a-exm", title: "Export document (.md)", sub: "Whole workbook as one Markdown file", group: "Action", run: () => { void exportFile("geminiforge_v20_workbook.md", buildMarkdown(), "text/markdown"); } },
      { id: "a-imp", title: "Import backup", sub: "Replace data from a backup file", group: "Action", run: () => useStore.getState().setImportOpen(true) },
      { id: "a-reset", title: "Reset saved data", sub: "Erase pins, notes, tracker and questions", group: "Action", run: () => resetAll() }
    ];
    const parts = q.toLowerCase().split(/\s+/).filter(Boolean);
    const acts = actions.filter((a) => parts.every((p) => `${a.title} ${a.sub}`.toLowerCase().includes(p)));
    const found = searchIndex(q).map((it) => ({ id: it.key, title: it.title, sub: it.sub, group: it.badge ?? "", run: () => { if (it.view) go(it.view); if (it.ref) openPane(it.ref); } }));
    const mine = parts.length ? [
      ...threads.filter((t) => parts.every((w) => `${t.title} ${t.turns.map((u) => u.text).join(" ")}`.toLowerCase().includes(w))).slice(0, 5).map((t) => ({ id: `thread:${t.id}`, title: t.title, sub: t.archived ? "Saved question (archived)" : "Saved question", group: "Question", run: () => go({ kind: "thread", id: t.id }) })),
      ...notes.filter((n) => parts.every((w) => n.text.toLowerCase().includes(w))).slice(0, 5).map((n) => ({ id: `note:${n.id}`, title: clip(n.text.replace(/\s+/g, " "), 70), sub: `Note on ${sourceInfo(n.ref)?.title ?? n.ref}`, group: "Note", run: () => sourceInfo(n.ref)?.run() }))
    ] : [];
    return [...(parts.length ? found.slice(0, 40) : found.filter((f) => f.id.startsWith("chapter:") || f.id.startsWith("lab:")).slice(0, 12)), ...mine, ...acts].slice(0, 60);
  }, [q, go, openPane, set, mm, resetAll, sidebarOpen, pane, threads, notes]);

  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => { list.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" }); }, [sel]);

  const choose = (i: number) => { const r = rows[i]; if (!r) return; setPalette(false); r.run(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((i) => (rows.length ? (i + 1) % rows.length : 0)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0)); }
    else if (e.key === "Home") { e.preventDefault(); setSel(0); }
    else if (e.key === "End") { e.preventDefault(); setSel(Math.max(0, rows.length - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); choose(sel); }
  };

  return (
    <dialog ref={dlg} className="pal" aria-label="Search" onClose={() => setPalette(false)} onClick={(e) => { if (e.target === dlg.current) setPalette(false); }}>
      <div className="pal-in">
        <Search size={17} aria-hidden style={{ color: "var(--acc)" }} />
        <input role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" aria-activedescendant={rows[sel] ? `pal-${sel}` : undefined} aria-label="Search chapters, crates, packs, prompts and actions" placeholder="Search chapters, crates, packs, prompts, actions" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} autoFocus />
        <kbd>Esc</kbd>
      </div>
      <div className="pal-list" id="pal-list" role="listbox" aria-label="Results" ref={list}>
        {rows.length === 0 && <p className="meta" style={{ padding: 16 }}>Nothing matches “{q}”.</p>}
        {rows.map((r, i) => (
          <div key={r.id} id={`pal-${i}`} data-i={i} role="option" aria-selected={i === sel} className="pal-i" onMouseMove={() => setSel(i)} onClick={() => choose(i)}>
            <div className="pal-t">{r.title}{r.sub && <small>{r.sub}</small>}</div>
            <span className="pal-g">{r.group}</span>
          </div>
        ))}
      </div>
      <div className="pal-ft"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span>{rows.length} results</span></div>
    </dialog>
  );
}
// #endregion
