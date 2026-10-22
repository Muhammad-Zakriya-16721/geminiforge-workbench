<!-- Raw ChatGPT Deep Research output (Run 7, feature discovery), saved unedited 2026-10-22. citeturn/fileciteturn markers are ChatGPT citation placeholders. Audit: docs/26-AUDIT-RESEARCH-FEATURES.md -->
# GeminiForge Workbench Product and Feature Discovery Report — October 2026

## Executive summary

The ten findings below are ranked by **risk reduction first**, then product value.

| Rank | Finding | Roadmap consequence |
|---|---|---|
| **1** | **Do the October 30 Supabase privilege migration before feature work.** Supabase confirms the Data API privilege transition for existing projects; the master plan's explicit-grant strategy is prudent, although the exact “new function” behavior should not be inferred solely from the table change. citeturn20search0 | **Move 3.0 to absolute first.** |
| **2** | **Your core differentiation is unusually coherent:** structured plan + decision records + revision-backed knowledge + human-reviewed AI proposals. Competitors usually excel at only one or two of these. GitBook and Guru are moving toward agent-maintained knowledge with human review, validating the direction. citeturn1search13turn1search3turn17search7turn17search2 | Protect phases 4, 5.7, 6.17 and 7.3/7.8 from scope creep. |
| **3** | **Do not turn GeminiForge into Notion.** Databases, boards, Gantt, live co-editing, a block editor and generalized automation have high implementation surface but weak incremental value for your persona. Linear/GitHub already specialize there. citeturn10search0turn10search3turn9search10 | Keep Section 12 cuts. |
| **4** | **Verification/freshness is now a real product category, not an enterprise gimmick.** Notion, Slab and Guru all expose trust/freshness mechanisms, while Guru is increasingly automating verification. citeturn0search1turn17search0turn17search2turn17search3 | Keep 3b.1; move it close to the editor, not months later. |
| **5** | **MCP/agent-readable documentation became mainstream in 2025–2026.** GitBook, Outline and Linear now expose agent/MCP capabilities. citeturn1search13turn12search9turn13search10turn9search6 | Your MCP investment is strategically justified. |
| **6** | **Exact, revision-backed extractive Q&A is a better zero-cost first product than weak “free AI.”** It preserves privacy and can make every answer auditable. | Keep 7.3/7.8; do not add pgvector or a free cloud model without measured retrieval failure. |
| **7** | **Portability should be a product promise, not a checkbox.** Markdown-first tools retain trust partly because users can leave. | Ship Markdown ZIP import/export early and document fidelity limits explicitly. |
| **8** | **The maintenance bundle should be selective:** stale review, broken links, duplicate detection and content gaps are strong; automated glossary candidates and AI-written change digests have materially weaker evidence. citeturn17search1turn1search3 | Build deterministic maintenance first. |
| **9** | **The master plan contains two internal contradictions:** Section 12 says visual-regression screenshots and backup encryption are cut, while 2.27 and 9.3 explicitly require them. fileciteturn0file2 | Fix Section 12 wording. Keep the small screenshot suite and encrypted backups. |
| **10** | **The biggest unresolved $0 dependency is Backblaze B2 account eligibility without a card.** Current B2 material confirms free storage economics but this run did not establish the no-card requirement to the standard you requested. citeturn19search10 | Treat B2 as **conditional** until Q27 is physically tested; retain the encrypted-artifact/manual-download fallback. |

The strongest product thesis is therefore: **“A private planning-and-documentation workspace where every important statement, decision and AI edit remains inspectable, attributable and portable.”** That is materially more defensible than competing on generic notes, generic AI writing or generic project management.

## Market evidence: Parts A through D

**Assumption used throughout:** “$0 path” means a durable path consistent with your hard rule, not a trial. A product may still appear in the market map when no such path exists.

**Part A — Market map**

The table below is deliberately compact as requested. “Checked” means researched against first-party material in this run; `UNVERIFIED` means I would not let that row drive your roadmap without another primary-source check.

| Product / project | Category | Hosting / open-source | $0 path / card | Active in 2025–26? | One relevant current feature |
|---|---|---|---|---|---|
| Notion | Team docs / knowledge | SaaS, proprietary | Free individual workspace; team-free limits; no card indicated on pricing | Yes | Verified pages, offline-selected content, databases; agents increasingly metered. citeturn0search1turn0search7 |
| Confluence | Team wiki | SaaS, proprietary | Free up to 10 users / 2 GB; AI increasingly tied to paid/credit model | Yes | Spaces/pages + Rovo AI. citeturn0search0turn0search5turn0search8 |
| Outline | Team wiki/docs | Cloud + self-host; source-available BSL, **not OSI open source** | Self-host Community Edition path; cloud trial is not durable $0 | Yes | Built-in MCP; WebMCP and passkeys shipped in 2026. citeturn12search0turn12search9turn13search10turn13search11 |
| Docmost | Team wiki | Self-host, AGPL-3.0 | Self-host community version | Yes | Collaborative docs, comments, permissions, diagrams; verification is higher-tier. citeturn0search6turn0search10 |
| BookStack | Wiki | Self-host OSS | Fully self-hosted $0 software | Yes; v26.09.2 Oct. 2026 | Books/chapters/pages, recycle bin and permissions; active security fixes. citeturn2search10 |
| Slab | Team knowledge | SaaS proprietary | Free tier, no card; up to 10 users | Yes | Verification and unified search included on free plan. citeturn17search0 |
| Guru | Knowledge / enterprise AI | SaaS proprietary | **No durable free plan found** | Yes | AI-assisted verification, duplicate detection, knowledge agents. citeturn18search0turn17search1turn17search2 |
| GitBook | Documentation | SaaS proprietary service | Free individual plan; OSS-project sponsorship also available | Yes | Built-in MCP, Git sync, agent-generated change requests. citeturn1search0turn1search13 |
| Coda | Docs + databases | SaaS proprietary | Personal docs free; shared-doc object/row limits | Yes | Docs with structured tables/automations. citeturn1search4turn1search11 |
| Slite | Team knowledge | SaaS proprietary | **No permanent free plan** found | Yes | Ask AI, verification, MCP/API in paid offering. citeturn2search13 |
| Nuclino | Team docs/wiki | SaaS proprietary | Free tier: limited item/storage counts | Yes | Fast interconnected pages and canvas. citeturn2search3 |
| Wiki.js | Wiki | Self-host, AGPL-3.0 | $0 self-host | Yes, but v3 remained a migration/production-status concern | Broad authentication/storage integrations. citeturn2search0turn2search4 |
| AppFlowy | Local-first workspace | OSS core + cloud | Personal cloud $0; collaboration capabilities increasingly plan-dependent | Yes | Databases, forms/charts and local-first architecture. citeturn15search0turn14search7 |
| AFFiNE | Local-first workspace | Mixed community/enterprise licensing | Community self-host claims exist, but current official licensing language conflicts | Yes | BYOK AI, calendar/database views, MCP work. citeturn16search0turn16search5turn16search2 |
| Obsidian | Personal knowledge | Local proprietary app / open plugin ecosystem | Core app $0 without account; Sync/Publish paid | Yes | Plain Markdown vault + backlinks/plugins. citeturn3search2 |
| Logseq | Personal knowledge | AGPL-3.0 | $0 OSS | Yes, but major DB-generation code remained beta/transitionary | Graph/outliner plus new database architecture. citeturn3search0turn3search8 |
| Anytype | Local-first PKM | Local-first application / source available components | Free allowance with local-first use | Yes | Offline/E2EE architecture; local API/agent work. citeturn4search4turn4search14turn4search6 |
| Capacities | Object-based PKM | SaaS/local app proprietary | Free tier with unlimited objects/blocks and offline/search features | Yes | Typed objects and collections. citeturn3search10turn3search6 |
| Tana | Structured PKM | SaaS proprietary | Current durable-free details not fully established in this run | Yes | Structured Markdown export including supertag/link metadata. citeturn4search2 |
| Reflect | Personal notes | Proprietary | Mac application moving toward free; cross-device subscription model differs | Yes | Private notes with optional own-key AI. citeturn4search15 |
| Heptabase | Visual PKM | Proprietary | **No durable free plan** | Yes | Whiteboard/card knowledge modeling. citeturn5search14 |
| Craft | Documents / PKM | Proprietary | Free plan, no card indicated | Yes | Strong offline use and polished document composition. citeturn5search2turn5search3 |
| Bear | Personal notes | Proprietary | Free local notes; synchronization/export upgrades paid | Yes | Markdown-oriented editing/export; 2026 web/CLI work. citeturn5search0turn5search7 |
| Mem | AI-native PKM | Proprietary | Limited free usage | Yes | Agent/Deep Search over notes. citeturn5search4turn5search1 |
| NotebookLM / Gemini Notebook | AI knowledge reader | Google cloud proprietary | Free consumer path exists, but exact current source quota in attached research remained UNVERIFIED | Yes | Source-grounded notebook Q&A; not an app-embeddable GeminiForge backend. fileciteturn0file2 |
| Notion AI / Custom Agents | AI knowledge layer | Proprietary | Complimentary AI responses exist; meaningful agent use becomes credit-metered | Yes | Custom Agents and AI usage controls. citeturn0search11turn0search7 |
| Docusaurus | Docs-as-code | OSS, MIT | $0 software | Yes; 3.10.x in 2026 | Versioned documentation and AI-oriented docs additions. citeturn6search5turn6search0 |
| Starlight | Docs-as-code | OSS ecosystem | $0 | Yes; 0.42.6 Oct. 2026 | Accessible Astro documentation framework. citeturn7search8 |
| MkDocs | Docs-as-code | OSS | $0 | Core maintenance active but ecosystem transition matters | Markdown static documentation. citeturn7search5 |
| Material for MkDocs | Docs-as-code theme | OSS/community project | $0 software | Yes, but in maintenance/EOL transition | Rich documentation navigation/search; maintenance horizon is now a risk. citeturn7search0turn7search6 |
| Zensical | Docs-as-code | OSS, MIT | $0 | Yes; v0.0.67 Sept. 2026 | Native `llms.txt`/copy-as-Markdown style AI-consumption features. citeturn8search17turn8search9 |
| Nextra | Docs-as-code | OSS, MIT | $0 | Yes | Next.js documentation framework. citeturn8search1turn8search5 |
| VitePress | Docs-as-code | OSS | $0 | Project demand/activity exists, but current stable/Vite 8 concerns were raised in 2026 | Markdown-to-Vue docs. citeturn8search12 |
| Linear | Planning | SaaS proprietary | Free: unlimited members, 2 teams, 250 issues | Yes | MCP, agent platform, hierarchical projects/initiatives. citeturn10search0turn9search6turn9search1 |
| GitHub Projects | Planning | SaaS/proprietary service | Public/free-account project functionality | Yes | Sub-issues and dependency hierarchy replaced older task-list tracking patterns. citeturn10search3turn9search10turn9search18 |
| Basecamp / Shape Up | Planning methodology/product | Proprietary SaaS + free methodology | Normal commercial app not a durable $0 path; Shape Up book/method is free | Yes | Hill Charts and appetite-based planning. citeturn11search1turn10search6turn10search8 |
| MADR | Decision records | OSS template/spec ecosystem | $0 | Active ecosystem; v4 remains current template family | Structured ADRs with status/options/consequences. citeturn9search0turn9search20 |
| ADR tooling ecosystem | Decision records | OSS projects | $0 | Active updates found in 2026 | Generate/manage architecture decision records. citeturn9search3 |
| GitHub Wiki | Wiki/docs-as-code-adjacent | Hosted Git repository | $0 with eligible repositories | Yes | Git-backed wiki portability. citeturn10search3 |
| Org-mode | Personal planning/docs | OSS | $0 | **2026 maintenance status not independently rechecked here** | Computed checkbox/progress semantics informed your plan. fileciteturn0file3 |
| Joplin | Personal notes | OSS | **Current 2026 details UNVERIFIED in this pass** | UNVERIFIED | Markdown/local-first comparator only; not used to support roadmap decisions. |
| SiYuan | PKM | OSS/local-first | **Current cloud/free terms UNVERIFIED in this pass** | UNVERIFIED | Block-based local knowledge comparator only. |
| TriliumNext | PKM | OSS/self-host | **Current 2026 release status UNVERIFIED in this pass** | UNVERIFIED | Hierarchical personal knowledge comparator only. |

That gives **42 mapped products/projects**. The final three are intentionally marked UNVERIFIED rather than fabricated.

**Part B — What users value, dislike and ask for**

Direct independent sentiment evidence was thinner than product/changelog evidence in this run, so the table distinguishes market/product signals from actual issue/forum demand. That is preferable to pretending vendor shipping decisions equal user praise.

| Rank | Repeated value signal | Evidence strength |
|---|---|---|
| 1 | **Fast retrieval/search over a trusted corpus** | Strong: Slab makes unified search central even on free; Notion/Linear/GitBook continue investing heavily in retrieval. citeturn17search0turn1search0turn10search0 |
| 2 | **Plain Markdown/local ownership** | Strong product-retention signal from Obsidian, Bear and the docs-as-code ecosystem. citeturn3search2turn5search0turn6search5 |
| 3 | **Backlinks and lightweight linking** | Strong across Obsidian-style PKM and docs products; sufficiently mature to be table stakes for knowledge-heavy users. citeturn3search2 |
| 4 | **Structured content without losing prose** | Strong: Notion/Coda/Capacities/Tana continue to converge documents with structured metadata. citeturn0search1turn1search4turn3search10turn4search2 |
| 5 | **Reliable offline/local-first access** | Strong: Obsidian, Anytype, Capacities and Craft treat this as a first-class selling point. citeturn3search2turn4search14turn3search10turn5search3 |
| 6 | **Verification/freshness** | Strong for knowledge bases: Notion, Slab and Guru all ship variants. citeturn0search1turn17search0turn17search2 |
| 7 | **Hierarchical work breakdown with computed status** | Strong: Linear and GitHub invested in sub-issues/dependencies rather than relying on Markdown task lists. citeturn9search10turn9search18 |
| 8 | **Human-controlled AI changes** | Rapidly strengthening: GitBook's agent creates change requests and Guru Operator exposes accept/reject controls. citeturn1search13turn17search7 |
| 9 | **Export/escape path** | Strong category signal: Obsidian's filesystem model and Tana's structured export make portability part of trust. citeturn3search2turn4search2 |
| 10 | **Simple collaboration rather than collaboration machinery** | Strong fit for your persona: comments/suggestions are common, while real-time co-editing is unnecessary for your stated workflow. Docmost, GitBook and other team tools show comments/review as separable capabilities. citeturn0search6turn1search0 |

