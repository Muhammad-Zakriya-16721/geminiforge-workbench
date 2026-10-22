# Audit of the ChatGPT Run 7 report (feature discovery, templates, portability, roadmap), 2026-10-22

Raw report: `docs/26a-RESEARCH-FEATURES-CHATGPT-RAW.md` (about 18,700 words). Verdict: **complete against the requested minimums and mostly well aligned with the plan, but it is a confirmation of our plan more than a discovery, its roadmap puts backups far too late, and it contains one wrong "market" claim and several UNVERIFIED rows.** I counted its structure (42 products, 10+10 patterns, 15 + 12 paradigms, 30 jobs, 186 features, 25 templates, 10 differentiators + 20 non-builds, 15 questions), checked every plan-step and idea-number citation in the 186 rows (all exist and map to the right item; one mis-mapping), and re-verified the market facts that drive decisions.

## 1. Verified TRUE (checked 2026-10-22)
| Claim | Evidence |
|---|---|
| Slab Free: up to 10 users, Verification and Unified Search included, no credit card | slab.com/pricing |
| Linear Free: unlimited members, 2 teams, 250 issues, 10 MB uploads (paid adds unlimited issues, admin roles); MCP/initiatives free-or-paid status not shown | linear.app/pricing |
| Outline is BSL 1.1 (source-available, not OSI open source) | github.com/outline/outline |
| Material for MkDocs entered **maintenance mode** (final 9.7.0, 2025-11-11, critical fixes for at least 12 months); Zensical is the stated successor. The report's "EOL" is a slight overstatement | squidfunk.github.io |
| Cloudflare Turnstile Free: up to 20 widgets, unlimited verifications, 10 hostnames per widget, 7-day analytics; the page does NOT say whether a card is needed | developers.cloudflare.com/turnstile/plans |
| GitBook MCP lets agents draft, edit pages, open change requests; edits land in a change request a human reviews and merges (changelog July 2026; Agent beta since Dec 2025 per a secondary source) | GitBook changelog via search |
| Guru Duplicate Detection exists (weekly scan after 100+ cards, similarity threshold, dismissed groups return after two weeks); Guru agents can verify/unverify and log actions | getguru.com feature pages |
| Notion Custom Agents became credit-metered on 2026-05-04 ($10 per 1,000 credits, Business/Enterprise add-on) | notion.com help via search |
| Versions: @docusaurus/core 3.10.2, @astrojs/starlight 0.42.6, vitepress 1.6.4 (2026-09-04), nextra 4.6.1 | npm |
| The master plan Section 12 really contradicts the plan: it lists "visual-regression screenshots" and "backup encryption" as cut while 2.27 and 9.3 require them (found and fixed) | our plan |
| Plan 4.2 really contains an optional "doing = 25%" toggle (the report recommends removing it) | our plan |
| All 186 catalog rows: every cited plan step exists, every cited idea number (1-155) exists and nearly always names the same feature (one wrong: F108 CRDT is mapped to idea 26, the block editor) | script comparison against docs/05 and the plan |

