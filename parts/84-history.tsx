// #region 11c. HISTORY (all saved questions: search, pin, archive/restore, delete with undo)
export function HistoryView() {
  const { threads, go, patchThread, deleteThreads, togglePin, pins, notify } = useStore(useShallow((s) => ({ threads: s.threads, go: s.go, patchThread: s.patchThread, deleteThreads: s.deleteThreads, togglePin: s.togglePin, pins: s.pins, notify: s.notify })));
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");
  const [sel, setSel] = useState<string[]>([]);
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = useMemo(() => threads
    .filter((t) => (filter === "all" ? true : filter === "archived" ? t.archived : !t.archived))
    .filter((t) => { if (!terms.length) return true; const hay = `${t.title} ${t.turns.map((u) => u.text).join(" ")}`.toLowerCase(); return terms.every((w) => hay.includes(w)); })
    .sort((a, b) => b.at - a.at), [threads, filter, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownSel = sel.filter((id) => list.some((t) => t.id === id));
  const all = list.length > 0 && shownSel.length === list.length;
  const del = (ids: string[]) => { deleteThreads(ids); setSel((s) => s.filter((x) => !ids.includes(x))); };
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)" }}>
      <h1 className="view-h">All questions</h1>
      <p className="meta">{threads.length} saved ({threads.filter((t) => t.archived).length} archived). Deleting can be undone for a few seconds.</p>
      <div className="hist-bar">
        <input className="set-in" style={{ width: 260 }} type="search" aria-label="Search saved questions" placeholder="Search questions and answers" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg" role="group" aria-label="Show">
          {(["all", "active", "archived"] as const).map((f) => <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === "all" ? "All" : f === "active" ? "Active" : "Archived"}</button>)}
        </div>
      </div>
      <div className="hist-bar">
        <label className="hist-all"><input type="checkbox" checked={all} onChange={() => setSel(all ? [] : list.map((t) => t.id))} /> Select all shown ({list.length})</label>
        <button type="button" className="btn btn-danger" disabled={shownSel.length === 0} onClick={() => del(shownSel)}>Delete selected ({shownSel.length})</button>
      </div>
      {list.length === 0 && <p className="meta">{threads.length === 0 ? "No saved questions yet. Ask one from the start page." : "Nothing matches."}</p>}
      <ul className="hist">
        {list.map((t) => (
          <li key={t.id} className="hist-i">
            <input type="checkbox" aria-label={`Select ${t.title}`} checked={sel.includes(t.id)} onChange={() => setSel((s) => (s.includes(t.id) ? s.filter((x) => x !== t.id) : [...s, t.id]))} />
            <button type="button" className="hist-t" onClick={() => go({ kind: "thread", id: t.id })}>
              <span>{t.title}</span>
              <small>{fmtDate(t.at)} · {Math.ceil(t.turns.length / 2)} {Math.ceil(t.turns.length / 2) === 1 ? "question" : "questions"}{t.archived ? " · Archived" : ""}{pins.includes(`thread:${t.id}`) ? " · Pinned" : ""}</small>
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => togglePin(`thread:${t.id}`)}>{pins.includes(`thread:${t.id}`) ? "Unpin" : "Pin"}</button>
            <button type="button" className="btn btn-ghost" onClick={() => { patchThread(t.id, { archived: !t.archived }); if (!t.archived) notify("Question archived", () => patchThread(t.id, { archived: false })); }}>{t.archived ? "Restore" : "Archive"}</button>
            <button type="button" className="btn btn-ghost" style={{ color: "var(--bad)" }} onClick={() => del([t.id])}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
// #endregion