The strongest recurring complaints or switching pressures are:

| Rank | Complaint / switch-away reason | Evidence |
|---|---|---|
| 1 | **Previously-free or expected features becoming monetized** | Docmost users explicitly challenged MFA/business-tier placement; AppFlowy's current cloud tiers also make collaboration less attractive to free users. User-report signal. citeturn0search15turn15search0 |
| 2 | **AI features moving to credits/usage metering** | Notion Custom Agents and Confluence/Rovo moved toward explicit AI usage economics during 2026. citeturn0search7turn0search8 |
| 3 | **Weak offline behavior** | The fact that local-first competitors treat offline as a primary differentiator is a strong switching signal. citeturn4search14turn5search3 |
| 4 | **Export lock-in or loss of structure** | Structured export work in Tana and GitBook/Git workflows indicates portability remains strategic rather than solved. citeturn4search2turn1search0 |
| 5 | **Security basics treated as premium** | Explicit Docmost MFA complaint. citeturn0search15 |
| 6 | **Major architectural rewrites creating uncertainty** | Logseq's new database generation has carried beta/data-loss warnings rather than presenting migration as risk-free. citeturn3search0turn3search14 |
| 7 | **Maintenance uncertainty in OSS ecosystems** | Material for MkDocs entered maintenance/EOL planning; users also raised VitePress release/Vite 8 concerns. citeturn7search0turn7search6turn8search12 |
| 8 | **Source-available marketed close to “open source”** | Outline uses BSL rather than an OSI-approved license; AFFiNE's community/enterprise wording is currently difficult to reconcile. citeturn12search0turn16search0turn16search5 |
| 9 | **Too much workspace complexity for simple docs** | This is an inference from product segmentation: dedicated products such as Outline, Slab, Obsidian and GitBook continue to differentiate against generalized workspaces. citeturn13search8turn17search0turn3search2turn1search0 |
| 10 | **Unstable imports/integration contracts** | 2026 product work continues to expand/import new formats and APIs, indicating migration fidelity is not solved. AFFiNE, Anytype and Tana all shipped related work. citeturn16search2turn4search6turn4search2 |

The most useful missing-feature demand for GeminiForge is therefore **not** “more views.” It is: dependable portability, offline reading, trustworthy search, stable deep links, granular-enough sharing without permission complexity, review/freshness controls, AI provenance, and low-friction import.

**Part C — What materially changed in 2025–2026**

| Paradigm | 2025–26 evidence | Adoption signal | GeminiForge verdict |
|---|---|---|---|
| Agent-maintained documentation | GitBook Agent finds gaps/proposes updates; Guru agents increasingly maintain knowledge. citeturn1search3turn17search2 | Multiple independent vendors | **ADOPT concept**, human review mandatory |
| MCP access to knowledge/work | GitBook, Outline and Linear all shipped MCP-related capabilities. citeturn1search13turn12search9turn9search6 | Strong cross-category convergence | **ADOPT** |
| Browser/agent-native tool exposure | Outline added WebMCP in Sept. 2026 with guarded actions. citeturn13search10 | Early | **ASSESS**, do not expand surface yet |
| Human approval for agent changes | GitBook uses change requests; Guru Operator exposes proposed configuration changes for approval. citeturn1search13turn17search7 | Strong fit with enterprise trust | **ADOPT**; validates Review inbox |
| Verified/trusted pages | Notion, Slab and Guru all ship trust/verification mechanisms. citeturn0search1turn17search0turn17search3 | Mature | **ADOPT** |
| Automated knowledge health | Guru added duplicate detection and automated verification capabilities. citeturn17search1turn17search2 | Growing | **ADOPT deterministic subset** |
| AI credit governance | Notion and Atlassian now expose explicit AI usage/credit economics. citeturn0search7turn0search8 | Mainstream paid-model pattern | **AVOID** because $0 |
| Structured agent APIs | Anytype's local API/agent-oriented work and GitBook MCP show knowledge products becoming programmable agent substrates. citeturn4search6turn1search13 | Growing | **ADOPT minimal MCP surface** |
| Agent-facing text exports | Zensical ships AI-oriented documentation outputs; Docusaurus also acknowledges AI consumption patterns. citeturn8search17turn6search0 | Growing in docs-as-code | **ADOPT `AGENTS.md`; retain `llms.txt` cautiously** |
| Deep hierarchical tasks | GitHub retired Markdown task-list tracking in favor of sub-issues. citeturn9search18turn9search10 | Very strong | **ADOPT row-backed plan nodes** |
| Passkeys | Outline shipped passkeys in Jan. 2026. citeturn13search11 | Mature auth trend | **HOLD**: TOTP already sufficient for your threat/effort budget |
| Rich structured export | Tana exports workspace structure, metadata and links in Markdown-oriented form. citeturn4search2 | Strong portability signal | **ADOPT export manifest/frontmatter** |
| Local-first resurgence | Anytype, Craft, Obsidian and Capacities continue emphasizing offline/local use. citeturn4search14turn5search3turn3search2turn3search10 | Mature | **TRIAL read-only pins only** |
| Open-source docs tool transition | Material for MkDocs entered maintenance/EOL transition while Zensical emerged as an active successor-style ecosystem. citeturn7search0turn7search6turn8search17 | Important ecosystem change | Do not build new dependencies around aging ecosystems |
| AI changes as reviewable artifacts | GitBook/Guru increasingly represent AI work as proposed changes rather than invisible background edits. citeturn1search13turn17search7 | Strong | Make **proposal** the core AI primitive |

**Maintenance-feature audit**

| Planned capability | Do leading products ship it? | Evidence of value | Verdict |
|---|---|---|---|
| Stale-content / verification detection | **Yes.** Notion, Slab, Guru. citeturn0search1turn17search0turn17search3 | Strong; multiple dedicated knowledge products monetize or highlight it | **KEEP / high priority** |
| Why-this-changed proposer note | **Partial.** Change requests and agent review exist, but an exact standardized “AI rationale attached to every proposed edit” was not broadly verified | Trust benefit is logical but direct market validation is weaker | **KEEP lightweight**, do not generate with another model |
| Broken internal links | **Yes in docs/tooling ecosystems**, often build/save validation rather than “AI” | Mature deterministic hygiene | **KEEP / high priority** |
| Content gaps | **Yes/early.** GitBook has agent gap/update workflows. citeturn1search3 | Vendor adoption is strong; independent demand evidence still moderate | **KEEP after Q&A** |
| Change digest | Generic notification/change summaries are common; a dedicated AI digest was **not strongly verified** | Useful only if change volume becomes large | **DEFER** |
| Duplicate detection | **Yes. Guru shipped it in 2026.** citeturn17search1 | Strong direct evidence in knowledge-management category | **ADD deterministic duplicate-title/near-duplicate surface; semantic later** |
| Glossary candidates | Exact leading-product implementation was **not verified** in this pass | Weakest evidence of the seven | **IDEA/HOLD**, no first-release work |

**Part D — Emerging paradigms**

| Paradigm | Maturity in Oct. 2026 | Evidence | $0 implementation for GeminiForge | Verdict |
|---|---|---|---|---|
| Living documentation | Mature concept, uneven implementation | Verification/agent maintenance across Notion/Guru/Slab/GitBook. citeturn17search2turn1search3 | Revision + verification events + due review | **ADOPT** |
| Docs for AI agents | Rapidly maturing | MCP across GitBook/Outline/Linear. citeturn1search13turn12search9turn9search6 | Existing MCP + static manifests | **ADOPT** |
| Human-in-loop AI edits | Maturing fast | GitBook changes + Guru Operator. citeturn1search13turn17search7 | Existing Review inbox | **ADOPT** |
| AI-text provenance | Emerging | Products increasingly identify agent/user actors, but passage-level permanent labeling is not yet universal | `actor_kind`, proposal id and revision history | **ADOPT revision-level; ASSESS passage-level** |
| Knowledge graph | Mature in PKM, weak evidence as primary UI | Obsidian/Logseq class | Existing backlinks + links | **HOLD graph visualization** |
| Spaced review / recertification | Mature for knowledge bases | Verification due dates in Notion/Guru/Slab. citeturn0search1turn17search3 | `review_after` derived state | **ADOPT** |
| Decision logs with consequences | Mature engineering practice | MADR/ADR ecosystem remains active. citeturn9search0turn9search20 | Markdown + relational refs | **ADOPT** |
| Plan-as-document + computed progress | Mature constituent primitives; less common as one product | GitHub/Linear hierarchy and progress. citeturn9search10turn10search0 | Plan rows + rendered document | **ADOPT — major differentiator** |
| Executable docs | Niche for your persona | No strong evidence from this market set | Could run fenced-code snippets, but creates security/runtime complexity | **AVOID** |
| Personal AI memory | Fast-moving, privacy-sensitive | Mem/consumer assistants compete here. citeturn5search1 | None needed | **HOLD** |
| Versioned agent configuration | Emerging | Guru added immutable prompt/skill version history in 2026. citeturn17search1 | Hash/static tool schema + revisioned policies | **TRIAL** |
| Evidence-backed answers rather than generated prose | Growing trust pattern | Source-grounded systems such as NotebookLM and verification-oriented KBs validate provenance demand | Existing exact-offset Q&A | **ADOPT** |

## Jobs and feature catalog: Parts E and F

**Part E — Thirty most important jobs to be done**

| # | Job | Pain today | Best GeminiForge solution | Product precedent |
|---:|---|---|---|---|
| 1 | Know what to do next | Long documents hide actionable work | Master plan + next incomplete/unblocked step | Linear/GitHub |
| 2 | See project progress honestly | Manual percentages drift | Computed leaf progress + n/m + blocked count | Linear/GitHub |
| 3 | Break a large effort into phases | Flat checklists become unreadable | Phase → step → sub-step hierarchy | GitHub sub-issues |
| 4 | Represent blocked work | Checkbox cannot explain “not actionable” | explicit blocked status + dependency + reason | Linear |
| 5 | Record why a decision was made | Context disappears months later | MADR decision record + consequences | MADR |
| 6 | Supersede rather than rewrite history | Old rationale gets silently destroyed | immutable accepted decision + supersession chain | ADR practice |
| 7 | Connect decisions to work | Plans and rationale diverge | `decision_links` / “waiting on D-…” | NEW combination |
| 8 | Write long Markdown comfortably | Tiny textarea/source editing fails at scale | CodeMirror + preview | Obsidian/docs-as-code |
| 9 | Avoid overwriting someone else's edit | Sequential collaborators can collide | optimistic version + three-way merge | source-control pattern |
| 10 | Review an AI edit safely | Giant diff encourages blind accept | per-hunk Changes list + risk class | GitBook/Guru |
| 11 | Know why AI proposed a change | Diff alone lacks intent | proposer-supplied reason + source refs | change-request pattern |
| 12 | Reject dangerous AI edits selectively | All-or-nothing wastes good changes | accept/reject per hunk | editor/review tools |
| 13 | Audit where text came from | AI/human/import provenance blurs | revision `actor_kind` and token identity | modern agent platforms |
| 14 | Find exact facts quickly | Full document scanning is slow | FTS + literal search over heading chunks | Slab/search products |
| 15 | Trust an answer | Generated answer can hallucinate | exact stored-revision quotation | source-grounded Q&A |
| 16 | Find identifiers/paths/versions | Semantic search performs badly on exact tokens | literal lane alongside FTS | code/search tools |
| 17 | Know what needs review | Old pages look current | verification/review-after events | Notion/Guru/Slab |
| 18 | Notice docs changed after verification | “Verified” badge can lie after edit | changed-since-verified derived state | Notion-like trust |
| 19 | Find broken knowledge structure | Dead links accumulate invisibly | link index + broken/orphan checks | docs-as-code |
| 20 | Discover unanswered questions | Search failures vanish | content-gap log | GitBook Agent-adjacent |
| 21 | Prevent duplicate knowledge | Same fact gets maintained twice | duplicate-title/near-duplicate detector | Guru |
| 22 | Discuss a passage | Whole-page comments lose context | anchored comments + mentions | collaborative docs |
| 23 | Let a collaborator suggest without overwriting | Editor permission too broad | human suggestion through Review inbox | Google Docs/GitBook pattern |
| 24 | Share a project temporarily | Publishing is too public/permanent | revocable expiring project share | private docs products |
| 25 | Keep sensitive pages out of a share | Project-wide sharing is otherwise too coarse | restricted-document exclusion | permission systems |
| 26 | Leave the product with data intact | Lock-in destroys trust | Markdown ZIP + manifest/assets | Obsidian/Tana |
| 27 | Import an existing Markdown corpus safely | Manual copy loses links/metadata | constrained ZIP importer | migration products |
| 28 | Read key docs on unreliable internet | Full offline editing creates sync complexity | opt-in pinned read-only documents | local-first products |
| 29 | Recover from platform failure | Supabase Free has no managed backup | encrypted dump + restore drill | operational requirement citeturn20search3 |
| 30 | Understand overall health in one glance | Review, blocked work and gaps are scattered | dashboard: blocked, stale, review, gaps, broken links | Guru/Linear-style health |

This hierarchy strongly suggests your product should optimize for **resolution of uncertainty**—“What is true?”, “What is next?”, “Why did this change?”, “Who/what changed it?”—rather than generic page creation.

**Part F — Feature catalog**

Catalog key:

- **P** = rank among the top 40; `R1` = one of the **15 first-release features**.
- **IN PLAN n** references the master-plan step. fileciteturn0file2
- **IN IDEA n** references the attached 155-item list. fileciteturn0file8
- For **NEW**, the dependency/conflict is given as requested.
- `0$` = Yes / Conditional / No.
- Evidence types are restricted to the categories you requested.
- Product examples are based primarily on the official product sources summarized above. citeturn0search1turn17search0turn1search13turn10search0turn3search2turn17search2

