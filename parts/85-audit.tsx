// #region 11d. CLAIMS REVIEW PAGE (decisions per claim are saved with your other data)
const AUDIT_LABEL: Record<AuditStatus, string> = { open: "Open", fix: "Fix the text", keep: "Keep as V20 target", drop: "Drop" };

export function AuditView() {
  const { audit, setAudit } = useStore(useShallow((s) => ({ audit: s.audit, setAudit: s.setAudit })));
  const [filter, setFilter] = useState<"all" | AuditStatus>("all");
  const st = (id: string): AuditStatus => audit[id]?.status ?? "open";
  const count = (s: AuditStatus) => CLAIMS.filter((c) => st(c.id) === s).length;
  const shown = CLAIMS.filter((c) => filter === "all" || st(c.id) === filter);
  return (
    <div className="col enter" style={{ fontFamily: "var(--sans)" }}>
      <h1 className="view-h">Claims review</h1>
      <p className="meta">Facts in the documentation that differ from public sources, or that are inconsistent inside it. This is a to-do list for the later documentation pass: nothing in the documentation text has been changed. Checked 2026-10-17. Your choices are saved.</p>
      <div className="seg" role="group" aria-label="Filter" style={{ margin: "6px 0 14px" }}>
        <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All ({CLAIMS.length})</button>
        {(Object.keys(AUDIT_LABEL) as AuditStatus[]).map((s) => <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>{AUDIT_LABEL[s]} ({count(s)})</button>)}
      </div>
      {shown.map((c) => (
        <div key={c.id} className="trk">
          <div className="trk-top">
            <span className="trk-t"><span className="chip" style={{ marginRight: 8 }}>{c.id}</span>{c.claim}</span>
            <div className="seg" role="group" aria-label={`Decision for ${c.id}`}>
              {(Object.keys(AUDIT_LABEL) as AuditStatus[]).map((s) => <button key={s} type="button" aria-pressed={st(c.id) === s} onClick={() => setAudit(c.id, { status: s })}>{AUDIT_LABEL[s]}</button>)}
            </div>
          </div>
          <p className="meta" style={{ margin: 0 }}><b>Where:</b> {c.where}</p>
          <p className="meta" style={{ margin: 0, color: "var(--tx2)" }}><b>What the source says:</b> {c.found}</p>
          <p className="meta" style={{ margin: 0 }}><b>Suggested:</b> {c.action}</p>
          <textarea aria-label={`Your note for ${c.id}`} placeholder="Your decision or note" value={audit[c.id]?.note ?? ""} onChange={(e) => setAudit(c.id, { note: e.target.value })} />
        </div>
      ))}
      {shown.length === 0 && <p className="meta">Nothing here.</p>}
      <h2 className="set-h" style={{ marginTop: 28 }}>Confirmed</h2>
      <ul className="rn">{CLAIMS_CONFIRMED.map((c) => <li key={c}>{c}</li>)}</ul>
      <h2 className="set-h">Outdated version pins</h2>
      <p className="meta">{CLAIMS_OUTDATED}</p>
      <h2 className="set-h">Not checked</h2>
      <p className="meta">{CLAIMS_UNCHECKED}</p>
    </div>
  );
}
// #endregion
