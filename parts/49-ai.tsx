// #region 5g. AI SPACE (review inbox + AI access). Needs the Supabase connection, so the Canvas build replaces this part with a stub.
const AI_CSS = `
.ai-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:6px 0 14px}.ai-bar .sp{flex:1}
.ai-set{border:1px solid var(--line);border-radius:14px;background:var(--raise);margin-bottom:12px;font-family:var(--sans)}
.ai-set-h{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between;padding:12px 14px 6px}
.ai-set-t{font:600 15px/1.35 var(--sans);color:var(--tx);flex:1;min-width:200px}
.ai-set p.meta{padding:0 14px}.ai-set-a{display:flex;flex-wrap:wrap;gap:8px;padding:6px 14px 12px}
.ai-d{border-top:1px solid var(--line);padding:10px 14px;outline:none}.ai-d:focus-visible{box-shadow:inset 3px 0 0 var(--focus)}
.ai-d[data-sel=true]{background:rgba(255,255,255,.025)}
.ai-d-h{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center}.ai-d-t{font:500 14px/1.3 var(--sans);color:var(--tx);margin-right:4px}
.ai-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.chip.warn{color:var(--warn);border-color:rgba(230,180,80,.3);background:rgba(230,180,80,.08)}
.ai-why{margin:4px 0 6px;font:400 13.5px/1.5 var(--sans);color:var(--tx2)}
.ai-diff{margin:8px 0;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#161513;font:400 13px/1.6 var(--mono);white-space:pre-wrap;word-break:break-word;max-height:420px;overflow:auto;color:var(--tx3)}
.ai-diff ins{background:rgba(125,211,160,.16);color:var(--ok);text-decoration:underline;text-decoration-style:dotted}
.ai-diff del{background:rgba(240,138,138,.14);color:var(--bad);text-decoration:line-through}
.ai-gap{color:var(--tx4);font-style:italic}
.ai-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.ai-rej{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.ai-rej input{flex:1;min-width:220px;width:auto}
.ai-keys{font:400 12px var(--sans);color:var(--tx4);margin:0 0 10px}.ai-keys kbd{font:500 11px var(--mono);border:1px solid var(--line2);border-radius:5px;padding:1px 5px;color:var(--tx3)}
.ai-tok{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:var(--raise);margin-bottom:8px;font:400 13.5px var(--sans)}
.ai-tok b{font-weight:600;color:var(--tx)}.ai-tok .sp{flex:1}
.ai-secret{display:block;width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line2);background:#161513;color:var(--tx);font:500 13px var(--mono);word-break:break-all;margin:6px 0}
.ai-snip{position:relative;margin:6px 0}.ai-snip pre{margin:0;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#161513;font:400 12.5px/1.55 var(--mono);white-space:pre-wrap;word-break:break-all;color:var(--tx2)}
.ai-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px 14px;margin:8px 0 12px}.ai-form label{display:flex;flex-direction:column;gap:4px;font:500 12px var(--sans);color:var(--tx3)}
.ai-form .set-in{width:100%}
.ai-tbl{width:100%;border-collapse:collapse;font:400 12.5px var(--sans)}.ai-tbl th{text-align:left;color:var(--tx4);font-weight:500;padding:4px 8px}.ai-tbl td{padding:4px 8px;border-top:1px solid var(--line);color:var(--tx2);word-break:break-word}
@media (forced-colors:active){.ai-diff ins{outline:1px solid Highlight}.ai-diff del{outline:1px dashed CanvasText}}
`;

