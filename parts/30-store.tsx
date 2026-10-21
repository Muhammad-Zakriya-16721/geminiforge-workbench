// #region 4. STORE, PERSISTENCE, ROUTER
export interface Note { id: string; ref: string; text: string; at: number }
export interface Turn { id: string; role: "user" | "assistant"; text: string; answer?: Answer }
export interface Thread { id: string; title: string; at: number; pinned: boolean; archived: boolean; turns: Turn[] }
export type TextSize = "s" | "m" | "l";
export type ColWidth = "narrow" | "normal" | "wide";
export type ProseFont = "serif" | "sans";
export interface Miss { q: string; at: number; status: "closest" | "none" | "reported" }
const MAX_THREADS = 300;
interface TrackerEntry { status: PromptStatus; note: string }

interface Persisted {
  sidebarOpen: boolean;
  paneWidth: number;
  motion: MotionMode;
  depth: Depth;
  textSize: TextSize;
  width: ColWidth;
  font: ProseFont;
  name: string;
  misses: Miss[];
  smart: boolean;
  lastExport: number;
  backupNudge: number;
  spikes: Record<string, { status: SpikeStatus; note: string }>;
  audit: Record<string, { status: AuditStatus; note: string }>;
  pins: string[];
  notes: Note[];
  tracker: Record<string, TrackerEntry>;
  threads: Thread[];
  open: Record<string, boolean>;
  last: View;
}

const STORE_KEY = "geminiforge_v21";
const STORE_VERSION = 1;
const chapterIds = (): ChapterId[] => CHAPTERS.map((c) => c.id);
const isStr = (x: unknown): x is string => typeof x === "string";
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

function sanitizeView(v: unknown): View {
  if (isObj(v) && v.kind === "chapter" && isStr(v.id) && chapterIds().includes(v.id as ChapterId)) return { kind: "chapter", id: v.id as ChapterId };
  if (isObj(v) && v.kind === "thread" && isStr(v.id)) return { kind: "thread", id: v.id };
  if (isObj(v) && (v.kind === "library" || v.kind === "tracker" || v.kind === "history" || v.kind === "audit" || v.kind === "inbox" || v.kind === "access" || v.kind === "trash")) return { kind: v.kind };
  if (isObj(v) && v.kind === "pages") return { kind: "pages", ref: isStr(v.ref) ? v.ref : undefined };
  return { kind: "home" };
}

function sanitizeAnswer(x: unknown): Answer | undefined {
  if (!isObj(x) || !Array.isArray(x.blocks)) return undefined;
  const blocks: AnsBlock[] = [];
  for (const b of x.blocks) {
    if (!isObj(b)) continue;
    if (b.t === "p" && isStr(b.text)) blocks.push({ t: "p", text: b.text });
    else if (b.t === "code" && isStr(b.code) && (b.lang === "rust" || b.lang === "sql" || b.lang === "json" || b.lang === "text")) blocks.push({ t: "code", code: b.code, lang: b.lang });
    else if (b.t === "kv" && Array.isArray(b.rows)) blocks.push({ t: "kv", rows: b.rows.filter((r): r is [string, string] => Array.isArray(r) && isStr(r[0]) && isStr(r[1])).map((r) => [r[0], r[1]] as [string, string]) });
    else if (b.t === "items" && Array.isArray(b.items)) blocks.push({ t: "items", items: b.items.filter((i): i is Record<string, string> => isObj(i) && isStr(i.key) && isStr(i.title) && isStr(i.sub)).map((i) => ({ key: i.key, title: i.title, sub: i.sub })) });
  }
  return { blocks, sources: Array.isArray(x.sources) ? x.sources.filter(isStr) : [], ctx: isStr(x.ctx) ? x.ctx : undefined, understood: isStr(x.understood) ? x.understood.slice(0, 300) : undefined, status: x.status === "exact" || x.status === "closest" || x.status === "none" ? x.status : undefined };
}

