// Maps the app's content bundle (camelCase JSON) to database rows (snake_case) and back-compares. Used by seed-content.mjs and verify-content.mjs.
export const TABLES = [
  ["chapters", "id", (b) => b.chapters.map((c, i) => ({ id: c.id, position: i + 1, num: c.num, title: c.title, subtitle: c.subtitle, icon: c.icon }))],
  ["chapter_blocks", "chapter_id,position", (b) => b.chapters.flatMap((c) => (b.chapterBlocks[c.id] ?? []).map((blk, i) => {
    const { t, text, id, ...rest } = blk;
    const data = t === "chart" ? { id } : Object.keys(rest).length ? rest : null;
    return { chapter_id: c.id, position: i + 1, kind: t, anchor: t === "h2" ? id : null, text: text ?? null, data };
  }))],
  ["crates", "name", (b) => b.crates.map((c, i) => ({ name: c.name, position: i + 1, layer: c.layer, plane: c.plane, plain_summary: c.plainSummary, why_it_matters: c.whyItMatters, deps: c.deps, badge: c.badge, code: c.code }))],
  ["agents", "id", (b) => b.roster.map((a, i) => ({ id: a.id, position: i + 1, role: a.role, reports_to: a.reportsTo, tier: a.tier, plain_role_explanation: a.plainRoleExplanation, budget_micros: a.budgetMicros, spent_micros: a.spentMicros, paused: a.paused }))],
  ["swarm_tasks", "task_id", (b) => b.tasks.map((t, i) => ({ task_id: t.taskId, position: i + 1, ancestry: t.ancestry, title: t.title, plain_explanation: t.plainExplanation, assignee: t.assignee, status: t.status, checked_out_run_id: t.checkedOutRunId, confidence: t.confidence, plan_hash: t.planHash }))],
  ["packs", "id", (b) => b.packs.map((p, i) => ({ id: p.id, position: i + 1, cat: p.cat, cat_label: p.catLabel, name: p.name, size: p.size, min_tier: p.minTier, plain_purpose: p.plainPurpose, tools: p.tools }))],
  ["deep_prompts", "id", (b) => b.prompts.map((p, i) => ({ id: p.id, position: i + 1, files: p.files, title: p.title, plain_goal: p.plainGoal, why_needed: p.whyNeeded, full_prompt: p.fullPrompt }))],
  ["confirmations", "id", (b) => b.confirmations.map((c, i) => ({ id: c.id, position: i + 1, title: c.title, plain_why: c.plainWhy }))],
  ["patches", "id", (b) => b.patches.map((p, i) => ({ id: p.id, position: i + 1, target: p.target, summary: p.summary, code: p.code }))],
  ["spikes", "id", (b) => b.spikes.map((s, i) => ({ id: s.id, position: i + 1, target: s.target, cand_a: s.candA, cand_b: s.candB, gate: s.gate }))],
  ["os_parity_rows", "position", (b) => b.osRows.map((r, i) => ({ position: i + 1, dim: r.dim, mint_x11: r.mint_x11, mint_wayland: r.mint_wayland, ubuntu_wayland: r.ubuntu_wayland, win_x64: r.win_x64, macos: r.macos }))],
  ["tier_chart", "position", (b) => b.tierChart.map((t, i) => ({ position: i + 1, tier: t.tier, overhead_gb: t.overheadGb, model_gb: t.modelGb }))],
  ["pss_chart", "position", (b) => b.pssChart.map((p, i) => ({ position: i + 1, name: p.name, s1: p.s1, s10: p.s10 }))],
  ["anti_bloat_rows", "position", (b) => b.antiBloat.map((r, i) => ({ position: i + 1, layer: r.layer, retained: r.retained, pruned: r.pruned, impact: r.impact }))],
  ["claims", "id", (b) => b.claims.map((c, i) => ({ id: c.id, position: i + 1, where_text: c.where, claim: c.claim, found: c.found, action: c.action }))],
  ["claim_notes", "kind,position", (b) => [...b.claimsConfirmed.map((text, i) => ({ kind: "confirmed", position: i + 1, text })), { kind: "outdated", position: 1, text: b.claimsOutdated }, { kind: "unchecked", position: 1, text: b.claimsUnchecked }]]
];

export const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));
