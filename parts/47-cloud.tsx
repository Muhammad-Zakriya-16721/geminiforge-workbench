// #region 5f. CLOUD SYNC (Supabase). The Canvas build swaps this file for canvas/47-cloud.tsx (a stub), because Canvas has no @supabase/supabase-js.
// Local storage stays the working copy. Signed in, each change is merged with the copy in Supabase (3-way, so two devices never overwrite each other).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SB_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SB_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const CLOUD_AVAILABLE = !!SB_URL && !!SB_KEY;
const sb: SupabaseClient | null = CLOUD_AVAILABLE ? createClient(SB_URL as string, SB_KEY as string) : null;

// Fields that follow you between devices. View state (sidebar, panel width, open rows, last page) and device choices (smart matching, backup nudge) stay per device.
const SYNC_FIELDS = ["motion", "depth", "textSize", "width", "font", "name", "misses", "lastExport", "spikes", "audit", "pins", "notes", "tracker", "threads"] as const;
type Synced = Pick<Persisted, (typeof SYNC_FIELDS)[number]>;

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isRec = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

// Generic 3-way merge of JSON values: a side that did not change defers to the other; objects merge key by key; a real conflict on one value keeps this device's.
function merge3(base: unknown, local: unknown, remote: unknown): unknown {
  if (sameJson(local, base)) return remote;
  if (sameJson(remote, base) || sameJson(local, remote)) return local;
  if (isRec(local) && isRec(remote)) {
    const b = isRec(base) ? base : {};
    const out: Record<string, unknown> = {};
    for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const v = merge3(b[k], local[k], remote[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return local;
}

// Lists of items with an id: an item added on either side is kept; an item removed on one side is removed unless the other side changed it.
function mergeById<T>(base: T[], local: T[], remote: T[], key: (x: T) => string, item: (b: T | undefined, l: T, r: T) => T = (b, l, r) => (sameJson(l, b) ? r : l)): T[] {
  const idx = (a: T[]) => new Map(a.map((x) => [key(x), x] as const));
  const B = idx(base), L = idx(local), R = idx(remote);
  const out: T[] = [];
  for (const id of new Set([...B.keys(), ...L.keys(), ...R.keys()])) {
    const b = B.get(id), l = L.get(id), r = R.get(id);
    if (l && r) out.push(item(b, l, r));
    else if (l) { if (!b || !sameJson(l, b)) out.push(l); }
    else if (r) { if (!b || !sameJson(r, b)) out.push(r); }
  }
  return out;
}

export function mergeStates(base: Synced, local: Synced, remote: Synced): Synced {
  const scalar = <K extends keyof Synced>(k: K) => merge3(base[k], local[k], remote[k]) as Synced[K];
  const mergeThread = (b: Thread | undefined, l: Thread, r: Thread): Thread => ({
    id: l.id,
    at: Math.min(l.at, r.at),
    title: merge3(b?.title, l.title, r.title) as string,
    pinned: merge3(b?.pinned, l.pinned, r.pinned) as boolean,
    archived: merge3(b?.archived, l.archived, r.archived) as boolean,
    turns: mergeById(b?.turns ?? [], l.turns, r.turns, (t) => t.id)
  });
  const pins = [...new Set([...local.pins.filter((p) => base.pins.includes(p) ? remote.pins.includes(p) : true), ...remote.pins.filter((p) => base.pins.includes(p) ? local.pins.includes(p) : true)])];
  return {
    motion: scalar("motion"), depth: scalar("depth"), textSize: scalar("textSize"), width: scalar("width"), font: scalar("font"), name: scalar("name"),
    lastExport: Math.max(local.lastExport, remote.lastExport),
    spikes: scalar("spikes"), audit: scalar("audit"), tracker: scalar("tracker"),
    pins,
    misses: mergeById(base.misses, local.misses, remote.misses, (m) => m.q).sort((a, b) => b.at - a.at).slice(0, 50),
    notes: mergeById(base.notes, local.notes, remote.notes, (n) => n.id).sort((a, b) => b.at - a.at),
    threads: mergeById(base.threads, local.threads, remote.threads, (t) => t.id, mergeThread).sort((a, b) => b.at - a.at).slice(0, MAX_THREADS)
  };
}

const pickSynced = (s: Persisted): Synced => Object.fromEntries(SYNC_FIELDS.map((k) => [k, s[k]])) as unknown as Synced;
const EMPTY_SYNCED: Synced = pickSynced(DEFAULTS);
const fromRemote = (data: unknown): Synced => ({ ...EMPTY_SYNCED, ...pickSynced({ ...DEFAULTS, ...sanitize({ v: STORE_VERSION, data }) } as Persisted) });

type CloudState = "off" | "signedout" | "syncing" | "synced" | "error";
const setCloud = (p: { cloudState?: CloudState; cloudEmail?: string; cloudAt?: number; cloudMsg?: string }) => useStore.setState(p);

let cloudUid = "";
let running = false;
let again = false;
const metaKey = () => `geminiforge_sync_${cloudUid}`;
const readMeta = (): { base: Synced; rev: number } | null => { try { const m = JSON.parse(window.localStorage.getItem(metaKey()) ?? "null"); return m && isRec(m.base) ? { base: { ...EMPTY_SYNCED, ...m.base }, rev: Number(m.rev) || 0 } : null; } catch { return null; } };
const writeMeta = (base: Synced, rev: number) => { try { window.localStorage.setItem(metaKey(), JSON.stringify({ base, rev })); } catch { /* the next sync merges again from an older base, which is safe */ } };

export async function syncNow(): Promise<void> {
  if (!sb || !cloudUid) return;
  if (running) { again = true; return; }
  running = true;
  setCloud({ cloudState: "syncing", cloudMsg: "" });
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: row, error } = await sb.from("workbench_state").select("data, rev").maybeSingle();
      if (error) throw error;
      const local = pickSynced(useStore.getState());
      const meta = readMeta();
      const merged = row ? mergeStates(meta?.base ?? EMPTY_SYNCED, local, fromRemote(row.data)) : local;
      if (!sameJson(merged, local)) { useStore.setState(merged); lastSynced = JSON.stringify(merged); }
      if (row && sameJson(merged, fromRemote(row.data))) { writeMeta(merged, row.rev as number); break; }
      if (JSON.stringify(merged).length > 4_500_000) throw new Error("Your data is too large to sync (over 4.5 MB). Delete old questions or export a backup.");
      if (!row) {
        const { error: e } = await sb.from("workbench_state").insert({ user_id: cloudUid, data: merged, rev: 1 });
        if (e) { if (e.code === "23505") continue; throw e; }
        writeMeta(merged, 1); break;
      }
      const { data: upd, error: e } = await sb.from("workbench_state").update({ data: merged, rev: (row.rev as number) + 1, updated_at: new Date().toISOString() }).eq("rev", row.rev).select("rev");
      if (e) throw e;
      if (upd && upd.length) { writeMeta(merged, upd[0].rev as number); break; }
      // someone saved between our read and write: read again and merge again
    }
    setCloud({ cloudState: "synced", cloudAt: Date.now(), cloudMsg: "" });
  } catch (e) {
    setCloud({ cloudState: "error", cloudMsg: e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Sync failed" });
  } finally {
    running = false;
    if (again) { again = false; void syncNow(); }
  }
}

let lastSynced = "";
let pushTimer: ReturnType<typeof setTimeout> | null = null;
if (sb && typeof window !== "undefined") {
  setCloud({ cloudState: "signedout" });
  const adopt = (session: { user: { id: string; email?: string } } | null) => {
    if (!session) { cloudUid = ""; setCloud({ cloudState: "signedout", cloudEmail: "" }); return; }
    if (cloudUid === session.user.id) return;
    cloudUid = session.user.id;
    setCloud({ cloudEmail: session.user.email ?? "" });
    lastSynced = JSON.stringify(pickSynced(useStore.getState()));
    void syncNow();
  };
  sb.auth.onAuthStateChange((_event, session) => { setTimeout(() => adopt(session), 0); }); // never await Supabase calls inside this callback
  // push soon after a synced field changes
  useStore.subscribe((s) => {
    if (!cloudUid) return;
    const j = JSON.stringify(pickSynced(s));
    if (j === lastSynced) return;
    lastSynced = j;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { void syncNow(); }, 2500);
  });
  // pick up changes from other devices
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void syncNow(); });
  setInterval(() => { if (document.visibilityState === "visible") void syncNow(); }, 60_000);
}