// Storage has no schema guarantee (Zustand's own docs warn JSON storage is unvalidated), so every field is checked.
function sanitize(raw: unknown): Partial<Persisted> {
  if (!isObj(raw) || raw.v !== STORE_VERSION || !isObj(raw.data)) return {};
  const d = raw.data;
  const out: Partial<Persisted> = {};
  if (typeof d.sidebarOpen === "boolean") out.sidebarOpen = d.sidebarOpen;
  if (typeof d.paneWidth === "number") out.paneWidth = clamp(d.paneWidth, 340, 900);
  if (d.motion === "full" || d.motion === "reduced" || d.motion === "system") out.motion = d.motion;
  if (d.depth === "brief" || d.depth === "standard" || d.depth === "detailed") out.depth = d.depth;
  if (d.textSize === "s" || d.textSize === "m" || d.textSize === "l") out.textSize = d.textSize;
  if (d.width === "narrow" || d.width === "normal" || d.width === "wide") out.width = d.width;
  if (d.font === "serif" || d.font === "sans") out.font = d.font;
  if (isStr(d.name)) out.name = d.name.slice(0, 40);
  if (Array.isArray(d.misses)) out.misses = d.misses.filter((m): m is Record<string, unknown> => isObj(m) && isStr(m.q) && typeof m.at === "number" && (m.status === "closest" || m.status === "none" || m.status === "reported")).map((m) => ({ q: (m.q as string).slice(0, 300), at: m.at as number, status: m.status as Miss["status"] })).slice(0, 50);
  if (typeof d.smart === "boolean") out.smart = d.smart;
  if (typeof d.lastExport === "number") out.lastExport = d.lastExport;
  if (typeof d.backupNudge === "number") out.backupNudge = d.backupNudge;
  const status2 = <S extends string>(src: unknown, ok: readonly S[]) => {
    const t: Record<string, { status: S; note: string }> = {};
    if (isObj(src)) Object.entries(src).forEach(([k, v]) => { if (isObj(v) && ok.includes(v.status as S)) t[k] = { status: v.status as S, note: isStr(v.note) ? v.note.slice(0, 5000) : "" }; });
    return t;
  };
  if (isObj(d.spikes)) out.spikes = status2(d.spikes, ["todo", "running", "pass", "fail"] as const);
  if (isObj(d.audit)) out.audit = status2(d.audit, ["open", "fix", "keep", "drop"] as const);
  if (Array.isArray(d.pins)) out.pins = d.pins.filter(isStr).slice(0, 200);
  if (Array.isArray(d.notes)) {
    out.notes = d.notes
      .filter((n): n is Record<string, unknown> => isObj(n) && isStr(n.id) && isStr(n.ref) && isStr(n.text) && typeof n.at === "number")
      .map((n) => ({ id: n.id as string, ref: n.ref as string, text: n.text as string, at: n.at as number }))
      .slice(0, 500);
  }
  if (isObj(d.tracker)) {
    const t: Record<string, TrackerEntry> = {};
    Object.entries(d.tracker).forEach(([k, v]) => {
      if (isObj(v) && (v.status === "todo" || v.status === "running" || v.status === "done")) t[k] = { status: v.status, note: isStr(v.note) ? v.note : "" };
    });
    out.tracker = t;
  }
  if (Array.isArray(d.threads)) {
    out.threads = d.threads
      .filter((t): t is Record<string, unknown> => isObj(t) && isStr(t.id) && isStr(t.title) && Array.isArray(t.turns))
      .map((t) => ({
        id: t.id as string,
        title: t.title as string,
        at: typeof t.at === "number" ? t.at : 0,
        pinned: t.pinned === true,
        archived: t.archived === true,
        turns: (t.turns as unknown[])
          .filter((u): u is Record<string, unknown> => isObj(u) && isStr(u.id) && isStr(u.text) && (u.role === "user" || u.role === "assistant"))
          .map((u) => ({ id: u.id as string, role: u.role as "user" | "assistant", text: u.text as string, answer: sanitizeAnswer(u.answer) }))
      }))
      .slice(0, MAX_THREADS);
  }
  if (isObj(d.open)) {
    const o: Record<string, boolean> = {};
    Object.entries(d.open).forEach(([k, v]) => { if (typeof v === "boolean") o[k] = v; });
    out.open = o;
  }
  if (d.last) out.last = sanitizeView(d.last);
  return out;
}

