// #region 3. CHAPTERS (prose as data, so it can be rendered, searched, exported and printed)
export const CHAPTER_ICONS: Record<string, React.ElementType> = { BookOpen, Layers, Cpu, Network, Box, FileText, ShieldCheck };
export const chapterIcon = (name: string): React.ElementType => CHAPTER_ICONS[name] ?? BookOpen;
export const CHAPTERS: ChapterMeta[] = ([
  { id: "overview", num: "01", title: "Executive Overview & Philosophy", subtitle: "What GeminiForge V20 is, why it exists, and how the 5 planes fit together", icon: "BookOpen" },
  { id: "planes", num: "02", title: "5 Planes, 14 Crates & 6-OS Parity", subtitle: "Clear guide to every Rust crate, kernel sandbox boundary, and OS target", icon: "Layers" },
  { id: "governor", num: "03", title: "Hardware Governor & Computer Use", subtitle: "Split-memory MoE sizing, 4 GB Tier E mode, and the sub-50ms CU router", icon: "Cpu" },
  { id: "swarm", num: "04", title: "Paperclip Org-Swarm & Junie Lite", subtitle: "Zero-token heartbeats (#3401 fix), atomic 409 checkouts, and two-speed routing", icon: "Network" },
  { id: "packs", num: "05", title: "25-Pack ForgeHub & Anti-Bloat Diet", subtitle: "On-demand .gfpack catalog and why we pruned 1.4 GB of duplicate dependencies", icon: "Box" },
  { id: "prompts", num: "06", title: "14 Deep Research Dispatch Prompts", subtitle: "Self-contained specification briefs for sequential 1-by-1 execution", icon: "FileText" },
  { id: "patches", num: "07", title: "8 Locked Confirms, Spikes & Patches", subtitle: "Accepted architectural decisions (CONFIRM-01–08) and F.1–F.6 drop-in code", icon: "ShieldCheck" }
] as Omit<ChapterMeta, "Icon">[]).map((c) => ({ ...c, Icon: chapterIcon(c.icon) }));

const MOE_REF: PaneRef = { kind: "lab", id: "moe" };
const SWARM_REF: PaneRef = { kind: "lab", id: "swarm" };
const OS_REF: PaneRef = { kind: "os", id: "matrix" };

