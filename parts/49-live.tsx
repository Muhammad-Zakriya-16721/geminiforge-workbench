// #region 5g2. LIVE UPDATES (signed-in owner only). Supabase Postgres Changes are used as a signal: the screens refetch what changed and update in place, with no reload.
type LiveChannel = ReturnType<SupabaseClient["channel"]>;
let liveCh: LiveChannel | null = null;
let liveTimer: ReturnType<typeof setTimeout> | null = null;
let liveRetry: ReturnType<typeof setTimeout> | null = null;

// debounce: one bulk write (for example a regenerated page) produces many events but one refetch
const bump = () => {
  if (liveTimer) return;
  liveTimer = setTimeout(() => { liveTimer = null; useStore.setState((s) => ({ liveTick: s.liveTick + 1 })); void refreshAi(); }, 350);
};

export function stopLive() {
  if (liveRetry) { clearTimeout(liveRetry); liveRetry = null; }
  if (liveCh && supabase) { void supabase.removeChannel(liveCh); }
  liveCh = null;
  if (useStore.getState().liveState !== "off") useStore.setState({ liveState: "off" });
}

export function startLive() {
  if (!supabase || liveCh) return;
  const sb = supabase;
  useStore.setState({ liveState: "connecting" });
  void sb.auth.getSession().then(({ data }) => {
    if (!data.session || liveCh) return;
    sb.realtime.setAuth(data.session.access_token);
    liveCh = sb.channel("owner-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "doc_drafts" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "change_sets" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "docs" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "content_meta" }, () => { void refreshContent(true); bump(); })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { useStore.setState({ liveState: "live" }); bump(); } // events missed while disconnected are not replayed: refetch
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (useStore.getState().liveState === "off") return;
          useStore.setState({ liveState: "retry" });
          // a stale token after waking a hidden tab causes CHANNEL_ERROR (supabase-js issue 2613): refresh the token, then join again
          if (liveRetry) clearTimeout(liveRetry);
          liveRetry = setTimeout(() => {
            liveRetry = null;
            const old = liveCh; liveCh = null;
            if (old) void sb.removeChannel(old);
            void sb.auth.getSession().then(({ data }) => { if (data.session && useStore.getState().isAdmin) startLive(); });
          }, 5000);
        }
      });
  });
}

if (supabase && typeof window !== "undefined") {
  // safety nets: a slow poll and a refetch whenever the tab becomes visible again
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && useStore.getState().isAdmin) bump(); });
  setInterval(() => { if (document.visibilityState === "visible" && useStore.getState().isAdmin) useStore.setState((s) => ({ liveTick: s.liveTick + 1 })); }, 300_000);
}
// #endregion