function loadPersisted(): Partial<Persisted> {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

// Hash router: #/home  #/chapter/<id>[/<section>]  #/thread/<id>  #/library  #/tracker, optional ?p=<kind>:<id> for the side panel.
export function parseHash(h: string): { view: View | null; pane: PaneRef | null } {
  const [path, query = ""] = h.replace(/^#/, "").split("?");
  const seg = path.split("/").filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch { return s; } });
  let pane: PaneRef | null = null;
  const p = new URLSearchParams(query).get("p");
  if (p) {
    const i = p.indexOf(":");
    const kind = p.slice(0, i) as PaneKind;
    if (i > 0 && ["crate", "pack", "prompt", "confirm", "patch", "spike", "os", "lab"].includes(kind)) pane = { kind, id: p.slice(i + 1) };
  }
  let view: View | null = null;
  if (seg[0] === "chapter" && seg[1] && chapterIds().includes(seg[1] as ChapterId)) view = { kind: "chapter", id: seg[1] as ChapterId, sec: seg[2] };
  else if (seg[0] === "thread" && seg[1]) view = { kind: "thread", id: seg[1] };
  else if (seg[0] === "library") view = { kind: "library" };
  else if (seg[0] === "tracker") view = { kind: "tracker" };
  else if (seg[0] === "history") view = { kind: "history" };
  else if (seg[0] === "audit") view = { kind: "audit" };
  else if (seg[0] === "inbox") view = { kind: "inbox" };
  else if (seg[0] === "trash") view = { kind: "trash" };
  else if (seg[0] === "pages") view = { kind: "pages", ref: seg[1] };
  else if (seg[0] === "access") view = { kind: "access" };
  else if (seg[0] === "home") view = { kind: "home" };
  return { view, pane };
}
export function toHash(view: View, pane: PaneRef | null): string {
  let path = "/home";
  if (view.kind === "chapter") path = `/chapter/${view.id}${view.sec ? "/" + encodeURIComponent(view.sec) : ""}`;
  else if (view.kind === "thread") path = `/thread/${encodeURIComponent(view.id)}`;
  else if (view.kind === "library") path = "/library";
  else if (view.kind === "tracker") path = "/tracker";
  else if (view.kind === "history") path = "/history";
  else if (view.kind === "audit") path = "/audit";
  else if (view.kind === "inbox") path = "/inbox";
  else if (view.kind === "trash") path = "/trash";
  else if (view.kind === "pages") path = `/pages${view.ref ? "/" + encodeURIComponent(view.ref) : ""}`;
  else if (view.kind === "access") path = "/access";
  return `#${path}${pane ? "?p=" + encodeURIComponent(`${pane.kind}:${pane.id}`) : ""}`;
}

export const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

