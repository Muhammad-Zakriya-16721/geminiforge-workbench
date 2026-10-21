// #region 5h. ADDED PAGES: documents that are not generated from the spec data (accepted AI proposals and pages you write). Read, edit, history, restore.
const PAGES_CSS = `
.pg-row{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:var(--raise);margin-bottom:8px;font:400 14px var(--sans);width:100%;text-align:left;color:var(--tx2)}
label.btn:focus-within{outline:2px solid var(--focus);outline-offset:2px}
.pg-row:hover{background:var(--hover);color:var(--tx)}.pg-row b{font-weight:500;color:var(--tx)}.pg-row .sp{flex:1}
.md-h3{font:600 18px/1.3 var(--sans);color:var(--tx);margin:24px 0 8px}
.md ul,.md ol{margin:0 0 14px;padding-left:24px}.md li{margin:3px 0}.md blockquote{margin:0 0 14px;padding:2px 14px;border-left:3px solid var(--line2);color:var(--tx3)}
.md table{border-collapse:collapse;margin:0 0 14px;font:400 14px/1.5 var(--sans);display:block;overflow-x:auto;max-width:100%}.md th,.md td{border:1px solid var(--line2);padding:5px 10px;text-align:left;vertical-align:top}.md th{background:rgba(255,255,255,.04);font-weight:600;color:var(--tx)}
.md hr{border:0;border-top:1px solid var(--line);margin:22px 0}.md pre.code{padding:12px 14px;margin:10px 0 14px;font:400 13px/1.6 var(--mono);white-space:pre-wrap;word-break:break-word;color:var(--tx2)}
.pg-ed{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pg-ed textarea{width:100%;min-height:360px;resize:vertical;border:1px solid var(--line2);background:#181715;border-radius:10px;color:var(--tx);padding:10px 12px;font:400 13.5px/1.55 var(--mono)}
.pg-ed .pv{border:1px solid var(--line);border-radius:10px;padding:4px 14px;max-height:520px;overflow:auto}
@media (max-width:900px){.pg-ed{grid-template-columns:1fr}}
`;

// Small Markdown reader: headings, lists, quotes, code fences, rules and paragraphs. Raw HTML is shown as text and only https links are clickable.
function Md({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: React.ReactNode[] = [];
  let i = 0, k = 0;
  const startsBlock = (l: string) => /^(```|#{1,6}\s|>|\s*([-*]|\d+\.)\s+|(-{3,}|\*{3,})\s*$)/.test(l);
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (/^```/.test(l)) {
      const buf: string[] = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(<pre key={k++} className="code"><code>{buf.join("\n")}</code></pre>);
      continue;
    }
    if (l.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes("-")) {
      const cells = (row: string) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
      const head = cells(l); i += 2; const rows: string[][] = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) rows.push(cells(lines[i++]));
      out.push(<table key={k++}><thead><tr>{head.map((c, j) => <th key={j} scope="col"><Inline text={c} /></th>)}</tr></thead><tbody>{rows.map((r, a) => <tr key={a}>{head.map((_, j) => <td key={j}><Inline text={r[j] ?? ""} /></td>)}</tr>)}</tbody></table>);
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(l);
    if (h) {
      const n = h[1].length;
      out.push(n === 1 ? <h2 key={k++} className="h2"><Inline text={h[2]} /></h2> : n === 2 ? <h3 key={k++} className="md-h3"><Inline text={h[2]} /></h3> : <h4 key={k++} className="md-h3"><Inline text={h[2]} /></h4>);
      i++; continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(l)) { out.push(<hr key={k++} />); i++; continue; }
    if (/^>/.test(l)) {
      const buf: string[] = [];
      while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(<blockquote key={k++}><Inline text={buf.join(" ")} /></blockquote>);
      continue;
    }
    const li = /^\s*([-*]|\d+\.)\s+/.exec(l);
    if (li) {
      const ordered = /\d/.test(li[1]); const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const kids = items.map((t, j) => <li key={j}><Inline text={t} /></li>);
      out.push(ordered ? <ol key={k++}>{kids}</ol> : <ul key={k++}>{kids}</ul>);
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && (buf.length === 0 || !startsBlock(lines[i]))) buf.push(lines[i++]);
    out.push(<p key={k++} className="p"><Inline text={buf.join(" ")} /></p>);
  }
  return <div className="md doc">{out}</div>;
}

interface PageRow { id: string; project_id: string; ref: string; kind: string; title: string; rev: number; updated_at: string; body?: string }
interface RevRow { rev: number; kind: string; created_at: string; title: string }
const REV_LABEL: Record<string, string> = { ai: "Accepted AI edit", revert: "Undo", edit: "Edit", sync: "Generated" };