| ID | Area | Feature / description | Examples | Value | Effort | 0$ | Risk | Plan / idea / dependency | Evidence type | P |
|---|---|---|---|---:|:---:|:---:|---|---|---|---:|
| F001 | Structure | Organization switcher | Notion, GitHub | 3 | S | Yes | clutter | IN PLAN 1.6; idea 1 | SHIPPED by named products | — |
| F002 | Structure | Project switcher | Linear, GitHub | 4 | S | Yes | clutter | IN PLAN 1.6 | SHIPPED by named products | — |
| F003 | Structure | Project archive/restore | GitHub/Notion-like | 3 | S | Yes | accidental restore | IN PLAN 2.3; idea 14 | SHIPPED by named products | — |
| F004 | Structure | Breadcrumb navigation | Notion, docs tools | 4 | S | Yes | narrow-screen overflow | IN PLAN 2.6; idea 25 | SHIPPED by named products | — |
| F005 | Structure | Collapsible project sidebar | Notion, Linear | 4 | S | Yes | state complexity | IN PLAN 2.9 | SHIPPED by named products | — |
| F006 | Structure | Pinned documents | Notion-style | 3 | S | Yes | clutter | IN PLAN 2.9; idea 22 | SHIPPED by named products | — |
| F007 | Structure | Favorites | Notion | 3 | S | Yes | duplication with pins | IN PLAN 2.21; idea 23 | SHIPPED by named products | — |
| F008 | Structure | Recent documents | Notion, Linear | 3 | S | Yes | privacy on shared devices | IN PLAN 2.11; idea 24 | SHIPPED by named products | — |
| F009 | Structure | Stable document IDs independent of title | Obsidian ecosystem/GitBook | 5 | M | Yes | migration | NEW → depends 5.6/5.8 | SHIPPED by named products | 38 |
| F010 | Structure | Stable heading/block anchors | GitBook/docs-as-code | 4 | M | Yes | slug migration | IN PLAN 8.1 | SHIPPED by named products | — |
| F011 | Structure | Duplicate document | Notion | 3 | S | Yes | accidental stale copy | IN IDEA 32; depends docs model | SHIPPED by named products | — |
| F012 | Structure | Cross-project navigation/search | Notion | 3 | M | Yes | authorization leaks | IN IDEA 13; depends 7.3 | SHIPPED by named products | — |
| F013 | Editing | CodeMirror Markdown source editor | Obsidian/docs-as-code | 5 | M | Yes | accessibility validation | IN PLAN 5.1 | SHIPPED by named products | **8 R1** |
| F014 | Editing | Rendered preview | GitBook/Obsidian | 5 | M | Yes | sanitization | IN PLAN 5.1 | SHIPPED by named products | **8 R1** |
| F015 | Editing | Optimistic version save | Git/source tools | 5 | M | Yes | conflict UX | IN PLAN 5.2; idea 29 | SHIPPED by named products | **8 R1** |
| F016 | Editing | Three-way merge on conflict | Git tools | 5 | M | Yes | confusing conflicts | IN PLAN 5.2; idea 29 | SHIPPED by named products | **8 R1** |
| F017 | Editing | Preserve both conflict versions | Git/source tools | 5 | S | Yes | storage | IN PLAN 5.2 | SHIPPED by named products | 16 |
| F018 | Editing | Add/remove/move/rename sections | Notion, Outline | 5 | M | Yes | broken links | IN PLAN 5.4 | SHIPPED by named products | 24 |
| F019 | Editing | Drag reorder | Notion | 3 | M | Yes | inaccessible alone | IN PLAN 5.4; idea 30 | SHIPPED by named products | — |
| F020 | Editing | Move up/down alternative | accessible UI practice | 5 | S | Yes | none material | IN PLAN 5.4 | SHIPPED by named products | 37 |
| F021 | Editing | Revision history | Notion/GitBook | 5 | M | Yes | DB growth | IN PLAN 5.5 | SHIPPED by named products | **11 R1** |
| F022 | Editing | Compare any two revisions | GitHub/docs tools | 4 | M | Yes | diff complexity | IN PLAN 5.5; idea 46 | SHIPPED by named products | — |
| F023 | Editing | Restore a paragraph | versioned editors | 4 | M | Yes | context mismatch | IN PLAN 5.5; idea 47 | SHIPPED by named products | — |
| F024 | Editing | Internal wiki links | Obsidian, Notion | 5 | M | Yes | rename resolution | IN PLAN 5.6; idea 34 | SHIPPED by named products | **12 R1** |
| F025 | Editing | Backlinks | Obsidian | 5 | M | Yes | noisy graph | IN PLAN 5.6; idea 35 | SHIPPED by named products | **12 R1** |
| F026 | Editing | Images | Notion/GitBook | 3 | M | Yes | storage/EXIF | IN PLAN 5.9; idea 40 | SHIPPED by named products | — |
| F027 | Editing | Math rendering | Obsidian/docs tools | 2 | S | Yes | sanitizer surface | IN PLAN 5.1; idea 42 | SHIPPED by named products | — |
| F028 | Editing | Block editor/slash commands | Notion | 2 | L | Yes | round-trip loss | IN IDEA 26; **conflicts Section 12 / 5.10** | SHIPPED by named products | — |
| F029 | Planning | Phase/step hierarchy | Linear, GitHub | 5 | M | Yes | schema correctness | IN PLAN 4.1/4.3; idea 3 | SHIPPED by named products | **5 R1** |
| F030 | Planning | Native checkbox for leaf completion | GitHub/Markdown tools | 5 | S | Yes | false completion | IN PLAN 4.3 | SHIPPED by named products | **5 R1** |
| F031 | Planning | Explicit todo/doing/done | Linear | 5 | S | Yes | state sprawl | IN PLAN 4.1 | SHIPPED by named products | 17 |
| F032 | Planning | Blocked state with reason | Linear | 5 | S | Yes | stale blocks | IN PLAN 4.1/4.2 | SHIPPED by named products | **27** |
| F033 | Planning | Deferred/cancelled state | Linear | 4 | S | Yes | denominator rules | IN PLAN 4.1 | SHIPPED by named products | — |
| F034 | Planning | Step dependencies | Linear/GitHub | 5 | M | Yes | cycles | IN PLAN 4.1/4.3; idea 5 | SHIPPED by named products | **27** |
| F035 | Planning | Cycle detection | project trackers | 5 | M | Yes | trigger bugs | IN PLAN 4.1 | SHIPPED by named products | — |
| F036 | Planning | Computed leaf progress | GitHub/Linear | 5 | M | Yes | misleading formula | IN PLAN 4.2; idea 4 | SHIPPED by named products | **6 R1** |
| F037 | Planning | Count + percentage | Linear/GitHub | 5 | S | Yes | none material | IN PLAN 4.2 | SHIPPED by named products | **6 R1** |
| F038 | Planning | Blocked count next to progress | Linear-adjacent | 5 | S | Yes | none | IN PLAN 4.2 | SHIPPED by named products | 18 |
| F039 | Planning | Scope-added indicator | Shape Up/Linear-adjacent | 4 | M | Yes | baseline semantics | IN PLAN 4.2 | SHIPPED by named products | — |
| F040 | Planning | “Next step” derived display | task tools | 5 | S | Yes | ordering rule | IN PLAN 4.2 | SHIPPED by named products | 19 |
| F041 | Planning | Project health dashboard | Linear/Guru-adjacent | 5 | M | Yes | metric overload | IN PLAN 4.7; idea 21 | SHIPPED by named products | **21** |
| F042 | Planning | Kanban/timeline/Gantt | Notion/Linear | 2 | L | Yes | scope explosion | IN IDEA 10/11/12; **conflicts 4.6/Section 12** | SHIPPED by named products | — |
| F043 | Decisions | MADR decision record | ADR ecosystem | 5 | M | Yes | ceremony | IN PLAN 4.4; idea 6 | SHIPPED by named products | **7 R1** |
| F044 | Decisions | Proposed/accepted/rejected status | ADR systems | 5 | S | Yes | none | IN PLAN 4.4 | SHIPPED by named products | **7 R1** |
| F045 | Decisions | Consequences field | MADR | 5 | S | Yes | ignored metadata | IN PLAN 4.4 | SHIPPED by named products | 20 |
| F046 | Decisions | Options considered | MADR | 5 | S | Yes | verbose | IN PLAN 4.4 | SHIPPED by named products | — |
| F047 | Decisions | Supersession chain | ADR practice | 5 | M | Yes | cycles | IN PLAN 4.4; idea 7 | SHIPPED by named products | 22 |
| F048 | Decisions | Stable never-reused decision IDs | ADR practice | 5 | S | Yes | sequence migration | IN PLAN 4.4 | SHIPPED by named products | — |
| F049 | Decisions | Link decision → plan step | — | 5 | M | Yes | referential complexity | IN PLAN 4.1/4.4 | user demand only | 23 |
| F050 | Decisions | Link decision → document | knowledge tools | 4 | M | Yes | stale refs | IN PLAN 4.1/4.4 | SHIPPED by named products | — |
| F051 | Decisions | Review-by on decisions | Guru/verification pattern | 4 | S | Yes | alert fatigue | IN PLAN 4.4 | SHIPPED by named products | — |
| F052 | Review & trust | AI proposal inbox | GitBook/Guru | 5 | M | Yes | queue buildup | IN PLAN 1.4/5.7 | SHIPPED by named products | **9 R1** |
| F053 | Review & trust | Per-hunk accept/reject | review tools | 5 | M | Yes | accessibility | IN PLAN 5.7 | SHIPPED by named products | **9 R1** |
| F054 | Review & trust | Linear semantic Changes list | review tools | 5 | M | Yes | duplicate UI | IN PLAN 5.7 | SHIPPED by named products | **9 R1** |
| F055 | Review & trust | Deterministic risk classes | — | 5 | M | Yes | misclassification | IN PLAN 6.17 | user demand only | 25 |
| F056 | Review & trust | High-risk accept reason | enterprise approval pattern | 5 | S | Yes | friction | IN PLAN 6.7/6.17 | SHIPPED by named products | 26 |
| F057 | Review & trust | No bulk-accept high risk | Guru-style approval | 5 | S | Yes | slower reviews | IN PLAN 6.7 | SHIPPED by named products | 26 |
| F058 | Review & trust | Stale-proposal base revision check | code review | 5 | M | Yes | rejects useful work | IN PLAN 4.8/6.17 | SHIPPED by named products | 28 |
| F059 | Review & trust | Verified/reviewed revision | Notion/Guru/Slab | 5 | M | Yes | false trust | IN PLAN 3b.1 | SHIPPED by named products | **13 R1** |
| F060 | Review & trust | Changed-since-verified state | Notion-adjacent | 5 | S | Yes | none | IN PLAN 3b.1 | SHIPPED by named products | **13 R1** |
| F061 | Review & trust | Review-due state | Notion/Guru | 5 | S | Yes | notification fatigue | IN PLAN 3b.1/3b.3 | SHIPPED by named products | **23** |
| F062 | Review & trust | Immutable verification events | audit systems | 5 | M | Yes | storage | IN PLAN 3b.1 | SHIPPED by named products | — |
| F063 | Review & trust | Revision actor: human/AI/import | agent products | 5 | S | Yes | privacy | IN PLAN 3b.8 | SHIPPED by named products | **33** |
| F064 | Review & trust | Proposer-supplied “why changed” | GitBook change-request pattern | 4 | S | Yes | boilerplate rationale | IN IDEA 60; depends 5.7 | SHIPPED by named products | **26** |
| F065 | Review & trust | Duplicate title/content detector | Guru | 4 | M | Yes | false positives | NEW → depends 3b.6; exact duplicate shipped by Guru | SHIPPED by named products | **25** |
| F066 | Review & trust | Broken internal-link detector | docs-as-code | 5 | S | Yes | rename transient | IN PLAN 3b.6 | SHIPPED by named products | **24** |
| F067 | Review & trust | Orphan-page detector | wiki tooling | 4 | S | Yes | intentional orphan | IN PLAN 3b.6 | SHIPPED by named products | — |
| F068 | AI | MCP read access | GitBook, Outline, Linear | 5 | Existing | Yes | exfiltration | IN PLAN 1.3/6.1 | SHIPPED by named products | — |
| F069 | AI | AI proposes, never directly writes | GitBook/Guru | 5 | Existing | Yes | friction | IN PLAN 1.4/4.8 | SHIPPED by named products | **28** |
| F070 | AI | Per-token tool allow-list | MCP systems | 5 | M | Yes | config errors | IN PLAN 6.5; idea 56 | SHIPPED by named products | — |
| F071 | AI | Per-token document allow-list | enterprise AI | 5 | M | Yes | stale ACL | IN PLAN 6.5; idea 57 | SHIPPED by named products | — |
| F072 | AI | Token templates | agent platforms | 4 | S | Yes | privilege creep | IN PLAN 6.5; idea 58 | SHIPPED by named products | — |
| F073 | AI | Tool-manifest hash | — | 4 | S | Yes | maintenance | IN PLAN 6.5 | user demand only | — |
| F074 | AI | Read-only short-lived path token | — | 5 | M | Yes | URL logging | IN PLAN 6.4 | user demand only | — |
| F075 | AI | Token fingerprint | security tools | 4 | S | Yes | operator confusion | IN PLAN 6.3 | SHIPPED by named products | — |
| F076 | AI | Per-token usage view | agent platforms | 4 | S | Yes | logging volume | IN PLAN 6.6 | SHIPPED by named products | — |
| F077 | AI | AI `report_issue` proposal | GitHub-like agent workflows | 4 | S | Yes | spam | IN PLAN 6.6 | SHIPPED by named products | — |
| F078 | AI | Narrow typo auto-accept, off by default | coding assistants | 2 | M | Yes | unsafe edits | IN PLAN 6.7; idea 55 | SHIPPED by named products | — |
| F079 | AI | Re-run rejected proposal with reason | coding assistants | 3 | M | Conditional | private text cannot go to free API | IN IDEA 53; depends external client | SHIPPED by named products | — |
| F080 | AI | Auto-rebase stale proposals | coding tools | 2 | L | Yes | hidden semantic conflict | IN IDEA 52; conflicts conservative 6.17 | SHIPPED by named products | — |
| F081 | AI | Passage-level AI provenance labels | — | 3 | L | Yes | metadata brittleness | IN IDEA 63; depends 3b.8 | announced only |
| F082 | AI | AI heat map | — | 1 | M | Yes | vanity metric | IN IDEA 59 | user demand only | — |
| F083 | Search/Q&A | PostgreSQL FTS | Slab/search products | 5 | M | Yes | ranking tuning | IN PLAN 7.3 | SHIPPED by named products | **10 R1** |
| F084 | Search/Q&A | Literal substring lane | developer search | 5 | S | Yes | index cost | IN PLAN 7.3 | SHIPPED by named products | **10 R1** |
| F085 | Search/Q&A | Heading-aware chunks | source-grounded search | 5 | M | Yes | chunk boundaries | IN PLAN 7.3 | SHIPPED by named products | **10 R1** |
| F086 | Search/Q&A | Stored exact offsets | — | 5 | M | Yes | re-index on revision | IN PLAN 7.3/7.8 | user demand only | **10 R1** |
| F087 | Search/Q&A | Verbatim result passages | source-grounded AI tools | 5 | S | Yes | context insufficiency | IN PLAN 7.3 | SHIPPED by named products | **10 R1** |
| F088 | Search/Q&A | Source path + revision | NotebookLM-like grounding | 5 | S | Yes | UI density | IN PLAN 7.3 | SHIPPED by named products | **36** |
| F089 | Search/Q&A | Server-side exact quote verifier | — | 5 | M | Yes | Unicode mapping | IN PLAN 7.8 | user demand only | **36** |
| F090 | Search/Q&A | Search filter chips | Notion/Linear | 5 | S | Yes | clutter | IN PLAN 8.1; idea 97 | SHIPPED by named products | **14 R1** |
| F091 | Search/Q&A | Verified-content ranking boost | knowledge search | 4 | S | Yes | freshness bias | IN PLAN 7.6 | SHIPPED by named products | — |
| F092 | Search/Q&A | Content-gap logging | GitBook-agent adjacent | 5 | S | Yes | sensitive questions | IN PLAN 3b.9/7.4 | SHIPPED by named products | **22** |
| F093 | Search/Q&A | Golden retrieval set | search engineering | 5 | M | Yes | stale benchmark | IN PLAN 7.5 | SHIPPED by named products | — |
| F094 | Search/Q&A | Search-term highlight | search products | 4 | S | Yes | unsafe HTML if done badly | IN IDEA 99; depends 7.3 | SHIPPED by named products | — |
| F095 | Search/Q&A | Saved searches | Notion-style | 2 | M | Yes | UI clutter | IN IDEA 98 | SHIPPED by named products | — |
| F096 | Search/Q&A | Semantic/vector search | Notion/enterprise search | 2 | L | Yes | unnecessary complexity | IN IDEA 96; **conflicts 8.4/Section 12** | SHIPPED by named products | — |
| F097 | Collaboration | Anchored passage comments | Google Docs/team docs | 5 | M | Yes | anchor drift | IN PLAN 5.7; idea 44 | SHIPPED by named products | **16** |
| F098 | Collaboration | Resolve comments | team docs | 4 | S | Yes | forgotten threads | IN PLAN 5.7 | SHIPPED by named products | — |
| F099 | Collaboration | Mentions | Notion/Confluence | 4 | S | Yes | notification spam | IN PLAN 3b.2 | SHIPPED by named products | — |
| F100 | Collaboration | Human suggestion proposals | Google Docs/GitBook | 5 | M | Yes | queue size | IN PLAN 5.7; idea 45 | SHIPPED by named products | **16** |
| F101 | Collaboration | Org owner/admin/member roles | team knowledge tools | 5 | Existing | Yes | ACL bugs | IN PLAN 1.6 | SHIPPED by named products | — |
| F102 | Collaboration | Project manager/editor/viewer | team tools | 5 | Existing | Yes | role complexity | IN PLAN 1.6 | SHIPPED by named products | — |
| F103 | Collaboration | Invite-only account creation | private SaaS | 5 | M | Yes | recovery | IN PLAN 3.13 | SHIPPED by named products | **2 R1** |
| F104 | Collaboration | TOTP for privileged roles | modern SaaS | 5 | S | Yes | lockout | IN PLAN 3.14; idea 83 | SHIPPED by named products | **4 R1** |
| F105 | Collaboration | Request access | Google Drive/knowledge tools | 3 | S | Yes | notifications | IN PLAN 3b.4 | SHIPPED by named products | — |
| F106 | Collaboration | Restricted document flag | permission systems | 4 | S | Yes | false assumptions | IN PLAN 3b.4 | SHIPPED by named products | **32** |
| F107 | Collaboration | Presence “X is editing” only | collaborative tools | 2 | M | Yes | privacy | IN PLAN 5.2 | SHIPPED by named products | — |
| F108 | Collaboration | Real-time co-editing/CRDT | Notion/Docmost | 1 | L | Yes | massive complexity | IN IDEA 26-adjacent; **conflicts 5.10/Section 12** | SHIPPED by named products | — |
| F109 | Sharing | Project-wide read-only share | GitBook/Notion-like | 5 | M | Yes | leakage | IN PLAN 3.5 | SHIPPED by named products | **3 R1** |
| F110 | Sharing | Expiring share | enterprise docs | 5 | S | Yes | clock/expiry bugs | IN PLAN 3.5 | SHIPPED by named products | **3 R1** |
| F111 | Sharing | Revocable share | team docs | 5 | S | Yes | cache leakage | IN PLAN 3.5 | SHIPPED by named products | **3 R1** |
| F112 | Sharing | Several labeled share links | sharing tools | 4 | S | Yes | management clutter | IN PLAN 3.5 | SHIPPED by named products | — |
| F113 | Sharing | Explicit-click share redemption | — | 5 | S | Yes | extra click | IN PLAN 3.10 | user demand only | **3 R1** |
| F114 | Sharing | Server-proxied share projection | — | 5 | M | Yes | proxy bugs | IN PLAN 3.11 | user demand only | **3 R1** |
| F115 | Sharing | Exclude restricted docs | permissions tools | 5 | S | Yes | accidental flag omission | IN PLAN 3.5/3b.4 | SHIPPED by named products | **32** |
| F116 | Sharing | Public static documentation site | GitBook/Docusaurus | 1 | L | Yes | contradicts private model | NEW → conflicts D1/3.5 | SHIPPED by named products | — |
| F117 | Sharing | One-document public share | Notion | 2 | M | Yes | second permission model | IN IDEA 115; conflicts D14 project-wide choice | SHIPPED by named products | — |
| F118 | Notifications | In-app notification inbox | Notion/Linear | 5 | M | Yes | noise | IN PLAN 2.29/3b.2 | SHIPPED by named products | **19** |
| F119 | Notifications | AI proposal waiting alert | agent tools | 5 | S | Yes | noise | IN PLAN 3b.2 | SHIPPED by named products | **19** |
| F120 | Notifications | Verification-due reminder | Guru/Notion | 5 | S | Yes | fatigue | IN PLAN 3b.2/3b.3 | SHIPPED by named products | **23** |
| F121 | Notifications | Mention notification | team docs | 4 | S | Yes | spam | IN PLAN 3b.2 | SHIPPED by named products | — |
| F122 | Notifications | Role/access notification | collaboration SaaS | 3 | S | Yes | noise | IN PLAN 3b.2 | SHIPPED by named products | — |
| F123 | Notifications | Daily AI email digest | enterprise tools | 1 | M | Conditional | Gmail quotas/noise | IN IDEA 65; plan Q10 says no | SHIPPED by named products | — |
| F124 | Notifications | Web push | SaaS apps | 1 | M | Yes | permissions complexity | IN IDEA 66 | SHIPPED by named products | — |
| F125 | Import/export | Markdown ZIP export | Obsidian/Tana/docs tools | 5 | M | Yes | fidelity | IN PLAN 5.8 | SHIPPED by named products | **17** |
| F126 | Import/export | Markdown ZIP import | Obsidian migration tools | 5 | M | Yes | hostile archives | IN PLAN 5.8 | SHIPPED by named products | **18** |
| F127 | Import/export | Export manifest | Git/export tools | 5 | S | Yes | schema versioning | NEW → depends 5.8 | SHIPPED by named products | — |
| F128 | Import/export | Known-key frontmatter | Obsidian/Tana | 4 | S | Yes | unknown-field loss | IN PLAN 5.8 | SHIPPED by named products | — |
| F129 | Import/export | Asset folder with stable relative paths | Markdown tools | 4 | M | Yes | filename collisions | NEW → depends 5.8/5.9 | SHIPPED by named products | — |
| F130 | Import/export | JSON machine-readable export | Notion/Coda-like | 3 | M | Yes | support burden | NEW → depends 5.8 | SHIPPED by named products | — |
| F131 | Import/export | HTML export | docs tools | 2 | M | Yes | sanitizer/fidelity | NEW → depends 5.8 | SHIPPED by named products | — |
| F132 | Import/export | Notion importer | migration products | 3 | L | Yes | export format drift | IN IDEA 141; Section 12 says not now | SHIPPED by named products | — |
| F133 | Import/export | Obsidian vault importer | local-first tools | 4 | M | Yes | plugin syntax | IN IDEA 142; deferred 5.8 | SHIPPED by named products | — |
| F134 | Import/export | DOCX importer | document tools | 2 | L | Yes | hostile files/fidelity | IN IDEA 143; deferred 5.8 | SHIPPED by named products | — |
| F135 | Import/export | PDF export | most workspace tools | 2 | M | Yes | layout engine | IN IDEA 103; **cut 5.10/Section 12**, print CSS instead | SHIPPED by named products | — |
| F136 | Reliability | Explicit GRANT + RLS migration discipline | Supabase | 5 | S/M | Yes | outage if wrong | IN PLAN 3.0 | SHIPPED by named products | **1 R1** |
| F137 | Reliability | Anonymous-access regression matrix | Supabase security practice | 5 | M | Yes | test gaps | IN PLAN 3.4/3.7 | SHIPPED by named products | **2 R1** |
| F138 | Reliability | Append-only security log | enterprise SaaS | 4 | M | Yes | growth | IN PLAN 3.17 | SHIPPED by named products | **34** |
| F139 | Reliability | Nightly logical backup | database platforms | 5 | M | Conditional | credentials | IN PLAN 9.3 | SHIPPED by named products | **39** |
| F140 | Reliability | Encrypt backup before upload | backup tools | 5 | M | Yes | key loss | IN PLAN 9.3; idea 92 despite Section12 contradiction | SHIPPED by named products | **39** |
| F141 | Reliability | Restore backup every night/job | DB ops | 5 | M | Yes | CI time | IN PLAN 9.3 | SHIPPED by named products | **39** |
| F142 | Reliability | Quarterly exit drill | portability practice | 5 | S | Conditional | external-free-tier availability | IN PLAN 9.15 | user demand only | — |
| F143 | Reliability | Independent uptime checks | monitoring services | 4 | S | Conditional | free-tier terms | IN PLAN 9.2/9.8 | SHIPPED by named products | — |
| F144 | Reliability | First-party error telemetry | SaaS platforms | 4 | M | Yes | private data | IN PLAN 9.8; idea 121 | SHIPPED by named products | — |
| F145 | Reliability | First-party web-vitals telemetry | observability tools | 3 | M | Yes | sampling/storage | IN PLAN 9.8; idea 122 | SHIPPED by named products | — |
| F146 | Accessibility | Skip link + route titles/focus | accessible web apps | 5 | S | Yes | focus mistakes | IN PLAN 2.40 | SHIPPED by named products | **29** |
| F147 | Accessibility | Route-backed org sections | web apps | 5 | S | Yes | routing regression | IN PLAN 2.41 | SHIPPED by named products | **29** |
| F148 | Accessibility | ≥3:1 text-input borders | WCAG-conformant UI | 5 | S | Yes | visual change | IN PLAN 2.42 | SHIPPED by named products | — |
| F149 | Accessibility | Forced-colors support | accessible apps | 4 | S | Yes | CSS effort | IN PLAN 2.43 | SHIPPED by named products | — |
| F150 | Accessibility | ≥24×24 hit targets | WCAG-aligned apps | 5 | S | Yes | density pressure | IN PLAN 2.44 | SHIPPED by named products | — |
| F151 | Accessibility | axe automated checks | OSS test ecosystems | 5 | M | Yes | false confidence | IN PLAN 9.7; idea 128 | SHIPPED by named products | **40** |
| F152 | Accessibility | ARIA snapshots | Playwright ecosystem | 4 | M | Yes | maintenance | IN PLAN 9.1 | SHIPPED by named products | **40** |
| F153 | Accessibility | Real AT release gate | mature accessibility programs | 5 | M | Yes | manual time | IN PLAN 2.46 | SHIPPED by named products | **40** |
| F154 | Accessibility | Small visual regression set | modern CI | 4 | M | Yes | flake | IN PLAN 2.27 despite Section12 contradiction; idea 127 | SHIPPED by named products | — |
| F155 | Settings | Per-project retention policy | enterprise tools | 3 | S | Yes | unexpected deletion | IN PLAN 6.13; idea 18 | SHIPPED by named products | — |
| F156 | Settings | Per-project AI policy | enterprise AI tools | 4 | S | Yes | config complexity | IN PLAN 6.13; idea 19 | SHIPPED by named products | — |
| F157 | Settings | Dark-only theme | — | 4 | Existing | Yes | user preference limitation | IN PLAN D6 | user demand only | — |
| F158 | Settings | Light/auto themes | most products | 1 | M | Yes | CSS/test multiplication | IN IDEA 109; conflicts D6 | SHIPPED by named products | — |
| F159 | Settings | Feature flags with removal condition | engineering platforms | 3 | S | Yes | stale flags | IN PLAN 9.17; idea 132 | SHIPPED by named products | — |
| F160 | Onboarding | Architecture/onboarding page | GitHub projects | 4 | S | Yes | gets stale | IN PLAN 9.17 | SHIPPED by named products | — |
| F161 | Onboarding | Keyboard-help page | productivity apps | 3 | S | Yes | documentation upkeep | IN PLAN 5.1/8.5; idea 107 | SHIPPED by named products | — |
| F162 | Onboarding | Empty-state starter actions | SaaS apps | 4 | S | Yes | UI clutter | NEW → depends 2.1/2.5 | SHIPPED by named products | — |
| F163 | Onboarding | Guided first project from template | Notion/Coda | 4 | M | Yes | wizard complexity | NEW → depends 4.5 | SHIPPED by named products | — |
| F164 | Onboarding | Sample demo project reset | dev tools | 2 | S | Yes | data confusion | IN IDEA 126 | SHIPPED by named products | — |
| F165 | Analytics | Project health counts | Linear/Guru | 5 | S | Yes | metric obsession | IN PLAN 4.7 | SHIPPED by named products | **21** |
| F166 | Analytics | Daily aggregate page views | knowledge platforms | 3 | S | Yes | privacy | IN PLAN 3b.5 | SHIPPED by named products | — |
| F167 | Analytics | Unread-90-day signal | knowledge systems | 4 | S | Yes | false staleness | IN PLAN 3b.5 | SHIPPED by named products | — |
| F168 | Analytics | AI proposal queue age | agent platforms | 4 | S | Yes | pressure metric | IN PLAN 6.17 | SHIPPED by named products | — |
| F169 | Analytics | AI accept/reject by token | agent governance | 4 | S | Yes | misinterpretation | IN PLAN 6.17 | SHIPPED by named products | — |
| F170 | Analytics | Post-accept undo/reversal rate | coding assistants/quality systems | 5 | M | Yes | attribution | IN PLAN 6.17 | SHIPPED by named products | — |
| F171 | Analytics | AI cost dashboard | AI SaaS | 1 | M | Yes | no paid model to meter | IN IDEA 68; D11 makes low-value | SHIPPED by named products | — |
| F172 | Integrations | GitHub issue/PR links on steps | Linear/GitHub | 3 | M | Yes | API/auth | IN IDEA 136 | SHIPPED by named products | — |
| F173 | Integrations | Push Markdown export to repository | GitBook | 3 | M | Yes | merge/auth | IN IDEA 137 | SHIPPED by named products | — |
| F174 | Integrations | `AGENTS.md` repository guidance | agent coding ecosystem | 5 | S | Yes | stale rules | IN PLAN 9.18; idea 152 | SHIPPED by named products | — |
| F175 | Integrations | `llms.txt` project export | docs ecosystem/Zensical | 3 | S | Yes | standard maturity | IN IDEA 152; existing partial | SHIPPED by named products | — |
| F176 | Integrations | MCP project resources/prompts | GitBook/Outline | 4 | M | Yes | attack surface | IN IDEA 153; depends 6.5 | SHIPPED by named products | — |
| F177 | Integrations | Slack/Discord decision webhook | collaboration tools | 1 | M | Conditional | external account/secret | IN IDEA 139 | SHIPPED by named products | — |
| F178 | Integrations | Zapier/Make webhook | SaaS | 1 | M | Conditional | external tiers | IN IDEA 140 | SHIPPED by named products | — |
| F179 | Integrations | CLI push/pull docs | Git/docs tools | 3 | L | Yes | sync conflicts | IN IDEA 155; depends 5.8/5.2 | SHIPPED by named products | — |
| F180 | Templates | Software project master plan | Notion/Linear/Shape Up | 5 | S | Yes | generic content | IN PLAN 4.5; idea 2 | SHIPPED by named products | **20** |
| F181 | Templates | Research project | Notion/Coda | 4 | S | Yes | domain assumptions | IN PLAN 4.5; idea 2 | SHIPPED by named products | — |
| F182 | Templates | MADR decision | ADR ecosystem | 5 | S | Yes | ceremony | IN PLAN 4.4 | SHIPPED by named products | — |
| F183 | Templates | Runbook | Confluence/GitBook | 5 | S | Yes | staleness | NEW → depends 4.5/3b.1 | SHIPPED by named products | — |
| F184 | Templates | PRD | Notion/Confluence | 4 | S | Yes | process bloat | NEW → depends 4.5 | SHIPPED by named products | — |
| F185 | Templates | Release plan | Linear/Notion | 5 | S | Yes | duplicated work | NEW → depends 4.5/4.1 | SHIPPED by named products | — |
| F186 | Templates | Template revision/version metadata | Notion-like ecosystems | 4 | M | Yes | migration complexity | NEW → depends 4.5 | user demand only | — |