interface Store extends Persisted {
  view: View;
  pane: PaneRef | null;
  palette: boolean;
  menu: boolean;
  toast: string;
  toastUndo: (() => void) | null;
  saveFail: boolean;
  printing: boolean;
  smartState: "off" | "loading" | "ready" | "failed";
  contentRev: number;
  contentSource: "built-in" | "saved copy" | "live";
  contentVersion: number;
  contentAt: number;
  contentMsg: string;
  contentBusy: boolean;
  cloudState: "off" | "signedout" | "syncing" | "synced" | "error";
  cloudEmail: string;
  cloudAt: number;
  cloudMsg: string;
  isAdmin: boolean;
  adminChecked: boolean; // true once the administrator check has finished (so views can show "Loading" instead of "not an administrator")
  inboxCount: number;
  liveTick: number;
  trashCount: number;
  highlight: string;
  liveState: "off" | "connecting" | "live" | "retry";
  smartMsg: string;
  patchTurn: (threadId: string, turnId: string, p: Partial<Turn>) => void;
  draft: string;
  collapsed: boolean;
  setDraft: (v: string) => void;
  setCollapsed: (v: boolean) => void;
  go: (view: View, pane?: PaneRef | null) => void;
  openPane: (pane: PaneRef | null) => void;
  applyHash: () => void;
  set: (p: Partial<Persisted>) => void;
  togglePin: (key: string) => void;
  toggleOpen: (key: string, dflt?: boolean) => void;
  setAllOpen: (keys: string[], open: boolean) => void;
  setPalette: (v: boolean) => void;
  setMenu: (v: boolean) => void;
  notify: (msg: string, undo?: () => void) => void;
  holdToast: (hold: boolean) => void; // pointer or keyboard focus on the toast pauses its timer (WCAG 2.2.1)
  setSpike: (id: string, p: Partial<{ status: SpikeStatus; note: string }>) => void;
  setAudit: (id: string, p: Partial<{ status: AuditStatus; note: string }>) => void;
  deleteThreads: (ids: string[]) => void;
  restoreThreads: (list: Thread[]) => void;
  setTracker: (id: string, p: Partial<TrackerEntry>) => void;
  newThread: (title: string, first: Turn[]) => string;
  appendTurns: (id: string, turns: Turn[]) => void;
  patchThread: (id: string, p: Partial<Thread>) => void;
  deleteThread: (id: string) => void;
  addNote: (ref: string, text: string) => void;
  deleteNote: (id: string) => void;
  settings: string | null;
  openSettings: (tab?: string) => void;
  closeSettings: () => void;
  logMiss: (q: string, status: Miss["status"]) => void;
  importOpen: boolean;
  setImportOpen: (v: boolean) => void;
  importAll: (raw: string) => string;
  resetAll: () => void;
}