const RISK_LABEL: Record<string, string> = {
  new_doc: "New document", whole_doc: "Replaces the whole text", large_change: "Large change", deletes_content: "Removes a lot of text",
  numbers_changed: "Numbers changed", code_changed: "Code blocks changed", new_url: "New web link", html: "Adds HTML", odd_link: "Unusual link type", invisible_chars: "Invisible characters"
};
const riskLevel = (score: number): "high" | "medium" | "low" => (score >= 4 ? "high" : score >= 2 ? "medium" : "low");
const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  return s < 90 ? "just now" : s < 5400 ? `${Math.round(s / 60)} min ago` : s < 129600 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} days ago`;
};

interface DraftRow {
  id: string; project_id: string; change_set_id: string; doc_ref: string; base_rev: number; op: string; rationale: string; status: string; note: string | null; reject_reason: string | null;
  risk_score: number; risk_flags: string[]; new_doc: boolean; result_title: string | null; applied_rev: number | null; reverted_at: string | null; created_at: string; decided_at: string | null;
}
interface SetRow { id: string; project_id: string; title: string; summary: string; client: string | null; created_at: string; doc_drafts: DraftRow[] }

export async function refreshAi(): Promise<void> {
  if (!supabase) return;
  try {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id;
    if (!uid) { useStore.setState({ isAdmin: false, inboxCount: 0 }); stopLive(); return; }
    const { data: a } = await supabase.from("app_admins").select("user_id").eq("user_id", uid).maybeSingle();
    if (!a) { useStore.setState({ isAdmin: false, inboxCount: 0 }); stopLive(); return; }
    const { count } = await supabase.from("doc_drafts").select("id", { count: "exact", head: true }).eq("status", "pending");
    const changed = useStore.getState().inboxCount !== (count ?? 0);
    useStore.setState((s) => ({ isAdmin: true, inboxCount: count ?? 0, liveTick: changed ? s.liveTick + 1 : s.liveTick }));
    startLive();
  } catch { /* keep the last known state */ }
}
if (supabase && typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void refreshAi(); });
  setInterval(() => { if (document.visibilityState === "visible") void refreshAi(); }, 60_000);
}

type DiffPart = { value: string; added?: boolean; removed?: boolean };
// shows what changed; long unchanged stretches are folded so a small edit in a long page stays readable
function DiffText({ a, b }: { a: string; b: string }) {
  const [parts, setParts] = useState<DiffPart[] | null>(null);
  useEffect(() => {
    let off = false;
    void import("diff").then((d) => { if (!off) setParts((a.length + b.length > 120_000 ? d.diffLines(a, b) : d.diffWordsWithSpace(a, b)) as DiffPart[]); }).catch(() => { if (!off) setParts([{ value: b, added: true }]); });
    return () => { off = true; };
  }, [a, b]);
  if (!parts) return <p className="meta" role="status">Comparing…</p>;
  if (!parts.some((p) => p.added || p.removed)) return <p className="meta">The text is identical.</p>;
  return (
    <pre className="ai-diff" tabIndex={0} aria-label="Changes: added text is underlined, removed text is struck through">
      {parts.map((p, i) => {
        if (p.added) return <ins key={i}><span className="ai-sr">[added: </span>{p.value}<span className="ai-sr">]</span></ins>;
        if (p.removed) return <del key={i}><span className="ai-sr">[removed: </span>{p.value}<span className="ai-sr">]</span></del>;
        const v = p.value;
        if (v.length <= 360) return <span key={i}>{v}</span>;
        const head = i === 0 ? "" : v.slice(0, 150), tail = i === parts.length - 1 ? "" : v.slice(-150);
        return <span key={i}>{head}<span className="ai-gap">{` ⋯ ${v.length - head.length - tail.length} unchanged characters ⋯ `}</span>{tail}</span>;
      })}
    </pre>
  );
}

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  pending: { label: "Waiting", cls: "warn" }, applied: { label: "Accepted", cls: "ok" }, rejected: { label: "Rejected", cls: "" }, stale: { label: "Out of date", cls: "bad" }, approved: { label: "Approved (apply by hand)", cls: "ok" }
};

function DraftCard({ d, docTitle, selected, onDecide, onRevert, cardRef }: { d: DraftRow; docTitle: string; selected: boolean; onDecide: (ids: string[], approve: boolean, reason?: string) => void; onRevert: (id: string) => void; cardRef: (el: HTMLDivElement | null) => void }) {
  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState<{ before: string; after: string; titleBefore: string; titleAfter: string | null } | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!open || detail || !supabase) return;
    let off = false;
    void (async () => {
      const [dr, rev] = await Promise.all([
        supabase!.from("doc_drafts").select("result_body,result_title").eq("id", d.id).single(),
        d.new_doc ? Promise.resolve({ data: null, error: null }) : supabase!.from("doc_revisions").select("body,title").eq("project_id", d.project_id).eq("ref", d.doc_ref).eq("rev", d.base_rev).maybeSingle()
      ]);
      if (off) return;
      if (dr.error || !dr.data) { setErr(dr.error?.message ?? "Could not load the change"); return; }
      setDetail({ before: (rev.data?.body as string | undefined) ?? "", after: (dr.data.result_body as string | null) ?? "", titleBefore: (rev.data?.title as string | undefined) ?? "", titleAfter: (dr.data.result_title as string | null) });
    })();
    return () => { off = true; };
  }, [open, detail, d]);
  const st = d.reverted_at ? { label: "Undone", cls: "" } : STATUS_CHIP[d.status] ?? { label: d.status, cls: "" };
  const lvl = riskLevel(d.risk_score);
  const pending = d.status === "pending";
  return (
    <div className="ai-d" ref={cardRef} tabIndex={0} data-sel={selected} data-id={d.id} role="group" aria-label={`${docTitle}, ${st.label}, ${lvl} risk`}>
      <div className="ai-d-h">
        <span className="ai-d-t">{docTitle}</span>
        <span className={`chip ${st.cls}`}>{st.label}</span>
        <span className={`chip ${lvl === "high" ? "bad" : lvl === "medium" ? "warn" : "ok"}`}>{lvl === "high" ? "High risk" : lvl === "medium" ? "Check closely" : "Low risk"}</span>
        <span className="mono dim small">{d.doc_ref}</span>
      </div>
      {d.risk_flags.length > 0 && <div className="ai-chips">{d.risk_flags.map((f) => <span key={f} className="chip warn">{RISK_LABEL[f] ?? f}</span>)}</div>}
      {d.rationale && <p className="ai-why"><b>Why the AI says:</b> {d.rationale}</p>}
      {(d.note || d.reject_reason) && <p className="meta">{d.reject_reason ? `Your reason: ${d.reject_reason}` : d.note}</p>}
      <div className="actions">
        <button type="button" className="btn" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Hide changes" : "Show changes"}</button>
        {pending && <button type="button" className="btn btn-primary" onClick={() => onDecide([d.id], true)}>Accept</button>}
        {pending && <button type="button" className="btn" data-act="reject" aria-expanded={rejecting} onClick={() => setRejecting(!rejecting)}>Reject…</button>}
        {d.status === "applied" && !d.reverted_at && <button type="button" className="btn" onClick={() => onRevert(d.id)}><Undo2 size={14} aria-hidden />Undo</button>}
        {detail && <button type="button" className="btn btn-ghost" onClick={() => { void copyText(detail.after); }}><Copy size={14} aria-hidden />Copy new text</button>}
      </div>
      {rejecting && (
        <form className="ai-rej" onSubmit={(e) => { e.preventDefault(); onDecide([d.id], false, reason.trim()); setRejecting(false); }}>
          <input className="set-in" aria-label="Reason (the AI can read it)" placeholder="Why? The AI can read this" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} autoFocus />
          <button type="submit" className="btn btn-danger">Reject</button>
        </form>
      )}
      {open && (
        <div>
          {err && <p className="banner" data-k="conflict" role="alert">{err}</p>}
          {!detail && !err && <p className="meta" role="status">Loading…</p>}
          {detail && detail.titleAfter && detail.titleAfter !== detail.titleBefore && <p className="meta">Title: {detail.titleBefore || "(none)"} → {detail.titleAfter}</p>}
          {detail && (d.new_doc ? <pre className="ai-diff" tabIndex={0} aria-label="New document text">{detail.after}</pre> : <DiffText a={detail.before} b={detail.after} />)}
        </div>
      )}
    </div>
  );
}

function LiveDot({ state }: { state: "off" | "connecting" | "live" | "retry" }) {
  const label = state === "live" ? "Live: new edits appear by themselves" : state === "connecting" ? "Connecting…" : state === "retry" ? "Reconnecting; checking every minute" : "Updates every minute";
  return <span className={`chip ${state === "live" ? "ok" : state === "retry" ? "warn" : ""}`} role="status" title={label}>{state === "live" ? "Live" : state === "retry" ? "Reconnecting" : state === "connecting" ? "Connecting" : "Auto-check"}</span>;
}

export function InboxView() {
  const { isAdmin, notify, cloudState, liveTick, liveState } = useStore(useShallow((s) => ({ isAdmin: s.isAdmin, notify: s.notify, cloudState: s.cloudState, liveTick: s.liveTick, liveState: s.liveState })));
  const [sets, setSets] = useState<SetRow[] | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"pending" | "done" | "all">("pending");
  const [sel, setSel] = useState("");
  const [busy, setBusy] = useState(false);
  const els = useRef<Record<string, HTMLDivElement | null>>({});

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("change_sets")
      .select("id,project_id,title,summary,client,created_at,doc_drafts(id,project_id,change_set_id,doc_ref,base_rev,op,rationale,status,note,reject_reason,risk_score,risk_flags,new_doc,result_title,applied_rev,reverted_at,created_at,decided_at)")
      .order("created_at", { ascending: false }).limit(60);
    if (error) { setErr(error.message); return; }
    setErr("");
    const rows = (data ?? []) as unknown as SetRow[];
    const refs = [...new Set(rows.flatMap((r) => r.doc_drafts.filter((d) => !d.new_doc).map((d) => d.doc_ref)))];
    const t: Record<string, string> = {};
    if (refs.length) {
      const { data: docs } = await supabase.from("docs").select("ref,title").in("ref", refs.slice(0, 200));
      for (const x of docs ?? []) t[x.ref as string] = x.title as string;
    }
    setTitles(t); setSets(rows);
  }, []);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load, liveTick]);

  const decide = useCallback(async (ids: string[], approve: boolean, reason?: string) => {
    if (!supabase || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("decide_drafts", { p_ids: ids, p_approve: approve, p_reason: reason || null });
    setBusy(false);
    if (error) { notify(error.message); return; }
    const res = (data ?? []) as { id: string; status: string }[];
    const n = (s: string) => res.filter((r) => r.status === s).length;
    const applied = res.filter((r) => r.status === "applied").map((r) => r.id);
    const parts = [n("applied") && `${n("applied")} accepted`, n("approved") && `${n("approved")} approved to apply by hand`, n("rejected") && `${n("rejected")} rejected`, n("stale") && `${n("stale")} out of date`].filter(Boolean);
    notify(parts.join(", ") || "Nothing changed", applied.length ? () => { void Promise.all(applied.map((id) => supabase!.rpc("revert_draft", { p_id: id }))).then((rs) => { const bad = rs.find((r) => r.error); if (bad?.error) useStore.getState().notify(`Could not undo: ${bad.error.message}`); void load(); void refreshAi(); }); } : undefined);
    await load(); void refreshAi();
  }, [busy, notify, load]);

  const revert = useCallback(async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.rpc("revert_draft", { p_id: id });
    notify(error ? error.message : "Undone: the earlier text is back as a new version");
    await load(); void refreshAi();
  }, [notify, load]);

  const shown = useMemo(() => (sets ?? []).map((s) => ({ ...s, doc_drafts: s.doc_drafts.filter((d) => filter === "all" || (filter === "pending" ? d.status === "pending" : d.status !== "pending")).sort((a, b) => b.risk_score - a.risk_score) })).filter((s) => s.doc_drafts.length > 0), [sets, filter]);
  const flat = useMemo(() => shown.flatMap((s) => s.doc_drafts.map((d) => d.id)), [shown]);
  const pendingTotal = (sets ?? []).reduce((n, s) => n + s.doc_drafts.filter((d) => d.status === "pending").length, 0);

  const onKey = (e: React.KeyboardEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-id]");
    if (!el || (e.target as HTMLElement).closest("input,textarea,pre") || e.ctrlKey || e.metaKey || e.altKey) return;
    const id = el.dataset.id as string; const i = flat.indexOf(id);
    const move = (j: number) => { const t = flat[Math.min(flat.length - 1, Math.max(0, j))]; if (t) { setSel(t); els.current[t]?.focus(); } };
    const d = shown.flatMap((s) => s.doc_drafts).find((x) => x.id === id);
    const k = e.key.toLowerCase();
    if (k === "j") { e.preventDefault(); move(i + 1); }
    else if (k === "k") { e.preventDefault(); move(i - 1); }
    else if (k === "a" && d?.status === "pending") { e.preventDefault(); void decide([id], true); }
    else if (k === "r" && d?.status === "pending") { e.preventDefault(); el.querySelector<HTMLButtonElement>("button[data-act=reject]")?.click(); }
  };

  if (!CLOUD_AVAILABLE || (cloudState !== "synced" && cloudState !== "syncing" && cloudState !== "error")) return <div className="col enter"><h1 className="view-h">Review inbox</h1><p className="meta">Sign in under Settings, then Sync, to review edits that AI tools propose.</p></div>;
  if (!isAdmin) return <div className="col enter"><h1 className="view-h">Review inbox</h1><p className="meta">This account is not an administrator of the documentation, so there is nothing to review.</p></div>;
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)" }}>
      <style>{AI_CSS}</style>
      <h1 className="view-h">Review inbox</h1>
      <p className="meta">Everything an AI tool proposes through MCP waits here. Nothing becomes official until you accept it. Each edit shows what the AI saw (its base version), what it wants to change, and why it is flagged. Accepting writes a new version you can undo; you can also restore any older version from history.</p>
      <div className="ai-bar">
        <div className="seg" role="group" aria-label="Filter">
          <button type="button" aria-pressed={filter === "pending"} onClick={() => setFilter("pending")}>Waiting ({pendingTotal})</button>
          <button type="button" aria-pressed={filter === "done"} onClick={() => setFilter("done")}>Decided</button>
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All</button>
        </div>
        <span className="sp" />
        <LiveDot state={liveState} />
        <button type="button" className="btn" onClick={() => void load()}><RefreshCw size={14} aria-hidden />Refresh</button>
      </div>
      <p className="ai-keys">With an edit focused: <kbd>j</kbd>/<kbd>k</kbd> next/previous, <kbd>a</kbd> accept, <kbd>r</kbd> reject.</p>
      {err && <p className="banner" data-k="conflict" role="alert">{err}</p>}
      {sets === null && !err && <p className="meta" role="status">Loading…</p>}
      {sets !== null && shown.length === 0 && <p className="meta">{filter === "pending" ? "Nothing is waiting for review." : "No edits to show."}</p>}
      <div onKeyDown={onKey}>
        {shown.map((s) => {
          const pend = s.doc_drafts.filter((d) => d.status === "pending");
          const low = pend.filter((d) => riskLevel(d.risk_score) === "low");
          return (
            <section key={s.id} className="ai-set" aria-label={s.title}>
              <div className="ai-set-h">
                <span className="ai-set-t">{s.title}</span>
                <span className="meta" style={{ margin: 0 }}>{s.client ? `${s.client} · ` : ""}{ago(s.created_at)} · {s.doc_drafts.length} edit{s.doc_drafts.length === 1 ? "" : "s"}</span>
              </div>
              {s.summary && <p className="meta">{s.summary}</p>}
              {pend.length > 0 && (
                <div className="ai-set-a">
                  {low.length > 0 && pend.length > low.length && <button type="button" className="btn" disabled={busy} onClick={() => void decide(low.map((d) => d.id), true)}>Accept the {low.length} low-risk</button>}
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void decide(pend.map((d) => d.id), true)}>Accept all {pend.length}</button>
                  <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void decide(pend.map((d) => d.id), false, "Rejected with the whole change set")}>Reject all</button>
                </div>
              )}
              {s.doc_drafts.map((d) => <DraftCard key={d.id} d={d} docTitle={d.new_doc ? (d.result_title ?? d.doc_ref) : titles[d.doc_ref] ?? d.doc_ref} selected={sel === d.id} onDecide={decide} onRevert={revert} cardRef={(el) => { els.current[d.id] = el; }} />)}
            </section>
          );
        })}
      </div>
    </div>
  );
}

interface TokenRow { id: string; label: string; mode: string; path_prefixes: string[]; daily_limit: number; max_pending: number; expires_at: string | null; revoked_at: string | null; last_used_at: string | null; last_client: string | null; created_at: string }
interface AuditRow { ts: string; token_label: string | null; tool: string; ref: string | null; status: string }

export function AccessView() {
  const { isAdmin, notify, cloudState, liveTick } = useStore(useShallow((s) => ({ isAdmin: s.isAdmin, notify: s.notify, cloudState: s.cloudState, liveTick: s.liveTick })));
  const [project, setProject] = useState<{ id: string; slug: string; name: string; paused: boolean } | null>(null);
  const [guide, setGuide] = useState("");
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ label: "", mode: "read", days: "30", limit: "500", pending: "20", prefixes: "" });
  const [secret, setSecret] = useState("");
  const [tab, setTab] = useState<"gemini" | "claude" | "cursor" | "curl">("gemini");
  const [test, setTest] = useState("");
  const [busy, setBusy] = useState(false);
  const base = `${SB_URL ?? ""}/functions/v1/docs-mcp`;

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data: ps, error } = await supabase.from("projects").select("id,slug,name,ai_paused,ai_guide").order("created_at").limit(1);
    if (error || !ps?.[0]) { setErr(error?.message ?? "No project found"); return; }
    const p = { id: ps[0].id as string, slug: ps[0].slug as string, name: ps[0].name as string, paused: !!ps[0].ai_paused };
    setProject(p); setGuide((ps[0].ai_guide as string | null) ?? ""); setErr("");
    const [t, a] = await Promise.all([
      supabase.from("mcp_tokens").select("id,label,mode,path_prefixes,daily_limit,max_pending,expires_at,revoked_at,last_used_at,last_client,created_at").eq("project_id", p.id).order("created_at", { ascending: false }),
      supabase.rpc("mcp_audit_recent", { p_slug: p.slug, p_limit: 40 })
    ]);
    setTokens((t.data ?? []) as TokenRow[]); setAudit((a.data ?? []) as AuditRow[]);
  }, []);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load, liveTick]);
  useEffect(() => () => setSecret(""), []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !project || busy) return;
    setBusy(true); setTest("");
    const days = Number(f.days) || 30;
    const { data, error } = await supabase.rpc("create_mcp_token", { p_project: project.slug, p_label: f.label.trim(), p_mode: f.mode, p_prefixes: f.prefixes.split(",").map((s) => s.trim()).filter(Boolean), p_ttl_days: days, p_daily_limit: Number(f.limit) || 500 });
    if (error || typeof data !== "string") { setBusy(false); notify(error?.message ?? "Could not create the token"); return; }
    const { data: row } = await supabase.from("mcp_tokens").select("id").eq("project_id", project.id).eq("label", f.label.trim()).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (row) await supabase.from("mcp_tokens").update({ max_pending: Math.min(200, Math.max(1, Number(f.pending) || 20)) }).eq("id", row.id);
    setSecret(data); setF({ ...f, label: "" }); setBusy(false);
    await load();
  };
  const revoke = async (id: string) => { if (!supabase) return; const { error } = await supabase.from("mcp_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", id); notify(error ? error.message : "Token revoked"); await load(); };
  const revokeAll = async () => {
    if (!supabase || !project || !window.confirm("Revoke every active token for this project? AI tools lose access immediately.")) return;
    const { error } = await supabase.from("mcp_tokens").update({ revoked_at: new Date().toISOString() }).eq("project_id", project.id).is("revoked_at", null);
    notify(error ? error.message : "All tokens revoked"); await load();
  };
  const pause = async () => {
    if (!supabase || !project) return;
    const { error } = await supabase.from("projects").update({ ai_paused: !project.paused }).eq("id", project.id);
    notify(error ? error.message : project.paused ? "AI access resumed" : "AI access paused"); await load();
  };
  const saveGuide = async () => {
    if (!supabase || !project) return;
    const { error } = await supabase.from("projects").update({ ai_guide: guide.trim() }).eq("id", project.id);
    notify(error ? error.message : "Message saved. AI tools read it when they call get_guide");
  };
  const runTest = async () => {
    setTest("Testing…");
    const meta = { "io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientInfo": { name: "workbench-test", version: "1" }, "io.modelcontextprotocol/clientCapabilities": {} };
    try {
      const r = await fetch(`${base}/${secret}`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": "tools/list" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: meta } }) });
      const t = await r.text(); const d = t.startsWith("event:") ? (t.split("\n").find((l) => l.startsWith("data:")) ?? "").slice(5) : t;
      const names = ((JSON.parse(d).result?.tools ?? []) as { name: string }[]).map((x) => x.name);
      setTest(names.length ? `Works: ${names.length} tools (${names.join(", ")})` : "The server answered but listed no tools");
    } catch { setTest("Could not reach the server"); }
  };

  if (!CLOUD_AVAILABLE || (cloudState !== "synced" && cloudState !== "syncing" && cloudState !== "error")) return <div className="col enter"><h1 className="view-h">AI access</h1><p className="meta">Sign in under Settings, then Sync, to manage AI access.</p></div>;
  if (!isAdmin) return <div className="col enter"><h1 className="view-h">AI access</h1><p className="meta">This account is not an administrator of the documentation.</p></div>;
  const url = `${base}/${secret || "TOKEN"}`;
  const snips = {
    gemini: `Gemini app: Settings → Apps → Add custom app → URL:\n${url}\n(no sign-in option)`,
    claude: `claude mcp add --transport http docs ${base} --header "Authorization: Bearer ${secret || "TOKEN"}"`,
    cursor: JSON.stringify({ mcpServers: { docs: { url: base, headers: { Authorization: `Bearer ${secret || "TOKEN"}` } } } }, null, 2),
    curl: `curl -s ${base} -H "Authorization: Bearer ${secret || "TOKEN"}" -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -H "MCP-Protocol-Version: 2026-07-28" -H "Mcp-Method: tools/list" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientInfo":{"name":"curl","version":"1"},"io.modelcontextprotocol/clientCapabilities":{}}}}'`
  };
  const state = (t: TokenRow) => (t.revoked_at ? "Revoked" : t.expires_at && new Date(t.expires_at) < new Date() ? "Expired" : "Active");
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)" }}>
      <style>{AI_CSS}</style>
      <h1 className="view-h">AI access</h1>
      <p className="meta">A token lets an AI tool read your documentation (and, in propose mode, send edits to the review inbox). It can never publish anything by itself. Reading public projects needs no token.</p>
      {err && <p className="banner" data-k="conflict" role="alert">{err}</p>}
      {project && (
        <div className="ai-bar">
          <span className="chip">{project.name}</span>
          <button type="button" className={`btn ${project.paused ? "btn-primary" : ""}`} onClick={() => void pause()}>{project.paused ? <><Play size={14} aria-hidden />Resume AI access</> : <><Pause size={14} aria-hidden />Pause AI access</>}</button>
          <button type="button" className="btn btn-danger" onClick={() => void revokeAll()}>Revoke all tokens</button>
          {project.paused && <span className="chip bad">Paused: tokens are refused</span>}
        </div>
      )}
      <h2 className="set-h">Message for AI tools</h2>
      <p className="meta">Shown to every AI tool when it calls <span className="mono">get_guide</span>, next to the built-in rules (which documents can be edited and how). Use it for your own rules, for example "only fix typos" or "never touch the Governor chapter".</p>
      <textarea className="set-in" style={{ width: "100%", height: 96, padding: 10, resize: "vertical" }} aria-label="Message for AI tools" maxLength={4000} value={guide} onChange={(e) => setGuide(e.target.value)} />
      <div className="actions"><button type="button" className="btn" onClick={() => void saveGuide()}>Save message</button></div>
      <h2 className="set-h">New token</h2>
      <form onSubmit={create}>
        <div className="ai-form">
          <label>Name<input className="set-in" required maxLength={80} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Gemini on my phone" /></label>
          <label>Can<select className="set-in" value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}><option value="read">Read only</option><option value="propose">Read and propose edits</option></select></label>
          <label>Expires<select className="set-in" value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })}><option value="7">in 7 days</option><option value="30">in 30 days</option><option value="90">in 90 days</option><option value="365">in 1 year</option></select></label>
          <label>Requests per day<input className="set-in" type="number" min={1} max={100000} value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} /></label>
          {f.mode === "propose" && <label>Waiting edits at most<input className="set-in" type="number" min={1} max={200} value={f.pending} onChange={(e) => setF({ ...f, pending: e.target.value })} /></label>}
          <label>Only these id prefixes (optional)<input className="set-in" value={f.prefixes} onChange={(e) => setF({ ...f, prefixes: e.target.value })} placeholder="crate:, pack:" /></label>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || !f.label.trim()}>Create token</button>
      </form>
      {secret && (
        <div className="trk" style={{ marginTop: 14 }}>
          <b>Copy it now: it is shown only once.</b>
          <code className="ai-secret" aria-label="New token">{secret}</code>
          <div className="actions">
            <button type="button" className="btn" onClick={async () => notify((await copyText(secret)) ? "Token copied" : "Could not copy")}><Copy size={14} aria-hidden />Copy token</button>
            <button type="button" className="btn" onClick={() => void runTest()}>Test it</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setSecret(""); setTest(""); }}>I saved it</button>
          </div>
          {test && <p className="meta" role="status">{test}</p>}
          <div className="seg" role="group" aria-label="Client">
            {(["gemini", "claude", "cursor", "curl"] as const).map((k) => <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>{k === "gemini" ? "Gemini" : k === "claude" ? "Claude Code" : k === "cursor" ? "Cursor / VS Code" : "curl"}</button>)}
          </div>
          <div className="ai-snip"><pre>{snips[tab]}</pre></div>
          {tab === "gemini" && <p className="meta">This puts the token inside the address, because the Gemini app cannot send headers. Treat the address like a password and use a read-only token with a short expiry.</p>}
        </div>
      )}
      <h2 className="set-h">Tokens</h2>
      {tokens.length === 0 && <p className="meta">No tokens yet.</p>}
      {tokens.map((t) => (
        <div key={t.id} className="ai-tok">
          <b>{t.label}</b><span className={`chip ${state(t) === "Active" ? "ok" : "bad"}`}>{state(t)}</span><span className="chip">{t.mode === "propose" ? "Read + propose" : "Read only"}</span>
          <span className="meta" style={{ margin: 0 }}>{t.last_used_at ? `used ${ago(t.last_used_at)}${t.last_client ? ` by ${t.last_client}` : ""}` : "never used"} · {t.expires_at ? `expires ${new Date(t.expires_at).toLocaleDateString()}` : "no expiry"}{t.path_prefixes.length ? ` · only ${t.path_prefixes.join(", ")}` : ""}</span>
          <span className="sp" />
          {state(t) === "Active" && <button type="button" className="btn btn-danger" onClick={() => void revoke(t.id)}>Revoke</button>}
        </div>
      ))}
      <h2 className="set-h">Recent activity</h2>
      {audit.length === 0 ? <p className="meta">No activity yet.</p> : (
        <table className="ai-tbl"><thead><tr><th>When</th><th>Token</th><th>Tool</th><th>Document</th><th>Result</th></tr></thead>
          <tbody>{audit.map((a, i) => <tr key={i}><td>{ago(a.ts)}</td><td>{a.token_label ?? "public"}</td><td className="mono">{a.tool}</td><td className="mono">{a.ref ?? ""}</td><td>{a.status}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}
// #endregion
