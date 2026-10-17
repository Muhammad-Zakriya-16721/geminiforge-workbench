// #region 2. SPEC DATA (content carried over unchanged from the previous file; re-audited in a later phase)
export const CRATES_LIST: CrateEntry[] = [
  {
    name: "crates/forge-types",
    layer: "Layer 0 · Foundation Leaf",
    plane: "Plane 3 · Authoritative Daemon",
    plainSummary: "Defines all shared identifiers, error types, and our compile-time deadlock prevention tokens.",
    whyItMatters:
      "In competitor audits (like jcode#1828), threads deadlocked when acquiring locks in opposite orders. forge-types uses zero-sized Rust phantom tokens (L0Root -> L1EnvConfig -> L2SessionController -> L3SurfaceState) so out-of-order lock code refuses to compile.",
    deps: "None (Zero-dependency leaf crate)",
    badge: "VERIFIED_PRIMARY_SOURCE",
    code: `// crates/forge-types/src/lock_order.rs
// Compile-Time Lock Hierarchy: prevents ABBA deadlocks (jcode#1828) at compile time.
pub enum L0Root {}
pub enum L1EnvConfig {}
pub enum L2SessionController {}
pub enum L3SurfaceState {}

pub struct OrderedMutex<Level, T> {
    inner: parking_lot::Mutex<T>,
    _level: std::marker::PhantomData<Level>,
}
// Also validates rkyv = "0.8" caches strictly via rkyv::access::<Archived<T>, rancor::Error>`
  },
  {
    name: "crates/forge-hw",
    layer: "Layer 1 · Core Infrastructure",
    plane: "Plane 3 · Authoritative Daemon",
    plainSummary: "Detects your exact CPU, RAM, GPU VRAM, and NPU limits to size local models safely.",
    whyItMatters:
      "Earlier audits mistakenly sized Mixture-of-Experts (MoE) models by active parameters, which causes instant OOM crashes. forge-hw vendors llmfit-core v1.1.10 and calculates resident capacity across split GPU VRAM + Host DDR5 RAM (-ngl), using active parameters strictly for tok/s speed.",
    deps: "forge-types",
    badge: "VERIFIED_PRIMARY_SOURCE",
    code: `// crates/forge-hw/src/moe_fit.rs — Split GPU VRAM + Host DDR5 RAM MoE Admission (Patch F.4)
// 1. Resident Capacity (100% of total parameters P_total must reside in VRAM + RAM):
//    VRAM_req = (P_shared_attn + P_experts_vram) * b_quant + KV_vram + B_compute <= VRAM_avail
//    RAM_req  = P_experts_ram * b_quant + KV_ram + RSS_daemon_shell <= 0.85 * Free_RAM
// 2. Generation Throughput (governed by active parameters per token P_active):
//    tok/s_eff = 1.0 / ((P_active_vram * b_quant / BW_vram) + (P_active_ram * b_quant / min(BW_ddr, BW_pcie)))`
  },
  {
    name: "crates/forge-db",
    layer: "Layer 1 · Core Infrastructure",
    plane: "Plane 3 · Authoritative Daemon",
    plainSummary: "Manages our single authoritative SQLite WAL database, FTS5 search, and Zero-Token Pre-Wake Gate.",
    whyItMatters:
      "Splitting relational tables across two SQLite files breaks foreign keys and atomic commits with vector_outbox. forge-db keeps all relational tables in authoritative_audit.db, dynamically toggling PRAGMA synchronous = FULL on approvals/checkouts and NORMAL on streaming chunks.",
    deps: "forge-types",
    badge: "VERIFIED_PRIMARY_SOURCE",
    code: `-- crates/forge-db/migrations/0001_authoritative_audit.sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
-- Zero-Token SQLite Pre-Wake Gate (<0.1ms in Rust, 0 LLM tokens burned on empty inbox, fixing paperclip#3401):
SELECT EXISTS(
  SELECT 1 FROM tasks
  WHERE assignee_agent_id = ?1 AND status IN ('PENDING', 'IN_REVIEW')
) AS has_actionable_work;`
  },
  {
    name: "crates/forge-sandbox",
    layer: "Layer 1 · Core Infrastructure",
    plane: "Plane 4 · Preemptible OS Worker Pool",
    plainSummary: "Enforces kernel-level sandboxing and <15 ms atomic subtree termination across Linux, Windows, and macOS.",
    whyItMatters:
      "Rust's catch_unwind and tokio::time::timeout cannot stop a hung C++ FFI call or a forked grandchild that called setsid(). forge-sandbox uses Linux cgroup.kill + /usr/lib/geminiforge/gf-bwrap-helper, Windows JobObjects + AppContainer SIDs, and macOS Seatbelt + kqueue.",
    deps: "forge-types, forge-hw",
    badge: "VERIFIED_PRIMARY_SOURCE",
    code: `// crates/forge-sandbox/src/lib.rs — 3-OS Atomic Subtree Supervisor
#[async_trait::async_trait]
pub trait SubtreeSupervisor: Send + Sync {
    async fn spawn_isolated(&self, cmd: &[String], policy: &SandboxPolicy) -> Result<WorkerHandle>;
    /// Atomically kills worker AND 100% of forked grandchildren across setsid() in < 15 ms
    /// via Linux cgroup.kill, Windows TerminateJobObject, or macOS killpg + kqueue EVFILT_PROC.
    async fn kill_subtree_atomic(&self, handle: &WorkerHandle) -> Result<()>;
}`
  },
  {
    name: "crates/forge-policy",
    layer: "Layer 2 · Security & VCS",
    plane: "Plane 3 · Authoritative Daemon",
    plainSummary: "Evaluates temporal security rules, pre-trust repository scans, and wire-level credential injection.",
    whyItMatters:
      "Stateless tool rules cannot stop an agent that reads a private .env file at step 1 and exfiltrates it over HTTP at step 2. forge-policy tracks session event history in SQLite (read_sensitive -> forbid(egress)) and injects API keys on the host wire so sandboxes hold only stand-in tokens.",
    deps: "forge-types, forge-db, forge-sandbox",
    badge: "VERIFIED_PRIMARY_SOURCE",
    code: `// crates/forge-policy/src/temporal.rs — Clean-Room Temporal Event-History Evaluator
// • Per-agent principal scoping (agent_id) + atomic IN_FLIGHT_RESERVED budget counters
// • Temporal rule: if session history contains 'fs:read_sensitive', deny 'net:egress' & 'mcp:external'
// • Pre-trust repo gate: affaan-m/agentshield 268 rules with runtimeConfidence weighting (1.0x active vs 0.25x template)`
  },
  {
    name: "crates/forge-vcs",
    layer: "Layer 2 · Security & VCS",
    plane: "Plane 3 & Plane 4",
    plainSummary: "Provides lock-free Jujutsu (jj-lib v0.46.0) multi-agent workspaces and <2 ms in-memory patch application.",
    whyItMatters:
      "When 20 agents run git commit concurrently, .git/index.lock contention and working-tree conflicts corrupt the repo. jj-lib uses a lock-free StackedTable operation log, algebraic conflict trees, <50 ms jj op undo, and in-memory imara-diff (fixing Windows codex#15003).",
    deps: "forge-types, forge-db",
    badge: "VERIFIED_PRIMARY_SOURCE",
    code: `// crates/forge-vcs/src/lib.rs — Embedded jj-lib v0.46.0 + Optimistic File Leases
// • Zero .git/index.lock contention across 20 concurrent coding agents
// • DashMap<CanonicalPath, FileLease> verifies blake3 pre-write hashes so unsaved editor buffers are never clobbered`
  },
  {
    name: "crates/forge-search",
    layer: "Layer 2 · Security & VCS",
    plane: "Plane 3 & Plane 4",
    plainSummary: "Maintains the incremental Tree-sitter 0.27 AST symbol graph and deduplicates .forge/AGENTS.md guidelines.",
    whyItMatters:
      "Combines 200k-file blake3 Merkle indexing, petgraph PageRank RepoMaps, 4-mode agentgrep queries (grep, find, outline, trace), and JetBrains Junie's hierarchical guidelines discovery (.forge/AGENTS.md -> .junie/AGENTS.md -> AGENTS.md -> ~/.forge/AGENTS.md).",
    deps: "forge-types, forge-db",
    badge: "VERIFIED_PRIMARY_SOURCE",
    code: `// crates/forge-search/src/guidelines.rs — Junie-Compatible Hierarchical Guidelines Loader
// 1. Project-level .forge/AGENTS.md & .junie/AGENTS.md (Highest Priority)
// 2. Repo root AGENTS.md / CLAUDE.md / GEMINI.md + .forge/playbook.md
// 3. Global ~/.forge/AGENTS.md (Deduplicated by blake3 paragraph hash)`
  },
  {
    name: "crates/forge-pty",
    layer: "Layer 2 · Security & VCS",
    plane: "Plane 3 · Authoritative Daemon",
    plainSummary: "Supervises terminal PTY rings, parses OSC 7501 program status sequences, and routes gf-tmux-shim.",
    whyItMatters:
      "Instead of fragile regex prompt scraping to guess if a CLI tool is waiting for permission, forge-pty parses Mitchell Hashimoto's OSC 7501 (rev 0.2) escape sequence (\\e]7501;state=blocked:kind=permission\\e\\\\) and surfaces a 1-click card in the Unified Approval Inbox in <5 ms.",
    deps: "forge-types, forge-sandbox",
    badge: "VERIFIED_PRIMARY_SOURCE",
    code: `// crates/forge-pty/src/osc7501.rs — OSC 7501 Program Status VT Parser (Revision 0.2)
// • Replies to OSC 7501 ; ? ST capability probes from Bubble Tea v2.1.0 / Charm Crush v0.98.0
// • Caps status records at 256 per pane (LRU) and supersedes OSC 9;4 progress bars until reset`
  },
  {
    name: "crates/forge-protocols",
    layer: "Layer 3 · Protocols & Extensions",
    plane: "Plane 3 · 5-Protocol Hub",
    plainSummary: "Implements MCP 2026-07-28, ACP v3.2.0 Conductor, A2A v0.14.1+, AG-UI 1.0, A2UI v0.9, and Two-Speed routing.",
    whyItMatters:
      "Stuffing 200 MCP tool schemas into a prompt burns 40,000 tokens per turn. forge-protocols exposes the 4-Meta-Tool Capability Gateway (~480 tokens baseline), wraps rmcp v3.5.1 in a 16 MiB BoundedJsonRpcLineReader (fixing rmcp#1030), and chains ACP v3.2.0 proxies.",
    deps: "forge-types, forge-db, forge-sandbox, forge-policy, forge-vcs",
    badge: "VERIFIED_PRIMARY_SOURCE",
    code: `// crates/forge-protocols/src/lib.rs — 5-Protocol Interoperability Spine
// • MCP 2026-07-28 (rmcp v3.5.1 + 16 MiB line cap + SEP-2567 server/discover + 300s idle SIGTERM in McpMux)
// • ACP v3.2.0 Conductor (ForgePolicyProxy -> ForgeFileLeaseProxy -> ForgeMcpBridgeProxy + 5-session recycling)
// • A2A (a2a-rust >= 0.14.1 fixing GHSA-hr9h-6jvf-wvg6 + 11 A2ABreak guards) + AG-UI 1.0 + A2UI v0.9`
  },
  {
    name: "crates/forge-mods",
    layer: "Layer 3 · Protocols & Extensions",
    plane: "Plane 2 · Sandboxed VM",
    plainSummary: "Executes .gmod.ts extensions and MCP Code Mode scripts inside a <4 MB / 64 MB Wasmtime QuickJS guest.",
    whyItMatters:
      "Running 10 UI Mods in 64 MB V8 Workers consumes 640 MB of RAM. forge-mods compiles .gmod.ts via swc in <15 ms into a wasmtime rquickjs (wasm32-wasip1) sandbox (<4 MB heap, 50 ms epoch preemption) that emits declarative A2UI v0.9 JSON to React 19.",
    deps: "forge-types, forge-db, forge-policy, forge-protocols",
    badge: "DESIGN_HYPOTHESIS — REQUIRES_SPIKE",
    code: `// crates/forge-mods/src/lib.rs — Sandboxed QuickJS-WASM Guest & MCP Code Mode (SEP-2106)
// • .gmod.ts Mods: < 4 MiB linear memory cap, 50 ms epoch interruption, emits A2UI v0.9 JSON deltas
// • MCP Code Mode: compiles SEP-2106 schemas into .d.ts and runs 50-step tool loops in 1 turn (90–94% token savings)`
  },
  {
    name: "crates/forge-cu",
    layer: "Layer 3 · Protocols & Extensions",
    plane: "Plane 5 · Computer-Use Engine",
    plainSummary: "Routes desktop and browser actions across Environments A/B/C and Mechanisms 0/1/2/3.",
    whyItMatters:
      "Separates WHERE an app runs (Headless Env A, Isolated PiP Virtual Display Env B, or Host Desktop Env C) from HOW it is driven (Mech 0 CLI-Anything <15 ms, Mech 1 Playwright/Lightpanda CDP, Mech 2 Drained AT-SPI2 / HWND UIA, Mech 3 UI-TARS Vision + VPI-Bench Guard).",
    deps: "forge-types, forge-hw, forge-sandbox, forge-policy, forge-protocols",
    badge: "VERIFIED_PRIMARY_SOURCE",
    code: `// crates/forge-cu/src/router.rs — Orthogonal Computer-Use Action Router
// • Fixes trycua/cua#4894 (stateless/drained zbus AT-SPI2 so Qt6 apps never hang)
// • Fixes trycua/cua#4963 (ScreenReaderEnabled=false so GNOME Orca never launches)
// • Fixes trycua/cua#4906 (EnumWindows + ElementFromHandle <2ms on Windows 10/11)`
  },
  {
    name: "crates/forge-swarm",
    layer: "Layer 4 · Orchestration",
    plane: "Plane 3 & Plane 4",
    plainSummary: "Coordinates 20-agent swarms, Paperclip org-charts, Confidence Stepping, and ForgeLab simulations.",
    whyItMatters:
      "Unites Microsoft UFO3's TaskConstellation DAG, Paperclip's Goal-Ancestry breadcrumbs and Atomic 409 Checkout, jcode's Confidence Stepping, Typed Evidence Receipts (preventing MiroFish#529 fake quotes), and DeepMind Concordia's Game Master causal referee.",
    deps: "forge-types, forge-db, forge-vcs, forge-search, forge-protocols, forge-cu",
    badge: "VERIFIED_PRIMARY_SOURCE",
    code: `// crates/forge-swarm/src/lib.rs — Org-Swarm & Grounded Simulation Coordinator
// • Rejects >=15% confidence jumps to 100% without a new passing verification ToolCallId
// • Requires TypedEvidenceReceipt (file_path, jj_change_id, test_exit_code, blake3_artifact_hash)`
  },
  {
    name: "bins/geminiforge-daemon",
    layer: "Layer 5 · Authoritative Binary",
    plane: "Plane 3 · Authoritative Daemon",
    plainSummary: "The single authoritative control daemon, geminiforge-lite browser bridge, and Zero-Token RRule cron runner.",
    whyItMatters:
      "Acquires an exclusive kernel advisory lock (flock / LockFileEx) before unlinking stale sockets or calling iceoryx2 cleanup_dead_nodes(), and transitions interrupted non-idempotent tools to INTERRUPTED_UNCERTAIN for human reconciliation.",
    deps: "All library crates",
    badge: "VERIFIED_PRIMARY_SOURCE",
    code: `// bins/geminiforge-daemon/src/main.rs
// Baseline RSS: 28–65 MB. Serves AG-UI 1.0 + A2UI v0.9 over 0600 UDS (SO_PEERCRED) or Owner-SID Named Pipe.`
  },
  {
    name: "bins/forge-worker, gf-tmux-shim & gf-emergency-hud",
    layer: "Layer 5 · Worker & HUD Binaries",
    plane: "Plane 1 & Plane 4",
    plainSummary: "Pre-warmed multi-call sandbox worker, tmux CLI pane translator, and <2 ms iced.rs Super+Escape HUD.",
    whyItMatters:
      "forge-worker isolates risky parsers (mmdr, search, a11y, duckdb, unpack) inside cgroup leaves, while gf-emergency-hud uses pure-Rust iced.rs (wgpu with automatic tiny-skia CPU fallback) to render the Super+Escape kill switch in <2 ms.",
    deps: "forge-types, forge-sandbox, forge-search, forge-cu, iced",
    badge: "VERIFIED_PRIMARY_SOURCE",
    code: `// bins/gf-emergency-hud/src/main.rs — Scoped iced.rs Native Overlay (CONFIRM-08)
// Maps in < 2 ms on Super+Escape using renderer/src/fallback.rs (wgpu -> tiny-skia CPU software rasterizer).`
  }
];