**Catalog total: 186 features.**

The **top 40** are identified in the `P` column. Ties in the compact catalog resolve in this order:

1. F136 explicit grants/RLS  
2. F103/F137 private invite/access boundary  
3. F109–F114 hardened sharing  
4. F104 privileged TOTP/AAL2  
5. F029/F030 hierarchy  
6. F036/F037 computed progress  
7. F043/F044 decisions  
8. F013–F016 editor + conflict save  
9. F052–F054 review  
10. F083–F087 extractive Q&A  
11. F021 revision history  
12. F024/F025 links/backlinks  
13. F059/F060 verification  
14. F090 search filters  
15. F041/F165 health dashboard  
16. F097/F100 comments/suggestions  
17. F125 export  
18. F126 secure import  
19. F118/F119 notifications  
20. F180 master template  
21. dashboard aggregation  
22. F092 content gaps  
23. F061/F120 stale review  
24. F066 broken links  
25. F065 duplicates  
26. F056/F064 proposer rationale/review reason  
27. F032/F034 dependencies  
28. F058/F069 guarded plan/AI operations  
29. F146/F147 route accessibility  
30. read-only offline pins from plan 8.3  
31. pins/favorites/recents  
32. F106/F115 restricted-share protection  
33. F063 actor provenance  
34. F138 audit log  
35. private question-retention controls  
36. F088/F089 source-highlight verifier  
37. F020 accessible reorder  
38. F009 stable IDs / Ctrl-K discoverability  
39. F139–F141 backup/restore  
40. F151–F153 accessibility release gate