export const CHAPTER_BLOCKS: Record<ChapterId, Block[]> = {
  overview: [
    { t: "badge", text: "CANONICAL V20 EDITION · 37 SOURCES & 4 AUDITS RECONCILED" },
    { t: "h1", text: "Meet the GeminiForge V20 Architecture." },
    { t: "p", text: "GeminiForge is a 100% free, local-first AI coding, computer-use, and reverse-engineering workstation designed to run smoothly on everything from a **4 GB RAM Linux Mint laptop** to a **192 GB multi-GPU studio server**. Instead of cramping raw tables onto a screen, this guide walks through how each part of the system works, why we designed it that way, and what bugs it eliminates." },
    { t: "h2", id: "sec-overview-pillars", text: "Three Core Principles Behind V20" },
    { t: "p", text: "During our line-by-line audit of 19 competing AI tools and 37 specification files, we found that most agent failures come from three sources: trusting in-process timeouts to stop hung tools, burning hundreds of millions of tokens on idle background timers, and bloating the base app with gigabytes of C++/Java dependencies. Here is how V20 solves all three:" },
    {
      t: "rows",
      items: [
        {
          title: "1. Kernel-Enforced Containment & <15 ms Subtree Termination",
          badge: "Plane 3 & Plane 4",
          body: [
            "**The Problem:** In Rust, `std::panic::catch_unwind` cannot catch a C++ segmentation fault, and `tokio::time::timeout` cannot stop a synchronous CPU loop or a hung OS accessibility call. Even worse, sending `SIGKILL` to a child process leaves its forked grandchildren running as orphans.",
            "**How GeminiForge Solves It:** The central Rust daemon (`geminiforge-daemon`, 28–65 MB RAM) never links C++ parsers in-process. Every parser, accessibility query, and coding agent runs in a sandboxed OS worker subprocess. When a timeout expires, the daemon kills the entire process subtree in **< 15 ms** by writing `1` to Linux cgroup v2 `cgroup.kill` (paired with our non-colliding `/usr/lib/geminiforge/gf-bwrap-helper` AppArmor wrapper), calling Windows `TerminateJobObject` + `AppContainer`, or triggering macOS `killpg` + `kqueue EVFILT_PROC`."
          ]
        },
        {
          title: "2. Zero-Token Idle Heartbeats & <500-Token Tool Context",
          badge: "98.8% Token Savings",
          body: [
            "**The Problem:** Loading 200 MCP tool schemas into every prompt burns ~40,000 tokens per turn. Furthermore, in upstream multi-agent systems ([Paperclip Issue #3401](https://github.com/paperclipai/paperclip/issues/3401)), waking an agent on a 15-minute timer just to check if its inbox is empty re-reads ~190K context tokens per wake—burning **859.6M tokens/day** for zero output.",
            "**How GeminiForge Solves It:** First, our **4-Meta-Tool Capability Gateway** (`search_capabilities`, `execute_capability`, `list_skills`, `get_skill`) keeps baseline tool overhead at **480 tokens**, while **QuickJS-WASM Code Mode** chains 50-step MCP calls in a single turn. Second, our **Zero-Token SQLite Pre-Wake Gate** checks `has_actionable_work(agent_id)` in `authoritative_audit.db` in **< 0.1 ms** in Rust—never waking an LLM when its queue is empty."
          ]
        },
        {
          title: "3. True 4 GB Laptop Support Without Compromising Pro Workstations",
          badge: "Tier E → Tier S",
          body: [
            "**The Problem:** Bundling a second browser runtime, loading local ONNX embedding weights (140 MB), or spawning Valve's Vulkan `Gamescope` compositor (180 MB) on a 4 GB RAM laptop causes immediate swap thrashing.",
            "**How GeminiForge Solves It:** On 4 GB Tier E hosts, `geminiforge-lite` (~14–18 MB installer) attaches to your existing system browser in `--app` mode (~18 MB bridge RSS), hard-blocks local model weights, uses **< 2 MB SQLite FTS5 BM25** lexical search, and uses lightweight `Xvfb` (15–35 MB RSS). On 16 GB+ Tier B/A/S machines, the governor unlocks Sandboxed Electron + React 19, `Xpra + Xephyr -glamor` (<30 MB VRAM on Ryzen 3500U Vega 8), and split VRAM/RAM MoE model offloading."
          ]
        }
      ]
    },
    { t: "h2", id: "sec-overview-artifacts", text: "Explore the Live Interactive Artifacts" },
    { t: "p", text: "Open either lab in the side panel to test the live simulators or inspect the underlying Rust and SQL code:" },
    { t: "chips", items: [{ label: "Split-Memory MoE Offload Calculator", ref: MOE_REF }, { label: "Paperclip 409 Checkout & Pre-Wake Lab", ref: SWARM_REF }] }
  ],

  planes: [
    { t: "h1", text: "The 14-Crate Rust Workspace & 6-OS Parity" },
    { t: "p", text: "Instead of a bloated 76-crate workspace with circular dependencies, GeminiForge V20 organizes its Rust codebase (Edition 2024, MSRV 1.89.0) into **14 strictly layered crates** across five isolation planes. Open any crate below to read its Rust trait and SQLite schema in the side panel." },
    { t: "h2", id: "sec-planes-crates", text: "Layered Crates Registry" },
    { t: "crates" },
    { t: "h2", id: "sec-planes-matrix", text: "How V20 Adapts Across All 6 OS & CPU Targets" },
    { t: "p", text: "Rather than assuming Linux Wayland behaves like X11 or Windows JobObjects restrict file access (they don't—Windows requires pairing JobObjects with `CreateAppContainerProfile` capability SIDs), V20 maps each kernel primitive explicitly per platform. Open the matrix to inspect all six targets side-by-side." },
    { t: "chips", items: [{ label: "Six-Target OS & CPU Parity Matrix", ref: OS_REF }] }
  ],

  governor: [
    { t: "h1", text: "Hardware Admission Governor & Sub-50ms Computer Use" },
    { t: "p", text: "Below you can see how resident memory is budgeted across hardware tiers (from 4 GB Tier E laptops to 192 GB Tier S workstations), why local AST/FTS5 recall avoids the 3.1 GB memory bloat seen in competing harnesses, and how our Orthogonal Computer-Use Router achieves a **60× speedup** over screenshot-only VLM agents." },
    { t: "h2", id: "sec-governor-chart1", text: "Resident Memory Budgets by Hardware Tier (Tiers E → S)" },
    { t: "p", text: "**What this chart shows:** On a 4 GB Tier E laptop, the Rust governor keeps total workstation overhead (`geminiforge-lite` bridge + daemon + `Xvfb`) under **120 MB** and hard-blocks local model weights (0 GB). As system RAM scales from 8 GB (Tier C) to 192 GB (Tier S), the governor progressively admits larger quantized models while keeping core overhead tiny." },
    { t: "chart", id: "tier" },
    { t: "h2", id: "sec-governor-chart2", text: "Coding Harness Memory Scaling (1-Session vs. 10-Session Swarm)" },
    { t: "p", text: "**What this chart shows:** Upstream benchmarks show that enabling local ONNX embeddings in `jcode` jumps 1-session memory from **27.8 MB** to **167.1 MB**, while Node/Electron harnesses consume over **2.2 GB–3.2 GB** across 10 sessions. GeminiForge achieves <2 MB lexical recall overhead on Tier E via SQLite FTS5 BM25 + Tree-sitter AST graphs." },
    { t: "chart", id: "pss" },
    { t: "h2", id: "sec-governor-router", text: "Orthogonal Computer-Use Router (Environment × Mechanism)" },
    { t: "p", text: "Most computer-use agents take a full-screen screenshot and wait 3–8 seconds for a cloud vision model on every click. GeminiForge separates **Where** the app runs (Env A Headless, Env B Isolated PiP Display, Env C Host Screen) from **How** the action is executed, always choosing the fastest deterministic tier first:" },
    {
      t: "cards",
      items: [
        { tag: "Mechanism Tier 0 · 1–15 ms (0 Vision Tokens)", title: "Direct Native API, MCP & CLI-Anything Harnesses", text: "Wraps desktop GUI apps (GIMP, Blender, LibreOffice, Audacity) into structured stateful JSON CLIs (HKUDS/CLI-Anything), executing actions in <15 ms without touching the mouse or spending vision tokens." },
        { tag: "Mechanism Tier 1 · 5–80 ms (~200 Tokens)", title: "Browser Provider Protocol (Playwright CDP + Lightpanda)", text: "Clicks web elements via stable element_ref handles (page.snapshot) with automatic RAII tab/session cleanup (fixing jcode#1805), using isolated Lightpanda (<45 MB RSS) for fast static scraping." },
        { tag: "Mechanism Tier 2 · <5 ms Replay / 40–180 ms Live", title: "Preemptible Rust Accessibility Worker + .forge-flow.yaml", text: "Queries native widget trees inside a 250 ms watchdog worker—using stateless zbus AT-SPI2 on Linux (fixing cua#4894 Qt6 hangs and #4963 Orca launches) and HWND-scoped UIA on Windows (<2 ms, fixing cua#4906)." },
        { tag: "Mechanism Tier 3 · 400–900 ms (2-Turn WebP ROI)", title: "UI-TARS-1.5 Vision Fallback + VPI-Bench Intent Guard", text: "Used only for custom GPU canvases with zero accessibility nodes. Guarded by the vision-blind forge-intent-guard (blocking 100% of VPI-Bench visual prompt injections) and a <1 ms pre-click Sobel edge lock." }
      ]
    },
    { t: "chips", items: [{ label: "Split-Memory MoE Offload Calculator", ref: MOE_REF }] }
  ],

  swarm: [
    { t: "h1", text: "Paperclip Organizational Swarm & Junie-Lite Two-Speed Routing" },
    { t: "p", text: "In new specification file `05.C`, GeminiForge integrates the best organizational primitives from [Paperclip AI](https://github.com/paperclipai/paperclip/blob/master/docs/guides/agent-developer/heartbeat-protocol.md) and [JetBrains Junie Lite](https://junie.jetbrains.com/blog/junie-lite/) directly into our Rust daemon and SQLite WAL database—eliminating Paperclip's heavy PostgreSQL/Node server and fixing its 859.6M-token/day heartbeat bug ([Issue #3401](https://github.com/paperclipai/paperclip/issues/3401))." },
    { t: "h2", id: "sec-swarm-simulation", text: "Zero-Token SQLite Pre-Wake Gate & Atomic 409 Checkout" },
    { t: "p", text: "Open the lab to trigger heartbeats against the task list below and to test concurrent checkouts (HTTP 409 on a task that is already locked)." },
    { t: "chips", items: [{ label: "Paperclip 409 Checkout & Pre-Wake Lab", ref: SWARM_REF }] },
    { t: "h2", id: "sec-swarm-tasks", text: "409 Checkout Task Constellation" },
    { t: "tasks" },
    { t: "h2", id: "sec-swarm-agents", text: "Organizational Roster & Per-Agent Budget Auto-Pause" },
    { t: "p", text: "Each agent role in `agent_roster` has a reporting line, a designated model tier (Frontier vs. Junie-Lite Workhorse), and a monthly/session budget ceiling that automatically pauses the agent at 100% spend:" },
    { t: "roster" }
  ],

  packs: [
    { t: "h1", text: "The 25-Pack ForgeHub Store & Anti-Bloat Dependency Diet" },
    { t: "p", text: "Every local feature and all 25 ForgeHub Packs are **100% free forever**. To keep the base installer compact (75–90 MB full Electron; 14–18 MB `geminiforge-lite`), heavy reverse-engineering binaries (like Ghidra 12.1.4 in Pack 10) and local vision weights are downloaded on demand as SHA-256-verified `.gfpack` archives." },
    { t: "h2", id: "sec-packs-registry", text: "25-Pack On-Demand Registry" },
    { t: "packs" },
    { t: "h2", id: "sec-packs-antibloat", text: "Strict Anti-Library-Bloat Diet (\"One Canonical Tool Per Job\")" },
    { t: "p", text: "Every row below shows the single canonical tool retained in the core workspace versus the overlapping or unmaintained libraries we pruned—saving over 1.4 GB of disk bloat and 400 MB of RAM:" },
    { t: "table", head: ["Subsystem", "Canonical Retained Tool", "Pruned / Isolated", "Why & Savings"], rows: ANTI_BLOAT_ROWS.map((r) => [r.layer, r.retained, r.pruned, r.impact]) }
  ],

  prompts: [
    { t: "h1", text: "14 Sub-Track Deep Research Dispatch Prompts" },
    { t: "p", text: "Each prompt below is a self-contained, zero-bias engineering brief ready to run 1-by-1 when you start your deep-research sessions. Each card explains **what the session produces** and **why it is needed**." },
    { t: "h2", id: "sec-prompts-list", text: "Sequential Prompts 01–14" },
    { t: "prompts" }
  ],

  patches: [
    { t: "h1", text: "8 Locked Confirmations, Phase 0 Spikes & Patches (`F.1`–`F.6`)" },
    { t: "p", text: "All eight architectural confirmations (`CONFIRM-01` through `CONFIRM-08`) are locked as accepted defaults. Below are plain-English explanations of each locked decision, followed by the drop-in specification patches (`Patch F.1`–`F.6`) and Phase 0 prototype spikes (`SPIKE-01`–`07`)." },
    { t: "h2", id: "sec-patches-confirms", text: "Eight Locked Architectural Decisions (`CONFIRM-01` to `CONFIRM-08`)" },
    { t: "confirms" },
    { t: "h2", id: "sec-patches-code", text: "Verbatim Specification Patches (`Patch F.1` through `Patch F.6`)" },
    { t: "p", text: "Open any patch to view and copy the replacement block in the side panel:" },
    { t: "patches" },
    { t: "h2", id: "sec-patches-spikes", text: "Phase 0 Prototype Spike Register (`SPIKE-01` to `SPIKE-07`)" },
    { t: "p", text: "These seven 1–2 day experiments run in Phase 0 before freezing Phase 1 APIs:" },
    { t: "table", head: ["Spike", "Decision Under Test", "Baseline Candidate A", "Challenger Candidate B", "Switching Criterion"], rows: PROTOTYPE_SPIKES.map((s) => [s.id, s.target, s.candA, s.candB, s.gate]) },
    { t: "h2", id: "sec-patches-matrix", text: "Six-Target OS & CPU Parity Verification Matrix" },
    { t: "p", text: "Verified across all six host OS targets: Linux Mint 22 (X11 and Wayland), Ubuntu 24.04 LTS, Windows 10/11 x64, Windows 11 ARM64, and macOS 15–27. All display servers, sandboxes, and input traps are mapped with 100% kernel-level fidelity." },
    { t: "chips", items: [{ label: "Six-Target OS & CPU Parity Matrix", ref: OS_REF }] },
    { t: "h2", id: "sec-patches-demos", text: "Workbench Demos" },
    { t: "p", text: "These two demos are part of this workbench, not of the specification. They simulate behaviours the spec describes, so you can see them work." },
    { t: "chips", items: [{ label: "Emergency Kill-Switch HUD (simulation)", ref: { kind: "lab", id: "hud" } }, { label: "Ring-0 Sanction Gate (demo)", ref: { kind: "lab", id: "ring0" } }] }
  ]
};

const stripMd = (s: string) => s.replace(/\*\*|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

// Sections are derived from the blocks, so the outline can never disagree with the headings.
const buildSections = (): Record<ChapterId, Section[]> => {
  const out: Record<ChapterId, Section[]> = {};
  (Object.keys(CHAPTER_BLOCKS) as ChapterId[]).forEach((cid) => {
    const secs: Section[] = [{ id: `sec-${cid}-top`, num: "1", title: "Overview" }];
    CHAPTER_BLOCKS[cid].forEach((b) => {
      if (b.t === "h2") secs.push({ id: b.id, num: String(secs.length + 1), title: stripMd(b.text) });
    });
    out[cid] = secs;
  });
  return out;
};
export const CHAPTER_SECTIONS: Record<ChapterId, Section[]> = buildSections();
export const rebuildSections = () => { Object.keys(CHAPTER_SECTIONS).forEach((k) => delete CHAPTER_SECTIONS[k]); Object.assign(CHAPTER_SECTIONS, buildSections()); };
export { stripMd };
// #endregion
