// #region 8. SIDE PANEL + LABS
const MOE_CATALOG: Record<string, { name: string; totalB: number; activeB: number; bQuant: number; kvGb: number }> = {
  qwen3_30b_a3b: { name: "Qwen3-Coder-30B-A3B (30B total / 3.3B active)", totalB: 30.0, activeB: 3.3, bQuant: 0.55, kvGb: 1.4 },
  mixtral_8x7b: { name: "Mixtral 8x7B (46.7B total / 12.9B active)", totalB: 46.7, activeB: 12.9, bQuant: 0.55, kvGb: 2.0 },
  qwen25_3b: { name: "Qwen2.5-Coder-3B (3.1B dense)", totalB: 3.1, activeB: 3.1, bQuant: 0.55, kvGb: 0.45 },
  qwen25_14b: { name: "Qwen2.5-Coder-14B (14.7B dense, Q5)", totalB: 14.7, activeB: 14.7, bQuant: 0.68, kvGb: 1.1 },
  deepseek_r1_70b: { name: "DeepSeek-R1-70B (70B dense)", totalB: 70.0, activeB: 70.0, bQuant: 0.55, kvGb: 3.2 }
};
const TIER_PRESETS: { id: string; label: string; vram: number; ram: number; ngl: number }[] = [
  { id: "E", label: "Tier E · 4 GB", vram: 0, ram: 4, ngl: 0 },
  { id: "C", label: "Tier C · 8 GB", vram: 2, ram: 8, ngl: 25 },
  { id: "B", label: "Tier B · 16 GB", vram: 2, ram: 14, ngl: 35 },
  { id: "A", label: "Tier A · 32–64 GB", vram: 16, ram: 32, ngl: 65 },
  { id: "S", label: "Tier S · 192 GB+", vram: 32, ram: 128, ngl: 100 }
];
// Assumed bandwidths (GB/s) for the speed estimate; not measurements.
const BW_VRAM = 320, BW_DDR = 42, BW_PCIE = 32;

export function moeEstimate(model: string, vram: number, ram: number, nglPct: number) {
  const m = MOE_CATALOG[model] ?? MOE_CATALOG.qwen3_30b_a3b;
  const ngl = nglPct / 100;
  const totalGb = m.totalB * m.bQuant;
  const vramReq = ngl > 0 ? totalGb * ngl + m.kvGb * ngl + 0.35 : 0;
  const ramReq = totalGb * (1 - ngl) + m.kvGb * (1 - ngl) + 0.45;
  const ramCap = ram * 0.85;
  const vramOk = vramReq <= vram + 1e-9;
  const ramOk = ramReq <= ramCap + 1e-9;
  const active = m.activeB * m.bQuant;
  const tps = vramOk && ramOk ? 1 / ((active * ngl) / BW_VRAM + (active * (1 - ngl)) / Math.min(BW_DDR, BW_PCIE) + 0.002) : null;
  const use = Math.max(vram > 0 ? vramReq / vram : vramReq > 0 ? Infinity : 0, ramReq / ramCap);
  let verdict: "tierE" | "nofit" | "gate" | "tight" | "ok" = "ok";
  if (ram <= 4.5) verdict = "tierE";
  else if (!vramOk || !ramOk) verdict = "nofit";
  else if (use > 0.98) verdict = "gate";
  else if (use > 0.85) verdict = "tight";
  return { m, vramReq, ramReq, ramCap, vramOk, ramOk, tps, verdict };
}

function Meter({ used, cap, label }: { used: number; cap: number; label: string }) {
  const r = cap > 0 ? used / cap : used > 0 ? Infinity : 0;
  const w = Math.min(100, Math.round((Number.isFinite(r) ? r : 1) * 100));
  return <div className="meter" data-over={r > 1} role="img" aria-label={label}><i style={{ width: `${w}%` }} /></div>;
}

const VERDICT_TEXT = {
  tierE: "Tier E: local model weights are blocked on 4 GB hosts",
  nofit: "Does not fit this hardware",
  gate: "Fits, but above 98%: double-warning gate",
  tight: "Fits, but tight (above 85%)",
  ok: "Fits comfortably"
} as const;