export const INITIAL_ROSTER: AgentRosterItem[] = [
  {
    id: "agent-arch-01",
    role: "Chief Systems Architect (CEO / CTO)",
    reportsTo: "Human Board (Ring-0 Sanction Gate)",
    tier: "FRONTIER (Claude Opus / Gemini Pro)",
    plainRoleExplanation:
      "Decomposes high-level user goals into Goal-Ancestry trees, reviews Typed Evidence Receipts, and arbitrates cross-agent AST merges.",
    budgetMicros: 50_000_000,
    spentMicros: 14_200_000,
    paused: false
  },
  {
    id: "agent-rust-02",
    role: "Principal Rust Kernel Engineer",
    reportsTo: "agent-arch-01",
    tier: "FRONTIER (ACP v3.2.0 Conductor)",
    plainRoleExplanation:
      "Implements core Rust traits in isolated jj-lib workspaces under the Asymmetric 3-Class Dual Barrier.",
    budgetMicros: 35_000_000,
    spentMicros: 18_900_000,
    paused: false
  },
  {
    id: "agent-junie-lite-03",
    role: "ForgeLite Worktree Scaffolder",
    reportsTo: "agent-rust-02",
    tier: "FORGE_LITE_WORKHORSE (Qwen 3.6 27B / Local Qwen3.5)",
    plainRoleExplanation:
      "Handles mechanical edits, test scaffolding, changelog updates, and lint fixes at $0/free workhorse cost so you never ration experiments.",
    budgetMicros: 10_000_000,
    spentMicros: 1_200_000,
    paused: false
  },
  {
    id: "agent-sec-qa-04",
    role: "Adversarial Red-Team & QA Verifier",
    reportsTo: "agent-arch-01",
    tier: "FRONTIER + OpenCodeReview v1.13.0",
    plainRoleExplanation:
      "Runs deterministic diff reviews (with deleted-file line anchoring) and CI-GATE-S1 to S4 fault injection before any task reaches 100% confidence.",
    budgetMicros: 25_000_000,
    spentMicros: 23_500_000,
    paused: false
  }
];

