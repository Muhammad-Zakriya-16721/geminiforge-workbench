// #region 7. DOCUMENT RENDERER (chapter blocks -> assistant "document message")
function OpenBtn({ ref_, label = "Open in panel" }: { ref_: PaneRef; label?: string }) {
  const openPane = useStore((s) => s.openPane);
  return (
    <button type="button" className="btn" onClick={(e) => { e.stopPropagation(); openPane(ref_); }}>
      <Code2 size={14} aria-hidden />
      <span>{label}</span>
    </button>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <input type="search" className="field" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />;
}

function CratesBlock() {
  const [q, setQ] = useState("");
  const setAll = useStore((s) => s.setAllOpen);
  const list = CRATES_LIST.filter((c) => !q.trim() || `${c.name} ${c.layer} ${c.plainSummary} ${c.whyItMatters}`.toLowerCase().includes(q.toLowerCase().trim()));
  const keys = CRATES_LIST.map((c) => `crate:${c.name}`);
  return (
    <div className="blk">
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Search crates by name, layer or purpose" />
        <button type="button" className="btn btn-ghost" onClick={() => setAll(keys, true)}>Expand all</button>
        <button type="button" className="btn btn-ghost" onClick={() => setAll(keys, false)}>Collapse all</button>
      </div>
      {list.length === 0 && <p className="muted">No crate matches that search.</p>}
      {list.map((c, i) => (
        <Row key={c.name} id={`crate:${c.name}`} dflt={i === 0 && !q} title={<span className="mono">{c.name}</span>} badge={c.layer} summary={c.plainSummary}>
          <p className="lead">{c.plainSummary}</p>
          <p><strong>Why it matters:</strong> {c.whyItMatters}</p>
          <p className="meta">Allowed dependencies: <span className="mono">{c.deps}</span> · {c.plane}</p>
          <CodeBlock code={c.code} lang={langOf(c.code)} label="Rust / SQL definition" />
          <div className="actions"><OpenBtn ref_={{ kind: "crate", id: c.name }} /></div>
        </Row>
      ))}
    </div>
  );
}

const PACK_CATS = [
  { id: "ALL", label: "All packs" },
  { id: "CAT1", label: "Coding & ACP" },
  { id: "CAT2", label: "Computer use" },
  { id: "CAT3", label: "Clean-room RE" },
  { id: "CAT4", label: "Swarms & ForgeLab" },
  { id: "CAT5", label: "AI, voice & studio" }
];

function PacksBlock() {
  const [cat, setCat] = useState("ALL");
  const [q, setQ] = useState("");
  const openPane = useStore((s) => s.openPane);
  const list = FORGEHUB_PACKS.filter((p) => (cat === "ALL" || p.cat === cat) && (!q.trim() || `${p.id} ${p.name} ${p.plainPurpose} ${p.tools}`.toLowerCase().includes(q.toLowerCase().trim())));
  return (
    <div className="blk">
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Pack category">
          {PACK_CATS.map((c) => (
            <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</button>
          ))}
        </div>
        <SearchBox value={q} onChange={setQ} placeholder="Filter packs by name or tool" />
      </div>
      <p className="meta">{list.length} of {FORGEHUB_PACKS.length} packs</p>
      <div className="grid2">
        {list.map((p) => (
          <button key={p.id} type="button" className="card card-btn" onClick={() => openPane({ kind: "pack", id: p.id })}>
            <span className="card-top"><span className="mono acc">{p.id} · {p.size}</span><span className="chip">Min tier {p.minTier}</span></span>
            <span className="card-t">{p.name}</span>
            <span className="card-x">{p.plainPurpose}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PromptsBlock() {
  const [q, setQ] = useState("");
  const setAll = useStore((s) => s.setAllOpen);
  const tracker = useStore((s) => s.tracker);
  const list = DEEP_PROMPTS.filter((p) => !q.trim() || `${p.id} ${p.title} ${p.files} ${p.plainGoal}`.toLowerCase().includes(q.toLowerCase().trim()));
  const keys = DEEP_PROMPTS.map((p) => `prompt:${p.id}`);
  return (
    <div className="blk">
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Search prompts by id, file or topic" />
        <button type="button" className="btn btn-ghost" onClick={() => setAll(keys, true)}>Expand all</button>
        <button type="button" className="btn btn-ghost" onClick={() => setAll(keys, false)}>Collapse all</button>
      </div>
      {list.map((p, i) => {
        const st = tracker[p.id]?.status ?? "todo";
        return (
          <Row key={p.id} id={`prompt:${p.id}`} dflt={i === 0 && !q} title={`${p.id}: ${p.title}`} badge={st === "todo" ? undefined : st === "running" ? "Running" : "Done"} summary={p.plainGoal}>
            <p className="meta">Target specification files: <span className="mono">{p.files}</span></p>
            <p className="lead">{p.plainGoal}</p>
            <p><strong>Why this session is needed:</strong> {p.whyNeeded}</p>
            <CodeBlock code={p.fullPrompt} lang="text" label="Dispatch prompt" />
            <div className="actions"><OpenBtn ref_={{ kind: "prompt", id: p.id }} /></div>
          </Row>
        );
      })}
    </div>
  );
}

function ConfirmsBlock() {
  const openPane = useStore((s) => s.openPane);
  return (
    <div className="stack">
      {LOCKED_CONFIRMATIONS.map((c) => (
        <button key={c.id} type="button" className="card card-btn" onClick={() => openPane({ kind: "confirm", id: c.id })}>
          <span className="card-top"><span className="mono acc">{c.id}</span><span className="chip ok">Accepted & locked</span></span>
          <span className="card-t">{c.title}</span>
          <span className="card-x">{c.plainWhy}</span>
        </button>
      ))}
    </div>
  );
}

function PatchesBlock() {
  const openPane = useStore((s) => s.openPane);
  return (
    <div className="grid2">
      {SPECIFICATION_PATCHES.map((p) => (
        <button key={p.id} type="button" className="card card-btn" onClick={() => openPane({ kind: "patch", id: p.id })}>
          <span className="card-top"><span className="mono acc">{p.id}</span><span className="mono dim">{p.target}</span></span>
          <span className="card-x">{p.summary}</span>
        </button>
      ))}
    </div>
  );
}

function TasksBlock() {
  return (
    <div className="stack">
      {INITIAL_TASKS.map((t) => (
        <div key={t.taskId} className="card">
          <div className="card-top"><span className="mono acc">{t.taskId}</span><span className={`chip st-${t.status.toLowerCase()}`}>{t.status.replace("_", " ")}</span></div>
          <div className="card-t">{t.title}</div>
          <p className="card-x">{t.plainExplanation}</p>
          <p className="meta">{t.ancestry}</p>
          <p className="meta">Assignee <span className="mono">{t.assignee}</span> · confidence {t.confidence}% · plan <span className="mono">{t.planHash}</span></p>
        </div>
      ))}
    </div>
  );
}

function RosterBlock() {
  return (
    <div className="grid2">
      {INITIAL_ROSTER.map((a) => {
        const p = pct(a.spentMicros, a.budgetMicros);
        return (
          <div key={a.id} className="card">
            <div className="card-top"><span className="mono acc">{a.id}</span><span className="chip">{a.tier.split(" ")[0]}</span></div>
            <div className="card-t">{a.role}</div>
            <p className="card-x">{a.plainRoleExplanation}</p>
            <p className="meta">Reports to {a.reportsTo}</p>
            <div className="meter" role="img" aria-label={`${p}% of budget spent`}><i style={{ width: `${p}%` }} /></div>
            <p className="meta">{fmtMicros(a.spentMicros)} of {fmtMicros(a.budgetMicros)} ({p}%)</p>
          </div>
        );
      })}
    </div>
  );
}

const logW = (v: number, max: number) => (v <= 0 ? 0 : Math.max(2, (Math.log10(1 + v) / Math.log10(1 + max)) * 60));

function ChartBlock({ id }: { id: "tier" | "pss" }) {
  if (id === "tier") {
    const max = Math.max(...TIER_CHART_DATA.map((d) => d.modelGb));
    return (
      <figure className="chart">
        <figcaption>Memory by hardware tier (GB, log scale)</figcaption>
        {TIER_CHART_DATA.map((d) => (
          <div key={d.tier} className="chart-row">
            <span className="chart-l">{d.tier}</span>
            <div className="chart-bars">
              <div className="chart-line"><i className="b1" style={{ width: `${logW(d.overheadGb, max)}%` }} /><span>{d.overheadGb} GB core overhead</span></div>
              <div className="chart-line"><i className="b2" style={{ width: `${logW(d.modelGb, max)}%` }} /><span>{d.modelGb === 0 ? "0 GB (local models blocked)" : `${d.modelGb} GB max local model budget`}</span></div>
            </div>
          </div>
        ))}
        <p className="meta">Bar length grows with the logarithm of the value, so 0.12 GB and 160 GB are both readable.</p>
      </figure>
    );
  }
  const max = Math.max(...HARNESS_PSS_DATA.map((d) => d.s10));
  return (
    <figure className="chart">
      <figcaption>Resident memory per harness (MB, log scale)</figcaption>
      {HARNESS_PSS_DATA.map((d, i) => (
        <div key={d.name} className="chart-row" data-hl={i === 0}>
          <span className="chart-l">{d.name}</span>
          <div className="chart-bars">
            <div className="chart-line"><i className="b1" style={{ width: `${logW(d.s1, max)}%` }} /><span>{d.s1} MB with 1 session</span></div>
            <div className="chart-line"><i className="b2" style={{ width: `${logW(d.s10, max)}%` }} /><span>{d.s10} MB with 10 sessions</span></div>
          </div>
        </div>
      ))}
      <p className="meta">Bar length grows with the logarithm of the value, so 28 MB and 3,200 MB are both readable.</p>
    </figure>
  );
}

function TableBlock({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="tbl">
      <table>
        <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j === 0 ? "mono" : undefined}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function Doc({ chapter }: { chapter: ChapterId }) {
  const openPane = useStore((s) => s.openPane);
  const blocks = CHAPTER_BLOCKS[chapter];
  return (
    <div className="doc">
      <span id={`sec-${chapter}-top`} />
      <AiTrail prefix={`chapter:${chapter}`} />
      {blocks.map((b, i) => {
        switch (b.t) {
          case "badge": return <p key={i} className="kicker">{b.text}</p>;
          case "h1": return <h1 key={i} className="h1"><Inline text={b.text} /></h1>;
          case "h2": return <h2 key={i} id={b.id} className="h2"><Inline text={b.text} /></h2>;
          case "p": return <p key={i} className="p"><Inline text={b.text} /></p>;
          case "rows":
            return (
              <div key={i} className="blk">
                {b.items.map((r, j) => (
                  <Row key={j} id={`row:${chapter}:${j}`} dflt={chapter === "overview" && j === 0} title={r.title} badge={r.badge}>
                    {r.body.map((t, k) => <p key={k} className="p"><Inline text={t} /></p>)}
                  </Row>
                ))}
              </div>
            );
          case "cards":
            return (
              <div key={i} className="grid2">
                {b.items.map((c) => (
                  <div key={c.title} className="card">
                    <span className="mono acc small">{c.tag}</span>
                    <div className="card-t">{c.title}</div>
                    <p className="card-x">{c.text}</p>
                  </div>
                ))}
              </div>
            );
          case "chips":
            return (
              <div key={i} className="chips">
                {b.items.map((c) => (
                  <button key={c.label} type="button" className="chipbtn" onClick={() => openPane(c.ref)}>
                    <Sparkles size={14} aria-hidden /><span>{c.label}</span><ChevronRight size={14} aria-hidden />
                  </button>
                ))}
              </div>
            );
          case "chart": return <ChartBlock key={i} id={b.id} />;
          case "table": return <TableBlock key={i} head={b.head} rows={b.rows} />;
          case "crates": return <CratesBlock key={i} />;
          case "packs": return <PacksBlock key={i} />;
          case "prompts": return <PromptsBlock key={i} />;
          case "confirms": return <ConfirmsBlock key={i} />;
          case "patches": return <PatchesBlock key={i} />;
          case "tasks": return <TasksBlock key={i} />;
          case "roster": return <RosterBlock key={i} />;
          default: return null;
        }
      })}
    </div>
  );
}
// #endregion