export async function cloudSignIn(email: string, password: string): Promise<string> {
  if (!sb) return "Sync is not configured.";
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  return error ? error.message : "";
}
export async function cloudSignOut() { if (sb) await sb.auth.signOut(); }

export function CloudPanel() {
  const { state, email, at, msg } = useStore(useShallow((s) => ({ state: s.cloudState, email: s.cloudEmail, at: s.cloudAt, msg: s.cloudMsg })));
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  if (!CLOUD_AVAILABLE) return <p className="meta">Sync is not set up in this build.</p>;
  if (state === "signedout" || state === "off") {
    return (
      <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setErr(await cloudSignIn(em, pw)); setBusy(false); setPw(""); }}>
        <p className="meta">Sign in to keep your questions, notes, tracker and settings in sync across devices. The account is created in the Supabase dashboard. Your data stays in this browser too.</p>
        <Setting label="Email"><input className="set-in" type="email" autoComplete="username" aria-label="Email" value={em} onChange={(e) => setEm(e.target.value)} required /></Setting>
        <Setting label="Password"><input className="set-in" type="password" autoComplete="current-password" aria-label="Password" value={pw} onChange={(e) => setPw(e.target.value)} required /></Setting>
        {err && <p className="banner" data-k="conflict" role="alert">{err}</p>}
        <div className="actions"><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></div>
      </form>
    );
  }
  return (
    <>
      <Setting label="Signed in as" desc={state === "syncing" ? "Syncing…" : state === "error" ? `Sync problem: ${msg}` : at ? `Last synced ${new Date(at).toLocaleTimeString()}` : "Waiting for the first sync"}><span className="mono">{email}</span></Setting>
      <Setting label="Sync now" desc="Merges this device with the saved copy. It also runs automatically after changes, when you return to the tab, and every minute."><button type="button" className="btn" disabled={state === "syncing"} onClick={() => void syncNow()}>Sync now</button></Setting>
      <Setting label="Sign out" desc="Your data stays in this browser. Other devices keep syncing with the saved copy."><button type="button" className="btn" onClick={() => void cloudSignOut()}>Sign out</button></Setting>
    </>
  );
}
// #endregion