export const INITIAL_TASKS: SwarmTaskItem[] = [
  {
    taskId: "GF-T00-101",
    ancestry: "V20 Release → Kernel Containment → gf-bwrap-helper Wrapper",
    title: "Verify /etc/apparmor.d/usr.lib.geminiforge.gf-bwrap-helper RTM_NEWADDR loopback",
    plainExplanation:
      "Ensures Ubuntu 24.04 & Linux Mint 22 allow --unshare-net loopback setup inside our wrapper binary without colliding with /usr/bin/bwrap.",
    assignee: "agent-rust-02",
    status: "RUNNING",
    checkedOutRunId: "run_0196a8f2_rust02",
    confidence: 85,
    planHash: "b3:9f81c4a0"
  },
  {
    taskId: "GF-T01-104",
    ancestry: "V20 Release → Track 01 Clean-Room → Stage 10 DuckDB Security",
    title: "Enforce SET enable_external_access = false before SET lock_configuration = true",
    plainExplanation:
      "Closes the 01.C §2.1 script vulnerability so untrusted SQLite views inspected in DuckDB can never read /etc/passwd or make network requests.",
    assignee: "agent-sec-qa-04",
    status: "IN_REVIEW",
    checkedOutRunId: null,
    confidence: 95,
    planHash: "b3:4e21b7d9"
  },
  {
    taskId: "GF-T02-112",
    ancestry: "V20 Release → ForgeAir Worktrees → Unit Test Scaffolding",
    title: "Generate 30 composite ast-grep !0/!1 positive & negative test fixtures",
    plainExplanation:
      "Uses the Junie-Lite workhorse tier to scaffold test fixtures catching bundler-minified booleans ({nodeIntegration:!0}) before and after Wakaru.",
    assignee: "agent-junie-lite-03",
    status: "PENDING",
    checkedOutRunId: null,
    confidence: 70,
    planHash: "b3:7c19e02a"
  },
  {
    taskId: "GF-T05-119",
    ancestry: "V20 Release → Organizational Swarm → Zero-Token Pre-Wake Gate",
    title: "Wire has_actionable_work(agent_id) SQLite pre-check to block empty LLM wakes (#3401)",
    plainExplanation:
      "Eliminates Paperclip Issue #3401 (which burned 859.6M tokens/day polling empty inboxes) by checking SQLite in <0.1 ms before waking any LLM.",
    assignee: "agent-arch-01",
    status: "COMPLETED",
    checkedOutRunId: null,
    confidence: 100,
    planHash: "b3:1a08f3e4"
  }
];

