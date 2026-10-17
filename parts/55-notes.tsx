// #region 10b. NOTES, BACKUP (JSON), MARKDOWN EXPORT
const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export function noteTarget(): { key: string; title: string } | null {
  const st = useStore.getState();
  if (st.pane) { const pc = paneContent(st.pane); return pc ? { key: refKey(st.pane), title: pc.title } : null; }
  if (st.view.kind === "chapter") { const id = st.view.id; const c = CHAPTERS.find((x) => x.id === id); return c ? { key: `chapter:${id}`, title: c.title } : null; }
  return null;
}

export function NotesBox({ refKey: rk, title }: { refKey: string; title: string }) {
  const { notes, addNote, deleteNote } = useStore(useShallow((s) => ({ notes: s.notes, addNote: s.addNote, deleteNote: s.deleteNote })));
  const [text, setText] = useState("");
  const mine = notes.filter((n) => n.ref === rk);
  const add = () => { addNote(rk, text); setText(""); };
  return (
    <section className="notes" aria-label={`Notes on ${title}`}>
      <h2 className="notes-h">Your notes</h2>
      <textarea
        aria-label={`Add a note on ${title}`}
        placeholder="Write a note for this page. It is saved in this browser."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); add(); } }}
      />
      <div className="actions" style={{ margin: "6px 0 0" }}>
        <button type="button" className="btn" disabled={!text.trim()} onClick={add}>Save note</button>
        <span className="meta" style={{ margin: 0, alignSelf: "center" }}>Ctrl Enter to save</span>
      </div>
      {mine.length > 0 && (
        <ul className="notes-l">
          {mine.map((n) => (
            <li key={n.id}>
              <p>{n.text}</p>
              <div className="notes-f"><span>{fmtDate(n.at)}</span><button type="button" className="btn btn-ghost" onClick={() => deleteNote(n.id)}>Delete</button></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function NotesList() {
  const { notes, deleteNote } = useStore(useShallow((s) => ({ notes: s.notes, deleteNote: s.deleteNote })));
  if (notes.length === 0) return <p className="meta">No notes yet. Add one at the end of any chapter or in the side panel, or type <span className="mono">/note your text</span> in the composer.</p>;
  return (
    <ul className="notes-l">
      {notes.map((n) => {
        const info = sourceInfo(n.ref);
        return (
          <li key={n.id}>
            <p>{n.text}</p>
            <div className="notes-f">
              <button type="button" className="btn btn-ghost" onClick={() => info?.run()}>{info?.title ?? n.ref}</button>
              <span>{fmtDate(n.at)}</span>
              <button type="button" className="btn btn-ghost" onClick={() => deleteNote(n.id)}>Delete</button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function downloadText(name: string, text: string, mime: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}

export async function exportFile(name: string, text: string, mime: string) {
  const st = useStore.getState();
  st.setMenu(false);
  if (downloadText(name, text, mime)) return;
  st.notify((await copyText(text)) ? "Download is blocked here, so the text was copied to your clipboard instead" : "Could not download or copy");
}

export function exportBackup() {
  void exportFile("geminiforge_v20_backup.json", backupJSON(), "application/json");
  useStore.getState().set({ lastExport: Date.now() });
}

export function ImportDialog() {
  const open = useStore((s) => s.importOpen);
  const { setImportOpen, importAll } = useStore(useShallow((s) => ({ setImportOpen: s.setImportOpen, importAll: s.importAll })));
  const dlg = useRef<HTMLDialogElement | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) { setText(""); setErr(""); d.showModal(); }
    if (!open && d.open) d.close();
  }, [open]);
  const run = () => { const m = importAll(text); setErr(m); };
  return (
    <dialog ref={dlg} className="pal imp" aria-labelledby="imp-t" onClose={() => setImportOpen(false)} onClick={(e) => { if (e.target === dlg.current) setImportOpen(false); }}>
      <div className="imp-in">
        <h2 id="imp-t" className="h4" style={{ marginTop: 0 }}>Import a backup</h2>
        <p className="meta">Choose a backup file or paste its JSON. This replaces your pins, notes, tracker status, questions and settings.</p>
        <input type="file" accept=".json,application/json" aria-label="Backup file" onChange={(e) => { const f = e.target.files?.[0]; if (f) f.text().then(setText).catch(() => setErr("Could not read that file.")); }} />
        <textarea aria-label="Backup JSON" value={text} onChange={(e) => setText(e.target.value)} placeholder='{"v":1,"data":{...}}' />
        {err && <p className="banner" data-k="conflict" role="alert">{err}</p>}
        <div className="actions">
          <button type="button" className="btn btn-primary" disabled={!text.trim()} onClick={run}>Replace my data</button>
          <button type="button" className="btn btn-ghost" onClick={() => setImportOpen(false)}>Cancel</button>
        </div>
      </div>
    </dialog>
  );
}

export function buildMarkdown(): string {
  const st = useStore.getState();
  const L: string[] = [];
  const fence = (code: string, lang = "") => `\`\`\`${lang}\n${code}\n\`\`\``;
  L.push("# GeminiForge V20: specification workbook", "", `Exported ${new Date().toISOString().slice(0, 10)} from the workbench. Content is carried over from the specification and is pending a claims re-audit.`, "");
  CHAPTERS.forEach((c) => {
    L.push(`## Chapter ${c.num}: ${c.title}`, "", `_${c.subtitle}_`, "");
    CHAPTER_BLOCKS[c.id].forEach((b) => {
      switch (b.t) {
        case "badge": L.push(`> ${b.text}`, ""); break;
        case "h1": L.push(`### ${b.text}`, ""); break;
        case "h2": L.push(`#### ${b.text}`, ""); break;
        case "p": L.push(b.text, ""); break;
        case "rows": b.items.forEach((r) => L.push(`**${r.title}**${r.badge ? ` (${r.badge})` : ""}`, "", ...r.body.flatMap((t) => [t, ""]))); break;
        case "cards": b.items.forEach((x) => L.push(`- **${x.title}** (${x.tag}): ${x.text}`)); L.push(""); break;
        case "chart": {
          if (b.id === "tier") L.push("| Tier | Core overhead (GB) | Max local model (GB) |", "|---|---|---|", ...TIER_CHART_DATA.map((d) => `| ${d.tier} | ${d.overheadGb} | ${d.modelGb} |`), "");
          else L.push("| Harness | 1 session (MB) | 10 sessions (MB) |", "|---|---|---|", ...HARNESS_PSS_DATA.map((d) => `| ${d.name} | ${d.s1} | ${d.s10} |`), "");
          break;
        }
        case "table": L.push(`| ${b.head.join(" | ")} |`, `|${b.head.map(() => "---").join("|")}|`, ...b.rows.map((r) => `| ${r.map((x) => x.replace(/\|/g, "\\|")).join(" | ")} |`), ""); break;
        case "crates": CRATES_LIST.forEach((x) => L.push(`**${x.name}** (${x.layer}; ${x.plane})`, "", x.plainSummary, "", `Why it matters: ${x.whyItMatters}`, "", `Dependencies: ${x.deps}`, "", fence(x.code, langOf(x.code)), "")); break;
        case "packs": L.push("| Pack | Name | Size | Min tier | Category | Purpose |", "|---|---|---|---|---|---|", ...FORGEHUB_PACKS.map((p) => `| ${p.id} | ${p.name} | ${p.size} | ${p.minTier} | ${p.catLabel} | ${p.plainPurpose} |`), ""); break;
        case "prompts": DEEP_PROMPTS.forEach((p) => L.push(`**${p.id}: ${p.title}**`, "", `Target files: ${p.files}`, "", `Goal: ${p.plainGoal}`, "", `Why: ${p.whyNeeded}`, "", fence(p.fullPrompt, "text"), "")); break;
        case "confirms": LOCKED_CONFIRMATIONS.forEach((x) => L.push(`**${x.id}: ${x.title}.** ${x.plainWhy}`, "")); break;
        case "patches": SPECIFICATION_PATCHES.forEach((p) => L.push(`**${p.id}** (${p.target}): ${p.summary}`, "", fence(p.code), "")); break;
        case "tasks": INITIAL_TASKS.forEach((t) => L.push(`- **${t.taskId}** [${t.status}] ${t.title} (assignee ${t.assignee}). ${t.plainExplanation}`)); L.push(""); break;
        case "roster": INITIAL_ROSTER.forEach((a) => L.push(`- **${a.role}** (${a.id}), reports to ${a.reportsTo}. ${a.plainRoleExplanation}`)); L.push(""); break;
        case "chips": break;
      }
    });
  });
  L.push("## Prompt tracker", "", "| Prompt | Status | Notes |", "|---|---|---|", ...DEEP_PROMPTS.map((p) => `| ${p.id} | ${st.tracker[p.id]?.status ?? "todo"} | ${(st.tracker[p.id]?.note ?? "").replace(/\n/g, " ").replace(/\|/g, "\\|")} |`), "");
  const cell = (t: string) => t.replace(/\n/g, " ").replace(/\|/g, "\\|");
  L.push("## Spike tracker", "", "| Spike | Status | Result |", "|---|---|---|", ...PROTOTYPE_SPIKES.map((x) => `| ${x.id} | ${st.spikes[x.id]?.status ?? "todo"} | ${cell(st.spikes[x.id]?.note ?? "")} |`), "");
  const decided = CLAIMS.filter((c) => st.audit[c.id] && (st.audit[c.id].status !== "open" || st.audit[c.id].note));
  if (decided.length) L.push("## Claims review decisions", "", "| Id | Claim | Decision | Note |", "|---|---|---|---|", ...decided.map((c) => `| ${c.id} | ${cell(c.claim)} | ${st.audit[c.id].status} | ${cell(st.audit[c.id].note)} |`), "");
  if (st.notes.length) {
    L.push("## Notes", "");
    st.notes.forEach((n) => L.push(`- ${fmtDate(n.at)} · ${sourceInfo(n.ref)?.title ?? n.ref}: ${n.text.replace(/\n/g, " ")}`));
    L.push("");
  }
  return L.join("\n");
}
// #endregion
