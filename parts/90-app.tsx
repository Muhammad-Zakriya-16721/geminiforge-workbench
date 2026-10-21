// #region 12. APP
function useActiveSection(scroller: React.RefObject<HTMLDivElement | null>, ids: string[], key: string) {
  const [active, setActive] = useState(ids[0] ?? "");
  useEffect(() => {
    const el = scroller.current;
    if (!el || ids.length === 0) return;
    let raf = 0;
    const calc = () => {
      raf = 0;
      const top = el.getBoundingClientRect().top;
      let cur = ids[0];
      for (const id of ids) {
        const n = document.getElementById(id);
        if (n && n.getBoundingClientRect().top - top <= 140) cur = id;
      }
      setActive(cur);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(calc); };
    el.addEventListener("scroll", onScroll, { passive: true });
    calc();
    return () => { el.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [scroller, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return active;
}

// Test hook (only with ?gftest in the address): lets the test scripts call the answer engine directly.
if (typeof window !== "undefined" && /[?&]gftest\b/.test(window.location.search)) {
  (window as unknown as Record<string, unknown>).__gf = { store: useStore, markPassage, answerQuestion, answerPlain, loadSmart, smartAnswer, mergeStates, contentSnapshot, validateBundle, applyContent, refreshContent, data: { FORGEHUB_PACKS, CRATES_LIST, DEEP_PROMPTS, LOCKED_CONFIRMATIONS, SPECIFICATION_PATCHES, PROTOTYPE_SPIKES, INITIAL_ROSTER, INITIAL_TASKS, TIER_CHART_DATA, CHAPTERS } };
}

initContent();

export default function App() {
  const { view, pane, sidebarOpen, paneWidth, toast, toastUndo, go, textSize, width, font, contentRev } = useStore(useShallow((s) => ({ contentRev: s.contentRev, view: s.view, pane: s.pane, sidebarOpen: s.sidebarOpen, paneWidth: s.paneWidth, toast: s.toast, toastUndo: s.toastUndo, go: s.go, textSize: s.textSize, width: s.width, font: s.font })));
  const reduced = useReduced();
  useTitleBadge();
  const spec = useSpecVisible();
  const scroller = useRef<HTMLDivElement | null>(null);
  const [far, setFar] = useState(false);
  const [shown, setShown] = useState<PaneRef | null>(pane);

  useEffect(() => {
    if (pane) { setShown(pane); return; }
    const t = setTimeout(() => setShown(null), reduced ? 0 : 280);
    return () => clearTimeout(t);
  }, [pane, reduced]);

  useEffect(() => {
    if (document.getElementById("gf-fonts")) return;
    const l = document.createElement("link");
    l.id = "gf-fonts";
    l.rel = "stylesheet";
    l.href = FONT_HREF;
    document.head.appendChild(l);
  }, []);

  useEffect(() => {
    void refreshContent(true);
    const onVisible = () => { if (document.visibilityState === "visible") void refreshContent(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    const onHash = () => useStore.getState().applyHash();
    window.addEventListener("popstate", onHash);
    window.addEventListener("hashchange", onHash);
    const onKey = (e: KeyboardEvent) => {
      const st = useStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.shiftKey && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === "k") { e.preventDefault(); st.setPalette(!st.palette); return; }
        if (k === "b") { e.preventDefault(); st.set({ sidebarOpen: !st.sidebarOpen }); return; }
        if (e.key === ",") { e.preventDefault(); st.settings ? st.closeSettings() : st.openSettings(); return; }
        if (/^[1-9]$/.test(e.key) && CHAPTERS[Number(e.key) - 1]) { e.preventDefault(); st.go({ kind: "chapter", id: CHAPTERS[Number(e.key) - 1].id }); return; }
      }
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === "TEXTAREA" || tag === "INPUT" || (e.target as HTMLElement | null)?.isContentEditable;
      const focusComposer = () => requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(".dock textarea, .home .cmp textarea")?.focus()));
      if (e.key === "/" && !mod && !e.altKey && !typing && !document.querySelector("dialog[open]")) { e.preventDefault(); focusComposer(); return; }
      if (e.altKey && !mod && !e.shiftKey && e.key.toLowerCase() === "n" && !document.querySelector("dialog[open]")) { e.preventDefault(); st.go({ kind: "home" }); focusComposer(); return; }
      if (e.key === "Escape" && !st.palette && !st.settings && tag !== "TEXTAREA" && tag !== "INPUT") {
        if (st.menu) st.setMenu(false);
        else if (st.pane) st.openPane(null);
      }
    };
    window.addEventListener("keydown", onKey);
    const pre = () => flushSync(() => useStore.setState({ printing: true }));
    const post = () => useStore.setState({ printing: false });
    window.addEventListener("beforeprint", pre);
    window.addEventListener("afterprint", post);
    return () => {
      window.removeEventListener("beforeprint", pre); window.removeEventListener("afterprint", post); window.removeEventListener("popstate", onHash); window.removeEventListener("hashchange", onHash); window.removeEventListener("keydown", onKey); };
  }, []);

  // a passage to show after opening a page from the review inbox: wait for the page to render, highlight it once
  const highlight = useStore((s) => s.highlight);
  useEffect(() => {
    if (!highlight) return;
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const el = scroller.current;
      if ((el && markPassage(el, highlight)) || tries > 25) { clearInterval(t); useStore.setState({ highlight: "" }); }
    }, 120);
    return () => clearInterval(t);
  }, [highlight]);
  const vkey = viewKey(view);
  useEffect(() => { if (window.innerWidth <= 900) useStore.getState().set({ sidebarOpen: false }); }, [vkey]);
  const sec = view.kind === "chapter" ? view.sec : undefined;
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (sec) {
      const t = document.getElementById(sec);
      if (t) {
        const top = t.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 12;
        el.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
        return;
      }
    }
    if (view.kind !== "thread") el.scrollTo({ top: 0 });
  }, [vkey, sec]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const el = scroller.current;
      if (el) setFar(el.scrollHeight - el.scrollTop - el.clientHeight > 240);
    });
    return () => cancelAnimationFrame(raf);
  }, [vkey, sec]);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    setFar(dist > 240);
  }, []);

  const submit = useCallback((text: string) => {
    const st = useStore.getState();
    const v = st.view;
    const th = v.kind === "thread" ? st.threads.find((t) => t.id === v.id) : undefined;
    const prev = th ? [...th.turns].reverse().find((t) => t.answer?.ctx) : undefined;
    const a = answerQuestion(text, { depth: st.depth, tracker: st.tracker, ctx: prev?.answer?.ctx });
    if (a.status === "closest" || a.status === "none") st.logMiss(text, a.status);
    const user: Turn = { id: uid("u"), role: "user", text };
    const reply: Turn = { id: uid("a"), role: "assistant", text: answerPlain(a), answer: a };
    let threadId = th?.id ?? "";
    if (th) st.appendTurns(th.id, [user, reply]);
    else {
      const title = text.replace(/\s+/g, " ").slice(0, 48) || "New question";
      threadId = st.newThread(title, [user, reply]);
      st.go({ kind: "thread", id: threadId });
    }
    // optional meaning-based re-rank for answers that are not exact
    if (st.smart && a.status !== "exact") {
      void loadSmart().then(() => smartAnswer(text)).then((b) => {
        if (!b) return;
        useStore.getState().patchTurn(threadId, reply.id, { text: answerPlain(b), answer: b });
        if (a.status === "none") useStore.getState().logMiss(text, "closest");
      }).catch(() => { /* keep the exact-rule answer */ });
    }
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(".dock textarea")?.focus()));
  }, []);

  const chapterId = view.kind === "chapter" ? view.id : null;
  const sections = chapterId ? CHAPTER_SECTIONS[chapterId] : [];
  const active = useActiveSection(scroller, sections.map((s) => s.id), chapterId ?? "");

  return (
    <div className="gf" data-rev={contentRev} data-motion={reduced ? "reduced" : "full"} data-sb={sidebarOpen ? "open" : "closed"} style={{ "--sbw": sidebarOpen ? "272px" : "0px", "--panew": pane ? `${paneWidth}px` : "0px", "--ps": TEXT_PX[textSize], "--cw": WIDTH_PX[width], "--pf": font === "serif" ? "var(--serif)" : "var(--sans)" } as React.CSSProperties}>
      <style>{CSS}{UI_CSS}</style>
      <Sidebar />
      <main className="main">
        <Header />
        <div className="mainbody">
          <div className="thread" ref={scroller} onScroll={onScroll}>
            <ErrorBoundary key={vkey} label="This view failed to render">
              {!spec && ["home", "chapter", "thread", "library", "tracker", "history", "audit"].includes(view.kind) && <ProjectHome />}
              {spec && view.kind === "home" && <HomeView onSubmit={submit} />}
              {spec && view.kind === "chapter" && !CHAPTERS.some((c) => c.id === view.id) && <div className="col enter"><h1 className="view-h">That chapter does not exist</h1><p className="meta">It may have been renamed or removed from the documentation.</p><button type="button" className="btn" onClick={() => go({ kind: "home" })}>Back to start</button></div>}
              {spec && view.kind === "chapter" && CHAPTERS.some((c) => c.id === view.id) && <div className="col enter" key={view.id}><Doc chapter={view.id} /><NotesBox refKey={`chapter:${view.id}`} title={CHAPTERS.find((c) => c.id === view.id)?.title ?? ""} /></div>}
              {spec && view.kind === "thread" && <ThreadView id={view.id} scroller={scroller} />}
              {spec && view.kind === "library" && <LibraryView />}
              {spec && view.kind === "tracker" && <TrackerView />}
              {spec && view.kind === "history" && <HistoryView />}
              {spec && view.kind === "audit" && <AuditView />}
              {view.kind === "pages" && <PagesView refId={view.ref} />}
              {view.kind === "inbox" && <InboxView />}
              {view.kind === "trash" && <TrashView />}
              {view.kind === "access" && <AccessView />}
              {view.kind === "orgs" && <OrgsView />}
              {view.kind === "org" && <OrgView id={view.id} tab={view.tab} />}
              {view.kind === "project" && <ProjectView />}
              {view.kind === "join" && <JoinView token={view.token} />}
            </ErrorBoundary>
          </div>
          {chapterId && <OutlineRail sections={sections} active={active} onGo={(id) => go({ kind: "chapter", id: chapterId, sec: id })} />}
          {view.kind !== "home" && view.kind !== "orgs" && view.kind !== "org" && view.kind !== "join" && (
            <div className="dock">
              {far && <button type="button" className="stb" aria-label="Scroll to bottom" onClick={() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reduced ? "auto" : "smooth" })}><ChevronDown size={17} aria-hidden /></button>}
              {/* the review screens have no question box: starting a thread there would navigate away in the middle of a review */}
              {spec && view.kind !== "inbox" && view.kind !== "trash" && view.kind !== "access" && view.kind !== "project" && <Composer placeholder="Ask a question, or type / for commands" onSubmit={submit} />}
            </div>
          )}
        </div>
      </main>
      <div className="scrim" onClick={() => useStore.getState().set({ sidebarOpen: false })} aria-hidden />
      <div className="pane-col" data-open={!!pane} ref={inertRef(!pane)}>{shown && <Pane pane={shown} />}</div>
      {toast && <div className="toast" role="status" onMouseEnter={() => useStore.getState().holdToast(true)} onMouseLeave={() => useStore.getState().holdToast(false)} onFocus={() => useStore.getState().holdToast(true)} onBlur={() => useStore.getState().holdToast(false)}>{toast}{toastUndo && <button type="button" className="toast-undo" onClick={() => { toastUndo(); useStore.getState().notify("Restored"); }}>Undo</button>}</div>}
      <Palette />
      <ImportDialog />
      <SettingsDialog onAsk={submit} />
    </div>
  );
}
// #endregion