export const FORGEHUB_PACKS: ForgeHubPack[] = [
  { id: "Pack 01", cat: "CAT1", catLabel: "Coding & ACP", name: "Core Coding Harness & ACP Adapter Suite", size: "~35 MB", minTier: "E", plainPurpose: "Connects Claude Code, Codex, Gemini CLI, Goose, jcode, and Junie CLI through the ACP v3.2.0 Conductor.", tools: "claude-agent-acp v0.89.1, codex-acp, gemini --acp, goose acp v1.53.0, ForgeJcodeBridge, Junie CLI" },
  { id: "Pack 02", cat: "CAT2", catLabel: "Computer Use", name: "Browser Automation & Low-RAM Scraping Pack", size: "~140 MB", minTier: "E", plainPurpose: "Drives authenticated web apps via Playwright CDP or scrapes static docs in <45 MB RAM via isolated Lightpanda.", tools: "Playwright CDP driver + isolated Lightpanda AGPL-3.0 (<45 MB RSS on Linux/macOS)" },
  { id: "Pack 03", cat: "CAT2", catLabel: "Computer Use", name: "Desktop Computer-Use & Vision Grounding Pack", size: "~185 MB", minTier: "B", plainPurpose: "Provides isolated Xpra/Xvfb PiP shadow desktops and local YOLO/OmniParser/UI-TARS vision grounding.", tools: "YOLOv11n-UI INT8 + RapidOCR + OmniParser V2 (0600 UDS) + UI-TARS-1.5-7B connector + Xpra/Xvfb" },
  { id: "Pack 04", cat: "CAT2", catLabel: "Computer Use", name: "Deterministic Accessibility & .forge-flow Studio", size: "~18 MB", minTier: "E", plainPurpose: "Clicks native OS widgets in <5 ms with 0 vision tokens via drained AT-SPI2, Windows UIA, and macOS AX.", tools: "forge-a11y-worker (Terminator UIA, stateless zbus AT-SPI2, AXUIElement) + .forge-flow.yaml" },
  { id: "Pack 05", cat: "CAT1", catLabel: "Coding & ACP", name: "Polyglot Shadow LSP & Structural Merge Pack", size: "~85 MB", minTier: "C", plainPurpose: "Runs hidden background compiler/LSP diagnostics on agent edits before showing diffs to you.", tools: "Hidden incremental LSP servers (rust-analyzer, vtsls, basedpyright) + 3-way AST resolver" },
  { id: "Pack 06", cat: "CAT1", catLabel: "Coding & ACP", name: "Polyglot Tree-Sitter & Merkle Indexing Pack", size: "~28 MB", minTier: "E", plainPurpose: "Indexes 200k-file monorepos in seconds using blake3 Merkle trees and 81 Tree-sitter 0.27 grammars.", tools: "81-language tree-sitter 0.27 grammars + blake3 Merkle indexer + petgraph PageRank RepoMap" },
  { id: "Pack 07", cat: "CAT1", catLabel: "Coding & ACP", name: "USearch HNSW Semantic Vector Worker Pack", size: "~42 MB", minTier: "C", plainPurpose: "Provides SIMD-accelerated semantic vector search synchronized from SQLite's transactional vector_outbox.", tools: "usearch v2.26 (numkong SIMD) + vector_outbox reconciler + local ONNX INT8 embedder" },
  { id: "Pack 08", cat: "CAT5", catLabel: "AI, Voice & Studio", name: "Visual Mermaid, Architecture Canvas & System Designer", size: "~12 MB", minTier: "E", plainPurpose: "Renders Mermaid diagrams to selectable SVGs in 1–4 ms via a 200 ms watchdog worker with mermaid.js fallback.", tools: "mmdr v0.3.1 (200 ms SVG subprocess worker) + client-side mermaid.js fallback + DAG canvas" },
  { id: "Pack 09", cat: "CAT3", catLabel: "Clean-Room RE", name: "Web, Electron, Source-Map & V8 .jsc Clean-Room Core", size: "~70 MB", minTier: "E", plainPurpose: "Unpacks ASARs, source maps, Webpack/Vite bundles, and V8 .jsc bytecode (Node 8–26) with 0 target execution.", tools: "asar v3.4.1, fuses v1.8.0, shuji v0.8.0, webcrack v2.16.0, wakaru v1.10.0, humanify v3.1.0, jscd v0.1.0, ast-grep v0.45.3, rea v6.4.0" },
  { id: "Pack 10", cat: "CAT3", catLabel: "Clean-Room RE", name: "Native & Polyglot Binary Decompiler Suite (Ghidra/r2)", size: "~620 MB", minTier: "B", plainPurpose: "Decompiles C++, Rust, Go, and Python binaries via lazy-loaded Ghidra MCP, Radare2 MCP, and locked DuckDB.", tools: "Ghidra 12.1.4 + OpenJDK 21 + ghidra-mcp v7.0.0 (--lazy) + r2mcp v1.8.8 (-R) + capa + floss + GoReSym + dfindexeddb + DuckDB v1.5.3" },
  { id: "Pack 11", cat: "CAT3", catLabel: "Clean-Room RE", name: "Dynamic Runtime Instrumentation & Network Tap Pack", size: "~95 MB", minTier: "C", plainPurpose: "Captures gRPC/Protobuf traffic and Frida hooks inside an air-gapped virtual ethernet namespace.", tools: "gf-bwrap-helper veth netns tap + mitmproxy + pbtk-from-binary v1.1.3 (isolated GPL-3.0) + Frida-MCP" },
  { id: "Pack 12", cat: "CAT3", catLabel: "Clean-Room RE", name: "Mobile APK, React Native Hermes & Flutter AOT Pack", size: "~160 MB", minTier: "C", plainPurpose: "Decompiles Android APKs, React Native Hermes bytecode (v59–v99), and Flutter libapp.so binaries.", tools: "jadx + P1sec/hermes-dec v0.1.7 (isolated AGPL-3.0, Hermes v59–v99) + worawit/blutter (pre-cached Dart VM)" },
  { id: "Pack 13", cat: "CAT4", catLabel: "Swarms & ForgeLab", name: "Multi-Agent ACP Swarm & Jujutsu Worktree Pack", size: "~22 MB", minTier: "C", plainPurpose: "Orchestrates 20-agent swarms across isolated Jujutsu worktrees with Paperclip org-chart templates.", tools: "UFO3 TaskConstellation coordinator + Paperclip Org-Chart / .forge-company.yaml importer + gf-tmux-shim" },
  { id: "Pack 14", cat: "CAT4", catLabel: "Swarms & ForgeLab", name: "ForgeLab Grounded Simulation Engine (Concordia/OASIS)", size: "~55 MB", minTier: "B", plainPurpose: "Runs multi-persona simulations grounded by a DeepMind Concordia Game Master causal referee.", tools: "Clean-room DeepMind Concordia Game Master causal referee + TinyTroupe propositions + OASIS SQLite graph" },
  { id: "Pack 15", cat: "CAT4", catLabel: "Swarms & ForgeLab", name: "Isolated MiroFish Sandbox Pack (Optional AGPL-3.0)", size: "~110 MB", minTier: "B", plainPurpose: "Runs the optional MiroFish dashboard inside an air-gapped subprocess guarded by a Cross-Family Model Jury.", tools: "666ghj/MiroFish isolated in air-gapped subprocess behind Plain-English Safety Shield & Cross-Family Jury" },
  { id: "Pack 16", cat: "CAT5", catLabel: "AI, Voice & Studio", name: "Custom & Recommended Local LLM Engine (llmfit)", size: "~45 MB", minTier: "C", plainPurpose: "Manages Ollama, llama.cpp, and MLX models with split VRAM/RAM MoE profiling and Double-Warning Gates.", tools: "llama.cpp / Ollama / MLX manager + llmfit-core split VRAM/RAM -ngl profiler + Double-Warning Gate" },
  { id: "Pack 17", cat: "CAT5", catLabel: "AI, Voice & Studio", name: "Local AST-Biased Voice Co-Pilot (forge-voice)", size: "~65 MB", minTier: "C", plainPurpose: "Transcribes push-to-talk voice locally and resolves spoken function names against your live Tree-sitter AST.", tools: "Moonshine-Tiny INT8 / whisper.cpp Q5_1 + WebRTC AEC + Tree-sitter AST phonetic vocabulary rescorer" },
  { id: "Pack 18", cat: "CAT5", catLabel: "AI, Voice & Studio", name: "SQLite RRule Cron & Ambient Garden/Scout Pack", size: "~10 MB", minTier: "E", plainPurpose: "Schedules recurring background maintenance in scratchpad worktrees with a 0-token SQLite Pre-Wake Gate.", tools: "rrule scheduler + Zero-Token Pre-Wake Gate + Strict Read/Scratchpad ambient/<job-id> worktree runner" },
  { id: "Pack 19", cat: "CAT5", catLabel: "AI, Voice & Studio", name: "Post-Mortem Flight-Recorder & Time-Travel Debugger", size: "~15 MB", minTier: "E", plainPurpose: "Lets you scrub backward through any agent turn, inspect screenshots and jj ops, and fork execution.", tools: "W3C traceparent event-stream scrubber + jj op undo + memfd dHash visual diff inspector" },
  { id: "Pack 20", cat: "CAT5", catLabel: "AI, Voice & Studio", name: "Mod & Skill Studio (wasmtime QuickJS-WASM SDK)", size: "~24 MB", minTier: "E", plainPurpose: "Compiles and hot-reloads .gmod.ts Mods in <15 ms inside a <4 MB QuickJS-WASM sandbox.", tools: "@geminiforge/mod-sdk + swc <15 ms compiler + rquickjs wasm32-wasip1 guest + A2UI v0.9 live previewer" },
  { id: "Pack 21", cat: "CAT5", catLabel: "AI, Voice & Studio", name: "NotebookLM, Obsidian & SARIF Research Exporter", size: "~8 MB", minTier: "E", plainPurpose: "Exports clean-room architecture specs, CycloneDX SBOMs, and SARIF security reports in one click.", tools: "1-click clean-room specification synthesizer (11-clean-room-spec.md), CycloneDX SBOM, and SARIF exporter" },
  { id: "Pack 22", cat: "CAT5", catLabel: "AI, Voice & Studio", name: "Encrypted Mobile Remote Control & Approval Companion", size: "~12 MB", minTier: "E", plainPurpose: "Pairs your phone via QR code (Noise XX encryption) to review and sign Ring-0 approval cards remotely.", tools: "QR-code snow Noise XX (X25519 + Ed25519) pairing + remote Sanction Gate / Paperclip Board approval signer" },
  { id: "Pack 23", cat: "CAT2", catLabel: "Computer Use", name: "NEW V20: CLI-Anything Desktop App JSON Harnesses", size: "~15 MB", minTier: "E", plainPurpose: "Wraps GIMP, Blender, LibreOffice, and Audacity into <15 ms stateful JSON CLIs at Mechanism Tier 0.", tools: "HKUDS/CLI-Anything (arXiv:2606.03854) stateful JSON CLI wrappers for GIMP, Blender, LibreOffice, Audacity" },
  { id: "Pack 24", cat: "CAT1", catLabel: "Coding & ACP", name: "NEW V20: OpenCodeReview + AgentShield DevSecOps", size: "~14 MB", minTier: "E", plainPurpose: "Combines Alibaba's ACP code-review service (deleted-file diff anchoring) with AgentShield's 268 static rules.", tools: "alibaba/open-code-review v1.13.0 ACP review service + affaan-m/agentshield 268-rule runtimeConfidence auditor" },
  { id: "Pack 25", cat: "CAT5", catLabel: "AI, Voice & Studio", name: "NEW V20: Hardware NPU / DirectML / QNN Accelerator", size: "~50 MB", minTier: "B", plainPurpose: "Offloads local embeddings, STT, and vision models onto Snapdragon Hexagon QNN, Ryzen AI, and Apple ANE.", tools: "Windows 11 ARM64 Qualcomm Hexagon QNN, AMD Ryzen AI XDNA, Intel Core Ultra NPU, and Apple ANE/Metal bridges" }
];

