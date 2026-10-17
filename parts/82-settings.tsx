// #region 11b. SETTINGS / APP DOCS (Ctrl+,)
const TABS: { id: string; label: string; Icon: React.ElementType }[] = [
  { id: "general", label: "General", Icon: SlidersHorizontal },
  { id: "features", label: "Features", Icon: ListChecks },
  { id: "shortcuts", label: "Shortcuts", Icon: Keyboard },
  { id: "answers", label: "Answer engine", Icon: MessageSquare },
  { id: "labs", label: "Labs", Icon: FlaskConical },
  ...(CLOUD_AVAILABLE ? [{ id: "sync", label: "Sync", Icon: Cloud }] : []),
  { id: "data", label: "Data", Icon: Database },
  { id: "about", label: "About", Icon: Info }
];

function Keys({ keys }: { keys: string }) {
  return (
    <span className="keys">
      {keys.split(" / ").map((alt, i) => (
        <span key={i}>{i > 0 && <i> or </i>}{alt.split("+").map((k, j) => <span key={j}>{j > 0 && <i>+</i>}<kbd>{k}</kbd></span>)}</span>
      ))}
    </span>
  );
}

function Setting({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="set-row">
      <div className="set-l"><div className="set-t">{label}</div>{desc && <div className="set-d">{desc}</div>}</div>
      <div className="set-c">{children}</div>
    </div>
  );
}

function Pick<T extends string>({ label, value, opts, onChange }: { label: string; value: T; opts: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {opts.map((o) => <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>{o.label}</button>)}
    </div>
  );
}

