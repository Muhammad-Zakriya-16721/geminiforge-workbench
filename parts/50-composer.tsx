// #region 10. COMPOSER (docked, collapsible, slash commands, long-paste chips)
const PASTE_LINES = 12;
const PASTE_CHARS = 1500;

interface SlashRow { id: string; label: string; hint: string; run: () => void }

export function Composer({ placeholder, onSubmit, autoFocus }: { placeholder: string; onSubmit: (text: string) => void; autoFocus?: boolean }) {
  const { draft, setDraft, collapsed, setCollapsed, go, openPane, depth, set, addNote } = useStore(useShallow((s) => ({ draft: s.draft, setDraft: s.setDraft, collapsed: s.collapsed, setCollapsed: s.setCollapsed, go: s.go, openPane: s.openPane, depth: s.depth, set: s.set, addNote: s.addNote })));
  const [depthMenu, setDepthMenu] = useState(false);
  const depthRef = useRef<HTMLDivElement | null>(null);
  useOutside(depthRef, () => setDepthMenu(false), depthMenu);
  const ta = useRef<HTMLTextAreaElement | null>(null);
  const [pastes, setPastes] = useState<string[]>([]);
  const [sel, setSel] = useState(0);
  const [slashOff, setSlashOff] = useState(false);

  const fit = useCallback(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    const max = Math.round(window.innerHeight * 0.4);
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, []);
  useEffect(() => { if (!collapsed) fit(); }, [draft, collapsed, fit]);
  useEffect(() => { if (autoFocus) ta.current?.focus(); }, [autoFocus]);

  const long = draft.split("\n").length > 4 || draft.length > 280;

  // Slash menu: "/" lists groups; "/crate fo" lists matching items of that group.
  const slash = useMemo<{ rows: SlashRow[]; title: string } | null>(() => {
    if (slashOff || !draft.startsWith("/") || draft.includes("\n")) return null;
    const m = /^\/(\S*)(?:\s+(.*))?$/.exec(draft);
    if (!m) return null;
    const word = m[1].toLowerCase();
    const rest = m[2];
    if (word === "note") {
      const t = (rest ?? "").trim();
      const tg = noteTarget();
      return { title: "Note", rows: [{ id: "note", label: tg ? `Save note on: ${tg.title}` : "Open a chapter or an item first", hint: t ? t.slice(0, 60) : "Type your note after /note", run: () => { if (tg && t) { addNote(tg.key, t); setDraft(""); } } }] };
    }
    const g = GROUPS.find((x) => x.id === word);
    if (g && rest !== undefined) {
      const items = searchIndex(rest, g.id).slice(0, 30);
      return { title: g.label, rows: items.map((it) => ({ id: it.key, label: it.title, hint: it.badge ?? "", run: () => { if (it.view) go(it.view); if (it.ref) openPane(it.ref); setDraft(""); } })) };
    }
    const groups = GROUPS.filter((x) => x.id.startsWith(word) || x.label.toLowerCase().startsWith(word));
    const rowsG: SlashRow[] = groups.map((x) => ({ id: x.id, label: `/${x.id}`, hint: x.desc, run: () => { setDraft(`/${x.id} `); } }));
    if ("note".startsWith(word)) rowsG.push({ id: "note", label: "/note", hint: "Save a note on the page you are viewing", run: () => setDraft("/note ") });
    return { title: "Commands", rows: rowsG };
  }, [draft, slashOff, go, openPane, setDraft, addNote]);
  useEffect(() => { setSel(0); setSlashOff(false); }, [draft.startsWith("/") ? draft : ""]);

  const send = () => {
    const text = [draft.trim(), ...pastes].filter(Boolean).join("\n\n");
    if (!text) return;
    onSubmit(text);
    setDraft("");
    setPastes([]);
    setCollapsed(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (slash && slash.rows.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSel((i) => (i + 1) % slash.rows.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSel((i) => (i - 1 + slash.rows.length) % slash.rows.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); slash.rows[sel]?.run(); return; }
    }
    if (e.key === "Escape") {
      if (slash) { e.preventDefault(); e.stopPropagation(); setSlashOff(true); return; }
      if (long && !collapsed) { e.preventDefault(); e.stopPropagation(); setCollapsed(true); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const t = e.clipboardData.getData("text");
    if (t && (t.split("\n").length > PASTE_LINES || t.length > PASTE_CHARS)) {
      e.preventDefault();
      setPastes((p) => [...p, t]);
    }
  };

  const hasContent = draft.trim().length > 0 || pastes.length > 0;
  const firstLine = draft.split("\n")[0] || (pastes[0] ?? "").split("\n")[0];
  const lineCount = draft.split("\n").length;
  const listId = "slash-list";

  return (
    <div className="cmp-wrap">
      <div className="cmp">
        {slash && slash.rows.length > 0 && (
          <div className="slash" role="listbox" id={listId} aria-label={slash.title}>
            {slash.rows.map((r, i) => (
              <div key={r.id} id={`slash-${i}`} role="option" aria-selected={i === sel} className="slash-i" onMouseEnter={() => setSel(i)} onMouseDown={(e) => { e.preventDefault(); r.run(); }}>
                <span className="mono">{r.label}</span><small>{r.hint}</small>
              </div>
            ))}
          </div>
        )}
        {pastes.length > 0 && (
          <div className="pastes">
            {pastes.map((p, i) => (
              <span key={i} className="paste">
                <button type="button" style={{ width: "auto", padding: "0 2px", color: "var(--tx2)" }} onClick={() => { setDraft((draft ? draft + "\n" : "") + p); setPastes((x) => x.filter((_, j) => j !== i)); }} title="Click to expand and edit">
                  Pasted text · {p.split("\n").length} lines
                </button>
                <button type="button" aria-label="Remove pasted text" onClick={() => setPastes((x) => x.filter((_, j) => j !== i))}><X size={13} aria-hidden /></button>
              </span>
            ))}
          </div>
        )}
        {collapsed && long ? (
          <button type="button" className="cmp-collapsed" onClick={() => { setCollapsed(false); setTimeout(() => ta.current?.focus(), 0); }} aria-label="Expand draft">
            <span>{firstLine}</span>
            <span className="meta" style={{ margin: 0 }}>Draft · {lineCount} lines</span>
            <ChevronDown size={16} aria-hidden style={{ transform: "rotate(180deg)" }} />
          </button>
        ) : (
          <textarea
            ref={ta}
            rows={1}
            value={draft}
            placeholder={placeholder}
            aria-label="Message"
            aria-haspopup="listbox"
            aria-controls={slash ? listId : undefined}
            aria-activedescendant={slash && slash.rows.length ? `slash-${sel}` : undefined}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            onPaste={onPaste}
          />
        )}
        <div className="cmp-bar">
          {long && !collapsed && (
            <button type="button" className="btn btn-ghost" onClick={() => setCollapsed(true)} title="Shrink the draft to one line (Esc)"><ChevronDown size={14} aria-hidden /><span>Collapse</span></button>
          )}
          <span className="cmp-sp" />
          <div ref={depthRef} style={{ position: "relative" }}>
            <button type="button" className="btn btn-ghost" aria-haspopup="menu" aria-expanded={depthMenu} onClick={() => setDepthMenu(!depthMenu)} title="How detailed answers are">
              <span style={{ textTransform: "capitalize" }}>{depth}</span><ChevronDown size={14} aria-hidden />
            </button>
            {depthMenu && (
              <div className="menu up" style={{ left: "auto", right: 0, minWidth: 250 }} role="menu">
                <div className="menu-h">Answer detail. More detail adds reasons, dependencies and code.</div>
                {(["brief", "standard", "detailed"] as Depth[]).map((d) => (
                  <button key={d} type="button" role="menuitemradio" aria-checked={depth === d} className="menu-i" onClick={() => { set({ depth: d }); setDepthMenu(false); }}>
                    <span style={{ textTransform: "capitalize" }}>{d}</span>{depth === d && <Check size={14} aria-hidden />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="send" disabled={!hasContent} onClick={send} aria-label="Send question" title="Send (Enter)"><ArrowUp size={17} aria-hidden /></button>
        </div>
      </div>
      {!(collapsed && long) && <p className="cmp-note">Answers come from this document, not from an AI.</p>}
    </div>
  );
}
// #endregion