export const DEEP_PROMPTS: DeepPromptEntry[] = [
  {
    id: "Prompt 01",
    files: "00.D1, 00.D2, 01.D, 02.D, 03.A–05.B",
    title: "Scenario Suite Audit, Deduplication & ~650 Atomic Test Expansion",
    plainGoal: "Clean up all 540 existing test scenarios and expand them into ~650 single-responsibility atomic tests.",
    whyNeeded: "In V18.1, S151–S180 in 00.D2 were verbatim duplicates of T01-S111–T01-S140 in 01.D, and several blocks compressed dozens of tests into prose paragraphs.",
    fullPrompt: `ROLE & OBJECTIVE:
Act as Principal QA Verification Architect and Formal Systems Specification Auditor. Perform a zero-trust line-by-line audit, deduplication, atomic splitting, and expansion across all 540 specified validation scenarios in the GeminiForge specification (00.D1, 00.D2, 01.D, 02.D) and author the missing atomic scenarios for Tracks 04 through 13 (03.A–03.B, 04.A–04.D, 05.A–05.C, 08.A).

DELIVERABLES REQUIRED:
1. Complete Deduplication & ID Remapping Table (S001–S190, T01-S01–S160, T02-S01–S190 -> Canonical GF-T<Track>-S<NNN> IDs).
2. Full Atomic Scenario Matrices (~650 rows) in Given / When / Then / Falsification Gate (cargo test CLI command & metric) format, marked strictly as [SPECIFIED_TEST].`
  },
  {
    id: "Prompt 02",
    files: "00.A (§2.2–§2.3), 00.B, 01.B (§1, §3), 02.A (§2.1, §2.4), Track 12",
    title: "Cross-OS Kernel Sandboxing, Subtree Supervision & Temporal Policy Engine",
    plainGoal: "Write the production Rust blueprints for our 3-OS process reaper, AppArmor wrapper, and temporal policy engine.",
    whyNeeded: "Ensures every worker subprocess and forked grandchild dies in <15 ms on timeout and blocks two-step read-then-exfiltrate attacks.",
    fullPrompt: `ROLE & OBJECTIVE:
Act as Principal OS Kernel Security Engineer and Release Engineering Architect. Design the complete V20 implementation specification for crates/forge-sandbox, crates/forge-policy, and Track 12 native cross-OS installer packaging.

DELIVERABLES REQUIRED:
1. Exact Rust implementation of SubtreeSupervisor across Linux (prctl(PR_SET_CHILD_SUBREAPER, 1) + delegated cgroup v2 leaf cgroup.kill), Windows (JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE + AppContainer SIDs), and macOS (setpgid + lifeline socketpair EOF + kqueue EVFILT_PROC).
2. Verbatim Debian (debian/postinst, debian/prerm, dh_apparmor) and RPM scripts for /usr/lib/geminiforge/gf-bwrap-helper.
3. Clean-room Rust forge-policy temporal state-machine evaluator over authoritative_audit.db + SOCK_SEQPACKET credential proxy (mlock + zeroize).`
  },
  {
    id: "Prompt 03",
    files: "01.A, 01.B, 01.C, 01.D, 00.E (#1–#22)",
    title: "Track 01 11-Stage Clean-Room Pipeline, Static Unpackers & Locked DuckDB",
    plainGoal: "Specify the 100% non-executing binary/bundle inspection pipeline and hardened DuckDB forensic worker.",
    whyNeeded: "Replaces the Python AppImage script with a memory-safe Rust SquashFS + EROFS static parser and locks DuckDB external access before mounting untrusted SQLite DBs.",
    fullPrompt: `ROLE & OBJECTIVE:
Act as Principal Reverse-Engineering Systems Architect and Binary/Database Forensics Specialist. Produce the complete V20 implementation specification for the Track 01 11-Stage Clean-Room Inspection Pipeline (01.A–01.D).

DELIVERABLES REQUIRED:
1. Native Rust static parser in forge-worker (goblin + bounded backhand / unsquashfs -no-xattrs -o) enforcing chmod a-x, computing max(e_shoff + e_shnum * e_shentsize, max(p_offset + p_filesz)), and scanning forward for both SquashFS (hsqs) and EROFS (0xE0F5E1E2 at +1024) magic bytes.
2. JSON schema and SHA-256 verifier for toolpacks.lock.json across Tier 1 (0 MB), Pack 09 (~70 MB), and Pack 10 (~620 MB) with --ignore-scripts=true.
3. Expanded gf-electron-security.yml (ast-grep v0.45.3 selector: pair) matching true/false and !0/!1 across both /work/asar-src and /work/wakaru-out.
4. Hardened forge-duckdb-worker over VACUUM INTO snapshots with SET enable_external_access = false; SET lock_configuration = true;.`
  },
  {
    id: "Prompt 04",
    files: "02.A, 02.B, 02.D, 02.E",
    title: "5-Protocol Interoperability Spine (MCP, ACP v3.2.0, A2A, AG-UI 1.0, A2UI v0.9)",
    plainGoal: "Specify the Rust protocol router uniting MCP, ACP v3.2.0, A2A v0.14.1, AG-UI 1.0, and A2UI v0.9 in <500 baseline tokens.",
    whyNeeded: "Patches 5 upstream rmcp v3.5.1 bugs, upgrades ACP to v3.2.0 Conductor proxy chains, and enforces the Asymmetric 3-Class Dual Barrier.",
    fullPrompt: `ROLE & OBJECTIVE:
Act as Principal Distributed Protocols & Agent Interoperability Architect. Design the complete Rust implementation blueprint for crates/forge-protocols.

DELIVERABLES REQUIRED:
1. rmcp v3.5.1 wrapper implementing BoundedJsonRpcLineReader (16 MiB cap fixing rmcp#1030), dual result+error rejection (#1283), ClientLifecycleMode::Auto (SEP-2567 server/discover), and McpMux lazy spawning + 300s idle SIGTERM termination.
2. agent-client-protocol v3.2.0 Conductor (_meta.proxy: ForgePolicyProxy -> ForgeFileLeaseProxy -> ForgeMcpBridgeProxy) + per-harness launch manifest table + 5-session Standby Process Recycling (copilot-cli#4113).
3. AG-UI 1.0 + A2UI v0.9 React 19 allowlist + a2a-rust >= 0.14.1 (11 A2ABreak defenses) + 4-Meta-Tool Capability Gateway (<500 baseline tokens).`
  },
  {
    id: "Prompt 05",
    files: "02.C, 03.A, 03.B, 00.D1 (S001–S010)",
    title: "Orthogonal Computer-Use Engine, Accessibility Workers & CLI-Anything Mech 0",
    plainGoal: "Design the sub-50ms desktop and browser automation router across Linux X11/Wayland, Windows, and macOS.",
    whyNeeded: "Fixes trycua/cua#4894 (Qt6 D-Bus hangs), #4963 (GNOME Orca trigger), and #4906 (1.2s Windows root walks) while removing XIAddMaster on :0.",
    fullPrompt: `ROLE & OBJECTIVE:
Act as Principal Desktop Compositor, Accessibility, and Computer-Use Agent Architect. Design the complete V20 implementation specification for crates/forge-cu and forge-a11y-worker.

DELIVERABLES REQUIRED:
1. ForgeAccessibilityProvider inside forge-a11y-worker (250 ms cgroup.kill/TerminateJobObject watchdog): stateless/drained zbus AT-SPI2 (fixing cua#4894), CHROME_ACCESSIBILITY=1 with ScreenReaderEnabled=false (fixing cua#4963), and EnumWindows + ElementFromHandle(hwnd) (<2 ms, fixing cua#4906).
2. Hardware-Tiered Environment B Virtual Display Pool (Xvfb/Weston on Tier E/C; Xpra + Xephyr -glamor on Ryzen 3500U Vega 8 Tier B; Mint 22 Wayland auto-route).
3. Permanent removal of XIAddMaster on :0 (CONFIRM-01), forge-intent-guard (VPI-Bench defense), <1 ms TOCTOU Sobel check, and HKUDS/CLI-Anything Mech 0 JSON harness adapter.`
  },
  {
    id: "Prompt 06",
    files: "04.A, 04.B, 04.C, 04.D, 00.A (§2.6), 00.E (#65)",
    title: "Tracks 05–07 QuickJS-WASM Mods SDK, AgentShield Scanner & llmfit Governor",
    plainGoal: "Specify the <4 MB Wasmtime QuickJS Mod runtime, AgentShield pre-trust scanner, and split VRAM/RAM MoE governor.",
    whyNeeded: "Resolves the 04.A TypeScript-in-Wasmtime contradiction and eliminates false-positive fatigue on example MCP configs using runtimeConfidence weights.",
    fullPrompt: `ROLE & OBJECTIVE:
Act as Principal Extension Runtime Architect, Static Security Analyzer, and Hardware Resource Governor Specialist. Design the complete V20 specification for crates/forge-mods, crates/forge-hw, the agentshield Pre-Trust Scanner, and the 25-Pack Store.

DELIVERABLES REQUIRED:
1. @geminiforge/mod-sdk TypeScript definitions, <15 ms swc compiler, static tree-sitter-typescript L0–L3 '$' capability scanner, and <4 MB wasmtime rquickjs guest emitting declarative A2UI v0.9 JSON snapshots (CONFIRM-05).
2. Port of affaan-m/agentshield (268 rules) with runtimeConfidence source weighting (1.0x active-runtime vs 0.25x template-example capped at 10 pts/file).
3. Vendored llmfit-core (v1.1.10) patches for split GPU VRAM + Host DDR5 RAM partial MoE offload (-ngl / --n-cpu-moe) and Windows 11 ARM64 IDXCoreAdapterFactory + QNN NPU probing.`
  },
  {
    id: "Prompt 07",
    files: "00.A (§2.1), 00.D1 (S071–S090), 02.E, 05.A",
    title: "Tracks 08–09 Terminal Multiplexer (OSC 7501 + gf-tmux-shim), Shadow LSP & jj-lib VCS",
    plainGoal: "Specify the OSC 7501 terminal parser, tmux-to-pane shim, Shadow LSP, and Jujutsu multi-agent VCS.",
    whyNeeded: "Lets CLI builds and coding agents report progress and permission blocks deterministically into the Unified Approval Inbox without prompt scraping.",
    fullPrompt: `ROLE & OBJECTIVE:
Act as Principal IDE Workbench Architect, Terminal Emulation Specialist, and Version Control Systems Engineer. Design the complete V20 specification for Tracks 08 and 09.

DELIVERABLES REQUIRED:
1. OSC 7501 (revision 0.2) VT parser in crates/forge-pty (\\e]7501;state=...:kind=...:progress=...\\e\\\\), OSC 7501 ; ? ST capability responder, 256-record LRU cap per pane, superseding OSC 9;4, and <5 ms routing of blocked states to the Unified Approval Inbox.
2. bins/gf-tmux-shim translating tmux split-window, new-window, send-keys, and capture-pane calls into native GeminiForge panes with FORGE_PANE_TOKEN capability grants.
3. crates/forge-vcs (jj-lib v0.46.0 StackedTable op-log, algebraic conflict trees, <50 ms op undo) + Shadow LSP (Pack 05) + crates/forge-search.`
  },
  {
    id: "Prompt 08",
    files: "00.A (§2.2, §2.5), 00.D1 (S091–S100), 02.E (§4 #10)",
    title: "Tracks 10–11 SQLite RRule Automation Engine, Zero-Token Pre-Wake Gate & Flight-Recorder",
    plainGoal: "Design the unattended RRule cron scheduler, scratchpad worktree runner, and W3C traceparent time-travel debugger.",
    whyNeeded: "Ensures background automations never burn idle LLM tokens (via the SQLite Pre-Wake Gate) and never mutate your main branch without 1-click Inbox approval.",
    fullPrompt: `ROLE & OBJECTIVE:
Act as Principal Background Automation, Durable Workflow, and Flight-Recorder Forensics Architect. Design the complete V20 specification for Tracks 10 and 11.

DELIVERABLES REQUIRED:
1. SQLite RRule scheduler (rrule crate) + notify filesystem/clipboard triggers + Zero-Token SQLite Pre-Wake Gate (checking has_actionable_work(agent_id) in <0.1 ms in Rust and suppressing LLM wakes when empty, fixing paperclip#3401).
2. Strict Read/Scratchpad Mode (S092, S093) & Opt-In Ambient Mode (T02-S133) inside ephemeral jj workspaces (ambient/<job-id>).
3. Post-Mortem Flight-Recorder & Time-Travel Debugger (S098) linking prompts, tool calls, memfd screenshot dHashes, jj op IDs, and temporal_policy_events via W3C traceparent.`
  },
  {
    id: "Prompt 09",
    files: "05.A, 05.B, 00.D1 (S061–S070), 02.C (§3)",
    title: "Track 13 Multi-Agent Swarms, Typed Evidence Receipts & ForgeLab (Concordia GM + OASIS)",
    plainGoal: "Specify the 20-agent TaskConstellation coordinator and the grounded ForgeLab social/product simulator.",
    whyNeeded: "Prevents multi-agent hallucination cascades and sycophancy bias using Typed Evidence Receipts, Concordia Game Master checks, and Adversarial Skeptic personas.",
    fullPrompt: `ROLE & OBJECTIVE:
Act as Principal Multi-Agent Systems & Grounded Simulation Architect. Design the complete V20 specification for crates/forge-swarm (05.A and 05.B).

DELIVERABLES REQUIRED:
1. TaskConstellation DAG coordinator enforcing TLA+-verified Safe Assignment Locking (T02-S115/S116), Confidence Stepping (rejecting >=15% jumps to 100% without a new passing verification ToolCallId, T02-S122), and Typed Evidence Receipts (eliminating MiroFish#529 fabricated quotes).
2. Clean-room Rust ForgeLab Engine (Pack 14): DeepMind Concordia Game Master (GM) Causal Referee, TinyTroupe Persona & Statistical Engine, OASIS 23-action social graph over authoritative_audit.db (<150 MB RAM), and Cross-Family Model Jury.`
  },
  {
    id: "Prompt 10",
    files: "00.D1 (S015, S021–S030), 02.A (§2.3), 02.E (§3 #2, #9–#13)",
    title: "Quad-Auth PKCE Vault, 429 Pool Rotator, KV Cache Scheduler & Junie-Lite Two-Speed Router",
    plainGoal: "Design the credential vault, prompt-cache TTL tracker, and Two-Speed Frontier/Workhorse model router.",
    whyNeeded: "Routes routine mechanical worktree tasks to free/local Qwen 3.6/3.5 models while preserving frontier credits and KV cache prefixes.",
    fullPrompt: `ROLE & OBJECTIVE:
Act as Principal Identity, Cryptography, and LLM Inference Routing Architect. Design the complete V20 specification for Quad-Auth, KV Cache Scheduling, and Two-Speed Model Routing.

DELIVERABLES REQUIRED:
1. Quad-Auth & Keyring Vault Manager with Argon2id + ChaCha20-Poly1305 fallback vault when OS keyrings are locked (S015) or in CI (FORGE_USE_MOCK_KEYCHAIN=1).
2. Junie-Lite-Inspired Two-Speed Model Router (CONFIRM-07): classifies Frontier Architectural Turns vs. Workhorse Mechanical Turns, routing Workhorse turns to local Qwen3.5/3.6 (Tier B+) or free/Lite tiers.
3. KV Prompt-Cache TTL Scheduler (5-min/1-hr countdown badge), 15s Compaction Watchdog (fixing goose#5253), and union-merged model catalog (fixing jcode#1824).`
  },
  {
    id: "Prompt 11",
    files: "00.D1 (S018, S081), 02.D (T02-S120, S131, S142, S163–S164)",
    title: "Local AST-Biased Voice Co-Pilot (forge-voice) & Subprocess Diagram Canvas (mmdr)",
    plainGoal: "Specify the local push-to-talk voice pipeline and the 200 ms subprocess-isolated Mermaid SVG renderer.",
    whyNeeded: "Matches spoken words against your codebase's real Rust/TS identifiers and prevents malformed Mermaid diagrams (mmdr#112) from hanging the daemon.",
    fullPrompt: `ROLE & OBJECTIVE:
Act as Principal Audio/Speech Signal Processing Engineer and Vector Graphics Layout Architect. Design the complete V20 specification for forge-voice (Pack 17) and the Hybrid Diagram Canvas (Pack 08).

DELIVERABLES REQUIRED:
1. forge-voice pipeline: PipeWire/PulseAudio/WASAPI/CoreAudio capture with WebRTC AEC, automatic null-sink isolation for Environment B PiP virtual displays (T02-S120), Moonshine-Tiny INT8 / whisper.cpp Q5_1 coupled to a Tree-sitter AST Vocabulary Rescorer, and zero idle WH_MOUSE_LL hooks.
2. Hybrid Diagram Renderer (Pack 08): executes mmdr v0.3.1 selectable SVG generation inside forge-worker --role mmdr with a 200 ms cgroup.kill/TerminateJobObject watchdog, falling back to client-side mermaid.js on syntax errors or timeouts (mmdr#112).`
  },
  {
    id: "Prompt 12",
    files: "01.A–01.D (T01-S134–S136, S153), 04.D (Packs 11, 12, 22)",
    title: "Dynamic Instrumentation (Pack 11), Mobile/Firmware RE (Pack 12) & Mobile Remote (Pack 22)",
    plainGoal: "Specify the isolated network-tap DBI sandbox, mobile APK/Hermes/Flutter unpacker, and Noise XX mobile remote.",
    whyNeeded: "Lets analysts inspect mobile apps and sign Ring-0 Sanction Gate approvals from their phone with zero plaintext relay exposure.",
    fullPrompt: `ROLE & OBJECTIVE:
Act as Principal Dynamic Binary Instrumentation (DBI), Mobile/Firmware Security Analyst, and End-to-End Encrypted Networking Architect. Design the complete V20 specification for Packs 11, 12, and 22.

DELIVERABLES REQUIRED:
1. Pack 11: isolated Linux network namespace (gf-bwrap-helper --unshare-all) wired via veth/usermode stack to mitmproxy + pbtk-from-binary v1.1.3 (isolated GPL-3.0 CLI) + Frida-MCP.
2. Pack 12: static extraction of Android .apk/.aab (jadx), React Native Hermes .hbc (hermes-dec v0.1.7 isolated AGPL-3.0 CLI, Hermes v59–v99), and Flutter libapp.so (blutter).
3. Pack 22: QR-code X25519 + Ed25519 Noise XX handshake (snow Rust crate) for receiving OSC 7501 / AG-UI / Paperclip Board approval cards on mobile and signing Ed25519 approval tokens.`
  },
  {
    id: "Prompt 13",
    files: "NEW V20 FILE: 05.C — Organizational Agent Hierarchy, Atomic Checkout & Guidelines Engine",
    title: "Paperclip Org-Swarm, Atomic 409 Checkout, Zero-Token Pre-Wake & Junie Guidelines (05.C)",
    plainGoal: "Author new specification file 05.C uniting Paperclip's organizational swarm contracts with JetBrains Junie's guidelines hierarchy.",
    whyNeeded: "Gives multi-agent teams structured roles, budgets, atomic HTTP 409 task locks, Goal-Ancestry why breadcrumbs, and deduplicated .forge/AGENTS.md rules.",
    fullPrompt: `ROLE & OBJECTIVE:
Act as Principal Organizational Multi-Agent Architect and IDE Context Engineer. Author the complete V20 specification for new file 05.C (Organizational Agent Hierarchy, Atomic Checkout, Goal Ancestry & Guidelines Engine).

DELIVERABLES REQUIRED:
1. Clean-room Rust implementation of Paperclip's 9-Step Heartbeat & Atomic Checkout Contract inside crates/forge-swarm and crates/forge-db: (a) Zero-Token SQLite Pre-Wake Gate (has_actionable_work(agent_id) checked in <0.1 ms in Rust, fixing paperclip#3401), (b) Atomic Checkout (X-Forge-Run-Id returning 409 Conflict with zero retry loops), (c) Goal-Ancestry Breadcrumb injection, (d) Revision-Bound Plan Confirmations, and (e) Per-Agent Budget Auto-Pause at 100% spend.
2. Unified Agent Identity & Guidelines Loader in crates/forge-search (.forge/AGENTS.md, .junie/AGENTS.md, CLAUDE.md, GEMINI.md) with blake3 deduplication and compilation of '# Explicit prohibitions' into forge-policy guards.`
  },
  {
    id: "Prompt 14",
    files: "NEW V20 FILE: 08.A — Claude-Desktop-Class Workbench Design System & Iced Native HUD",
    plainGoal: "Author new specification file 08.A defining the warm literary salon UI, Artifact split-pane choreography, and <2 ms Iced HUD.",
    title: "Claude-Desktop-Class React 19 Workbench, Pure Framer Motion Choreography & Iced HUD (08.A)",
    whyNeeded: "Codifies the exact Parchment/Ivory/Terracotta tokens, Fraunces/Inter/JetBrains Mono typography scale, and scoped iced.rs Super+Escape overlay.",
    fullPrompt: `ROLE & OBJECTIVE:
Act as Principal Design Systems Architect, Frontend Performance Engineer (TypeScript, React 19, Vite, CSS Modules, Framer Motion), and Rust GUI Systems Engineer (iced.rs / wgpu / tiny-skia). Author the complete V20 specification for new file 08.A.

DELIVERABLES REQUIRED:
1. Complete CSS Custom Property token system (variables.module.css) for Warm Editorial Parchment (#F5F4ED), Ivory (#FAF9F5), and Near Black (#141413) themes, Terracotta Brand (#C96442) accents, Fraunces/Inter/JetBrains Mono typography, and Streamer Privacy Mode (S090).
2. Pure Framer Motion (stiffness: 350, damping: 32) spring choreography for the Side-by-Side CodeMirror 6 + Shiki + A2UI v0.9 Artifact Drawer (eliminating legacy GSAP runtime) and Ring-0 Sanction Gate Modal (DOM event.isTrusted == true).
3. Standalone native Rust bins/gf-emergency-hud built with iced.rs (wgpu primary with automatic renderer/src/fallback.rs fallback to tiny-skia CPU rendering, CONFIRM-08) mapping in <2 ms on Super+Escape.`
  }
];