function MoeLab() {
  const [model, setModel] = useState("qwen3_30b_a3b");
  const [vram, setVram] = useState(8);
  const [ram, setRam] = useState(24);
  const [ngl, setNgl] = useState(40);
  const e = moeEstimate(model, vram, ram, ngl);
  const short = (need: number, have: number) => (need > have ? `short by ${(need - have).toFixed(1)} GB (needs ${have > 0 ? (need / have).toFixed(1) + "×" : "VRAM"})` : "ok");
  return (
    <div className="lab">
      <p className="meta">Pick a hardware preset or move the sliders. All numbers are estimates from assumed bandwidths (VRAM {BW_VRAM}, DDR {BW_DDR}, PCIe {BW_PCIE} GB/s).</p>
      <div className="seg" role="group" aria-label="Hardware preset">
        {TIER_PRESETS.map((t) => (
          <button key={t.id} type="button" onClick={() => { setVram(t.vram); setRam(t.ram); setNgl(t.ngl); }}>{t.label}</button>
        ))}
      </div>
      <label className="lab-l">Model
        <Select label="Model" value={model} onChange={setModel} options={Object.entries(MOE_CATALOG).map(([k, v]) => ({ value: k, label: v.name }))} />
      </label>
      <label className="lab-l"><span><span>GPU VRAM</span><b className="mono">{vram.toFixed(0)} GB</b></span>
        <input type="range" min={0} max={48} step={1} value={vram} onChange={(ev) => setVram(Number(ev.target.value))} />
      </label>
      <label className="lab-l"><span><span>Usable system RAM</span><b className="mono">{ram.toFixed(0)} GB</b></span>
        <input type="range" min={4} max={128} step={2} value={ram} onChange={(ev) => setRam(Number(ev.target.value))} />
      </label>
      <label className="lab-l"><span><span>Layers offloaded to GPU (<code className="ic">-ngl</code>)</span><b className="mono">{ngl}%</b></span>
        <input type="range" min={0} max={100} step={5} value={ngl} onChange={(ev) => setNgl(Number(ev.target.value))} />
      </label>
      <div className="tiles">
        <div className="tile">
          <span className="tile-k">GPU VRAM needed</span>
          <span className="tile-v mono">{e.vramReq.toFixed(1)} / {vram.toFixed(1)} GB</span>
          <Meter used={e.vramReq} cap={vram} label="VRAM use" />
          <span className="tile-s">{short(e.vramReq, vram)}</span>
        </div>
        <div className="tile">
          <span className="tile-k">Host RAM needed (85% cap)</span>
          <span className="tile-v mono">{e.ramReq.toFixed(1)} / {e.ramCap.toFixed(1)} GB</span>
          <Meter used={e.ramReq} cap={e.ramCap} label="RAM use" />
          <span className="tile-s">{short(e.ramReq, e.ramCap)}</span>
        </div>
        <div className="tile">
          <span className="tile-k">Estimated speed (active params)</span>
          <span className="tile-v mono">{e.tps === null ? "n/a" : `${e.tps.toFixed(1)} tok/s`}</span>
          <span className="tile-s">{e.tps === null ? "Shown only when the model fits" : "Hybrid VRAM + RAM bandwidth estimate"}</span>
        </div>
        <div className="tile" data-v={e.verdict}>
          <span className="tile-k">Governor decision</span>
          <span className="tile-v">{VERDICT_TEXT[e.verdict]}</span>
        </div>
      </div>
    </div>
  );
}

interface LabState { tasks: SwarmTaskItem[]; roster: AgentRosterItem[]; hbCount: number; saved: number; log: string[]; banner: { kind: "none" | "ok" | "conflict"; text: string }; runSeq: number }
type LabAct =
  | { t: "heartbeat" }
  | { t: "checkout"; id: string }
  | { t: "complete"; id: string }
  | { t: "spend"; id: string }
  | { t: "reset" };
const labInit = (): LabState => ({ tasks: INITIAL_TASKS, roster: INITIAL_ROSTER, hbCount: 0, saved: 0, log: [], banner: { kind: "none", text: "" }, runSeq: 1 });
const isPaused = (a: AgentRosterItem) => a.paused || a.spentMicros >= a.budgetMicros;

