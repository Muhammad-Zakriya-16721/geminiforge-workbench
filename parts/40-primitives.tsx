// #region 6. SMALL SHARED PIECES
const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
export function Inline({ text }: { text: string }) {
  const parts = text.split(INLINE_RE);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**") && p.length > 4) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("`") && p.endsWith("`") && p.length > 2) return <code key={i} className="ic">{p.slice(1, -1)}</code>;
        const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(p);
        if (m) return /^https:\/\//.test(m[2]) ? <a key={i} href={m[2]} target="_blank" rel="noopener noreferrer">{m[1]}</a> : <span key={i}>{m[1]}</span>;
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
}

const KW_RUST = new Set(["pub", "fn", "struct", "enum", "impl", "trait", "async", "await", "use", "mod", "let", "mut", "const", "static", "match", "if", "else", "for", "while", "loop", "return", "where", "type", "self", "Self", "dyn", "move", "unsafe", "crate", "super", "as", "in", "ref"]);
const KW_SQL = new Set(["SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "EXISTS", "PRAGMA", "SET", "INSERT", "UPDATE", "DELETE", "CREATE", "TABLE", "AS", "ON", "JOIN", "LIMIT", "ORDER", "BY", "VALUES", "NULL", "PRIMARY", "KEY"]);
const TOKEN_RE = /(\/\/[^\n]*|--[^\n]*|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|\b\d[\d_.]*\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/g;

export function highlight(code: string, lang: PaneContent["lang"]): React.ReactNode {
  if (lang === "text") return code;
  const kws = lang === "sql" ? KW_SQL : lang === "rust" ? KW_RUST : null;
  return code.split(TOKEN_RE).map((t, i) => {
    if (!t) return null;
    if (t.startsWith("//") || (lang === "sql" && t.startsWith("--"))) return <span key={i} className="tk-c">{t}</span>;
    if (t[0] === '"' || t[0] === "'") return <span key={i} className="tk-s">{t}</span>;
    if (/^\d/.test(t)) return <span key={i} className="tk-n">{t}</span>;
    if (kws && kws.has(t)) return <span key={i} className="tk-k">{t}</span>;
    return <React.Fragment key={i}>{t}</React.Fragment>;
  });
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyBtn({ text, label = "Copy", className = "btn btn-ghost" }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (t.current) clearTimeout(t.current); }, []);
  return (
    <button
      type="button"
      className={className}
      onClick={async (e) => {
        e.stopPropagation();
        setState((await copyText(text)) ? "ok" : "fail");
        if (t.current) clearTimeout(t.current);
        t.current = setTimeout(() => setState("idle"), 1500);
      }}
    >
      {state === "ok" ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      <span>{state === "ok" ? "Copied" : state === "fail" ? "Copy failed" : label}</span>
    </button>
  );
}

export function CodeBlock({ code, lang, label }: { code: string; lang: PaneContent["lang"]; label?: string }) {
  return (
    <figure className="code">
      <figcaption>
        <span>{label ?? lang}</span>
        <CopyBtn text={code} />
      </figcaption>
      <pre tabIndex={0}><code>{highlight(code, lang)}</code></pre>
    </figure>
  );
}

export function Row({ id, title, badge, summary, dflt = false, children }: { id: string; title: React.ReactNode; badge?: string; summary?: string; dflt?: boolean; children: React.ReactNode }) {
  const open = useStore((s) => s.open[id] ?? dflt);
  const printing = useStore((s) => s.printing);
  const toggle = useStore((s) => s.toggleOpen);
  const pid = `rp-${id.replace(/\W/g, "_")}`;
  const [mounted, setMounted] = useState(open);
  useEffect(() => { if (open) setMounted(true); }, [open]);
  return (
    <div className="row" data-open={open}>
      <h3 className="row-h">
        <button type="button" aria-expanded={open} aria-controls={pid} onClick={() => toggle(id, dflt)}>
          <span className="row-t">{title}</span>
          {badge && <span className="chip">{badge}</span>}
          <ChevronDown size={16} className="row-chev" aria-hidden />
        </button>
      </h3>
      {summary && !open && <p className="row-sum">{summary}</p>}
      <div id={pid} className="row-p">
        <div className="row-in" ref={inertRef(!open)}>{(open || mounted || printing) && children}</div>
      </div>
    </div>
  );
}

// React 18 (Canvas) has no boolean `inert` prop and React 19 drops string values, so set the DOM property directly.
export const inertRef = (on: boolean) => (el: HTMLElement | null) => { if (el) el.inert = on; };

// Menu keyboard support: focus the first item on open, arrows/Home/End move, focus returns to the trigger on close.
export function useMenuNav(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const trigger = document.activeElement as HTMLElement | null;
    const items = () => [...el.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])')];
    items()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      const list = items(); const i = list.indexOf(document.activeElement as HTMLElement);
      const move = (n: number) => { e.preventDefault(); list[(n + list.length) % list.length]?.focus(); };
      if (e.key === "ArrowDown") move(i + 1); else if (e.key === "ArrowUp") move(i - 1); else if (e.key === "Home") move(0); else if (e.key === "End") move(list.length - 1);
    };
    el.addEventListener("keydown", key);
    return () => { el.removeEventListener("keydown", key); if (trigger && document.contains(trigger)) trigger.focus(); };
  }, [ref]);
}

export function useOutside(ref: React.RefObject<HTMLElement | null>, onOut: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const down = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOut(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onOut(); };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [ref, onOut, active]);
}

export function useReduced(): boolean {
  const mode = useStore((s) => s.motion);
  const [sys, setSys] = useState(() => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fn = () => setSys(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return mode === "reduced" || (mode === "system" && sys);
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode; label?: string }, { err: string }> {
  state = { err: "" };
  static getDerivedStateFromError(e: unknown) { return { err: e instanceof Error ? e.message : String(e) }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="boundary" role="alert">
        <strong>{this.props.label ?? "Something went wrong"}</strong>
        <p>{this.state.err}</p>
        <button type="button" className="btn" onClick={() => this.setState({ err: "" })}>Try again</button>
        <button type="button" className="btn btn-ghost" onClick={() => useStore.getState().resetAll()}>Reset saved data</button>
      </div>
    );
  }
}

export const pct = (n: number, d: number) => (d > 0 ? Math.floor((n / d) * 100) : 0);
export const fmtMicros = (n: number) => `$${(n / 1_000_000).toFixed(2)}`;
// #endregion