export const LOCKED_CONFIRMATIONS: Confirmation[] = [
  { id: "CONFIRM-01", title: "Remove XInput2 Second Cursor (XIAddMaster) on :0", plainWhy: "Creating a second master cursor on X11 :0 breaks GTK3/GTK4/Qt6 menus and steals keyboard focus. Concurrent multi-cursor GUI work now runs inside isolated Environment B (Xpra/Xvfb/Weston), while host :0 stays single-cursor with a 350 ms typing yield." },
  { id: "CONFIRM-02", title: "Consolidate Into Single-Relational SQLite WAL (authoritative_audit.db)", plainWhy: "SQLite cannot enforce FOREIGN KEY constraints or atomic commits across two separate database files. All relational tables and vector_outbox live in authoritative_audit.db, toggling PRAGMA synchronous = FULL on approvals and NORMAL on streaming chunks." },
  { id: "CONFIRM-03", title: "Deduplicate & Expand Master Validation Suite to ~650 Atomic Scenarios", plainWhy: "Eliminates the 30 duplicate scenarios between 00.D2 and 01.D, splits compound tests (T02-S178, T02-S180), and expands prose summaries into individual Given/When/Then rows." },
  { id: "CONFIRM-04", title: "Expand ForgeHub Store from 22 to 25 Free On-Demand Packs", plainWhy: "Adds Pack 23 (CLI-Anything Desktop JSON Harnesses), Pack 24 (OpenCodeReview + AgentShield DevSecOps), and Pack 25 (Hardware NPU / DirectML / QNN Accelerator) with 0 MB added to the base installer." },
  { id: "CONFIRM-05", title: "Declarative A2UI v0.9 JSON Contract for .gmod.ts UI Mods", plainWhy: "Prohibits raw DOM/HTML injection in UI Mods. Every .gmod.ts runs inside a <4 MB Wasmtime QuickJS-WASM guest and emits declarative A2UI v0.9 JSON rendered safely by React 19." },
  { id: "CONFIRM-06", title: "Paperclip Org-Swarm & Zero-Token SQLite Pre-Wake Gate", plainWhy: "Adopts Paperclip's Org-Chart, Goal-Ancestry, and Atomic 409 Checkout in SQLite, while checking has_actionable_work() in <0.1 ms in Rust so idle heartbeats burn 0 LLM tokens (fixing paperclip#3401)." },
  { id: "CONFIRM-07", title: "JetBrains Junie-Lite Two-Speed Routing & .junie/AGENTS.md Loader", plainWhy: "Routes routine mechanical edits, test scaffolds, and lint fixes to free/local Qwen 3.6/3.5 workhorse models while reserving frontier credits for architecture turns, and auto-deduplicates .forge/AGENTS.md and .junie/AGENTS.md." },
  { id: "CONFIRM-08", title: "Scope iced.rs Strictly to the <2 ms Native Emergency HUD", plainWhy: "Because iced_webview backends either lack CSS Grid/JS (litehtml/Blitz) or bundle 250 MB of Chromium anyway (CEF), Sandboxed Electron + React 19 (and geminiforge-lite) remains the main shell while iced.rs powers the <2 ms Super+Escape kill-switch overlay." }
];