function labReduce(s: LabState, a: LabAct): LabState {
  switch (a.t) {
    case "reset": return labInit();
    case "heartbeat": {
      const n = s.hbCount + 1;
      let saved = s.saved;
      const log = s.roster.map((ag) => {
        if (isPaused(ag)) return `${ag.id}: skipped (paused by budget governor)`;
        const work = s.tasks.filter((t) => t.assignee === ag.id && (t.status === "PENDING" || t.status === "IN_REVIEW")).length;
        if (work === 0) { saved += 190_000; return `${ag.id}: no wake, queue empty (0 tokens; spec figure ~190K saved)`; }
        return `${ag.id}: woke for ${work} actionable task${work > 1 ? "s" : ""}`;
      });
      return { ...s, hbCount: n, saved, log: [`Heartbeat #${n}`, ...log] };
    }
    case "checkout": {
      const t = s.tasks.find((x) => x.taskId === a.id);
      if (!t) return s;
      const ag = s.roster.find((x) => x.id === t.assignee);
      if (t.status === "COMPLETED") return { ...s, banner: { kind: "conflict", text: `${t.taskId} is already completed and cannot be checked out.` } };
      if (t.status === "RUNNING" && t.checkedOutRunId) return { ...s, banner: { kind: "conflict", text: `409 Conflict on ${t.taskId}: locked by run ${t.checkedOutRunId}. Second agent stops immediately, no retry loop.` } };
      if (t.status === "IN_REVIEW") return { ...s, banner: { kind: "conflict", text: `${t.taskId} is in review and is not available for checkout.` } };
      if (ag && isPaused(ag)) return { ...s, banner: { kind: "conflict", text: `Refused: ${ag.id} is paused by the budget governor.` } };
      const run = `run_${s.runSeq.toString(16).padStart(6, "0")}_${t.assignee.split("-").pop()}`;
      return { ...s, runSeq: s.runSeq + 1, tasks: s.tasks.map((x) => (x.taskId === t.taskId ? { ...x, status: "RUNNING", checkedOutRunId: run } : x)), banner: { kind: "ok", text: `Checkout granted on ${t.taskId} with X-Forge-Run-Id ${run}.` } };
    }
    case "complete":
      return { ...s, tasks: s.tasks.map((x) => (x.taskId === a.id ? { ...x, status: "COMPLETED", confidence: 100, checkedOutRunId: null } : x)), banner: { kind: "ok", text: `${a.id} completed and its lock released.` } };
    case "spend":
      return { ...s, roster: s.roster.map((ag) => (ag.id !== a.id || isPaused(ag) ? ag : { ...ag, spentMicros: Math.min(ag.budgetMicros, ag.spentMicros + Math.round(ag.budgetMicros * 0.25)), paused: ag.spentMicros + Math.round(ag.budgetMicros * 0.25) >= ag.budgetMicros })) };
  }
}

