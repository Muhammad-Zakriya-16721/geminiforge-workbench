// #region 5g. LIVE DOCUMENTATION (Supabase). The Canvas build swaps this file for canvas/48-content-live.tsx (a stub: Canvas uses the built-in copy).
const CONTENT_CACHE_KEY = "geminiforge_content_v1";
const setContentInfo = (p: { contentSource?: "built-in" | "saved copy" | "live"; contentVersion?: number; contentAt?: number; contentMsg?: string; contentBusy?: boolean }) => useStore.setState(p);

// Runs once at start-up, before the first screen: use the copy saved from the last successful download so the page shows the latest documentation immediately, even offline.
export function initContent() {
  try {
    const raw = window.localStorage.getItem(CONTENT_CACHE_KEY);
    const b = raw ? validateBundle(JSON.parse(raw)) : null;
    if (b) { applyContent(b); setContentInfo({ contentSource: "saved copy", contentVersion: b.version }); }
  } catch { /* unreadable saved copy: keep the built-in one */ }
}

let lastRefresh = 0;
export async function refreshContent(force = false): Promise<void> {
  if (!CLOUD_AVAILABLE || /[?&]nolive\b/.test(window.location.search) || (!force && Date.now() - lastRefresh < 60_000)) return;
  lastRefresh = Date.now();
  setContentInfo({ contentBusy: true, contentMsg: "" });
  try {
    // cheap check first: when the version number is unchanged, skip the full download
    const known = useStore.getState().contentVersion;
    if (!force && known) {
      try {
        const v = await fetch(`${SB_URL}/rest/v1/content_meta?select=version`, { headers: { apikey: SB_KEY as string }, signal: AbortSignal.timeout(6_000) });
        const rows = v.ok ? ((await v.json()) as { version?: number }[]) : [];
        if (rows[0]?.version === known) { setContentInfo({ contentAt: Date.now(), contentBusy: false }); return; }
      } catch { /* unknown: fall through to the full download */ }
    }
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10_000);
    const res = await fetch(`${SB_URL}/rest/v1/rpc/get_content_bundle`, { method: "POST", signal: ctl.signal, headers: { apikey: SB_KEY as string, "Content-Type": "application/json" }, body: "{}" });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`The documentation server answered ${res.status}`);
    const b = validateBundle(await res.json());
    if (!b) throw new Error("The documentation from the server did not have the expected shape, so it was ignored.");
    const changed = JSON.stringify({ ...contentSnapshot(), version: 0 }) !== JSON.stringify({ ...b, version: 0 });
    if (changed) {
      applyContent(b);
      useStore.setState((s) => ({ contentRev: s.contentRev + 1 }));
      useStore.getState().notify(`Documentation updated (version ${b.version}).`);
    }
    try { window.localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(b)); } catch { /* storage full: the next start-up just downloads again */ }
    setContentInfo({ contentSource: "live", contentVersion: b.version, contentAt: Date.now(), contentBusy: false });
  } catch (e) {
    setContentInfo({ contentBusy: false, contentMsg: e instanceof Error ? e.message : "Could not reach the documentation server" });
  }
}
// #endregion
