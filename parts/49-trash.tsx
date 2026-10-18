// #region 5i. TRASH AND CONFIRMATIONS. Edits and added pages go to Trash for 30 days; permanent delete asks first. Needs Supabase, so the Canvas build stubs it.
interface ConfirmOpts { title: string; body: React.ReactNode; confirmLabel: string; type?: string; danger?: boolean }

function ConfirmDialog({ opts, onClose }: { opts: ConfirmOpts; onClose: (ok: boolean) => void }) {
  const dlg = useRef<HTMLDialogElement | null>(null);
  const [typed, setTyped] = useState("");
  useEffect(() => { const d = dlg.current; if (d && !d.open) d.showModal(); }, []);
  const okToGo = !opts.type || typed.trim() === opts.type;
  return (
    <dialog ref={dlg} className="pal imp" aria-labelledby="cf-t" onClose={() => onClose(false)} onClick={(e) => { if (e.target === dlg.current) onClose(false); }}>
      <form className="imp-in" method="dialog" onSubmit={(e) => { e.preventDefault(); if (okToGo) onClose(true); }}>
        <h2 id="cf-t" className="h4" style={{ marginTop: 0 }}>{opts.title}</h2>
        <div className="meta" style={{ color: "var(--tx2)" }}>{opts.body}</div>
        {opts.type && (
          <label className="meta" style={{ display: "block", marginTop: 8 }}>Type <b className="mono">{opts.type}</b> to confirm
            <input className="set-in" style={{ display: "block", width: "100%", marginTop: 4 }} autoFocus autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
          </label>
        )}
        <div className="actions" style={{ marginTop: 14 }}>
          <button type="submit" className={`btn ${opts.danger ? "btn-danger" : "btn-primary"}`} disabled={!okToGo}>{opts.confirmLabel}</button>
          <button type="button" className="btn" autoFocus={!opts.type} onClick={() => onClose(false)}>Cancel</button>
        </div>
      </form>
    </dialog>
  );
}

// ask() resolves true when confirmed; render `node` once in the screen
function useConfirm() {
  const [st, setSt] = useState<{ opts: ConfirmOpts; resolve: (v: boolean) => void } | null>(null);
  const ask = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => setSt({ opts, resolve })), []);
  const node = st ? <ConfirmDialog key={st.opts.title + st.opts.confirmLabel} opts={st.opts} onClose={(v) => { st.resolve(v); setSt(null); }} /> : null;
  return { ask, node };
}

interface TrashRow { key: string; type: "edit" | "page"; id: string; title: string; sub: string; deletedAt: string; purgeAt: string }
interface LogRow { id: number; item_type: string; item_id: string; title: string; action: string; at: string }
const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

