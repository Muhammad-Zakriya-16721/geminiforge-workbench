// #region 5g3. OWNER TOOLS: backup download, llms.txt, access checks, tab-title badge. Needs Supabase, so the Canvas build stubs it.
function downloadFile(name: string, mime: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
const stamp = () => new Date().toISOString().slice(0, 10);

// everything the owner created in the app, as one JSON file (token secrets do not exist in the database, so none can be exported)
async function exportOwnerBackup(notify: (m: string) => void) {
  const pid = useStore.getState().projectId;
  if (!supabase || !pid) return;
  const sb = supabase;
  const [proj, pages, sets, ver, ev, toks] = await Promise.all([
    sb.from("projects").select("id,slug,name,description,ai_guide,ai_paused,visibility").eq("id", pid).limit(1),
    sb.from("docs").select("id,ref,kind,title,body,rev,updated_at,deleted_at").eq("project_id", pid).eq("source", "native"),
    sb.from("change_sets").select("id,title,summary,client,created_at,deleted_at,doc_drafts(id,doc_ref,op,status,rationale,note,reject_reason,risk_score,risk_flags,payload,result_title,result_body,base_rev,applied_rev,reverted_at,created_at,decided_at)").eq("project_id", pid).order("created_at", { ascending: false }).limit(1000),
    sb.from("instruction_versions").select("token_id,body,at").eq("project_id", pid).order("at", { ascending: false }).limit(500),
    sb.from("token_events").select("token_id,action,detail,at").eq("project_id", pid).order("at", { ascending: false }).limit(500),
    sb.from("mcp_tokens").select("id,label,mode,path_prefixes,daily_limit,max_pending,expires_at,revoked_at,created_at,ai_note").eq("project_id", pid)
  ]);
  const bad = [proj, pages, sets, ver, ev, toks].find((r) => r.error);
  if (bad?.error) { notify(`Backup failed: ${bad.error.message}`); return; }
  const pageRows = (pages.data ?? []) as { id: string }[];
  const revs = pageRows.length ? await sb.from("doc_revisions").select("doc_id,rev,kind,title,body,created_at").in("doc_id", pageRows.map((p) => p.id)).order("rev", { ascending: false }).limit(5000) : { data: [], error: null };
  if (revs.error) { notify(`Backup failed: ${revs.error.message}`); return; }
  const out = { format: "geminiforge-backup", version: 1, exported_at: new Date().toISOString(), project: proj.data?.[0] ?? null, added_pages: pages.data, page_history: revs.data, change_sets: sets.data, messages_history: ver.data, token_changes: ev.data, tokens_without_secrets: toks.data };
  downloadFile(`geminiforge-backup-${stamp()}.json`, "application/json", JSON.stringify(out, null, 2));
  notify(`Backup downloaded: ${pageRows.length} pages, ${(sets.data ?? []).length} change sets`);
}

// a plain-text map of the documentation for AI tools that read files (the MCP address is public; tokens are never included)
async function exportLlmsTxt(notify: (m: string) => void, mcpUrl: string) {
  if (!supabase) return;
  const { data: ps } = await supabase.from("projects").select("id,name,description").eq("id", useStore.getState().projectId).limit(1);
  const p = ps?.[0]; if (!p) { notify("No project found"); return; }
  const { data, error } = await supabase.from("docs").select("ref,kind,title").eq("project_id", p.id).is("deleted_at", null).order("kind").order("ref").limit(2000);
  if (error) { notify(error.message); return; }
  const byKind = new Map<string, { ref: string; title: string }[]>();
  for (const d of data ?? []) { const a = byKind.get(d.kind as string) ?? []; a.push({ ref: d.ref as string, title: d.title as string }); byKind.set(d.kind as string, a); }
  const lines = [`# ${p.name}`, "", `> ${(p.description as string | null) || "Documentation"}`, "", `Read it through MCP: ${mcpUrl} (tools: get_guide, search_docs, read_doc, get_outline). Ask the owner for an access token if you need to propose edits.`, ""];
  for (const [kind, items] of byKind) { lines.push(`## ${kind} (${items.length})`, ...items.map((i) => `- ${i.ref}: ${i.title}`), ""); }
  downloadFile(`llms-${stamp()}.txt`, "text/plain", lines.join("\n"));
  notify(`llms.txt downloaded: ${(data ?? []).length} documents`);
}

interface CheckTok { label: string; mode: string; path_prefixes: string[]; expires_at: string | null; revoked_at: string | null; last_used_at: string | null; created_at: string }
// quick, local checks of the AI access settings; each line says what to look at
function accessChecks(tokens: CheckTok[], paused: boolean, guide: string, failed: number): { level: "warn" | "info" | "ok"; text: string }[] {
  const now = Date.now(), day = 86_400_000;
  const live = tokens.filter((t) => !t.revoked_at && (!t.expires_at || new Date(t.expires_at).getTime() > now));
  const out: { level: "warn" | "info" | "ok"; text: string }[] = [];
  if (paused) out.push({ level: "warn", text: "AI access is paused: every token is refused until you resume it." });
  for (const t of live) {
    if (t.expires_at && new Date(t.expires_at).getTime() - now < 7 * day) out.push({ level: "warn", text: `“${t.label}” expires in less than 7 days. Edit it to extend, or make a new token.` });
    if (t.mode === "propose" && t.path_prefixes.length === 0) out.push({ level: "warn", text: `“${t.label}” can propose edits to every document. Limit it with id prefixes if it only needs part of them.` });
    if (!t.last_used_at && now - new Date(t.created_at).getTime() > 7 * day) out.push({ level: "info", text: `“${t.label}” was never used in over a week. Revoke it if you do not need it.` });
  }
  if (live.length === 0) out.push({ level: "info", text: "No active token: AI tools can only read the public documentation." });
  if (!guide.trim()) out.push({ level: "info", text: "No message for AI tools is set. They only get the built-in rules (what can be edited, how)." });
  if (failed >= 5) out.push({ level: "warn", text: `${failed} of the latest calls failed. Open Recent activity to see why (wrong arguments, expired token, rate limit).` });
  if (out.length === 0) out.push({ level: "ok", text: "Nothing needs attention." });
  return out;
}

// "(3) GeminiForge V20" in the browser tab when edits are waiting
function useTitleBadge() {
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    const apply = (n: number) => { document.title = n > 0 ? `(${n}) ${base}` : base; };
    apply(useStore.getState().inboxCount);
    const off = useStore.subscribe((s, p) => { if (s.inboxCount !== p.inboxCount) apply(s.inboxCount); });
    return () => { off(); document.title = base; };
  }, []);
}

