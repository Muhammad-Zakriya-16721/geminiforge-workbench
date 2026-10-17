// #region 5. PANE CONTENT + SEARCH INDEX
export interface PaneContent { title: string; subtitle: string; badge: string; why: string; how: string; code: string; lang: "rust" | "sql" | "json" | "text"; kindLabel: string }

export const refKey = (r: PaneRef) => `${r.kind}:${r.id}`;
export const refFromKey = (k: string): PaneRef | null => {
  const i = k.indexOf(":");
  return i > 0 ? { kind: k.slice(0, i) as PaneKind, id: k.slice(i + 1) } : null;
};

const langOf = (code: string): PaneContent["lang"] => (/^\s*(--|SELECT|PRAGMA|SET )/m.test(code) && !/fn |pub |\/\//.test(code) ? "sql" : "rust");

export function paneContent(ref: PaneRef): PaneContent | null {
  switch (ref.kind) {
    case "crate": {
      const c = CRATES_LIST.find((x) => x.name === ref.id);
      return c ? { title: c.name, subtitle: `${c.layer} · ${c.plane}`, badge: c.badge, why: c.whyItMatters, how: `Allowed workspace dependencies: ${c.deps}`, code: c.code, lang: langOf(c.code), kindLabel: "Crate" } : null;
    }
    case "pack": {
      const p = FORGEHUB_PACKS.find((x) => x.id === ref.id);
      return p ? { title: `${p.id}: ${p.name}`, subtitle: `${p.catLabel} · ${p.size} · Min tier ${p.minTier}`, badge: "ON-DEMAND PACK", why: p.plainPurpose, how: "Verified against toolpacks.lock.json (Ed25519 + SHA-256) before unpacking into sandboxed worker storage.", code: JSON.stringify(p, null, 2), lang: "json", kindLabel: "Pack" } : null;
    }
    case "prompt": {
      const p = DEEP_PROMPTS.find((x) => x.id === ref.id);
      return p ? { title: `${p.id}: ${p.title}`, subtitle: `Target specification files: ${p.files}`, badge: "DEEP RESEARCH BRIEF", why: p.whyNeeded, how: `Goal: ${p.plainGoal}`, code: p.fullPrompt, lang: "text", kindLabel: "Prompt" } : null;
    }
    case "confirm": {
      const c = LOCKED_CONFIRMATIONS.find((x) => x.id === ref.id);
      return c ? { title: `${c.id}: ${c.title}`, subtitle: "Locked architectural confirmation", badge: "ACCEPTED & LOCKED", why: c.plainWhy, how: "", code: "", lang: "text", kindLabel: "Confirmation" } : null;
    }
    case "patch": {
      const p = SPECIFICATION_PATCHES.find((x) => x.id === ref.id);
      return p ? { title: `${p.id} · ${p.target}`, subtitle: `Drop-in patch for ${p.target}`, badge: "SPECIFICATION PATCH", why: p.summary, how: "Paste this block into the target specification file.", code: p.code, lang: langOf(p.code), kindLabel: "Patch" } : null;
    }
    case "spike": {
      const s = PROTOTYPE_SPIKES.find((x) => x.id === ref.id);
      return s ? { title: `${s.id} · ${s.target}`, subtitle: "Phase 0 prototype spike", badge: "PROTOTYPE SPIKE", why: `Candidate A (${s.candA}) against Candidate B (${s.candB}).`, how: `Falsification gate: ${s.gate}`, code: "", lang: "text", kindLabel: "Spike" } : null;
    }
    case "os":
      return { title: "Six-Target OS & CPU Parity Matrix", subtitle: "Linux Mint 22 (X11 & Wayland) · Ubuntu 24.04 · Windows 10/11 · macOS 15–27", badge: "MATRIX", why: "Every operating system has its own sandboxing and display-server traps. For example, Linux Mint 22 Cinnamon Wayland uses xdg-desktop-portal-xapp, which lacks RemoteDesktop/ScreenCast, so forge-cu routes GUI tasks into an isolated Xvfb/Xpra virtual display.", how: "", code: "", lang: "text", kindLabel: "Matrix" };
    case "lab":
      if (ref.id === "moe") return { title: "Split-Memory MoE Offload Calculator", subtitle: "Lab · crates/forge-hw (Patch F.4)", badge: "LAB", why: "Tests how Mixture-of-Experts models split total weights across GPU VRAM and host RAM while active parameters set tokens per second.", how: "All results are estimates from assumed bandwidths, not measurements.", code: CRATES_LIST[1].code, lang: "rust", kindLabel: "Lab" };
      if (ref.id === "swarm") return { title: "Paperclip 409 Checkout & Pre-Wake Lab", subtitle: "Lab · crates/forge-swarm (file 05.C)", badge: "LAB", why: "Shows how the pre-wake check avoids waking an agent with an empty queue, and how atomic checkout rejects a second agent with HTTP 409.", how: "Simulation only. Timings in the spec are targets, not measurements.", code: CRATES_LIST[2].code, lang: "sql", kindLabel: "Lab" };
      if (ref.id === "hud") return { title: "Emergency Kill-Switch HUD (simulation)", subtitle: "Lab · bins/gf-emergency-hud (CONFIRM-08)", badge: "LAB", why: "Walks through what the Super+Escape overlay is specified to do: release input, then terminate the whole worker subtree atomically.", how: "Simulation only. The spec targets (map in under 2 ms, kill in under 15 ms) are not measured here.", code: CRATES_LIST[CRATES_LIST.length - 1].code, lang: "rust", kindLabel: "Lab" };
      if (ref.id === "ring0") return { title: "Ring-0 Sanction Gate (demo)", subtitle: "Lab · Prompt 14 / 08.A (event.isTrusted)", badge: "LAB", why: "The spec asks the approval modal to accept only genuine user clicks (DOM event.isTrusted == true). This demo shows the difference between a real click and a scripted one.", how: "A browser flag is a UI-level signal only. Real enforcement of approvals has to live in the daemon, not in page code.", code: "", lang: "text", kindLabel: "Lab" };
      return null;
  }
}

export interface IndexItem { key: string; group: string; title: string; sub: string; badge?: string; ref?: PaneRef; view?: View; kw: string }

export const GROUPS: { id: string; label: string; desc: string }[] = [
  { id: "chapter", label: "Chapters", get desc() { return `Open one of the ${CHAPTERS.length} chapters`; } },
  { id: "crate", label: "Crates", desc: "Rust crates and binaries" },
  { id: "pack", label: "Packs", get desc() { return `${FORGEHUB_PACKS.length} on-demand ForgeHub packs`; } },
  { id: "prompt", label: "Prompts", get desc() { return `${DEEP_PROMPTS.length} deep research briefs`; } },
  { id: "confirm", label: "Confirmations", get desc() { return `${LOCKED_CONFIRMATIONS.length} locked decisions`; } },
  { id: "patch", label: "Patches", desc: "Drop-in specification patches" },
  { id: "spike", label: "Spikes", desc: "Phase 0 prototype experiments" },
  { id: "lab", label: "Labs", desc: "Interactive simulators" },
  { id: "os", label: "OS matrix", desc: "Six-target parity matrix" }
];

const buildIndex = (): IndexItem[] => {
  const items: IndexItem[] = [];
  CHAPTERS.forEach((c) => items.push({ key: `chapter:${c.id}`, group: "chapter", title: `${c.num} ${c.title}`, sub: c.subtitle, badge: "Chapter", view: { kind: "chapter", id: c.id }, kw: `${c.title} ${c.subtitle} chapter ${c.num}`.toLowerCase() }));
  const add = (ref: PaneRef, group: string, badge: string, extra: string) => {
    const pc = paneContent(ref);
    if (pc) items.push({ key: refKey(ref), group, title: pc.title, sub: pc.why.length > 120 ? pc.why.slice(0, 117) + "..." : pc.why, badge, ref, kw: `${pc.title} ${pc.subtitle} ${pc.why} ${extra}`.toLowerCase() });
  };
  CRATES_LIST.forEach((c) => add({ kind: "crate", id: c.name }, "crate", "Crate", `${c.layer} ${c.plainSummary} ${c.deps}`));
  FORGEHUB_PACKS.forEach((p) => add({ kind: "pack", id: p.id }, "pack", `Tier ${p.minTier}`, `${p.catLabel} ${p.tools} ${p.size}`));
  DEEP_PROMPTS.forEach((p) => add({ kind: "prompt", id: p.id }, "prompt", "Prompt", `${p.files} ${p.plainGoal}`));
  LOCKED_CONFIRMATIONS.forEach((c) => add({ kind: "confirm", id: c.id }, "confirm", "Locked", ""));
  SPECIFICATION_PATCHES.forEach((p) => add({ kind: "patch", id: p.id }, "patch", p.target, ""));
  PROTOTYPE_SPIKES.forEach((s) => add({ kind: "spike", id: s.id }, "spike", "Spike", `${s.candA} ${s.candB} ${s.gate}`));
  add({ kind: "lab", id: "moe" }, "lab", "Lab", "moe vram ram calculator offload ngl simulator");
  add({ kind: "lab", id: "swarm" }, "lab", "Lab", "heartbeat checkout 409 pre-wake paperclip simulator");
  add({ kind: "lab", id: "hud" }, "lab", "Lab", "emergency hud kill switch super escape cgroup reap iced simulator");
  add({ kind: "lab", id: "ring0" }, "lab", "Lab", "ring-0 sanction gate istrusted click approval demo");
  add({ kind: "os", id: "matrix" }, "os", "Matrix", "linux windows macos mint ubuntu wayland x11 parity");
  return items;
};
export const INDEX: IndexItem[] = buildIndex();
export const rebuildIndex = () => { INDEX.length = 0; INDEX.push(...buildIndex()); };

export function searchIndex(q: string, group?: string): IndexItem[] {
  const parts = q.toLowerCase().split(/\s+/).filter(Boolean);
  const pool = group ? INDEX.filter((i) => i.group === group) : INDEX;
  if (!parts.length) return pool;
  return pool
    .map((it) => {
      if (!parts.every((p) => it.kw.includes(p))) return null;
      const title = it.title.toLowerCase();
      let score = 0;
      parts.forEach((p) => { if (title.includes(p)) score += 3; if (title.startsWith(p)) score += 2; });
      return { it, score };
    })
    .filter((x): x is { it: IndexItem; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.it);
}
// #endregion