export function TrashView() {
  const { isAdmin, notify, cloudState, liveTick } = useStore(useShallow((s) => ({ isAdmin: s.isAdmin, notify: s.notify, cloudState: s.cloudState, liveTick: s.liveTick })));
  const [rows, setRows] = useState<TrashRow[] | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"all" | "edit" | "page" | "tokens" | "log">("all");
  const [q, setQ] = useState("");
  const [age, setAge] = useState<"any" | "7" | "30">("any");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const { ask, node } = useConfirm();

  const load = useCallback(async () => {
    if (!supabase) return;
    const [es, ps, lg] = await Promise.all([
      supabase.from("change_sets").select("id,title,client,deleted_at,purge_after,doc_drafts(id)").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
      supabase.from("docs").select("id,ref,kind,title,deleted_at,purge_after").eq("source", "native").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
      supabase.from("trash_log").select("id,item_type,item_id,title,action,at").order("at", { ascending: false }).limit(200)
    ]);
    const e = es.error ?? ps.error ?? lg.error;
    if (e) { setErr(e.message); return; }
    setErr("");
    const plus30 = (d: string) => new Date(new Date(d).getTime() + 30 * 86_400_000).toISOString();
    const out: TrashRow[] = [
      ...(es.data ?? []).map((r) => ({ key: `edit:${r.id}`, type: "edit" as const, id: r.id as string, title: r.title as string, sub: `${(r.doc_drafts as unknown[] | null)?.length ?? 0} edit(s)${r.client ? ` · ${r.client}` : ""}`, deletedAt: r.deleted_at as string, purgeAt: (r.purge_after as string | null) ?? plus30(r.deleted_at as string) })),
      ...(ps.data ?? []).map((r) => ({ key: `page:${r.id}`, type: "page" as const, id: r.id as string, title: r.title as string, sub: r.ref as string, deletedAt: r.deleted_at as string, purgeAt: (r.purge_after as string | null) ?? plus30(r.deleted_at as string) }))
    ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
    setRows(out); setLog((lg.data ?? []) as LogRow[]);
    setPicked((p) => new Set([...p].filter((k) => out.some((r) => r.key === k))));
  }, []);

  // items past their purge date are removed when the Trash is opened
  useEffect(() => {
    if (!isAdmin || !supabase) return;
    const now = new Date().toISOString();
    void Promise.all([
      supabase.from("change_sets").delete().not("deleted_at", "is", null).lt("purge_after", now),
      supabase.from("docs").delete().eq("source", "native").not("deleted_at", "is", null).lt("purge_after", now)
    ]).catch(() => { /* the next visit tries again */ }).then(() => load());
  }, [isAdmin, load]);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load, liveTick]);

  const shown = useMemo(() => (rows ?? []).filter((r) => (tab === "all" || tab === r.type) && (!q.trim() || `${r.title} ${r.sub}`.toLowerCase().includes(q.trim().toLowerCase())) && (age === "any" || Date.now() - new Date(r.deletedAt).getTime() <= Number(age) * 86_400_000)), [rows, tab, q, age]);
  const counts = { edit: (rows ?? []).filter((r) => r.type === "edit").length, page: (rows ?? []).filter((r) => r.type === "page").length };
  const pickedRows = shown.filter((r) => picked.has(r.key));

  const restore = async (list: TrashRow[]) => {
    if (!supabase || busy || list.length === 0) return;
    setBusy(true);
    const [a, b] = await Promise.all([
      list.some((r) => r.type === "edit") ? supabase.rpc("restore_edits", { p_ids: list.filter((r) => r.type === "edit").map((r) => r.id) }) : Promise.resolve({ data: { done: [] }, error: null }),
      list.some((r) => r.type === "page") ? supabase.rpc("restore_pages", { p_ids: list.filter((r) => r.type === "page").map((r) => r.id) }) : Promise.resolve({ data: { done: [] }, error: null })
    ]);
    setBusy(false);
    const e = a.error ?? b.error;
    const n = ((a.data as { done: unknown[] } | null)?.done.length ?? 0) + ((b.data as { done: unknown[] } | null)?.done.length ?? 0);
    notify(e ? e.message : `${n} restored`);
    setPicked(new Set()); await load(); void refreshAi();
  };

  const purge = async (list: TrashRow[]): Promise<number> => {
    if (!supabase || list.length === 0) return 0;
    let n = 0;
    const eds = list.filter((r) => r.type === "edit").map((r) => r.id), pgs = list.filter((r) => r.type === "page").map((r) => r.id);
    if (eds.length) { const r = await supabase.from("change_sets").delete().in("id", eds).select("id"); if (r.error) throw r.error; n += r.data?.length ?? 0; }
    if (pgs.length) { const r = await supabase.from("docs").delete().in("id", pgs).select("id"); if (r.error) throw r.error; n += r.data?.length ?? 0; }
    return n;
  };
  const purgeNow = async (list: TrashRow[]) => {
    if (busy) return;
    setBusy(true);
    try {
      const n = await purge(list);
      notify(n === list.length ? `${n} deleted for good` : `${n} of ${list.length} deleted; the rest could not be removed`);
    } catch (e) { notify(e instanceof Error ? e.message : (e as { message?: string }).message ?? "Delete failed"); }
    setBusy(false); setPicked(new Set()); await load(); void refreshAi();
  };

  const deleteForever = async (list: TrashRow[]) => {
    if (list.length === 0) return;
    const one = list.length === 1;
    const ok = await ask({
      title: one ? "Delete this item for good?" : `Delete ${list.length} items for good?`,
      body: <>{one ? <>“{list[0].title}” will be removed permanently.</> : <>{list.filter((r) => r.type === "edit").length} edit set(s) and {list.filter((r) => r.type === "page").length} page(s) will be removed permanently.</>} This cannot be undone. Pages lose their version history too.</>,
      confirmLabel: "Delete forever", danger: true, type: one ? undefined : "DELETE"
    });
    if (ok) await purgeNow(list);
  };

  const emptyTrash = async () => {
    const all = rows ?? [];
    if (all.length === 0) return;
    const step1 = await ask({ title: "Empty the Trash?", body: <>{counts.edit} edit set(s) and {counts.page} page(s) are in the Trash. Everything in it will be deleted for good. This cannot be undone.</>, confirmLabel: "Continue", danger: true });
    if (!step1) return;
    const step2 = await ask({ title: "Really delete everything in the Trash?", body: <>This permanently removes {all.length} item(s), including page version history.</>, confirmLabel: "Empty Trash", danger: true, type: "EMPTY TRASH" });
    if (step2) await purgeNow(all);
  };

  if (!CLOUD_AVAILABLE || (cloudState !== "synced" && cloudState !== "syncing" && cloudState !== "error")) return <div className="col enter"><h1 className="view-h">Trash</h1><p className="meta">Sign in under Settings, then Sync, to use the Trash.</p></div>;
  if (!isAdmin) return <div className="col enter"><h1 className="view-h">Trash</h1><p className="meta">This account is not an administrator of the documentation.</p></div>;
  const tokenLog = log.filter((l) => l.item_type === "token" && l.action === "purged");
  const toggle = (k: string) => setPicked((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const selectable = tab === "all" || tab === "edit" || tab === "page";
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)" }}>
      <style>{AI_CSS}{PAGES_CSS}</style>
      {node}
      <h1 className="view-h">Trash</h1>
      <p className="meta">Deleted edits and added pages stay here for 30 days and can be restored. After that they are removed automatically. Accepted AI edits are kept as history and cannot be deleted until you undo them. Deleted tokens cannot be restored.</p>
      <div className="ai-bar">
        <div className="seg" role="group" aria-label="Type">
          <button type="button" aria-pressed={tab === "all"} onClick={() => setTab("all")}>All ({(rows ?? []).length})</button>
          <button type="button" aria-pressed={tab === "edit"} onClick={() => setTab("edit")}>Edits ({counts.edit})</button>
          <button type="button" aria-pressed={tab === "page"} onClick={() => setTab("page")}>Pages ({counts.page})</button>
          <button type="button" aria-pressed={tab === "tokens"} onClick={() => setTab("tokens")}>Deleted tokens ({tokenLog.length})</button>
          <button type="button" aria-pressed={tab === "log"} onClick={() => setTab("log")}>Log</button>
        </div>
        <span className="sp" />
        <button type="button" className="btn btn-danger" disabled={busy || (rows ?? []).length === 0} onClick={() => void emptyTrash()}>Empty Trash</button>
      </div>
      {selectable && (
        <div className="ai-bar">
          <input className="set-in" style={{ width: 220 }} aria-label="Search the Trash" placeholder="Search the Trash" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="set-in" style={{ width: 170 }} aria-label="Deleted within" value={age} onChange={(e) => setAge(e.target.value as "any" | "7" | "30")}><option value="any">Deleted any time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select>
          <span className="sp" />
          <button type="button" className="btn" disabled={shown.length === 0} onClick={() => setPicked(pickedRows.length === shown.length ? new Set() : new Set(shown.map((r) => r.key)))}>{pickedRows.length === shown.length && shown.length > 0 ? "Clear selection" : "Select all shown"}</button>
          <button type="button" className="btn" disabled={busy || pickedRows.length === 0} onClick={() => void restore(pickedRows)}><Undo2 size={14} aria-hidden />Restore{pickedRows.length ? ` (${pickedRows.length})` : ""}</button>
          <button type="button" className="btn btn-danger" disabled={busy || pickedRows.length === 0} onClick={() => void deleteForever(pickedRows)}>Delete forever{pickedRows.length ? ` (${pickedRows.length})` : ""}</button>
        </div>
      )}
      {err && <p className="banner" data-k="conflict" role="alert">{err}</p>}
      {rows === null && !err && <p className="meta" role="status">Loading…</p>}
      {selectable && rows !== null && shown.length === 0 && <p className="meta">{(rows ?? []).length === 0 ? "The Trash is empty." : "Nothing matches."}</p>}
      {selectable && shown.map((r) => (
        <div key={r.key} className="ai-tok" data-key={r.key}>
          <input type="checkbox" aria-label={`Select ${r.title}`} checked={picked.has(r.key)} onChange={() => toggle(r.key)} />
          <b>{r.title}</b><span className="chip">{r.type === "edit" ? "Edit set" : "Page"}</span>
          <span className="meta" style={{ margin: 0 }}>{r.sub} · deleted {ago(r.deletedAt)} · purges in {daysLeft(r.purgeAt)} day{daysLeft(r.purgeAt) === 1 ? "" : "s"}</span>
          <span className="sp" />
          <button type="button" className="btn" disabled={busy} onClick={() => void restore([r])}>Restore</button>
          <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void deleteForever([r])}>Delete forever</button>
        </div>
      ))}
      {tab === "tokens" && (tokenLog.length === 0 ? <p className="meta">No tokens have been deleted.</p> : tokenLog.map((l) => <div key={l.id} className="ai-tok"><b>{l.title}</b><span className="chip">Deleted token</span><span className="meta" style={{ margin: 0 }}>deleted {ago(l.at)} · cannot be restored</span></div>))}
      {tab === "log" && (log.length === 0 ? <p className="meta">Nothing yet.</p> : (
        <table className="ai-tbl"><thead><tr><th>When</th><th>Action</th><th>Type</th><th>Item</th></tr></thead>
          <tbody>{log.map((l) => <tr key={l.id}><td>{ago(l.at)}</td><td>{l.action === "trashed" ? "Moved to Trash" : l.action === "restored" ? "Restored" : "Deleted for good"}</td><td>{l.item_type}</td><td>{l.title}</td></tr>)}</tbody>
        </table>
      ))}
    </div>
  );
}
// #endregion