// owner only: shows where an accepted AI edit changed this chapter (the newest version of each section is still the AI's, not undone or overwritten)
function AiTrail({ prefix }: { prefix: string }) {
  const { isAdmin, liveTick, go, projectId } = useStore(useShallow((s) => ({ isAdmin: s.isAdmin, liveTick: s.liveTick, go: s.go, projectId: s.projectId })));
  const [rows, setRows] = useState<{ ref: string; at: string }[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!isAdmin || !supabase) { setRows([]); return; }
    let off = false;
    void supabase.from("doc_revisions").select("ref,kind,rev,created_at").eq("project_id", projectId).or(`ref.eq.${prefix},ref.like.${prefix}#%`).in("kind", ["ai", "revert", "edit"]).order("created_at", { ascending: false }).limit(60)
      .then(({ data, error }) => {
        if (off || error) return;
        const seen = new Set<string>(); const out: { ref: string; at: string }[] = [];
        for (const r of (data ?? []) as { ref: string; kind: string; created_at: string }[]) { if (seen.has(r.ref)) continue; seen.add(r.ref); if (r.kind === "ai") out.push({ ref: r.ref, at: r.created_at }); }
        setRows(out);
      });
    return () => { off = true; };
  }, [isAdmin, prefix, liveTick, projectId]);
  if (rows.length === 0) return null;
  return (
    <div className="blk" style={{ fontFamily: "var(--sans)", margin: "0 0 14px" }}>
      <p className="meta" style={{ margin: 0 }}><span className="chip warn">AI edited</span> {rows.length} section{rows.length === 1 ? "" : "s"} here {rows.length === 1 ? "holds" : "hold"} an accepted AI edit (latest {ago(rows[0].at)}). <button type="button" className="btn btn-ghost" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Hide" : "Show which"}</button></p>
      {open && <ul className="ai-checks">{rows.map((r) => <li key={r.ref}><button type="button" className="btn btn-ghost" onClick={() => { const [c, sec] = r.ref.replace(/^chapter:/, "").split("#"); go({ kind: "chapter", id: c as ChapterId, sec: sec || undefined }); }}>{r.ref}</button> <span className="meta">{ago(r.at)}</span></li>)}</ul>}
    </div>
  );
}
// #endregion
