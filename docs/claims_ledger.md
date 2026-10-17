# GeminiForge V20: claims ledger (first pass)

Checked on 2026-10-17 against public pages (GitHub issue/release pages, crates.io, npm registry, Hugging Face, MCP spec site, JetBrains blog). Nothing in the app's content text has been changed. This is a list for you to decide on.

Legend: OK = confirmed. FIX = the source says something different from the text. OLD = the pinned version exists but a newer one is out. TARGET = a V20 design target (not an external fact). NOT FOUND / NOT CHECKED = could not confirm.

## A. Needs a decision (text differs from the source)

| # | Where in the content | Claim | What the source says | Suggested action |
|---|---|---|---|---|
| A1 | Ch.1 pillar 2 ("859.6M tokens/day", "~190K per wake"); Ch.4 intro; task GF-T05-119 ("859.6M tokens/day"); swarm lab ("~190K saved" per suppressed wake) | Paperclip #3401: "859.6M tokens/day", "~190K context tokens per wake" | Issue exists (open, opened 2026-04-11, title "Heartbeat is architecturally heavyweight"). The numbers come from a later comment (2026-08-28): **859.6M context tokens and 7.04M output tokens over an 8-day window for one agent**, and one idle heartbeat is "roughly ten turns each re-reading a ~190K prefix". So it is not per day, and 190K is per turn, not per wake. | Reword to the source's figures, or cite them as "one agent, 8 days". |
| A2 | Prompt 11 (why-needed text and deliverable 2) | mmdr#112 "prevents malformed Mermaid diagrams from hanging the daemon" | 1jehuang/mermaid-rs-renderer#112 exists but is a rendering-accuracy report (CJK text clipping, architecture-beta ports); closed 2026-07-01. No hang is described. | Remove the issue reference or describe the real reason for the 200 ms watchdog. |
| A3 | Pack 02, SPIKE-02 | Lightpanda "<45 MB RSS" | Project README (AGPL-3.0) reports **123 MB peak for 100 pages** (vs 2 GB for headless Chrome). No 45 MB figure is claimed. SPIKE-02's gate (<50 MB on a 100-page crawl) is below the project's own number. | Mark as a V20 target, or adjust the gate. |
| A4 | Pack 10 | "ghidra-mcp v7.0.0 (--lazy)" | bethington/ghidra-mcp has only **7.0.0-rc.1 to rc.3** (rc.3 on 14 Oct). Latest stable is 6.0.0 (25 Jul). No release note mentions lazy loading (one aggregator page does). | Pin to a real version or say "7.0.0 release candidate". |
| A5 | Crate forge-protocols; Prompt 04 deliverable 3 | "a2a-rust >= 0.14.1 fixing GHSA-hr9h-6jvf-wvg6" | The crate named `a2a-rust` has only 0.1.0. A crate `a2a-protocol-types` has 0.14.1. The advisory URL github.com/advisories/GHSA-hr9h-6jvf-wvg6 returned 404 (could be private or mistyped). The A2A protocol itself is at v1.0.1. | Confirm the intended crate name and the advisory id. |
| A6 | forge-protocols, Prompt 04 | "fixing rmcp#1030" / "#1283" | Both exist. #1030 (unbounded stdio line buffer) closed 2026-10-14 via PR #1049. #1283 (client accepts a response with both result and error, reported against rmcp 3.4.0) closed 2026-10-14 via PR #1287. rmcp 3.5.1 (2026-10-05) predates both fixes. | Keep, but note the upstream fixes will arrive in a release after 3.5.1. |
| A7 | Prompt 06, Pack 24 | AgentShield "268 rules" | README says "268 rules across 15 modules" but its own summary table totals 102. runtimeConfidence is real; template-example is 0.25x (matches). "1.0x active-runtime" is not stated literally (it says full weight). | Say "README claims 268 rules (its table lists 102)". |
| A8 | forge-pty, Prompt 07 | "OSC 7501 (revision 0.2)" | OSC 7501 (Program Status Protocol) is real: Bubble Tea v2.1.0 (2026-10-08) added it, and Crush v0.98.0 is titled "Rex, OSC 7501...". No "revision 0.2" found. | Confirm the revision number from the spec text. |
| A9 | forge-cu; Prompt 05 (why-needed) | cua#4906 "1.2 s Windows root walks" | Issue exists (open): `list_windows` takes about 1.2 s per call, constant for 1 or 14 windows; cause **not identified** (UIA is only one guess). | Reword to "list_windows takes ~1.2 s". |
| A10 | Ch.5 intro ("100% free forever" for packs), agent-junie-lite-03 ("$0/free workhorse cost"), Confirm-07 | Junie Lite is free | JetBrains post (2026-10-02): free, "virtually unlimited", runs Qwen 3.6 27B on JetBrains infrastructure, but the footnote says the offer is **valid until 31 Dec 2026** and models may change. | Add the end date, or avoid "free forever" for Junie Lite. |
| A11 | forge-types | jcode#1828 "threads deadlocked ... in competitor audits" | 1jehuang/jcode#1828 exists (open, 2026-10-14): an ABBA deadlock in `cargo test jcode-tui --lib` between a render lock and an env lock. A test-suite deadlock, not a production report. | Say "test-suite deadlock". |
| A12 | Prompt 10 deliverable 3 | goose#5253 "(fixing)" a "15s compaction watchdog" | Issue "Summarize fails after 10mins" (closed 2025-10-20): a ~10-minute hard cap on summarize/compaction; reporter asked for a configurable LLM timeout. Repo is now aaif-goose/goose. Related, not identical. | Reword as "related to". |
| A13 | Prompt 04 deliverable 2 | copilot-cli#4113 "5-session standby recycling" | Issue "ACP mode does not implement session/close" (closed 2026-07-31): resources stay until the shared process dies. Related, not about recycling. | Reword. |