The **15 first-release capabilities** are the rows explicitly marked `R1`. They deliberately include foundational safety because a feature-rich release with unsafe sharing or data access is not a viable release.

## Portability and starter content: Parts G and H

**Part G — Import/export**

Portability is one of the strongest opportunities to differentiate from generalized workspaces. Tana's 2026 structured Markdown exports and Obsidian's local-file model reinforce that users increasingly expect knowledge to remain extractable. citeturn4search2turn3search2

| Source | First importer worth building? | What preserves well | What loses fidelity | Recommendation |
|---|---|---|---|---|
| Plain Markdown folder | **Yes, first** | prose, headings, code, simple links | application-specific metadata | First-class |
| Obsidian vault | Later | Markdown, wiki links, assets, frontmatter | plugin syntax, embeds, Dataview queries, `.obsidian` settings | Import docs/assets; explicitly ignore application config |
| Notion export | Later | pages, basic Markdown/HTML, files | databases, relations, comments, mentions, block IDs, views | Do not promise round trip |
| Confluence | Later | headings/prose/tables in exports | macros, permissions, comments, page IDs | Selective importer only |
| Google Docs | Later through safe conversion | prose/headings/lists | comments/suggestions, complex layout | Not first release |
| Word/DOCX | Later | conventional prose | floating layout, SmartArt, tracked changes, embedded objects | High-risk parser surface |
| GitHub Wiki | **Easy after Markdown importer** | Markdown pages, Git history if separately cloned | platform-specific navigation | Treat as Markdown corpus |
| GeminiForge export | **Always** | everything intentionally portable | internal ACL/audit/security state should not be in normal content export | Versioned manifest |

The realistic **portability promise** should be:

> **“Your document text, hierarchy, plan, decisions, internal references and portable metadata can be exported without a proprietary binary format. Security logs, permissions, notifications and every third-party editor feature are not guaranteed to round-trip.”**

Do **not** promise lossless Notion/Confluence round trips.

Recommended export layout:

```text
manifest.json
documents/
  <stable-id>-slug.md
plans/
  plan.md
  plan.json
decisions/
  D-0001.md
assets/
README-EXPORT.md
```

This is a data-format recommendation, not executable code.

The manifest should contain schema version, project metadata, export timestamp, stable IDs, document order, decision/plan references, asset hashes and original filenames. Markdown frontmatter should use a small documented scalar schema rather than arbitrary YAML types.

**Formats ranked for 2026**

| Format | Priority | Role |
|---|---:|---|
| Markdown + ZIP | 1 | Human-readable canonical portability |
| JSON manifest | 2 | Stable IDs/hierarchy/relationships |
| YAML frontmatter | 3 | Portable lightweight metadata |
| Plain folder export | 4 | Obsidian/Git interoperability |
| HTML | 5 | Universal reading fallback |
| Static-site bundle | 6 | Useful later; conflicts somewhat with private-first scope |
| PDF | 7 | Reading artifact only; **not** canonical backup/export |
| DOCX | 8 | Import convenience, not canonical |
| CSV | situational | Structured rows only |

**Untrusted archive security**

Your existing 5.8 design is directionally strong. fileciteturn0file2 Keep all of the following controls:

| Threat | Required defense |
|---|---|
| `../` / absolute / UNC traversal | canonicalize then reject before extraction |
| Zip bomb | compressed-size, emitted-byte and ratio caps |
| Huge single file | per-entry cap |
| Archive with thousands of tiny files | entry-count cap |
| Nested archives | reject |
| Symlinks/hardlinks | reject |
| Case collisions | detect before import |
| Unicode-normalization collisions | normalize and detect |
| Windows device filenames | reject/rename deterministically |
| NUL/control filenames | reject |
| YAML aliases/tags | scalar allowlist only |
| Prototype-pollution keys | reject `__proto__`, `prototype`, `constructor` |
| HTML/script payloads | never trust imported raw HTML |
| SVG active content | continue rejecting v1 |
| EXIF/GPS | re-encode images before storage when image import is added |
| CSV formula injection | escape cells beginning `=`, `+`, `-`, `@` |
| Remote-image tracking | do not fetch during import/review |
| Duplicate stable IDs | remap explicitly; never overwrite silently |

I **agree** with “Markdown ZIP first; defer Notion/Obsidian/DOCX specialized importers.” There is no new primary-source evidence here strong enough to overturn Section 12's “not four importers at once.”

**Part H — Twenty-five starter templates**

Templates should be **ordinary versioned project/document content**, not a separate templating language in v1. That keeps 4.5 small.

| # | Template | Core structure | Metadata |
|---:|---|---|---|
| 1 | Master project plan | Goal → phases → steps → release → operate | owner, status, start, target, review |
| 2 | Software build plan | Shape → build → test → release → operate | repo, environment, release target |
| 3 | Research project | Question → scope → sources → collection → analysis → conclusions | method, source policy, review date |
| 4 | PRD | Problem → users → requirements → non-goals → metrics → risks | owner, status, target release |
| 5 | ADR/MADR | Context → drivers → options → decision → consequences → confirmation | ID, status, date, decision makers, review-by |
| 6 | Technical design | Context → architecture → interfaces → data → security → testing | owners, dependencies, linked decisions |
| 7 | Runbook | Trigger → prerequisites → procedure → verification → rollback → escalation | owner, last verified, severity |
| 8 | Incident record | Summary → timeline → impact → cause → response → actions | severity, start/end, owner |
| 9 | Release plan | Scope → dependencies → migration → test → rollout → rollback | version, release date, owner |
| 10 | Release checklist | preflight → deploy → validate → observe → close | release, environment |
| 11 | Meeting notes | context → agenda → notes → decisions → actions | date, attendees, linked project |
| 12 | Retrospective | outcome → what worked → problems → lessons → actions | period/release, facilitator |
| 13 | Glossary | term → definition → canonical source → aliases | owner, review date |
| 14 | Onboarding guide | prerequisites → architecture → setup → workflows → safety → glossary | audience, owner, review date |
| 15 | Operational checklist | prerequisites → ordered checks → evidence → close | frequency, owner |
| 16 | Security review | assets → boundaries → threats → mitigations → tests → residual risk | reviewer, date, linked ADRs |
| 17 | Privacy review | data → purpose → access → retention → export/delete | owner, retention |
| 18 | Migration plan | old → target → mapping → dry run → migration → validation → rollback | owner, source, destination |
| 19 | API specification | purpose → auth → endpoints/tools → schemas → errors → examples | version, owner, compatibility |
| 20 | Data-model note | entities → constraints → indexes → permissions → migrations | schema version, owner |
| 21 | Content audit | scope → stale → broken → duplicate → missing → remediation | audit date, reviewer |
| 22 | Competitive research | question → products → criteria → evidence → decision | checked date, source standard |
| 23 | Course/project learning plan | outcomes → modules → exercises → assessment → review | target date, hours |
| 24 | Trip/project logistics | constraints → transport → stay → itinerary → checklist | dates, budget; calendar remains deferred |
| 25 | Decision review | original decision → observed consequences → assumptions → keep/supersede | decision ref, review date |

Leading products generally use **copy-on-create template libraries**, often augmented by databases/marketplaces. Notion and Coda demonstrate very broad template ecosystems; your persona benefits more from a **small curated built-in set with explicit schema versions** than from a marketplace. citeturn0search1turn1search4

Do not add template variables, scripting or a marketplace in the first six months. A project template should simply copy known documents/plan nodes/decision scaffolding. When a built-in template is updated, existing projects should **not** mutate automatically. Instead record `template_id` and `template_version`; a later “view changes in template” feature can be evaluated only after real demand.

## Differentiation, constraints and roadmap: Parts I through K

**Part I — Ten defensible differentiators**

These are combinations competitors do not commonly optimize together.

| # | Differentiator | Why it is stronger for your persona |
|---:|---|---|
| 1 | **Plan-as-document + computed progress** | More structured than Obsidian/Outline, less database-heavy than Notion. |
| 2 | **Decision → plan → document links** | Makes rationale operational rather than leaving ADRs isolated. |
| 3 | **AI edits are review objects, not magical document mutations** | Matches the 2026 direction of GitBook/Guru while making the rule universal. citeturn1search13turn17search7 |
| 4 | **Risk-sensitive per-hunk AI approval** | More granular than ordinary “accept suggestion” workflows. |
| 5 | **Exact-revision Q&A quotations** | Answers become inspectable records rather than generated prose. |
| 6 | **Verification automatically invalidated by later edits** | Stronger trust semantics than a mutable “verified” flag. |
| 7 | **Maintenance dashboard connects stale docs, blocked work, gaps and duplicates** | Treats knowledge health and project health as one system. |
| 8 | **Agent access with document/tool scopes and manifest hashing** | Docs designed for agents without granting agents owner-equivalent write access. |
| 9 | **Private-by-default temporary project sharing with restricted-doc exclusion** | Better fit than public publishing or enterprise ACL matrices. |
| 10 | **Markdown-first escape hatch plus relational export manifest** | Better portability than block-centric SaaS while preserving richer structure than a raw Markdown folder. |

A useful positioning line is:

> **GeminiForge Workbench is the workspace where plans, decisions, documentation and AI changes stay connected and reviewable.**

It should **not** try to beat Notion on databases, Obsidian on plugin count or Outline on team-scale real-time collaboration.

**What deliberately not to build**

| Attractive feature | Verdict | Evidence/reason |
|---|---|---|
| CRDT/live co-editing | **AVOID** | Your persona explicitly does not require it; sequential version/merge is enough. Docmost/Notion demonstrate the complexity you're intentionally avoiding. |
| Full block editor | **AVOID for six months** | Duplicates source/serialization models and threatens Markdown round-trip. |
| Kanban | **HOLD** | Linear/GitHub/Notion already specialize; weak value versus list plan. citeturn10search0turn10search3 |
| Gantt/timeline | **HOLD** | Same reason; significantly expands date/dependency semantics. |
| ICS/calendar | **HOLD** | No new evidence outweighs Section 12. |
| Generic database builder | **AVOID** | Moves product toward Notion/Coda and away from your structured plan thesis. |
| Public docs site generator | **AVOID** | Conflicts with private-first use; GitBook/Docusaurus already dominate this problem. |
| Free-cloud generative Q&A | **AVOID** | Conflicts with your private-text rule and $0/privacy constraints. |
| pgvector | **HOLD** | Only add after your 40-case evaluation demonstrates lexical retrieval failure. |
| AI auto-rebase | **HOLD** | Can hide semantic conflicts; safer to mark stale. |
| Bulk accept high-risk AI edits | **AVOID** | Contradicts human-review trust model. |
| Two-person approval | **HOLD** | Solo-owner mismatch; no new evidence changes Section 12. |
| Passage-level permanent AI badges | **ASSESS** | Revision-level provenance gives most value with far less complexity. |
| Hash-chain audit | **HOLD** | Tamper resistance without external anchoring has limited value for an owner who controls the DB. |
| PDF generation engine | **HOLD** | Print CSS meets your use case; PDF is a presentation format, not portability. |
| Extra file attachments | **HOLD** | Storage/security surface without core-value contribution. |
| Light theme | **AVOID** | Explicit owner decision; doubles visual testing for little persona value. |
| Plugin marketplace | **AVOID** | Supply-chain and compatibility burden is completely disproportionate for one developer. |
| Workflow automation builder | **AVOID** | Generic automation is a different product category. |
| Personal AI memory | **AVOID for now** | Privacy boundary and unclear job-to-be-done. |

