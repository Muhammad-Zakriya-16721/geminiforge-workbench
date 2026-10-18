// #region 5j. PEEK: show the page an AI edit touched, with the changed passage highlighted (CSS Custom Highlight API; no DOM changes, so React is not disturbed)
const PEEK_CSS = `
::highlight(gf-passage){background:rgba(217,119,87,.38);color:inherit}
.ai-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,var(--peekw,42%));gap:18px;align-items:start}
.ai-peek{position:sticky;top:8px;border:1px solid var(--line2);border-radius:14px;background:var(--raise);max-height:calc(100dvh - 120px);display:flex;flex-direction:column;font-family:var(--sans);min-width:0}
.ai-peek-h{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line)}
.ai-peek-h b{font-weight:600;color:var(--tx);flex:1;min-width:140px}
.ai-peek-b{padding:6px 14px 14px;overflow:auto}
.ai-d-open{margin-left:auto}
@media (max-width:900px){.ai-split{display:block}.ai-peek{position:fixed;inset:0;z-index:60;max-height:none;border-radius:0}}
`;

// text of a Markdown-ish source without its markup, so it can be found in the rendered page
const plainText = (t: string) => t.replace(/\*\*|`/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/^#{1,6}\s+/gm, "");

// highlights the first occurrence of `raw` inside `root` and scrolls it into view; returns false when it cannot be found
export function markPassage(root: HTMLElement, raw: string): boolean {
  // the app has its own `CSS` string constant, so the browser object is read from globalThis
  const hl = (globalThis as unknown as { CSS?: { highlights?: Map<string, unknown> } }).CSS?.highlights;
  const H = (window as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
  const needle = plainText(raw).replace(/\s+/g, " ").trim();
  if (needle.length < 3) return false;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: { n: Text; start: number }[] = [];
  let all = "";
  for (let n = walker.nextNode(); n; n = walker.nextNode()) { nodes.push({ n: n as Text, start: all.length }); all += n.nodeValue ?? ""; }
  let norm = ""; const map: number[] = []; let prevSp = true;
  for (let i = 0; i < all.length; i++) {
    if (/\s/.test(all[i])) { if (!prevSp) { norm += " "; map.push(i); } prevSp = true; } else { norm += all[i]; map.push(i); prevSp = false; }
  }
  const low = norm.toLowerCase();
  let len = needle.length;
  let idx = low.indexOf(needle.toLowerCase());
  if (idx < 0 && needle.length > 48) { len = 48; idx = low.indexOf(needle.slice(0, 48).toLowerCase()); } // the passage may cross formatting: match its start
  if (idx < 0) return false;
  const s = map[idx], e = map[Math.min(map.length - 1, idx + len - 1)] + 1;
  const loc = (pos: number) => { for (let k = nodes.length - 1; k >= 0; k--) if (nodes[k].start <= pos) return { node: nodes[k].n, off: pos - nodes[k].start }; return null; };
  const a = loc(s), b = loc(e - 1);
  if (!a || !b) return false;
  const range = document.createRange();
  range.setStart(a.node, Math.min(a.off, a.node.length)); range.setEnd(b.node, Math.min(b.off + 1, b.node.length));
  if (hl && H) { hl.set("gf-passage", new H(range)); setTimeout(() => hl.delete("gf-passage"), 9000); }
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  a.node.parentElement?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  return true;
}

// where the real page for a document id lives in the app
function openDocument(ref: string, passage = "") {
  const st = useStore.getState();
  st.set({}); useStore.setState({ highlight: passage });
  const [kind, ...rest] = ref.split(":"); const id = rest.join(":");
  if (kind === "chapter") { const [c, sec] = id.split("#"); st.go({ kind: "chapter", id: c, sec: sec || undefined }); return true; }
  if (kind === "crate" || kind === "pack" || kind === "prompt" || kind === "patch" || kind === "spike") { st.go({ kind: kind === "prompt" ? "tracker" : "library" }, { kind, id }); return true; }
  if (kind === "confirm") { st.go({ kind: "library" }, { kind: "confirm", id }); return true; }
  if (kind === "claim") { st.go({ kind: "audit" }); return true; }
  st.go({ kind: "pages", ref }); return true;
}

// the text that changed: before the edit for waiting/rejected edits, after it for accepted ones
const passageOf = (d: { status: string; reverted_at: string | null }, p: Record<string, unknown> | null): string => {
  if (!p) return "";
  const accepted = d.status === "applied" && !d.reverted_at;
  const s = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  return accepted ? s("replace") || s("text") || s("find") || s("anchor") : s("find") || s("anchor");
};

export function PeekPanel({ d, docTitle, wide, onWide, onClose }: { d: DraftRow; docTitle: string; wide: boolean; onWide: () => void; onClose: () => void }) {
  const [body, setBody] = useState<string | null>(null);
  const [title, setTitle] = useState(docTitle);
  const [passage, setPassage] = useState("");
  const [err, setErr] = useState("");
  const box = useRef<HTMLDivElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!supabase) return;
    let off = false;
    setBody(null); setErr("");
    void (async () => {
      const [doc, dr] = await Promise.all([
        d.new_doc ? supabase!.from("docs").select("title,body").eq("project_id", d.project_id).eq("ref", d.doc_ref).maybeSingle() : supabase!.from("docs").select("title,body").eq("project_id", d.project_id).eq("ref", d.doc_ref).is("deleted_at", null).maybeSingle(),
        supabase!.from("doc_drafts").select("payload").eq("id", d.id).single()
      ]);
      if (off) return;
      if (doc.error || dr.error) { setErr((doc.error ?? dr.error)?.message ?? "Could not load the page"); return; }
      setBody((doc.data?.body as string | undefined) ?? ""); setTitle((doc.data?.title as string | undefined) ?? docTitle);
      setPassage(passageOf(d, (dr.data?.payload as Record<string, unknown> | null) ?? null));
    })();
    return () => { off = true; };
  }, [d, docTitle]);
  const show = useCallback(() => { if (box.current && passage) markPassage(box.current, passage); }, [passage]);
  useEffect(() => { if (body !== null) { const t = setTimeout(show, 60); return () => clearTimeout(t); } }, [body, show]);
  useEffect(() => { closeBtn.current?.focus(); }, []);
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
  return (
    <aside className="ai-peek" role="complementary" aria-label={`Page: ${title}`} onKeyDown={onKey}>
      <div className="ai-peek-h">
        <b>{title}</b>
        <button type="button" className="btn" onClick={show} disabled={!passage}>Show the change</button>
        <button type="button" className="btn" onClick={() => openDocument(d.doc_ref, passage)}>Open the page</button>
        <button type="button" className="btn btn-ghost" aria-pressed={wide} onClick={onWide} title="Make the panel wider or narrower">{wide ? "Narrower" : "Wider"}</button>
        <button type="button" className="btn btn-ghost" ref={closeBtn} onClick={onClose} aria-label="Close the page panel (Esc)"><X size={15} aria-hidden /></button>
      </div>
      <div className="ai-peek-b" ref={box}>
        {err && <p className="banner" data-k="conflict" role="alert">{err}</p>}
        {body === null && !err && <p className="meta" role="status">Loading…</p>}
        {body !== null && (body ? <Md text={body} /> : <p className="meta">This page has no text yet.</p>)}
        {body !== null && passage && <p className="meta" style={{ marginTop: 10 }}>{d.status === "applied" && !d.reverted_at ? "Highlighted: the text this edit wrote." : "Highlighted: the text this edit wants to change."}</p>}
      </div>
    </aside>
  );
}
// #endregion