function SwarmLab() {
  const [s, d] = React.useReducer(labReduce, undefined, labInit);
  return (
    <div className="lab">
      <p className="meta">Simulation only. Timings quoted in the spec are targets, not measurements.</p>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={() => d({ t: "heartbeat" })}><Zap size={14} aria-hidden /><span>Trigger heartbeat</span></button>
        <button type="button" className="btn btn-ghost" onClick={() => d({ t: "reset" })}><RotateCcw size={14} aria-hidden /><span>Reset</span></button>
      </div>
      <p className="meta">Heartbeats: <b>{s.hbCount}</b> · spec-figure tokens saved: <b>{(s.saved / 1000).toFixed(0)}K</b></p>
      {s.log.length > 0 && <ul className="log" aria-live="polite">{s.log.map((l, i) => <li key={i} data-h={i === 0 || l.startsWith("Heartbeat")}>{l}</li>)}</ul>}
      {s.banner.kind !== "none" && <div className="banner" data-k={s.banner.kind} role="status">{s.banner.text}</div>}
      <div className="stack">
        {s.tasks.map((t) => {
          const locked = t.status === "RUNNING" && !!t.checkedOutRunId;
          const canTry = t.status === "PENDING" || locked;
          return (
            <div key={t.taskId} className="card">
              <div className="card-top"><span className="mono acc">{t.taskId}</span><span className={`chip st-${t.status.toLowerCase()}`}>{t.status.replace("_", " ")}</span></div>
              <div className="card-t">{t.title}</div>
              <p className="meta">Assignee <span className="mono">{t.assignee}</span> · {t.checkedOutRunId ? `lock ${t.checkedOutRunId}` : "unlocked"} · confidence {t.confidence}%</p>
              <div className="actions">
                <button type="button" className="btn" disabled={!canTry} onClick={() => d({ t: "checkout", id: t.taskId })}>{locked ? "Second agent checkout (409)" : "Atomic checkout"}</button>
                {locked && <button type="button" className="btn btn-ghost" onClick={() => d({ t: "complete", id: t.taskId })}>Mark completed</button>}
              </div>
            </div>
          );
        })}
      </div>
      <h3 className="h4">Budget governor</h3>
      <div className="grid2">
        {s.roster.map((ag) => {
          const p = pct(ag.spentMicros, ag.budgetMicros);
          const paused = isPaused(ag);
          return (
            <div key={ag.id} className="card">
              <div className="card-top"><span className="mono acc small">{ag.id}</span><span className={`chip ${paused ? "bad" : "ok"}`}>{paused ? "Paused" : "Active"}</span></div>
              <Meter used={ag.spentMicros} cap={ag.budgetMicros} label={`${p}% of budget spent`} />
              <p className="meta">{fmtMicros(ag.spentMicros)} of {fmtMicros(ag.budgetMicros)} ({p}%)</p>
              <button type="button" className="btn btn-ghost" disabled={paused} onClick={() => d({ t: "spend", id: ag.id })}>{paused ? "Paused" : "Simulate +25% spend"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HudLab() {
  const [state, setState] = useState<"armed" | "reaped">("armed");
  const [ms, setMs] = useState<number | null>(null);
  const stop = () => {
    const t0 = performance.now();
    setState("reaped");
    requestAnimationFrame(() => setMs(Math.round((performance.now() - t0) * 10) / 10));
  };
  const reaped = state === "reaped";
  return (
    <div className="lab">
      <div className="hud" data-s={state}>
        <div className="hud-bar"><span className="hud-led" aria-hidden /><span className="mono">bins/gf-emergency-hud · Super+Escape</span></div>
        <dl className="dl">
          <dt>Input lock on the host display</dt><dd>{reaped ? "Released" : "Held by the agent"}</dd>
          <dt>Worker subtree gf-worker-cu-04</dt><dd>{reaped ? "Terminated (whole subtree, including forked children)" : "Running, armed for atomic kill"}</dd>
          <dt>Interrupted tool call</dt><dd>{reaped ? "INTERRUPTED_UNCERTAIN, queued for human reconciliation" : "In flight"}</dd>
        </dl>
        <div className="actions">
          <button type="button" className="btn btn-primary" disabled={reaped} onClick={stop}><Zap size={14} aria-hidden /><span>Trigger emergency stop</span></button>
          <button type="button" className="btn btn-ghost" onClick={() => { setState("armed"); setMs(null); }}><RotateCcw size={14} aria-hidden /><span>Reset</span></button>
        </div>
        {ms !== null && <p className="meta" role="status">This page updated {ms} ms after the click. That is the browser demo, not the native overlay; the spec targets are under 2 ms to appear and under 15 ms to kill the subtree.</p>}
      </div>
    </div>
  );
}

function Ring0Lab() {
  const [log, setLog] = useState<{ ok: boolean; text: string }[]>([]);
  const btn = useRef<HTMLButtonElement | null>(null);
  const approve = (e: React.MouseEvent<HTMLButtonElement>) => {
    const trusted = e.nativeEvent.isTrusted;
    setLog((l) => [{ ok: trusted, text: trusted ? "Approved: genuine user click (isTrusted is true)." : "Rejected: scripted click (isTrusted is false)." }, ...l].slice(0, 6));
  };
  return (
    <div className="lab">
      <div className="actions">
        <button ref={btn} type="button" className="btn btn-primary" onClick={approve}><Lock size={14} aria-hidden /><span>Approve with a real click</span></button>
        <button type="button" className="btn" onClick={() => btn.current?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))}>Send a scripted click</button>
      </div>
      {log.length > 0 && <ul className="log" aria-live="polite">{log.map((l, i) => <li key={i} style={{ color: l.ok ? "var(--ok)" : "var(--bad)" }}>{l.text}</li>)}</ul>}
    </div>
  );
}

function OsMatrix() {
  return (
    <div className="stack">
      {OS_PARITY_ROWS.map((r) => (
        <div key={r.dim} className="card">
          <div className="card-t">{r.dim}</div>
          <dl className="dl">
            <dt>Mint 22 X11</dt><dd className="mono">{r.mint_x11}</dd>
            <dt>Mint 22 Wayland</dt><dd className="mono">{r.mint_wayland}</dd>
            <dt>Ubuntu 24.04 Wayland</dt><dd className="mono">{r.ubuntu_wayland}</dd>
            <dt>Windows 10/11</dt><dd className="mono">{r.win_x64}</dd>
            <dt>macOS 15–27</dt><dd className="mono">{r.macos}</dd>
          </dl>
        </div>
      ))}
    </div>
  );
}

export function Pane({ pane }: { pane: PaneRef }) {
  const { openPane, pins, togglePin, paneWidth, set } = useStore(useShallow((s) => ({ openPane: s.openPane, pins: s.pins, togglePin: s.togglePin, paneWidth: s.paneWidth, set: s.set })));
  const content = paneContent(pane);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const key = refKey(pane);
  const pinned = pins.includes(key);
  const drag = useRef<{ raf: number } | null>(null);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { raf: 0 };
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const x = e.clientX;
    cancelAnimationFrame(drag.current.raf);
    drag.current.raf = requestAnimationFrame(() => set({ paneWidth: clamp(window.innerWidth - x, 340, Math.max(360, Math.min(900, window.innerWidth - 460))) }));
  };
  const onUp = () => { drag.current = null; };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); set({ paneWidth: clamp(paneWidth + 24, 340, 900) }); }
    if (e.key === "ArrowRight") { e.preventDefault(); set({ paneWidth: clamp(paneWidth - 24, 340, 900) }); }
  };

  if (!content) return (
    <aside className="pane" aria-label="Side panel" style={{ width: paneWidth }}>
      <header className="pane-h"><div className="pane-hd"><h2 className="pane-t">Item not found</h2><p className="meta">That link points to something that is not in this document.</p></div><div className="pane-ac"><button type="button" className="icon-btn" aria-label="Close side panel" onClick={() => openPane(null)}><X size={16} aria-hidden /></button></div></header>
    </aside>
  );
  return (
    <aside className="pane" aria-label="Side panel" style={{ width: paneWidth }}>
      <div className="pane-grip" role="separator" aria-orientation="vertical" aria-label="Resize side panel" aria-valuenow={paneWidth} aria-valuemin={340} aria-valuemax={900} tabIndex={0} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey} />
      <header className="pane-h">
        <div className="pane-hd">
          <span className="chip">{content.kindLabel}</span>
          <h2 className="pane-t">{content.title}</h2>
          <p className="meta">{content.subtitle}</p>
        </div>
        <div className="pane-ac">
          <button type="button" className="icon-btn" aria-pressed={pinned} aria-label={pinned ? "Unpin" : "Pin"} title={pinned ? "Unpin" : "Pin"} onClick={() => togglePin(key)}><Bookmark size={16} aria-hidden fill={pinned ? "currentColor" : "none"} /></button>
          <button ref={closeRef} type="button" className="icon-btn" aria-label="Close side panel" title="Close side panel" onClick={() => openPane(null)}><X size={16} aria-hidden /></button>
        </div>
      </header>
      <div className="pane-b">
        <ErrorBoundary label="This panel failed to render">
          {content.badge.toLowerCase() !== content.kindLabel.toLowerCase() && <span className="chip ok">{content.badge}</span>}
          {content.why && <p className="p"><Inline text={content.why} /></p>}
          {content.how && <p className="meta">{content.how}</p>}
          {pane.kind === "lab" && pane.id === "moe" && <MoeLab />}
          {pane.kind === "lab" && pane.id === "swarm" && <SwarmLab />}
          {pane.kind === "lab" && pane.id === "hud" && <HudLab />}
          {pane.kind === "lab" && pane.id === "ring0" && <Ring0Lab />}
          {pane.kind === "os" && <OsMatrix />}
          {content.code && <CodeBlock code={content.code} lang={content.lang} label={content.kindLabel === "Prompt" ? "Dispatch prompt" : content.lang} />}
          <NotesBox refKey={key} title={content.title} />
        </ErrorBoundary>
      </div>
    </aside>
  );
}
// #endregion