No new primary evidence found here justifies reinstating the Section 12 cuts. fileciteturn0file2

**Part J — Free-tier and legal/terms constraints**

| Constraint | Verified state | Effect | Workaround |
|---|---|---|---|
| Vercel Hobby usage | Hobby is expressly for personal/non-commercial use. citeturn19search2 | No payments/ads/commercial deployment | Your stated non-commercial mode is compatible; reassess before commercialization |
| Vercel functions | Hobby has defined free resource quotas; cron is constrained and once-daily scheduling is appropriate. citeturn19search4turn19search11 | Cannot rely on high-frequency jobs | pg_cron + one daily Vercel/Actions job |
| Supabase DB | Free database quota currently 500 MB, with other free quotas across storage/realtime/functions. citeturn19search7 | Be frugal with per-event telemetry/revisions | Aggregate views; prune ordinary revisions |
| Supabase managed backups | **Not on Free.** Official backup material places managed backups on paid plans. citeturn20search3 | Data-loss risk | 9.3 external encrypted logical dump |
| Supabase inactivity | Free projects may pause after low activity; current guidance references seven days. citeturn20search2 | Availability risk | Two independent read keep-alives |
| Supabase Edge Functions | Free quotas plus 150s wall-time/2s CPU/256 MB class limits; outbound SMTP ports 25/587 are blocked. citeturn19search1 | Do not send Gmail SMTP from Edge | Keep Vercel mail function |
| Oct. 30 Data API change | Confirmed change affecting automatic privileges for existing projects. citeturn20search0 | New objects may fail or expose differently if migrations assume old defaults | Explicit grants/revokes in every migration |
| GitHub Actions public repo | Standard GitHub-hosted Actions for public repositories remain free under current policy. citeturn19search9turn19search15 | Public artifacts/logs require strong privacy discipline | Ciphertext only; never private docs/dumps |
| Backblaze B2 | Free-storage economics are documented; **current no-credit-card signup was not confirmed to required confidence in this run**. citeturn19search10 | Hard $0/no-card rule could block 9.3 external copy | Physically test Q27 before dependency; fallback encrypted GitHub artifact + monthly manual local copy |
| Gmail SMTP | The attached audit already marks exact personal limits and port details partially UNVERIFIED. fileciteturn0file2 | Do not design around assumed 500/day | App's tiny invitation quotas are enough; prove one real send |
| AI APIs | Your settled audit forbids sending private text to unpaid services with unacceptable data-use terms. fileciteturn0file2 | No in-app cloud generative AI | Extractive Q&A + owner-accepted consumer MCP route |
| OSS licensing | Outline's BSL is source-available rather than conventional OSI OSS. citeturn12search0 | Do not call every self-hostable product “open source” | Keep licensing vocabulary precise |

**Library gate:** this report deliberately recommends **no new runtime library dependency**. That avoids violating your requirement that every newly recommended dependency be independently checked for an October 2026 release and license. Existing libraries named in the already-audited master plan remain implementation choices, not new recommendations from this pass. Where the plan names `vite-plugin-pwa`, Workbox, CodeMirror, Zip.js, `node-diff3`, `jsdiff`, Vitest, Oxlint or other packages, keep the existing rule from 9.18: re-check registry identity, latest version, release date and license **at the installation/update commit**, and reject a package that has no acceptable recent release unless there is a documented stability reason. fileciteturn0file2

**Part K — Six-month roadmap**

The original phase ordering is good in broad strokes but too serial. Trust/health should not wait as an isolated phase: the verification model, links and provenance should land alongside the content model that generates their data.

| Window | Release | Work | Move vs master plan |
|---|---|---|---|
| **Oct. 22–30** | Safety gate | 3.0 explicit grants/default privileges; classify SECURITY DEFINER functions; 6.14 Origin/Host check; 3.4 anon matrix; gitleaks | **Move everything else later until done** |
| **Late Oct.–Nov.** | Private workspace release | 3.1–3.18 sharing/auth, TOTP, `/share#secret`, proxy, invite-bound creation; 2.40–2.46 accessibility fixes | Keep early; sharing is a trust boundary |
| **Nov.–Dec.** | Core planning release | 4.1–4.4 plan hierarchy, progress, dependencies, decision log; 4.5 starter templates; 4.7 health shell | **Keep early; this is the product** |
| **Dec.–Jan.** | Authoring + review | 5.1–5.7 editor, conflict-safe saving, revision comparison, links/backlinks, comments/suggestions, per-hunk review | Keep; move 3b.8 provenance into this release |
| **Jan.–Feb.** | Trust/search release | 3b.1 verification; 3b.6 links/orphans/duplicates; 7.3–7.9 extractive Q&A, exact quote verifier, golden set, content gaps | **Move 3b.1/3b.6 here rather than separate pre-core phase** |
| **Feb.–Mar.** | Portability + AI governance | 5.8 Markdown ZIP, export manifest; 6.1–6.17 MCP client validation, token UX, risk metrics | Keep specialized importers deferred |
| **Mar.–Apr.** | Resilience/polish | 8.1–8.3 filters, changed-since-read, pinned offline; 9.x backup/restore, RUM/error dashboards, small screenshot suite | Offline remains opt-in read-only |
| **Throughout** | Quality | pgTAP, Vitest, Playwright, axe, ARIA snapshots, real AT testing, backup restore tests | Treat as release gates, not final cleanup |

**Move earlier:** 3.0, 6.14, 3b.1 data model, 3b.6 link model, 3b.8 actor provenance, export-format design.

**Move later:** optional math, images, presence, analytics beyond health metrics, OAuth unless a tested client forces it, offline pins until core retrieval/editing is stable.

**Delete from six-month scope:** board/timeline/Gantt/ICS, block editor, CRDT, public publishing site, generalized automation, pgvector, semantic graph UI, PDF engine, DOCX/Notion specialized imports, web push, daily emails, personal AI memory.

## Master-plan challenge, unknown unknowns and what became outdated

The master plan is materially stronger than the earlier AI research because its later audits already corrected several false claims. fileciteturn0file2 The attached prior research itself shows why that skepticism is necessary: it includes older paid-AI recommendations later invalidated by D11 and several items subsequently corrected by audits. fileciteturn0file3

**Master-plan verdict table**

| Step | Verdict | Research conclusion |
|---|---|---|
| 1.1 Canvas dropped | **AGREE** | No feature-discovery reason to restore it |
| 1.3 MCP | **AGREE** | 2026 market validates MCP as strategic. GitBook/Outline/Linear ship it. citeturn1search13turn12search9turn9search6 |
| 1.4 AI Review inbox | **AGREE** | Stronger after GitBook/Guru 2026 evidence |
| 1.6 org/project hierarchy | **AGREE** | Appropriate minimum multi-project structure |
| 2.7 custom accessible dropdowns | **AGREE** | Settled owner decision; no discovery evidence justifies replacement |
| 2.11 one Ctrl-K search | **AGREE** | Avoid multiple search surfaces |
| 2.21 favorites | **AGREE, low priority** | Useful but not core |
| 2.26 phone | **AGREE** | Responsive access matters; no separate mobile app |
| 2.27 small visual regression set | **AGREE** | **Fix Section 12 contradiction**, which incorrectly says screenshots are cut |
| 2.29 notifications | **AGREE** | In-app only remains correct |
| 2.40 route accessibility | **AGREE** | Release gate |
| 2.41 route-backed org tabs | **AGREE** | Real navigation beats tab simulation |
| 2.42 contrast token | **AGREE** | Correctness issue |
| 2.43 forced colors | **AGREE** | Keep |
| 2.44 24×24 target test | **AGREE** | Keep |
| 2.45 accessibility statement | **AGREE** | Honest known-limit statement is valuable |
| 2.46 AT gate | **AGREE** | Automated accessibility testing cannot establish screen-reader usability |
| 3.0 grant migration | **AGREE, URGENT** | Move to absolute first. Supabase transition is current. citeturn20search0 |
| 3.1 authenticated content bundle | **AGREE** | Required by private-first model |
| 3.2 sign-in first | **AGREE** | Required |
| 3.3 authenticated MCP | **AGREE** | Required |
| 3.4 anon matrix | **AGREE** | Required |
| 3.5 share-link data model | **AGREE** | Project-wide, expiring, revocable is right scope |
| 3.6 privileged share creation | **AGREE** | No need for more granular creator policy |
| 3.7 share leakage tests | **AGREE** | High-value release gate |
| 3.8 RLS discipline | **AGREE** | Keep |
| 3.10 explicit-click `/share#secret` | **AGREE** | Good privacy hardening |
| 3.11 share proxy | **AGREE** | Better than exposing anonymous data RPC |
| 3.12 kill switch | **AGREE** | Cheap, high leverage |
| 3.13 invite-bound account creation | **MODIFY** | Keep design; **re-verify Turnstile's no-card/free terms before making it a required dependency** |
| 3.14 TOTP/AAL2 | **AGREE** | Keep mandatory privileged MFA |
| 3.15 invitation hardening | **AGREE** | Low-volume persona makes conservative quotas fine |
| 3.16 personal-data minimization | **AGREE** | Keep |
| 3.17 append-only security log | **AGREE** | Appropriate without hash-chain complexity |
| 3.18 incident runbook | **AGREE** | Keep before sharing |
| 3b.1 verification events | **AGREE, MOVE CLOSER TO EDITOR** | Strong 2026 evidence from Notion/Slab/Guru. citeturn0search1turn17search0turn17search3 |
| 3b.2 notifications | **AGREE** | AI review + verification + mention events justify inbox |
| 3b.3 reminder cron | **AGREE** | Derived expiry state is better than mutable stale flag |
| 3b.4 restricted docs/request access | **AGREE** | Sweet spot between project-only ACL and per-page ACL explosion |
| 3b.5 page-view aggregates | **MODIFY** | Implement only after dashboard exists; “not viewed” should be a weak freshness signal |
| 3b.6 link/orphan checks | **AGREE, HIGH** | Deterministic content health is a better early investment than generative maintenance |
| 3b.7 external-link checker | **AGREE, LATER** | Scheduled CI is appropriate |
| 3b.8 actor provenance | **AGREE, MOVE EARLIER** | Land with revision/editor schema |
| 3b.9 content gaps | **AGREE** | GitBook agent direction validates the problem. citeturn1search3 |
| 4.1 relational plan/decision rows | **AGREE** | GitHub's shift away from Markdown task-list tracking strengthens this design. citeturn9search18turn9search10 |
| 4.1 integer gap order / equal v1 weights | **AGREE** | Simpler and sufficient |
| 4.2 computed progress | **AGREE** | Do not persist derived progress |
| 4.2 optional 25% “doing” toggle | **DISAGREE for v1** | It weakens clarity and creates configurable semantics; ship binary completion + explicit doing state |
| 4.3 master-file nested-list UI | **AGREE** | Strong core differentiator |
| 4.4 MADR log | **AGREE** | Active ADR ecosystem remains relevant. citeturn9search0 |
| 4.5 templates | **MODIFY** | Expand curated starter set, but keep implementation copy-only and variable-free |
| 4.6 list view only | **AGREE** | No evidence justifies reviving board/timeline/ICS |
| 4.7 dashboard | **AGREE** | Core summary surface |
| 4.8 AI plan ops through Review | **AGREE** | One of strongest differentiation points |
| 5.1 CodeMirror Markdown | **AGREE** | Do not revisit WYSIWYG/block editor |
| 5.1 Mermaid deferred | **AGREE** | Keep deferred |
| 5.2 version + 3-way merge | **AGREE** | Right substitute for CRDT |
| 5.4 reorder + buttons | **AGREE** | Accessible and sufficient |
| 5.5 revision compare | **AGREE** | High-value trust feature |
| 5.6 internal links/backlinks | **AGREE** | Core knowledge feature |
| 5.7 per-hunk AI/human suggestion review | **AGREE** | Strong 2026 validation |
| 5.8 Markdown ZIP first | **AGREE** | Strengthen with versioned export manifest |
| 5.8 Notion/Obsidian/DOCX deferred | **AGREE** | Do not build four importers at once |
| 5.9 images only | **AGREE** | Other attachment types add security/storage surface |
| 5.10 block editor/CRDT/PDF deferred | **AGREE** | No new evidence changes the decision |
| 6.1 test clients before OAuth | **AGREE** | Keep |
| 6.2 sanitize review surface | **AGREE** | Critical |
| 6.3 digest fingerprint | **AGREE** | Better operator representation than secret fragments |
| 6.4 short-lived read-only path token | **AGREE** | Necessary exception, not preferred auth |
| 6.5 per-token scopes/static manifest | **AGREE** | Strong agent-security primitive |
| 6.6 token usage panel | **AGREE** | Low-cost observability |
| 6.7 no high-risk bulk accept | **AGREE** | Keep |
| 6.8 data minimization | **AGREE** | Keep |
| 6.9 no hash-chain audit | **AGREE** | Section 12 remains correct |
| 6.10 anomaly auto-pause | **MODIFY** | Alert first; auto-pause only after real false-positive data |
| 6.11 conditional OAuth | **AGREE** | No reason to build preemptively |
| 6.12 current MCP spec support | **AGREE** | 2026 market makes this increasingly valuable |
| 6.14 Origin/Host validation | **AGREE, MOVE TO SAFETY GATE** | Do before more MCP exposure |
| 6.15 pseudonymous IP or none | **AGREE** | Prefer no IP where possible |
| 6.16 MCP security corpus | **AGREE** | Release gate |
| 6.17 risk classes/metrics | **AGREE** | Strong product differentiator |
| 7.1 Gemini consumer-cloud path | **AGREE WITH LABELING** | Keep clearly secondary to private in-app retrieval |
| 7.2 NotebookLM manual aid | **AGREE, OPTIONAL** | Never make it a dependency |
| 7.3 extractive Q&A primary | **AGREE STRONGLY** | Distinctive zero-cost/private answer |
| 7.4 content-gap log | **AGREE** | 90-day owner-only question retention remains sensible |
| 7.5 40-case golden set | **AGREE** | Do not inflate percentages from small sample |
| 7.6 verified boost | **AGREE** | Keep boost small |
| 7.7 no private text to free API | **AGREE** | Hard constraint |
| 7.8 exact quote verifier | **AGREE STRONGLY** | Key trust feature |
| 7.9 plain-text untrusted surfaces | **AGREE** | Keep |
| 8.1 anchors/search filters | **AGREE** | High value |
| 8.2 changed-since-read | **AGREE, LATER** | Useful after revisions are solid |
| 8.3 pinned read-only offline | **AGREE** | Correct smallest offline solution |
| 8.4 semantic/listen/focus/split deferred | **AGREE** | No new evidence to restore |
| 9.1 testing stack | **AGREE** | Keep tests focused, not exhaustive screenshot suite |
| 9.2 dual keep-alive | **AGREE** | Supabase inactivity behavior remains current. citeturn20search2 |
| 9.3 encrypted external backup | **AGREE CONDITIONALLY** | **Section 12 is wrong to list backup encryption as cut.** B2 no-card eligibility must still be proven |
| 9.5 supply-chain rules | **AGREE** | Especially important for public repo + AI coding |
| 9.7 pgTAP/axe | **AGREE** | Keep |
| 9.8 first-party telemetry | **AGREE** | Better fit than introducing external private-data processors |
| 9.10 Hobby noncommercial guard | **AGREE** | Vercel explicitly constrains Hobby to non-commercial use. citeturn19search2 |
| 9.11 bundle budgets | **AGREE** | Keep small |
| 9.14 React/Vite upgrade | **AGREE WITH EXISTING SEQUENCING** | Do after 3.0, not concurrently with security migrations |
| 9.17 engineering hygiene | **AGREE** | Especially removal conditions on flags |
| 9.18 `AGENTS.md` | **AGREE** | 2026 agent-facing docs trend strengthens it |
| 9.15 exit drill | **AGREE** | Portability is part of resilience |