const DEFAULTS: Persisted = { sidebarOpen: true, paneWidth: 520, motion: "full", depth: "standard", textSize: "m", width: "normal", font: "serif", name: "", misses: [], smart: false, lastExport: 0, backupNudge: 0, spikes: {}, audit: {}, pins: [], notes: [], tracker: {}, threads: [], open: { "row:overview:0": true }, last: { kind: "home" } };
const persisted0: Persisted = { ...DEFAULTS, ...loadPersisted() };
if (typeof window !== "undefined" && window.innerWidth <= 900) persisted0.sidebarOpen = false;
const hash0 = typeof window !== "undefined" ? { ...parseHash(window.location.hash), hadHash: window.location.hash.replace(/^#\/?/, "") !== "" } : { view: null, pane: null, hadHash: false };

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useStore = create<Store>((set, get) => ({
  ...persisted0,
  view: hash0.view ?? (hash0.hadHash ? { kind: "home" as const } : persisted0.last),
  pane: hash0.pane,
  palette: false,
  menu: false,
  toast: "",
  toastUndo: null,
  saveFail: false,
  printing: false,
  smartState: "off",
  contentRev: 0,
  contentSource: "built-in",
  contentVersion: 0,
  contentAt: 0,
  contentMsg: "",
  contentBusy: false,
  cloudState: "off",
  cloudEmail: "",
  cloudAt: 0,
  cloudMsg: "",
  isAdmin: false,
  adminChecked: false,
  inboxCount: 0,
  liveTick: 0,
  trashCount: 0,
  highlight: "",
  liveState: "off",
  smartMsg: "",
  patchTurn: (threadId, turnId, p) => set((s) => ({ threads: s.threads.map((t) => (t.id === threadId ? { ...t, turns: t.turns.map((u) => (u.id === turnId ? { ...u, ...p } : u)) } : t)) })),
  draft: "",
  collapsed: false,
  setDraft: (draft) => set({ draft }),
  setCollapsed: (collapsed) => set({ collapsed }),
  go: (view, pane) => {
    const nextPane = pane === undefined ? get().pane : pane;
    set({ view, pane: nextPane, last: view, palette: false, menu: false });
    try { window.history.pushState(null, "", toHash(view, nextPane)); } catch { /* sandboxed frame: stay in memory */ }
  },
  openPane: (pane) => {
    set({ pane, palette: false, menu: false });
    try { window.history.replaceState(null, "", toHash(get().view, pane)); } catch { /* sandboxed frame */ }
  },
  applyHash: () => {
    const { view, pane } = parseHash(window.location.hash);
    if (!view && window.location.hash.replace(/^#\/?/, "")) { try { window.history.replaceState(null, "", toHash({ kind: "home" }, null)); } catch { /* sandboxed frame */ } set({ view: { kind: "home" }, pane: null }); return; }
    set({ view: view ?? get().view, pane });
  },
  set: (p) => set(p),
  togglePin: (key) => set((s) => ({ pins: s.pins.includes(key) ? s.pins.filter((k) => k !== key) : [...s.pins, key] })),
  toggleOpen: (key, dflt = false) => set((s) => ({ open: { ...s.open, [key]: !(s.open[key] ?? dflt) } })),
  setAllOpen: (keys, open) => set((s) => { const o = { ...s.open }; keys.forEach((k) => { o[k] = open; }); return { open: o }; }),
  setPalette: (palette) => set({ palette, menu: false }),
  setMenu: (menu) => set({ menu }),
  notify: (toast, undo) => {
    set({ toast, toastUndo: undo ?? null });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: "", toastUndo: null }), undo ? 8000 : 3200);
  },
  holdToast: (hold) => {
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    if (!hold && get().toast) toastTimer = setTimeout(() => set({ toast: "", toastUndo: null }), 4000);
  },
  setSpike: (id, p) => set((s) => ({ spikes: { ...s.spikes, [id]: { ...(s.spikes[id] ?? { status: "todo" as SpikeStatus, note: "" }), ...p } } })),
  setAudit: (id, p) => set((s) => ({ audit: { ...s.audit, [id]: { ...(s.audit[id] ?? { status: "open" as AuditStatus, note: "" }), ...p } } })),
  deleteThreads: (ids) => {
    const gone = get().threads.filter((t) => ids.includes(t.id));
    if (!gone.length) return;
    set((s) => ({ threads: s.threads.filter((t) => !ids.includes(t.id)) }));
    get().notify(`${gone.length} ${gone.length === 1 ? "question" : "questions"} deleted`, () => get().restoreThreads(gone));
  },
  restoreThreads: (list) => set((s) => ({ threads: [...list.filter((t) => !s.threads.some((x) => x.id === t.id)), ...s.threads].slice(0, MAX_THREADS) })),
  setTracker: (id, p) => set((s) => ({ tracker: { ...s.tracker, [id]: { ...(s.tracker[id] ?? { status: "todo" as PromptStatus, note: "" }), ...p } } })),
  newThread: (title, first) => {
    const id = uid("t");
    const dropped = get().threads.length >= MAX_THREADS;
    set((s) => ({ threads: [{ id, title, at: Date.now(), pinned: false, archived: false, turns: first }, ...s.threads].slice(0, MAX_THREADS) }));
    if (dropped) get().notify(`Only the newest ${MAX_THREADS} questions are kept, so the oldest one was removed. Export a backup to keep them all.`);
    return id;
  },
  appendTurns: (id, turns) => set((s) => ({ threads: s.threads.map((t) => (t.id === id ? { ...t, turns: [...t.turns, ...turns] } : t)) })),
  patchThread: (id, p) => set((s) => ({ threads: s.threads.map((t) => (t.id === id ? { ...t, ...p } : t)) })),
  deleteThread: (id) => {
    const t = get().threads.find((x) => x.id === id);
    if (!t) return;
    set((s) => ({ threads: s.threads.filter((x) => x.id !== id) }));
    get().notify("Question deleted", () => get().restoreThreads([t]));
  },
  addNote: (ref, text) => { const t = text.trim().slice(0, 5000); if (t) set((s) => ({ notes: [{ id: uid("n"), ref, text: t, at: Date.now() }, ...s.notes] })); },
  deleteNote: (id) => {
    const n = get().notes.find((x) => x.id === id);
    if (!n) return;
    set((s) => ({ notes: s.notes.filter((x) => x.id !== id) }));
    get().notify("Note deleted", () => set((s) => ({ notes: [n, ...s.notes].sort((a, b) => b.at - a.at) })));
  },
  settings: null,
  openSettings: (tab) => set({ settings: tab ?? "general", palette: false, menu: false }),
  closeSettings: () => set({ settings: null }),
  logMiss: (q, status) => set((s) => ({ misses: [{ q: q.slice(0, 300), at: Date.now(), status }, ...s.misses.filter((m) => m.q !== q)].slice(0, 50) })),
  importOpen: false,
  setImportOpen: (importOpen) => set({ importOpen }),
  importAll: (raw) => {
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return "That is not valid JSON."; }
    const data = sanitize(parsed);
    if (Object.keys(data).length === 0) return "That file is not a GeminiForge backup (or it is from a different version).";
    set({ ...DEFAULTS, ...data, view: { kind: "home" }, pane: null, importOpen: false, settings: null });
    return "";
  },
  resetAll: () => {
    try { window.localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
    set({ ...DEFAULTS, view: { kind: "home" }, pane: null });
  }
}));

export const snapshot = (s: Persisted): Persisted => ({ sidebarOpen: s.sidebarOpen, paneWidth: s.paneWidth, motion: s.motion, depth: s.depth, textSize: s.textSize, width: s.width, font: s.font, name: s.name, misses: s.misses, smart: s.smart, lastExport: s.lastExport, backupNudge: s.backupNudge, spikes: s.spikes, audit: s.audit, pins: s.pins, notes: s.notes, tracker: s.tracker, threads: s.threads, open: s.open, last: s.last });
export const backupJSON = () => JSON.stringify({ v: STORE_VERSION, data: snapshot(useStore.getState()) }, null, 1);

// Saves are debounced and skipped when nothing persisted changed (typing in the composer must not rewrite megabytes).
const ser = (s: Persisted) => JSON.stringify(snapshot(s));
let lastSaved = ser(useStore.getState());
let saveTimer: ReturnType<typeof setTimeout> | null = null;
useStore.subscribe((s) => {
  const j = ser(s);
  if (j === lastSaved) return;
  lastSaved = j;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: STORE_VERSION, savedAt: Date.now(), data: JSON.parse(j) }));
      if (useStore.getState().saveFail) useStore.setState({ saveFail: false });
    } catch {
      if (!useStore.getState().saveFail) { useStore.setState({ saveFail: true }); useStore.getState().notify("Could not save here (storage is full or blocked). Export a backup so nothing is lost."); }
    }
  }, 250);
});

// Another tab saved: adopt its data (not this tab's view state), so a later save here cannot overwrite it with stale data.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORE_KEY || !e.newValue) return;
    try {
      const d = sanitize(JSON.parse(e.newValue));
      const { sidebarOpen: _a, paneWidth: _b, open: _c, last: _d, ...shared } = d;
      useStore.setState(shared);
      lastSaved = ser(useStore.getState());
    } catch { /* ignore a malformed write */ }
  });
}
// #endregion