function FeatureList({ items, run }: { items: Feature[]; run: (a: FeatAction) => void }) {
  const groups = Array.from(new Set(items.map((f) => f.group)));
  return (
    <>
      {groups.map((g) => (
        <section key={g} aria-label={g}>
          <h3 className="set-h">{g}</h3>
          {items.filter((f) => f.group === g).map((f) => (
            <div className="feat" key={f.name}>
              <div className="feat-t">{f.name}{f.act && <button type="button" className="btn" onClick={() => run(f.act!.to)}>{f.act.label}</button>}</div>
              <p className="feat-d">{f.desc}</p>
              <p className="feat-h"><b>How:</b> {f.how}</p>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

function ShortcutTable({ items }: { items: typeof SHORTCUTS }) {
  return (
    <table className="sc">
      <thead><tr><th>Keys</th><th>Does</th><th>Where</th></tr></thead>
      <tbody>{items.map((s, i) => <tr key={i}><td><Keys keys={s.keys} /></td><td>{s.what}</td><td className="dim">{s.where}</td></tr>)}</tbody>
    </table>
  );
}

export function SettingsDialog({ onAsk }: { onAsk: (q: string) => void }) {
  const st = useStore(useShallow((s) => ({ tab: s.settings, close: s.closeSettings, open: s.openSettings, set: s.set, motion: s.motion, depth: s.depth, textSize: s.textSize, width: s.width, font: s.font, name: s.name, misses: s.misses, smart: s.smart, smartState: s.smartState, smartMsg: s.smartMsg, lastExport: s.lastExport, pins: s.pins, notes: s.notes, tracker: s.tracker, threads: s.threads, resetAll: s.resetAll, go: s.go, openPane: s.openPane })));
  const dlg = useRef<HTMLDialogElement | null>(null);
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState(false);
  const isOpen = st.tab !== null;
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (isOpen && !d.open) { opener.current = document.activeElement as HTMLElement | null; setQ(""); setConfirm(false); d.showModal(); }
    if (!isOpen && d.open) d.close();
  }, [isOpen]);

  const tab = st.tab ?? "general";
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hit = (t: string) => terms.every((w) => t.toLowerCase().includes(w));
  const featHits = terms.length ? FEATURES.filter((f) => hit(`${f.group} ${f.name} ${f.desc} ${f.how}`)) : [];
  const scHits = terms.length ? SHORTCUTS.filter((s) => hit(`${s.keys} ${s.what} ${s.where}`)) : [];

  const run = (a: FeatAction) => {
    if ("tab" in a) { setQ(""); st.open(a.tab); return; }
    st.close();
    if ("go" in a) st.go(a.go);
    else if ("pane" in a) st.openPane(a.pane);
    else onAsk(a.ask);
  };

  const dataBytes = useMemo(() => { try { return new Blob([backupJSON()]).size; } catch { return 0; } }, [st.pins, st.notes, st.tracker, st.threads, st.misses]); // eslint-disable-line react-hooks/exhaustive-deps
  const trackerCount = Object.values(st.tracker).filter((t) => t.status !== "todo" || t.note).length;
  const fmtSize = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

  let body: React.ReactNode;
  if (terms.length) {
    body = featHits.length + scHits.length === 0 ? <p className="meta">Nothing matches “{q}”.</p> : (
      <>
        {featHits.length > 0 && <FeatureList items={featHits} run={run} />}
        {scHits.length > 0 && <><h3 className="set-h">Shortcuts</h3><ShortcutTable items={scHits} /></>}
      </>
    );
  } else if (tab === "general") {
    body = (
      <>
        <h3 className="set-h">Profile</h3>
        <Setting label="Display name" desc="Shown in the sidebar and the greeting. Stays in this browser."><input className="set-in" aria-label="Display name" maxLength={40} placeholder="Your name" value={st.name} onChange={(e) => st.set({ name: e.target.value })} /></Setting>
        <h3 className="set-h">Appearance</h3>
        <Setting label="Theme" desc="This workbench is dark only."><span className="chip">Dark</span></Setting>
        <Setting label="Reading font"><Pick label="Reading font" value={st.font} opts={[{ id: "serif", label: "Serif" }, { id: "sans", label: "Sans" }]} onChange={(font) => st.set({ font })} /></Setting>
        <Setting label="Text size"><Pick label="Text size" value={st.textSize} opts={[{ id: "s", label: "Small" }, { id: "m", label: "Medium" }, { id: "l", label: "Large" }]} onChange={(textSize) => st.set({ textSize })} /></Setting>
        <Setting label="Reading width"><Pick label="Reading width" value={st.width} opts={[{ id: "narrow", label: "Narrow" }, { id: "normal", label: "Normal" }, { id: "wide", label: "Wide" }]} onChange={(width) => st.set({ width })} /></Setting>
        <p className="set-prev">The quick brown fox jumps over the lazy dog. Chapters, answers and the side panel all use these three settings.</p>
        <Setting label="Animations" desc="Match system follows your operating system. Some systems report reduced motion even when you did not choose it, so the default is Full."><Pick label="Animations" value={st.motion} opts={[{ id: "full", label: "Full" }, { id: "reduced", label: "Reduced" }, { id: "system", label: "Match system" }]} onChange={(motion) => st.set({ motion })} /></Setting>
        <h3 className="set-h">Answers</h3>
        <Setting label="Answer detail" desc="Brief: one sentence. Standard: adds the reason and key facts. Detailed: adds code and tool lists."><Pick label="Answer detail" value={st.depth} opts={[{ id: "brief", label: "Brief" }, { id: "standard", label: "Standard" }, { id: "detailed", label: "Detailed" }]} onChange={(depth) => st.set({ depth })} /></Setting>
      </>
    );
  } else if (tab === "features") {
    body = (<><p className="meta">Everything this workbench can do. Items with a button open the feature directly.</p><FeatureList items={FEATURES} run={run} /></>);
  } else if (tab === "shortcuts") {
    body = (<><p className="meta">Shortcuts marked “Anywhere” work from any page, except while typing in a box where noted.</p><ShortcutTable items={SHORTCUTS} /></>);
  } else if (tab === "answers") {
    body = (
      <>
        <p className="meta">The composer answers from this document’s own data: {CRATES_LIST.length} crate entries, {FORGEHUB_PACKS.length} packs, {DEEP_PROMPTS.length} prompts, {LOCKED_CONFIRMATIONS.length} confirmations, {SPECIFICATION_PATCHES.length} patches, {PROTOTYPE_SPIKES.length} spikes, {INITIAL_ROSTER.length} agents, {INITIAL_TASKS.length} tasks and the chapter text. It does not use AI, never guesses, and shows the sources it used. When it cannot answer exactly it says so and shows the closest passages.</p>
        <p className="meta">Because the answers are built from the data, adding or changing an item updates counts, lists and answers automatically. Only a new <em>kind</em> of question needs a new rule.</p>
        <h3 className="set-h">Smart matching (experimental)</h3>
        <Setting label="Meaning-based search for questions that are not exact" desc="Loads a small model (about 23 MB, downloaded once per session from public CDNs: jsDelivr and Hugging Face). It runs in your browser and nothing you type or read is sent anywhere. It only picks and quotes passages from this document; it never writes new text. If the download is blocked, the normal answers keep working.">
          <Pick label="Smart matching" value={st.smart ? "on" : "off"} opts={[{ id: "off", label: "Off" }, { id: "on", label: "On" }]} onChange={(v) => { st.set({ smart: v === "on" }); if (v === "on") void loadSmart(); }} />
        </Setting>
        {st.smart && <p className="meta" role="status">{st.smartState === "off" ? "Starts when you ask a question that is not an exact match, or press Retry." : st.smartMsg}{st.smartState === "failed" && <> <button type="button" className="btn btn-ghost" onClick={() => void loadSmart()}>Retry</button></>}</p>}
        <h3 className="set-h">Questions it answers (click to try)</h3>
        {ANSWER_EXAMPLES.map((g) => (
          <div key={g.type} className="ex"><div className="ex-t">{g.type}</div><div className="chips">{g.examples.map((x) => <button key={x} type="button" className="chipbtn" onClick={() => run({ ask: x })}>{x}</button>)}</div></div>
        ))}
        <h3 className="set-h">Questions it could not answer exactly{st.misses.length > 0 && <button type="button" className="btn btn-ghost" onClick={() => st.set({ misses: [] })}>Clear log</button>}</h3>
        {st.misses.length === 0 ? <p className="meta">None yet. Questions that got only closest passages, or nothing, are listed here so you can see what to teach it next.</p> : (
          <ul className="miss">
            {st.misses.map((m) => <li key={m.q}><span>{m.q}</span><span className={`chip ${m.status === "none" ? "bad" : ""}`}>{m.status === "none" ? "Not found" : m.status === "reported" ? "You flagged it" : "Closest only"}</span><button type="button" className="btn btn-ghost" onClick={() => run({ ask: m.q })}>Ask again</button></li>)}
          </ul>
        )}
      </>
    );
  } else if (tab === "labs") {
    body = (
      <>
        <p className="meta">Interactive simulators. They run in your browser, never measure real hardware, and do not print invented numbers.</p>
        {LABS.map((l) => (
          <div className="feat" key={l.name}><div className="feat-t">{l.name}<button type="button" className="btn" onClick={() => run({ pane: l.ref })}>Open</button></div><p className="feat-d">{l.desc}</p></div>
        ))}
      </>
    );
  } else if (tab === "sync") {
    body = <CloudPanel />;
  } else if (tab === "data") {
    body = (
      <>
        <p className="meta">Everything you save lives in this browser only (local storage key <span className="mono">geminiforge_v21</span>). Questions and notes are never sent anywhere. The page loads its fonts from Google Fonts.</p>
        <h3 className="set-h">Stored now</h3>
        <ul className="stats">
          <li><b>{st.pins.length}</b> pins</li><li><b>{st.notes.length}</b> notes</li><li><b>{st.threads.length}</b> saved questions</li><li><b>{trackerCount}</b> tracker entries</li><li><b>{fmtSize(dataBytes)}</b> total</li>
        </ul>
        <h3 className="set-h">Backup</h3>
        <Setting label="Export backup" desc="Pins, notes, tracker, questions and settings as a JSON file."><button type="button" className="btn" onClick={() => { exportBackup(); }}><Download size={14} aria-hidden />Export .json</button></Setting>
        <Setting label="Import backup" desc="Replaces your current data with a backup file."><button type="button" className="btn" onClick={() => { st.close(); useStore.getState().setImportOpen(true); }}><Upload size={14} aria-hidden />Import</button></Setting>
        <Setting label="Export document" desc="The whole workbook, plus your tracker and notes, as one Markdown file."><button type="button" className="btn" onClick={() => { void exportFile("geminiforge_v20_workbook.md", buildMarkdown(), "text/markdown"); }}><Download size={14} aria-hidden />Export .md</button></Setting>
        <p className="meta">{st.lastExport ? `Last backup exported ${new Date(st.lastExport).toLocaleString()}.` : "You have not exported a backup yet."}</p>
        <h3 className="set-h">Saved questions</h3>
        <Setting label="Delete all saved questions" desc="Removes every question and answer (also archived ones). You can undo for a few seconds."><button type="button" className="btn btn-danger" disabled={st.threads.length === 0} onClick={() => { useStore.getState().deleteThreads(st.threads.map((t) => t.id)); }}>Delete all ({st.threads.length})</button></Setting>
        <h3 className="set-h">Reset</h3>
        <Setting label="Erase saved data" desc="Removes pins, notes, tracker, questions and settings from this browser. Export a backup first."><button type="button" className="btn btn-danger" onClick={() => { if (confirm) { st.resetAll(); st.close(); } else setConfirm(true); }}>{confirm ? "Click again to erase everything" : "Erase…"}</button></Setting>
      </>
    );
  } else {
    body = (
      <>
        <Setting label="GeminiForge V20 Workbench" desc="Overview, plan and document keeper for the V20 specification."><span className="mono">v{APP_VERSION} · {BUILD_DATE}</span></Setting>
        <Setting label="Built with" desc="No other libraries, no network calls except fonts."><span className="mono dim">React · Zustand · Lucide</span></Setting>
        <h3 className="set-h">Release notes</h3>
        {CHANGELOG.map((c) => (
          <div className="feat" key={c.v}><div className="feat-t">v{c.v}<span className="dim mono small">{c.date}</span></div><ul className="rn">{c.items.map((i) => <li key={i}>{i}</li>)}</ul></div>
        ))}
      </>
    );
  }

  return (
    <dialog ref={dlg} className="set" aria-label="Settings" onClose={() => { st.close(); requestAnimationFrame(() => { const o = opener.current; (o && document.contains(o) && o !== document.body ? o : document.querySelector<HTMLElement>(".foot-btn"))?.focus(); }); }} onClick={(e) => { if (e.target === dlg.current) st.close(); }}>
      <div className="set-wrap">
        <nav className="set-nav" aria-label="Settings sections">
          <input className="set-search" type="search" aria-label="Search settings and features" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} type="button" className="set-tab" aria-current={!terms.length && tab === id ? "page" : undefined} onClick={() => { setQ(""); st.open(id); }}><Icon size={16} aria-hidden /><span>{label}</span></button>
          ))}
        </nav>
        <div className="set-main">
          <div className="set-top"><h2>{terms.length ? "Search results" : TABS.find((t) => t.id === tab)?.label}</h2><button type="button" className="icon-btn" aria-label="Close settings" onClick={() => st.close()}><X size={17} aria-hidden /></button></div>
          <div className="set-body" tabIndex={0} role="region" aria-label="Settings content">{isOpen && body}</div>
        </div>
      </div>
    </dialog>
  );
}
// #endregion