export const TIER_CHART_DATA = [
  { tier: "Tier E (4GB)", overheadGb: 0.12, modelGb: 0 },
  { tier: "Tier C (8GB)", overheadGb: 0.35, modelGb: 4.5 },
  { tier: "Tier B (16GB)", overheadGb: 0.55, modelGb: 10.5 },
  { tier: "Tier A (32-64GB)", overheadGb: 0.85, modelGb: 28.0 },
  { tier: "Tier S (192GB+)", overheadGb: 1.20, modelGb: 160.0 }
];

export const HARNESS_PSS_DATA = [
  { name: "GeminiForge (Rust)", s1: 28, s10: 65 },
  { name: "jcode (Rust baseline)", s1: 27.8, s10: 167 },
  { name: "Goose (Rust/Go)", s1: 42, s10: 310 },
  { name: "Codex / Claude ACP", s1: 180, s10: 1250 },
  { name: "Paperclip (Node/PG)", s1: 320, s10: 2200 },
  { name: "Standard Electron", s1: 450, s10: 3200 }
];

export const ANTI_BLOAT_ROWS = [
  { layer: "L0 Foundation", retained: "parking_lot + rkyv 0.8", pruned: "std::sync::Mutex, bincode", impact: "Zero-copy lock ordering, -12 MB memory" },
  { layer: "L1 Database", retained: "SQLite WAL (authoritative_audit.db)", pruned: "Dual SQLite DBs, PostgreSQL", impact: "Enforces foreign keys, atomic WAL commits" },
  { layer: "L1 Sandbox", retained: "cgroup.kill / JobObjects / Seatbelt", pruned: "In-process timeouts, SIGKILL", impact: "Atomically reaps 100% of forked subtrees in <15ms" },
  { layer: "L2 VCS", retained: "Embedded jj-lib v0.46.0", pruned: "git CLI subprocesses, .git/index.lock", impact: "Zero lock contention across 20 concurrent agents" },
  { layer: "L2 AST Graph", retained: "Tree-sitter 0.27 + petgraph", pruned: "LSP indexing daemons, ctags", impact: "200k-file AST symbol maps in <45 MB RSS" },
  { layer: "L3 Protocols", retained: "rmcp v3.5.1 + 4-Meta-Tool Gateway", pruned: "Full 200-tool MCP prompt dumps", impact: "Drops tool overhead from 40k to 480 tokens" },
  { layer: "L3 UI Mods", retained: "wasmtime QuickJS-WASM (wasm32-wasip1)", pruned: "V8 Workers, Node vm2", impact: "<4 MB heap per mod, -600 MB RAM" }
];