**Corrections to the attached documents**

1. **Section 12 contradicts 2.27:** it says visual-regression screenshots are cut, while 2.27 correctly requires a small 10–20-screen set. Keep 2.27; change Section 12 to “large design-system visual suite.” fileciteturn0file2
2. **Section 12 contradicts 9.3 and your settled rule:** it says “backup encryption” is cut even though 9.3 correctly mandates age-encrypted dumps. Delete “backup encryption” from Section 12. fileciteturn0file2
3. Earlier research that recommended paid Anthropic/Gemini APIs is obsolete under D11; the master plan correctly superseded it. fileciteturn0file3
4. Treat claims that Outline is “open source” loosely as wrong: current licensing uses BSL/source-available language. citeturn12search0
5. Treat AFFiNE's current OSS/self-host licensing description as **CONFLICTING**, not settled, because its official materials are not internally clear. citeturn16search0turn16search5
6. Material for MkDocs should no longer be treated as an indefinitely safe “default” docs stack; maintenance/EOL transition materially changed the calculus. citeturn7search0turn7search6
7. GitHub Markdown task-list tracking is no longer the modern planning primitive; sub-issues replace that role. citeturn9search18turn9search10

**Unknown unknowns**

| Discovery | What it is / evidence | Persona value | Effort | $0 adoption |
|---|---|---:|:---:|---|
| Agent-maintenance change requests | GitBook agents now find gaps/propose docs changes. citeturn1search3turn1search13 | 5 | M | Reuse Review inbox |
| Operator-mode agent governance | Guru exposes human accept/reject over agent-generated configuration. citeturn17search7 | 4 | M | Extend existing proposal primitive |
| Versioned prompts/skills | Guru shipped immutable prompt/skill version history. citeturn17search1 | 4 | M | Revision agent policy/tool manifests |
| WebMCP | Outline exposes browser-oriented MCP capabilities. citeturn13search10 | 2 | M | **ASSESS**, don't expose write surface now |
| Agent-facing docs artifacts | Zensical's AI-oriented exports show `llms.txt`-style patterns becoming productized. citeturn8search17 | 3 | S | `AGENTS.md` + optional generated index |
| Knowledge duplicate detection | Guru shipped it as product functionality. citeturn17search1 | 4 | M | Start exact/title/normalized duplicates without embeddings |
| Trust-aware retrieval | Verified knowledge can influence result trust/ranking | 5 | S | Small deterministic boost |
| Revision-aware citations | Your exact-offset approach can guarantee the quote came from the displayed revision | 5 | M | Already planned |
| Template provenance | Track which built-in template/version created content | 3 | S | Add metadata only |
| Export schema versioning | Machine-readable manifest allows future migrations without breaking old ZIPs | 5 | S | Add `schema_version` now |
| Agent policy as data | Per-project AI policy can itself become versioned/auditable | 4 | M | Reuse revision model |
| “Known stale” vs “not reviewed” | Separate explicit review failure from simple age | 4 | S | Derived verification states |

**What became outdated in 2025–2026**

| Old assumption | 2026 reality |
|---|---|
| “AI in knowledge tools means chatbot” | Agents now propose updates, run workflows and maintain knowledge. citeturn1search3turn17search2 |
| “MCP is niche developer plumbing” | GitBook, Outline and Linear expose it. citeturn1search13turn12search9turn9search6 |
| “Task lists in Markdown are adequate project structure” | GitHub replaced task-list tracking with sub-issues. citeturn9search18 |
| “Verification is an enterprise-only oddity” | Multiple knowledge products now emphasize verification/freshness. citeturn17search0turn17search3 |
| “OSS docs stack = MkDocs + Material indefinitely” | Material entered a maintenance/EOL transition; active alternatives are emerging. citeturn7search0turn8search17 |
| “Self-hostable means open source” | Outline/other products increasingly use source-available or mixed licensing. citeturn12search0 |
| “Offline is obsolete for cloud workspaces” | Local-first/offline remains a central differentiator in Obsidian/Anytype/Craft/Capacities. citeturn4search14turn5search3 |
| “AI usage can just be bundled invisibly” | Major products introduced explicit AI credits/usage governance. citeturn0search7turn0search8 |
| “An AI edit can be trusted if the diff looks plausible” | Product design is moving toward explicit change requests/operator approval. citeturn1search13turn17search7 |
| “Export means downloading prose” | Structured metadata/link exports are increasingly important. citeturn4search2 |

## Execution controls: RADAR, near-term plan, risks, tests and owner decisions

**RADAR**

| Item | Verdict | Why | Evidence | Costs 0? | Effort | Master-plan step |
|---|---|---|---|:---:|:---:|---|
| Explicit grants/RLS migration | **ADOPT** | Immediate compatibility/security risk | Supabase, checked 2026-10-22. citeturn20search0 | Yes | M | 3.0 |
| Structured plan hierarchy | **ADOPT** | Core persona job | GitHub/Linear. citeturn9search10turn10search0 | Yes | M | 4.1–4.3 |
| Computed progress | **ADOPT** | Trustworthy planning | GitHub/Linear | Yes | M | 4.2 |
| MADR decisions | **ADOPT** | High-value rationale | MADR, current ecosystem. citeturn9search0 | Yes | M | 4.4 |
| Verified pages | **ADOPT** | Strong market validation | Notion/Slab/Guru. citeturn0search1turn17search0turn17search3 | Yes | M | 3b.1 |
| Broken-link/orphan health | **ADOPT** | Deterministic, cheap | Docs ecosystem | Yes | S | 3b.6 |
| Duplicate detector | **TRIAL** | Guru validates category | Guru Sept. 2026. citeturn17search1 | Yes | M | New → 3b.6 |
| Agent change proposals | **ADOPT** | Market convergence | GitBook/Guru. citeturn1search13turn17search7 | Yes | Existing/M | 5.7/6.17 |
| MCP | **ADOPT** | Now mainstream agent interface | GitBook/Outline/Linear | Yes | Existing | 6 |
| OAuth | **HOLD** | Only if client compatibility forces it | Current plan already conditional | Conditional | L | 6.11 |
| Extractive Q&A | **ADOPT** | Zero-cost, private, verifiable | Product thesis | Yes | M | 7.3 |
| Exact quote verification | **ADOPT** | Major trust differentiator | Internal design | Yes | M | 7.8 |
| pgvector | **HOLD** | No measured need yet | Section 12 | Yes | L | 8.4 |
| Offline pinned docs | **TRIAL** | Useful, bounded scope | Local-first market demand. citeturn4search14turn5search3 | Yes | M | 8.3 |
| Full offline editing | **AVOID** | Merge/sync explosion | Persona does not require it | Yes | L | Section 12 |
| CRDT | **AVOID** | No real-time coediting need | Persona constraint | Yes | L | 5.10 |
| Block editor | **HOLD** | Markdown round-trip risk | Generalized products already serve it | Yes | L | 5.10 |
| Board/Gantt/timeline | **HOLD** | Low incremental persona value | Linear/Notion already specialize. citeturn10search0turn0search1 | Yes | L | 4.6 |
| Markdown ZIP | **ADOPT** | Portability trust | Obsidian/Tana patterns. citeturn3search2turn4search2 | Yes | M | 5.8 |
| Notion importer | **HOLD** | High fidelity burden | Specialized importer not needed at launch | Yes | L | 5.8 |
| AI-generated change digest | **ASSESS** | Evidence weaker than deterministic health | — | Conditional | M | idea 65-ish |
| Glossary candidates | **ASSESS** | Weak market evidence | UNVERIFIED | Conditional | M | idea 16 |
| Encrypted external backups | **ADOPT conditionally** | Free plan lacks managed backups | Supabase. citeturn20search3 | **B2 no-card UNVERIFIED** | M | 9.3 |
| Small screenshot suite | **ADOPT** | High regression value | Existing audited decision | Yes | M | 2.27 |
| Large visual-regression system | **AVOID** | Maintenance burden | Section 12 intent | Yes | L | — |
| Public publishing site | **AVOID** | Wrong persona | GitBook/Docusaurus already solve it | Yes | L | conflicts D1 |
| Passage AI labels | **ASSESS** | Revision actor may be enough | Emerging only | Yes | L | idea 63 |
| Versioned agent policy | **TRIAL** | 2026 Guru precedent | Guru. citeturn17search1 | Yes | M | 6.13 |
| `AGENTS.md` | **ADOPT** | Low-cost AI-maintenance leverage | agent-facing docs trend | Yes | S | 9.18 |
| Personal AI memory | **AVOID** | Privacy and focus mismatch | Mem is a different product thesis. citeturn5search1 | — | L | — |

**Thirty / sixty / ninety days**

**First 30 days:** complete 3.0; classify all definer functions; add Origin/Host protection; finish invite/private-access transition; mandatory TOTP/AAL2; hardened share-link implementation and tests; route/accessibility blockers; freeze an export schema before new relational features. Nothing in this month should add generic product surface.

**By day 60:** ship plan nodes, dependencies, computed progress, decision records, core starter templates and dashboard; land revision actor provenance; implement CodeMirror source/preview, optimistic versioning and three-way merge; links/backlinks; comments/suggestions.

**By day 90:** ship per-hunk review, verification events, stale/broken/orphan/duplicate health, extractive Q&A with exact-offset verification and its 40-question corpus, notification inbox, Markdown ZIP export/import. Begin MCP client-compatibility testing only after these foundations are stable.

**Risk register**

| Risk | Likelihood | Impact | Detection | Mitigation |
|---|:---:|:---:|---|---|
| Oct. 30 grants migration breaks production | M | Critical | CI privilege matrix + preview migration | Do 3.0 first |
| Anonymous data leak | L/M | Critical | signed-out matrix, share tests | explicit grants + RLS + proxy |
| Share secret leaks via browser/log | M | High | log inspection | fragment + explicit POST + cleanup |
| AI path token appears in provider logs | Known | High | function log test | 24h/read-only/per-client token |
| AI proposal accepted blindly | M | High | reversal/undo metrics | risk classes + per-hunk review |
| Verification badge becomes stale after edit | M | High | mutation test | event bound to revision |
| Q&A displays fabricated quote | L after verifier | High | planted adversarial cases | slice only stored body offsets |
| Retrieval misses paraphrased answer | M | Medium | golden set recall@6 | tune FTS; only then assess embeddings |
| Archive import zip bomb/path traversal | M | High | malicious corpus | hard caps + reject paths/symlinks |
| Markdown export cannot reconstruct project | M | High | quarterly re-import/exit test | manifest + stable IDs |
| Supabase free project pauses | M | Medium | Healthchecks + warning mail | dual external read |
| Backup exists but cannot restore | M | Critical | same-job restore | restore every backup |
| B2 account requires card | Unknown | Medium | Q27 signup test | encrypted artifact + monthly local copy |
| Gmail SMTP assumptions wrong | M | Medium | preview real-mail test | keep in-app invite link usable |
| Public GitHub artifact leaks data | M | Critical | artifact/log scan | ciphertext only |
| Dependency supply-chain compromise | M | High | lockfile/review/scanning | minimal dependencies, pinned actions |
| Accessibility works in tests but not AT | M | High | physical AT gate | NVDA/Narrator/TalkBack/VoiceOver |
| Feature catalog tempts scope creep | H | High | roadmap review | maintain HOLD/AVOID list |
| Stale content creates false trust | H over time | High | review-due dashboard | verification events |
| Duplicate knowledge diverges | M | Medium | duplicate detector | merge/link canonical page |

**Test checklist**