export function PagesView({ refId }: { refId?: string }) {
  const { isAdmin: canEdit, projectId, adminChecked, notify, go, cloudState, liveTick } = useStore(useShallow((s) => ({ projectId: s.projectId, isAdmin: s.isAdmin, adminChecked: s.adminChecked, notify: s.notify, go: s.go, cloudState: s.cloudState, liveTick: s.liveTick })));
  const [rows, setRows] = useState<PageRow[] | null>(null);
  const [page, setPage] = useState<PageRow | null>(null);
  const [revs, setRevs] = useState<RevRow[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [err, setErr] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const loadList = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("docs").select("id,project_id,ref,kind,title,rev,updated_at").eq("project_id", projectId).eq("source", "native").is("deleted_at", null).order("updated_at", { ascending: false }).limit(200);
    if (error) { setErr(error.message); return; }
    setErr(""); setRows((data ?? []) as PageRow[]);
  }, [projectId]);
  const loadPage = useCallback(async (r: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.from("docs").select("id,project_id,ref,kind,title,rev,updated_at,body").eq("project_id", projectId).eq("source", "native").is("deleted_at", null).eq("ref", r).maybeSingle();
    if (error) { setErr(error.message); return; }
    setErr(""); setPage((data as PageRow | null) ?? null); setEditing(false);
    if (data) {
      const { data: rv } = await supabase.from("doc_revisions").select("rev,kind,created_at,title").eq("doc_id", data.id).order("rev", { ascending: false }).limit(30);
      setRevs((rv ?? []) as RevRow[]);
    }
  }, [projectId]);
  useEffect(() => { setPage(null); }, [refId]);
  // an update from the server refreshes in place; while you are editing it must not overwrite your text
  useEffect(() => { if (refId) { if (!editing) void loadPage(refId); } else void loadList(); }, [refId, loadList, loadPage, liveTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // leaving the tab or closing the window with unsaved text asks first (shortcut: moving to another screen inside the app is not guarded)
  useEffect(() => {
    if (!editing || !page || draft === (page.body ?? "")) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editing, page, draft]);
  const save = async () => {
    if (!supabase || !page) return;
    // only if nobody changed the page since it was opened (an accepted AI edit would otherwise be overwritten)
    const { data: done, error } = await supabase.from("docs").update({ body: draft, title: title.trim() || page.title }).eq("id", page.id).eq("rev", page.rev).select("id");
    if (error) { notify(error.message); return; }
    if (!done?.length) { notify("This page changed while you were editing (for example an accepted AI edit). Your text is still in the box: copy it, then reopen the page and apply it again."); return; }
    notify("Saved as a new version"); await loadPage(page.ref);
  };
  const restore = async (rev: number) => {
    if (!supabase || !page) return;
    const { data, error } = await supabase.from("doc_revisions").select("body,title").eq("doc_id", page.id).eq("rev", rev).single();
    if (error || !data) { notify(error?.message ?? "Version not found"); return; }
    const r = await supabase.from("docs").update({ body: data.body, title: data.title }).eq("id", page.id);
    notify(r.error ? r.error.message : `Version ${rev} restored as a new version`); await loadPage(page.ref);
  };
  const trashPage = async () => {
    if (!supabase || !page) return;
    const id = page.id;
    const { data, error } = await supabase.rpc("trash_pages", { p_ids: [id] });
    const r = data as { done: string[]; refused: { reason: string }[] } | null;
    if (error || !r?.done.length) { notify(error?.message ?? r?.refused[0]?.reason ?? "Could not move it"); return; }
    notify("Page moved to the Trash", () => { void supabase!.rpc("restore_pages", { p_ids: [id] }).then(() => { void refreshAi(); }); });
    void refreshAi(); go({ kind: "pages" });
  };
  const createPage = async (ttl: string, text: string): Promise<boolean> => {
    if (!supabase || !ttl.trim()) return false;
    // titles in other scripts (Urdu, Arabic, ...) have no Latin letters, so they get a short generated id; the title itself is kept as typed
    const slug = ttl.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || `p-${Date.now().toString(36)}`;
    if (!projectId) { notify("No project selected"); return false; }
    const { error } = await supabase.from("docs").insert({ project_id: projectId, ref: `page:${slug}`, kind: "page", title: ttl.trim().slice(0, 200), body: text, source: "native" });
    if (error) { notify(error.code === "23505" ? "A page with that name already exists (it may be in the Trash)" : error.message); return false; }
    go({ kind: "pages", ref: `page:${slug}` });
    return true;
  };
  const create = async (e: React.FormEvent) => { e.preventDefault(); if (await createPage(newTitle, "")) setNewTitle(""); };
  // a Markdown file becomes a new page; the title is its first "# " line or the file name
  const importFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 200_000) { notify("That file is larger than 200 KB"); return; }
    const text = (await f.text()).replace(/\r\n?/g, "\n");
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) { notify("That does not look like a text file"); return; }
    const h1 = /^#\s+(.+)$/m.exec(text);
    await createPage(h1 ? h1[1] : f.name.replace(/\.[^.]+$/, ""), text);
  };
  const downloadMd = () => {
    if (!page) return;
    const url = URL.createObjectURL(new Blob([page.body ?? ""], { type: "text/markdown" }));
    const a = document.createElement("a"); a.href = url; a.download = `${page.ref.replace(/^page:/, "").replace(/[^\w.-]+/g, "-") || "page"}.md`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  if (!CLOUD_AVAILABLE || (cloudState !== "synced" && cloudState !== "syncing" && cloudState !== "error")) return <div className="col enter"><h1 className="view-h">Added pages</h1><p className="meta">Sign in under Settings, then Sync, to see pages.</p></div>;
  if (!projectId && !adminChecked) return <div className="col enter"><h1 className="view-h">Added pages</h1><p className="meta" role="status">Loading…</p></div>;
  if (!projectId) return <div className="col enter"><h1 className="view-h">Added pages</h1><p className="meta">You have no project yet. Ask a project manager to invite you.</p></div>;

  if (!refId) {
    return (
      <div className="col enter" style={{ fontFamily: "var(--sans)" }}>
        <style>{AI_CSS}{PAGES_CSS}</style>
        <h1 className="view-h">Added pages</h1>
        <p className="meta">Pages that are not generated from the specification data: documents an AI tool proposed and you accepted, and pages you write yourself. The chapters, crates, packs and the rest stay under their own sections.</p>
        {canEdit && <form className="ai-bar" onSubmit={create}>
          <input className="set-in" style={{ width: 260 }} aria-label="New page title" placeholder="New page title" maxLength={120} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <button type="submit" className="btn" disabled={!newTitle.trim()}><Plus size={14} aria-hidden />New page</button>
          <label className="btn" style={{ cursor: "pointer" }}>Import a Markdown file<input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} onChange={(e) => { void importFile(e.target.files?.[0]); e.target.value = ""; }} /></label>
        </form>}
        {err && <p className="banner" data-k="conflict" role="alert">{err}</p>}
        {rows === null && !err && <p className="meta" role="status">Loading…</p>}
        {rows?.length === 0 && <p className="meta">No added pages yet.</p>}
        {rows?.map((r) => (
          <button key={r.id} type="button" className="pg-row" onClick={() => go({ kind: "pages", ref: r.ref })}>
            <b>{r.title}</b><span className="chip">{r.kind}</span><span className="mono dim small">{r.ref}</span><span className="sp" /><span className="meta" style={{ margin: 0 }}>v{r.rev} · {ago(r.updated_at)}</span>
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)" }}>
      <style>{AI_CSS}{PAGES_CSS}</style>
      <button type="button" className="btn btn-ghost" onClick={() => go({ kind: "pages" })}><ChevronRight size={14} aria-hidden style={{ transform: "rotate(180deg)" }} />All added pages</button>
      {err && <p className="banner" data-k="conflict" role="alert">{err}</p>}
      {!page && !err && <p className="meta" role="status">Loading…</p>}
      {page && (
        <>
          <h1 className="view-h">{page.title}</h1>
          <p className="meta"><span className="mono">{page.ref}</span> · version {page.rev} · {ago(page.updated_at)}</p>
          <div className="actions">
            {canEdit && !editing && <button type="button" className="btn" onClick={() => { setDraft(page.body ?? ""); setTitle(page.title); setEditing(true); }}>Edit</button>}
            {editing && <button type="button" className="btn btn-primary" onClick={() => void save()}>Save</button>}
            {editing && <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>}
            <button type="button" className="btn btn-ghost" onClick={async () => notify((await copyText(page.body ?? "")) ? "Copied as Markdown" : "Could not copy")}><Copy size={14} aria-hidden />Copy Markdown</button>
            <button type="button" className="btn btn-ghost" onClick={downloadMd}>Download .md</button>
            {canEdit && <button type="button" className="btn btn-ghost" onClick={() => void trashPage()}><Trash2 size={14} aria-hidden />Move to Trash</button>}
          </div>
          {editing ? (
            <>
              <label className="meta" style={{ display: "block", marginTop: 10 }}>Title<input className="set-in" style={{ display: "block", width: "100%", marginTop: 4 }} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
              <div className="pg-ed" style={{ marginTop: 10 }}>
                <textarea aria-label="Markdown text" maxLength={200000} value={draft} onChange={(e) => setDraft(e.target.value)} />
                <div className="pv" aria-label="Preview"><Md text={draft} /></div>
              </div>
            </>
          ) : (page.body ? <Md text={page.body} /> : <p className="meta">This page is empty. Use Edit to write it.</p>)}
          <h2 className="set-h">History</h2>
          {revs.map((r) => (
            <div key={r.rev} className="ai-tok">
              <b>Version {r.rev}</b><span className={`chip ${r.kind === "ai" ? "warn" : ""}`}>{REV_LABEL[r.kind] ?? r.kind}</span><span className="meta" style={{ margin: 0 }}>{ago(r.created_at)}</span><span className="sp" />
              {canEdit && r.rev !== page.rev && <button type="button" className="btn" onClick={() => void restore(r.rev)}><Undo2 size={14} aria-hidden />Restore</button>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
// #endregion