export const SPECIFICATION_PATCHES: SpecPatch[] = [
  { id: "Patch F.1", target: "00.A §2.1", summary: "Advisory flock before unlinking UDS socket", code: "// flock(fd, LOCK_EX | LOCK_NB) before unlink(sock_path)" },
  { id: "Patch F.2", target: "00.B §1.2", summary: "Linux cgroup.kill & AppArmor wrapper profile", code: "# /etc/apparmor.d/usr.lib.geminiforge.gf-bwrap-helper" },
  { id: "Patch F.3", target: "01.C §2.1", summary: "Hardened DuckDB forensic view isolation", code: "SET enable_external_access = false; SET lock_configuration = true;" },
  { id: "Patch F.4", target: "02.A §3.2", summary: "Split VRAM/RAM MoE Admission calculation", code: "VRAM_req = (P_shared + P_experts_vram) * b_quant <= VRAM_avail" },
  { id: "Patch F.5", target: "02.C §4.1", summary: "Stateless AT-SPI2 D-Bus drainage & HWND UIA", code: "// zbus AT-SPI2 event drainage preventing Qt6 hangs (cua#4894)" },
  { id: "Patch F.6", target: "05.C §1.1", summary: "Zero-Token SQLite Pre-Wake Gate (<0.1ms)", code: "SELECT EXISTS(SELECT 1 FROM tasks WHERE assignee = ?1 AND status = 'PENDING');" }
];

export const PROTOTYPE_SPIKES: Spike[] = [
  { id: "SPIKE-01", target: "Bulk Shared-Memory IPC", candA: "iceoryx2 v0.4.0", candB: "Linux memfd / Win Named Pipe", gate: "Throughput > 2 GB/s on 4K frames" },
  { id: "SPIKE-02", target: "Lightweight Scraping Engine", candA: "Lightpanda (<45 MB RSS)", candB: "Playwright Headless Chromium", gate: "RAM < 50 MB on 100-page crawl" },
  { id: "SPIKE-03", target: "Mod Runtime Isolation", candA: "wasmtime rquickjs (<4 MB)", candB: "Isolated V8 Worker (64 MB)", gate: "Startup latency < 15 ms, heap < 4 MB" },
  { id: "SPIKE-04", target: "VCS Working Tree Concurrency", candA: "jj-lib StackedTable", candB: "git worktree add", gate: "Zero .git/index.lock contention across 20 agents" },
  { id: "SPIKE-05", target: "Emergency HUD Native Overlay", candA: "iced.rs (wgpu -> tiny-skia)", candB: "Tauri Webview Window", gate: "Map window < 2 ms on Super+Escape" },
  { id: "SPIKE-06", target: "Voice AST Rescoring", candA: "Moonshine-Tiny INT8 + Tree-sitter", candB: "Whisper.cpp Large", gate: "Vocabulary precision > 98% on code identifiers" },
  { id: "SPIKE-07", target: "Local MoE Offload Sizing", candA: "llmfit-core -ngl profiler", candB: "Ollama default allocation", gate: "Zero swap thrashing on 16GB laptops" }
];

export const OS_PARITY_ROWS: OsRow[] = [
  { dim: "Kernel Sandboxing", mint_x11: "cgroup v2 + gf-bwrap-helper", mint_wayland: "cgroup v2 + gf-bwrap-helper", ubuntu_wayland: "cgroup v2 + AppArmor", win_x64: "JobObjects + AppContainer", macos: "Seatbelt + sandbox-exec" },
  { dim: "Subtree Termination", mint_x11: "cgroup.kill (<15 ms)", mint_wayland: "cgroup.kill (<15 ms)", ubuntu_wayland: "cgroup.kill (<15 ms)", win_x64: "TerminateJobObject (<5 ms)", macos: "killpg + kqueue EVFILT_PROC" },
  { dim: "Display Server", mint_x11: "X11 :0 (350ms typing yield)", mint_wayland: "Isolated Xpra / Xvfb PiP", ubuntu_wayland: "Isolated Weston / Wayland PiP", win_x64: "Virtual Desktop / Direct3D", macos: "WindowServer Virtual Display" },
  { dim: "Accessibility Driver", mint_x11: "Stateless zbus AT-SPI2", mint_wayland: "Stateless zbus AT-SPI2", ubuntu_wayland: "Drained AT-SPI2 bus", win_x64: "HWND-scoped UI Automation", macos: "AXUIElementCopyAttributeNames" },
  { dim: "Hardware Accel / NPU", mint_x11: "Vulkan / ROCm / OpenCL", mint_wayland: "Vulkan / ROCm", ubuntu_wayland: "Vulkan / Intel oneAPI", win_x64: "DirectML / QNN / ONNX EP", macos: "Metal / Apple Neural Engine" }
];
// #endregion