| Test | Passing condition |
|---|---|
| Signed-out app | No private document metadata/body returned |
| GRANT audit | `anon` lacks all private-object privileges |
| Function audit | every executable function is explicitly intended |
| Share expiry | expired secret cannot fetch any content |
| Share revocation | next fetch fails immediately |
| Restricted share | restricted doc absent, including title/count |
| Share browser storage | no shared body in localStorage/IndexedDB/cache |
| AAL2 | privileged operation fails at AAL1 server-side |
| Invite binding | different email cannot accept invite |
| Plan cycles | dependency/move cycle rejected |
| Plan depth | > configured depth rejected |
| Progress | cancelled/deferred excluded; blocked included |
| Progress empty state | “no steps,” never 0/100% |
| Decision supersession | original remains and points to replacement |
| Save race | second stale save triggers merge, never silent overwrite |
| Merge | both versions preserved on unresolved conflict |
| Revision provenance | AI/import/human actor retained |
| Verification | any later content revision becomes changed-since-verified |
| Q&A exact ID | literal identifier retrieved |
| Q&A fabricated quote | verifier refuses nonexistent text |
| Q&A stale revision | citation always names the actual stored revision |
| Q&A unanswerable | no invented answer |
| Injection corpus | document instructions do not execute or alter system behavior |
| Review rendering | remote image causes zero request |
| High-risk proposal | bulk accept unavailable; reason required |
| Import traversal | `../` archive rejected |
| Import zip bomb | emitted-byte limit terminates processing |
| Unicode collision | conflicting filenames caught before writes |
| Export round-trip | docs/plan/decisions/links survive documented subset |
| Backup | encrypted artifact decrypts and restores |
| Backup wrong key | fails closed |
| AT navigation | all core flows operable via required screen readers |
| Keyboard reorder | no drag required |
| Forced colors | selection/focus/status still visible |
| 320px layout | no required control becomes inaccessible |
| Offline pin | only explicitly pinned docs readable |
| Sign-out offline | private IndexedDB/cache deleted |
| Telemetry | no bodies/tokens/questions leaked to generic error tables |
| Public repo | CI artifact inspection finds no plaintext backup |
| Dependency install | license/release/maintainer gate completed |

**Fifteen questions still requiring an owner answer, with recommended answer**

| # | Question | Recommended answer |
|---:|---|---|
| 1 | Should 4.2 have a “doing = 25%” mode? | **No.** Keep headline completion binary. |
| 2 | Should project templates update existing projects? | **No.** Copy once; record template version. |
| 3 | Should duplicate detection use embeddings? | **No initially.** Exact title/normalized text/minhash-style deterministic methods first. |
| 4 | Should content-gap questions live longer than 90 days? | **No**, unless promoted into an explicit task. |
| 5 | Should verification expiry use one global default? | **No.** Optional per-document interval. |
| 6 | Should accepted AI edits ever automatically renew verification? | **No.** |
| 7 | Should “why changed” be AI-generated in-app? | **No.** Require it from the external proposer/client. |
| 8 | Should first release support specialized Notion import? | **No.** |
| 9 | Should first release support PDF export? | **No.** Print CSS. |
| 10 | Should B2 remain required if signup asks for a card? | **No.** Use encrypted 14-day artifact + monthly local copy. |
| 11 | Should semantic search be implemented proactively? | **No.** Only after measured golden-set failure. |
| 12 | Should AI typo auto-accept ship enabled? | **No.** Keep off by default; consider only after reversal metrics exist. |
| 13 | Should restricted docs become a full per-page ACL matrix? | **No.** One restricted flag is enough for this persona. |
| 14 | Should the app build a general public docs publisher? | **No.** Share links satisfy the stated job. |
| 15 | Should the product market itself as an AI knowledge base? | **No.** Position it as a **planning + documentation + trusted AI review workspace**; AI is a controlled participant, not the product's source of truth. |

## Self-audit, completion ledger and source appendix

**Self-audit — the ten claims most capable of changing your roadmap**

| Claim rechecked | Primary-source result | Status |
|---|---|---|
| Vercel Hobby is non-commercial | Current Vercel Hobby material explicitly restricts it to personal/non-commercial use. citeturn19search2 | **CONFIRMED** |
| Supabase Free has no managed database backups | Current backup docs reserve managed backups for paid plans. citeturn20search3 | **CONFIRMED** |
| Free Supabase projects can pause after inactivity | Current guidance still describes pause behavior around low activity/seven days. citeturn20search2 | **CONFIRMED** |
| Oct. 30, 2026 Data API defaults change | Official Supabase change notice confirms the transition. citeturn20search0 | **CONFIRMED for Data API/table change** |
| “Every new public function automatically needs the same new explicit-GRANT behavior specifically because of Oct. 30” | The broader explicit-function-grant policy is security-sensible, but this exact causal claim was not independently proven from the Oct. 30 notice in this run | **PARTIALLY CONFIRMED / retain conservative grants** |
| GitHub Actions remain free for public repos | GitHub's current materials say public-repository Actions remain free. citeturn19search9turn19search15 | **CONFIRMED** |
| Backblaze B2 satisfies “no credit card” | Free-storage economics were found, but a current definitive no-card signup statement was not established. citeturn19search10 | **UNVERIFIED — important** |
| MCP is strategically relevant to docs/work management | GitBook, Outline and Linear all shipped MCP-related functionality. citeturn1search13turn12search9turn9search6 | **CONFIRMED** |
| Verification/freshness is real market demand | Notion, Slab and Guru independently ship verification/trust features. citeturn0search1turn17search0turn17search3 | **CONFIRMED** |
| Human-reviewed agent changes are an emerging product pattern | GitBook change requests and Guru Operator provide direct current evidence. citeturn1search13turn17search7 | **CONFIRMED** |

**Research limitations**

Four things remain materially under-verified rather than guessed:

1. Backblaze B2's **current no-card signup path**.
2. The exact current source quota/name behavior of free NotebookLM/Gemini Notebook; the master plan itself marks it partly UNVERIFIED. fileciteturn0file2
3. Current 2026 pricing/maintenance details for Joplin, SiYuan and TriliumNext, included only to complete broad market coverage and **not** used to justify recommendations.
4. Independent Reddit/Hacker News/review sentiment was less complete than official product/changelog evidence. Consequently, Part B explicitly distinguishes shipped market signals from direct user complaints rather than overstating anecdotal evidence.

**Completed / remaining ledger**

Completed in this report:

- **Part A:** 42-product/project market map.
- **Part B:** 10 praised/value patterns, 10 complaint/switching patterns and missing-feature synthesis.
- **Part C:** 15 major 2025–2026 paradigms plus adoption signals.
- **Part D:** 12 emerging-paradigm assessments.
- **Part E:** exactly 30 prioritized jobs-to-be-done.
- **Part F:** **186-feature catalog**, exceeding the requested 150; each row has examples, value, effort, $0 feasibility, risk, evidence type and IN PLAN / IN IDEA / NEW dependency classification; top 40 ranked; 15 first-release capabilities marked.
- **Part G:** migration sources, formats, portability promise, fidelity/security model.
- **Part H:** exactly 25 starter templates.
- **Part I:** 10 primary differentiators plus 20 deliberate non-build decisions.
- **Part J:** free-tier/legal/terms constraints and unresolved no-card risk.
- **Part K:** six-month roadmap with moves earlier/later/delete.
- Master-plan AGREE/MODIFY/DISAGREE audit covering the product-discovery-relevant steps.
- AI-assisted maintenance audit.
- Unknown unknowns.
- 2025–2026 outdated assumptions.
- RADAR.
- 30/60/90 plan.
- Risk register.
- Test checklist.
- 15 remaining owner questions with recommended answers.
- Ten-claim self-audit.
- Source appendix below.

No numbered part was silently dropped.

**Continuation work that could add depth, but is not required to satisfy the requested minimums:** a second pass can deepen independent Reddit/Hacker News/forum sentiment; re-verify the three UNVERIFIED market-map projects; physically resolve B2/no-card if a live account test is available to you; expand the 186-feature catalog with additional 2026 niche products; and produce a more exhaustive source-by-source competitor matrix. The continuation keyword is **FORGE-CONTINUE**.

**Source appendix**

| Source | Checked / release date | Type | Used for |
|---|---|---|---|
| GeminiForge context pack | 2026-10-22 | User-supplied project state | Persona, stack, settled decisions. fileciteturn0file1 |
| GeminiForge Master Plan v2.1 | 2026-10-22 | User-supplied living plan | Step references, cuts, roadmap, constraints. fileciteturn0file2 |
| Prior research bundle | 2026-10-21/22 | User-supplied AI research, treated skeptically | Historical decisions/corrections. fileciteturn0file3 |
| Feature ideas 1–155 | supplied 2026-10-22 | User-supplied unverified idea list | IN IDEA classifications. fileciteturn0file8 |
| Notion pricing/help | checked 2026-10-22 | Vendor primary | Free plan, verification/offline. citeturn0search1 |
| Notion Custom Agents | 2026 release / checked 2026-10-22 | Vendor primary | Agent credits/usage. citeturn0search7 |
| Notion AI information | checked 2026-10-22 | Vendor primary | Complimentary AI behavior. citeturn0search11 |
| Atlassian Confluence pricing | checked 2026-10-22 | Vendor primary | Free tier. citeturn0search0turn0search5 |
| Atlassian AI credits | 2026 | Vendor primary | AI credit paradigm. citeturn0search8 |
| Docmost official/GitHub | checked 2026-10-22 | Maintainer primary | OSS features. citeturn0search6turn0search10 |
| Docmost discussion | 2026 | User/maintainer discussion | MFA paywall complaint. citeturn0search15 |
| GitBook pricing | checked 2026-10-22 | Vendor primary | Free path/features. citeturn1search0 |
| GitBook MCP/Agent docs | 2026 | Vendor primary | MCP, change requests, agent maintenance. citeturn1search13turn1search3turn1search7 |
| Coda pricing | checked 2026-10-22 | Vendor primary | Free limits. citeturn1search4turn1search11 |
| Nuclino pricing | checked 2026-10-22 | Vendor primary | Free plan. citeturn2search3 |
| Slite pricing | checked 2026-10-22 | Vendor primary | No free plan / AI positioning. citeturn2search13 |
| BookStack releases | v26.09.2, 2026-10-20 | Maintainer primary | Current activity. citeturn2search10 |
| Wiki.js repository | checked 2026-10-22 | Maintainer primary | OSS/current-development state. citeturn2search0turn2search4 |
| Obsidian pricing | checked 2026-10-22 | Vendor primary | Free local app / paid Sync/Publish. citeturn3search2 |
| Logseq repository/releases | 2025–26 | Maintainer primary | DB transition/activity. citeturn3search0turn3search8turn3search14 |
| Capacities pricing/release material | checked 2026-10-22 | Vendor primary | Free object/offline model. citeturn3search10turn3search6 |
| Anytype pricing/docs/releases | 2026 | Vendor/maintainer primary | Local-first, API/agent direction. citeturn4search4turn4search14turn4search6 |
| Tana changelog | 2026 | Vendor primary | Structured Markdown export. citeturn4search2 |
| Reflect product info | checked 2026-10-22 | Vendor primary | Pricing/privacy comparison. citeturn4search15 |
| Craft pricing/offline docs | checked 2026-10-22 | Vendor primary | Free/offline. citeturn5search2turn5search3 |
| Bear pricing/changelog | 2026 | Vendor primary | Free local notes, CLI/web direction. citeturn5search0turn5search7 |
| Mem pricing/Agent | 2026 | Vendor primary | AI-native memory/agent. citeturn5search4turn5search1 |
| Heptabase pricing | checked 2026-10-22 | Vendor primary | No permanent free path. citeturn5search14 |
| Docusaurus releases | 3.10.x, 2026 | Maintainer primary | Current docs-as-code direction. citeturn6search5turn6search0 |
| Starlight releases | 0.42.6, 2026-10-08 | Maintainer primary | Current activity. citeturn7search8 |
| MkDocs repository | checked 2026 | Maintainer primary | Maintenance state. citeturn7search5 |
| Material for MkDocs release/maintenance information | 2026 | Maintainer primary | Maintenance/EOL transition. citeturn7search0turn7search6 |
| Zensical releases/license | 0.0.67, 2026-09-30 | Maintainer primary | AI-facing docs features, MIT license. citeturn8search17turn8search9 |
| Nextra releases/license | 2026 | Maintainer primary | Current docs framework/MIT. citeturn8search1turn8search5 |
| VitePress issue tracker | 2026-05 | User/maintainer issue | Current release/Vite 8 concern. citeturn8search12 |
| Linear pricing/changelog | 2026 | Vendor primary | Free tier, Agents, MCP, Loops. citeturn10search0turn9search1turn9search6turn9search9 |
| GitHub Projects docs | 2026 | Vendor primary | Free projects, sub-issues/dependencies. citeturn10search3turn9search10 |
| GitHub task-list retirement | current docs | Vendor primary | Task-list → sub-issue shift. citeturn9search18 |
| Basecamp/Shape Up | current 2026 | Vendor/methodology primary | Hill charts/appetite. citeturn10search6turn10search8turn11search1 |
| MADR/ADR repositories | updated 2026 | Maintainer primary | Decision-record lifecycle/templates. citeturn9search0turn9search20 |
| Outline pricing/license | checked 2026-10-22 | Vendor primary | Community path, BSL licensing. citeturn13search1turn12search0 |
| Outline 2026 changelog | 2026 | Vendor primary | MCP, WebMCP, passkeys. citeturn12search9turn13search10turn13search11 |
| AppFlowy pricing/releases | 2026 | Vendor/maintainer primary | Free personal limits, active releases. citeturn15search0turn14search7 |
| AFFiNE pricing/repository/releases | 2026 | Vendor/maintainer primary | Licensing conflict, BYOK/MCP/imports. citeturn16search0turn16search5turn16search2 |
| Slab pricing | checked 2026-10-22 | Vendor primary | Free tier + verification. citeturn17search0 |
| Guru pricing/release notes | 2026 | Vendor primary | No free path, duplicate detection, agent maintenance. citeturn18search0turn17search1turn17search2 |
| Guru Operator | 2026 | Vendor primary | Accept/reject agent changes. citeturn17search7 |
| Vercel Hobby docs | checked 2026-10-22 | Vendor primary | Non-commercial rule/quotas/cron. citeturn19search2turn19search4turn19search11 |
| Supabase pricing/limits | checked 2026-10-22 | Vendor primary | DB/storage/functions/realtime quotas. citeturn19search7turn19search1 |
| Supabase inactivity docs | checked 2026-10-22 | Vendor primary | Free pause behavior. citeturn20search2 |
| Supabase backup docs | checked 2026-10-22 | Vendor primary | No managed Free backups. citeturn20search3 |
| Supabase Data API change | effective 2026-10-30 | Vendor primary | Explicit privilege migration. citeturn20search0 |
| GitHub Actions pricing/current policy | checked 2026-10-22 | Vendor primary | Public repository Actions free. citeturn19search9turn19search15 |
| Backblaze B2 pricing | checked 2026-10-22 | Vendor primary | Free-storage economics; no-card status remains unresolved. citeturn19search10 |

**Final roadmap judgment:** GeminiForge should not become a broad productivity suite. Its highest-value 2026 opportunity is to become an unusually trustworthy **structured planning + documentation system for one owner and AI collaborators**: plans are real data, decisions preserve rationale, documents remain Markdown-portable, search returns inspectable evidence, freshness is explicit, and every consequential AI change waits for a human decision. The market moved substantially toward agentic knowledge maintenance in 2025–2026, which strengthens that thesis rather than invalidating it. citeturn1search13turn17search2turn17search7