## B. Confirmed

| Claim | Evidence |
|---|---|
| Paperclip #3401 exists, timer heartbeat ~15 min wakes the LLM even with an empty inbox | issue page |
| Paperclip heartbeat doc: 9 steps, 409 Conflict on checkout, run-id header | docs/guides/agent-developer/heartbeat-protocol.md (header there is X-Paperclip-Run-Id; V20 renames to X-Forge-Run-Id) |
| trycua/cua#4894 (AT-SPI bus not drained, Qt apps hang) | issue open; fix PR #4903 linked |
| trycua/cua#4963 (Orca launched on GNOME) | closed 2026-10-14, PR #4964 |
| 666ghj/MiroFish#529 (fabricated tool_result blocks inflate entities/quotes) | issue open |
| openai/codex#15003 (Windows apply_patch fails for large patches via argv) | issue open |
| jj-lib 0.46.0 | crates.io, published 2026-10-07 (latest) |
| rmcp 3.5.1 | crates.io, published 2026-10-05 (latest) |
| tree-sitter 0.27 | 0.27.0 (2026-08-30), 0.27.1 (2026-10-08) |
| usearch 2.26 | 2.26.0 to 2.26.4 |
| Ghidra 12.1.4 | released 21 Sep, current latest |
| alibaba/open-code-review v1.13.0 (ACP service; deleted-file diff fixes) | release notes, 13 Oct, latest |
| HKUDS/CLI-Anything: Apache-2.0, arXiv 2606.03854 linked, GIMP/Blender/LibreOffice/Audacity harnesses | repo README (a "<15 ms" latency is not claimed by the project) |
| MCP spec version 2026-07-28 | modelcontextprotocol.io/specification/2026-07-28 |
| A2UI v0.9 | protocol versions v0.9 and v0.9.1 in A2UI releases |
| AG-UI 1.0 | @ag-ui/client and @ag-ui/core 1.0.x packages |
| Bubble Tea v2.1.0, Crush v0.98.0 | releases 2026-10-08 |
| webcrack 2.16.0, shuji 0.8.0 | npm latest |
| Qwen3.6-27B, UI-TARS-1.5-7B | Hugging Face pages exist |
| Lightpanda is AGPL-3.0 | README |
| hermes-dec v0.1.7 | tag exists (2026-08-11); license and bytecode range 59-99 not confirmed |
| Arithmetic: 98.8% token savings (40,000 to 480), 10 mods x 64 MB = 640 MB, 600 MB saved | computed |

## C. Pinned versions that exist but are no longer latest

llmfit-core 1.1.10 (latest 1.1.17) · agent-client-protocol (ACP) crate 3.2.0 (latest 3.4.0, 2026-10-16) · ast-grep 0.45.3 (npm @ast-grep/cli 0.51.0) · wakaru 1.10.0 (@wakaru/cli 1.14.0) · asar 3.4.1 (@electron/asar 4.3.1) · fuses 1.8.0 (@electron/fuses 2.1.3) · humanify 3.1.0 (npm humanifyjs is 2.2.2, so the name or version needs checking) · goose 1.53.0 (latest 1.55.0) · DuckDB 1.5.3 (latest 1.5.6) · hermes-dec 0.1.7 (0.1.8) · Crush 0.98.0 (0.98.1) · radare2-mcp 1.8.8 (1.9.0) · claude-agent-acp 0.89.1 (npm 0.93.0) · iced (0.13.1 vs latest 0.14.0, if a version is quoted).

## D. Internal inconsistencies in the content (from the data itself)

1. "14 crates": the registry has 14 entries = 12 under `crates/` + 2 under `bins/`, and the last `bins/` entry covers three binaries (so 12 crates + 4 binaries).
2. "Six-target OS parity": the matrix has 5 columns (Mint X11, Mint Wayland, Ubuntu Wayland, Windows x64, macOS). Windows 11 ARM64 is named in the text but has no column.
3. 13 of 14 crate entries carry the badge `VERIFIED_PRIMARY_SOURCE`, which the checks above do not support for every claim. Suggest a different label such as "SPEC TARGET" unless a source is attached.
4. "Verbatim" patches F.1 to F.6 are one-line stubs, and most crate "code" blocks are comment excerpts.
5. The anti-bloat table and the "1.4 GB / 400 MB" savings have no computed basis in the data.
6. The simulation numbers shown in the old file (0.04 ms, 4.2 ms, PID 41209) were invented; the new labs no longer print invented measurements.

## E. Not checked (no source found or out of scope this pass)

jscd 0.1.0 · rea 6.4.0 · pbtk-from-binary 1.1.3 · blutter · jadx · capa/floss/GoReSym/dfindexeddb · OmniParser V2 · YOLOv11n-UI · RapidOCR · Moonshine-Tiny · whisper.cpp Q5_1 · mitmproxy · Frida-MCP · iceoryx2 0.4.0 · wasmtime/rquickjs · rkyv 0.8 · MCP SEP-2567 and SEP-2106 · "A2ABreak" · MSRV 1.89.0 · "37 sources / 4 audits / 19 tools" · "76-crate workspace" · "540 scenarios / ~650" · 3.1 GB memory bloat · "60x speedup" · the Ryzen 3500U / Vega 8 notes · Windows ARM64 QNN/NPU notes · all V20 latency and RSS numbers (<15 ms, <2 ms, 28-65 MB) which are design targets, not external facts.

## Suggested next step (needs you)

For each A-row: choose "fix the text", "keep as a V20 target and label it so", or "drop". I can apply all your decisions in one pass and re-run the whole test suite.