## 2. Wrong, overstated or weak
1. **"GitHub retired Markdown task-list tracking in favour of sub-issues" is wrong as stated.** GitHub retired the private-preview **tasklist blocks** on 2025-04-30 and pointed to sub-issues (8 levels of hierarchy); ordinary Markdown checkbox lists were not retired (changelog 2025-02-18; docs say so too). The report uses this three times (Part C, 4.1 verdict, "outdated" table). Our row-backed plan design is still right, but the evidence is "GitHub and Linear built native hierarchy", not "Markdown task lists are obsolete".
2. **Little real discovery.** 140 of 186 rows (75%) are already in the plan, 30 are in the idea list, 13 are NEW and four of those are templates. 44 rows have vague examples ("Notion-style", "team knowledge tools") and no per-row citation (only an evidence-type label). Treat the catalog as a prioritisation aid for what we already planned.
3. **"Top 40" and "first-release 15" are groups, not features**: ranks 1-40 are capability groups (a few with no catalog row, e.g. "dashboard aggregation"); the 15 first-release groups cover 33 rows and amount to Phases 3, 4, 5 and 7 together, not a small first release.
4. **Rubber-stamp risk in the plan challenge**: of about 100 verdicts almost all are AGREE; only 3.13, 3b.5, 4.2 (25% toggle), 4.5, 6.10 are MODIFY/DISAGREE. The real challenge happens in sections 3 and 4 below.
5. **Part B (user voice) is thin**: the report admits Reddit/Hacker News evidence was incomplete; complaints are mostly inferred from product moves. Do not use Part B as proof of demand.
6. **UNVERIFIED rows**: Joplin, SiYuan, TriliumNext (marked by the report), Confluence Free limits (the page did not load for me), Guru "no durable free plan", Guru "Operator accept/reject" and "September 2026" (I found Guru's duplicate detection and verification agents but not Operator), Notion verified pages on Free (one source says Business plan and up; the report counts it as market validation), BookStack v26.09.2, Zensical 0.0.67, AFFiNE licensing (the report itself says CONFLICTING), Docmost MFA complaint. None drives a plan decision.
7. **Roadmap defects**: backups, keep-alive and the Oct-30 follow-ups are placed in March-April ("resilience/polish") although the project holds real data with no backup and can pause (docs/22); 3b.1 is both "move earlier" (list) and "move to Jan-Feb" (table); Phase 2 polish and Phase 9 items 9.2/9.3/9.5/9.16 are missing from the first 90 days; "first 30 days" contains sharing, accounts, TOTP, accessibility and the MCP check together, which is not realistic for one developer.
8. The executive summary is about 495 words (limit 400), the jobs table has 5 of the 9 requested fields, Part K has 8 rows. Minor.

## 3. Adopted (changes to the master plan)
1. **Fix Section 12** (verified contradiction): "visual-regression screenshots" becomes "a LARGE visual-regression/design-system suite (a 10-20 screenshot set stays in 2.27)"; delete "backup encryption" (9.3 requires it).
2. **4.2**: delete the optional 25% "doing" mode; headline completion is binary over leaf steps; `doing` is an explicit state shown beside it.
3. **3b.1**: optional per-document review interval (no global default); accepted AI edits never renew verification (already stated, now a test); derived states: verified / changed since verified / review due / known stale (explicit "this is wrong now") / not reviewed.
4. **3b.5**: build only after the dashboard exists; views are a weak freshness hint.
5. **3b.6**: add a deterministic duplicate detector: normalized-title and normalized-text hash first, optional `pg_trgm` later, no embeddings (Guru precedent; threshold and weekly scan are tunable).
6. **4.5 templates**: copy-on-create, no variables, scripting or marketplace; each project records `template_id` + `template_version`; existing projects never change automatically; ship the first six (master plan, software build plan, ADR/MADR, runbook, release plan, meeting notes) and keep the other 19 (appendix A) for demand.
7. **5.8**: our hostile-archive defences already cover the report's whole table; add the export layout and manifest (`manifest.json` with `schema_version`, stable ids, document order, plan/decision references, asset hashes, original filenames; `documents/<stable-id>-slug.md`, `plans/plan.md` + `plan.json`, `decisions/D-0001.md`, `assets/`, `README-EXPORT.md`), known-scalar frontmatter only, and the portability promise: "your document text, hierarchy, plan, decisions, internal references and portable metadata export without a proprietary format; security logs, permissions, notifications and third-party editor features are not guaranteed to round-trip".
8. **6.10**: alert first; auto-pause only after real false-positive data.
9. **3.13**: Turnstile Free = 20 widgets, unlimited verifications, 10 hostnames; whether signup needs a card is UNVERIFIED (check when creating the widget).
10. **Product thesis (added to the plan header)**: "A private planning-and-documentation workspace where every important statement, decision and AI edit stays inspectable, attributable and portable." Not a Notion clone (no databases, boards, live co-editing, block editor, generic automation); not marketed as "an AI knowledge base".
11. **Section 12 additions** (all consistent with owner decisions): public docs-site generator, generic database builder, workflow automation builder, plugin marketplace, executable docs, personal AI memory, light/auto themes (D6), graph visualisation, AI-generated change digest and glossary candidates (ASSESS only), JSON/HTML export (only the manifest JSON is built).
12. **Acceptance tests**: the report's 40-item product test list is kept as appendix B and referenced from plan item 9.19.

## 4. My changes to the report's roadmap (adopted as the build order v2.2)
| When | Block | Content | Why |
|---|---|---|---|
| By 2026-10-29 | **Safety gate** | 3.0 grants migration (needs your OK, it writes to the live DB), classify the 28 definer functions, 3.4 anon matrix | hard platform deadline 2026-10-30 |
| Weeks 1-2 | **Survival + hardening** | 9.2 keep-alive, 9.3 encrypted backup + same-job restore, 9.5 CI/supply-chain basics, 9.16 Oxlint + `tsc`, 6.14/6.15 MCP Origin check and IP pseudonym, 2.40-2.42/2.44 small accessibility fixes | no backup exists today; the project can pause; all are S/M and unblock safe work (backups need your steps Q26-Q29) |
| Weeks 3-6 | **The product: planning core** | 4.1-4.4 plan nodes, progress, dependencies, decisions; 4.5 six templates; 4.7 dashboard shell; 3b.8 actor provenance together with the revision schema | this is the differentiator and your actual use |
| Weeks 6-10 | **Authoring and review** | 5.1/5.2/5.4/5.5/5.6 editor, versioned save, links; 5.7 per-hunk review + 6.17 risk classes; 3b.1 verification; 3b.6 link/orphan/duplicate health | trust loop |
| Weeks 10-14 | **Answers or sharing (Q40)** | 7.3-7.9 extractive Q&A + quote verifier + golden set; OR 3.5-3.11 share links + 3.13/3.14 accounts and TOTP when the first outside reader/collaborator is needed | order depends on who needs the app first |
| Weeks 14-18 | **Portability and AI governance** | 5.8 ZIP + manifest, 6.x token UX, 8.1-8.3 filters and pinned offline, accessibility gate 2.46 | after the core is stable |
| Throughout | **Quality gates** | pgTAP, Vitest, Playwright, axe, ARIA snapshots, restore drills | release gates, not cleanup |
Not before 3.0: 9.14 React 19 upgrade and any new table. The report's "delete from six-month scope" list is adopted as HOLD/AVOID in Section 12.

## 5. Open questions for the owner (recommendation first)
- **Q40** Order after the safety and survival blocks: planning core first (my recommendation, because you are the only user for now and this is the product) or sharing/accounts first (needed when the first outside collaborator joins)?
- **Q41** Accept the report's 15 recommended "No" answers as decisions D19 (adopted into the plan above): no 25% doing mode; templates never auto-update; no embeddings for duplicates; 90-day question retention; per-document review interval; accepted AI edits never renew verification; "why changed" must come from the proposer; no Notion importer first; no PDF engine (print CSS); B2 optional (artifact + manual fallback); no semantic search until measured failure; typo auto-accept off; one restricted flag (no per-page ACL matrix); no public docs publisher; position as planning + documentation + trusted AI review, not "AI knowledge base"? Recommended: yes.

## Appendix A. The 25 starter templates (from the report; copy-only, variable-free)
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

## Appendix B. Product acceptance test list (from the report; plan item 9.19)
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
