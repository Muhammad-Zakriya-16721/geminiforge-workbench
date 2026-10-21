# MASTER PLAN v2: GeminiForge documentation workspace (living document)

v1 written 2026-10-21 morning. **v2 rewritten 2026-10-21 after six sourced research passes** (docs/10, 13-18). `[x]` = done and tested, `[~]` = partly, `[ ]` = not started, `[?]` = waiting for the owner. Tags: **Q** = question for the owner (my recommendation given), **D** = decision made, **OWN** = only the owner can do it, **S/M/L** = effort (small: under a day, medium: 1-3 days, large: more), **(docs/N)** = where the evidence is. Facts marked UNVERIFIED in the research docs stay unverified here.
Superseded by this file: docs/03-ROADMAP-NEXT.md, docs/ROADMAP.md. Older lists kept for reference: docs/05 (155 ideas), docs/08 (audit).

## 0. State (v0.7.0)
Live: https://geminiforge-workbench.vercel.app (auto-deploys from `main`). Supabase `plbvgcnyfclillatpowc` (free plan). Tests: qa-ai 152, qa-content 12, prodcheck 101, MCP offline 33, invitation email 9, SQL matrix. Phase 1 and 2 below are done.

## 1. What the research changed (read this first)
1. **Supabase changes Data API grants on 2026-10-30 (9 days away).** New `public` tables will no longer be granted to anon/authenticated/service_role automatically; a migration that creates a table without explicit `GRANT` fails with 42501. Rule from now on: every new table migration contains its GRANTs and RLS in the same file. (docs/16)
2. **Phase order changes.** Verify client compatibility (Claude Code, Cursor, claude.ai, Gemini app) BEFORE building OAuth; header tokens first, path tokens only for the Gemini app, read-only, 24 h by default. (docs/14)
3. **Ask-the-docs: use Anthropic Haiku 5.5 with Citations (about 1-3 USD per month) + Postgres full-text search; do not rotate five free OpenRouter accounts** (terms 7(3), pointless). Remove the "5 keys rotation" line from docs/06. (docs/15)
4. **Editor: CodeMirror 6 (Markdown source + preview), not a WYSIWYG editor**; save with a version column and 3-way merge, not a CRDT. (docs/17)
5. **Planning layer: rows are the source of truth, Markdown is rendered; progress is computed, never stored.** (docs/13)
6. **New high-value items from the benchmark**: verified/owner/review-by pages, notification inbox, content-gap list, request-access, share-link hardening. (docs/18)
7. **Survival items on the free plan**: backups do not exist unless we build them; the project pauses after 7 days of no user database activity (in-database cron may not count); Hobby cron runs once per day. (docs/16)
8. **Corrected assumption**: TOTP two-factor sign-in is free on all Supabase plans (only phone MFA is paid; leaked-password protection is Pro). Earlier notes said "no MFA on free": **Q15**, confirm in the dashboard.
9. **Cut or defer** a long list for a solo owner (section 12).

## PHASE 1: Foundations (DONE)
- [x] 1.1 Reader app, answer engine, notes, backups, labs, Canvas single-file build
- [x] 1.2 Supabase sync, runtime content bundle, Realtime live updates
- [x] 1.3 MCP server (Edge Function `docs-mcp`), tokens, audit log, kill switch, Gemini path token tested
- [x] 1.4 AI space: Review inbox, diffs, risk flags, side panel, undo; Trash with timer (default: keep until deleted by hand)
- [x] 1.5 CI (GitHub Actions) with browser tests; Vercel deploy
- [x] 1.6 Organizations > Projects, roles, invitation links, RLS matrix, project switcher

## PHASE 2: Workspace UI v2 (DONE 2026-10-21; polish list below)
- [x] 2.1 Start address = Organizations page (cards/list, search, role filter, sort, create/rename/delete/restore)
- [x] 2.2 Soft delete for organizations (delete_org, restore_org, purge_org; Deleted tab; typed name; Undo)
- [x] 2.3 Organization page: Projects / People / Invitations / Activity / Settings; archived projects restore or delete for good
- [x] 2.4 Invite always reachable (header button, project page, Ctrl+K, Invitations tab)
- [x] 2.5 Project home with all documents and the question bar
- [x] 2.6 Breadcrumbs app > organization > Projects > project > page with switchers
- [x] 2.7 Custom animated dropdowns replace every native select
- [x] 2.8 Compact hover/click areas app-wide (one density rule set)
- [x] 2.9 Sidebar groups (Project, Chapters, Pinned, Questions, Review, Manage); top level lists organizations and projects
- [x] 2.10 Account menu rebuilt (narrow, no search)
- [x] 2.11 One search (Ctrl+K) with scopes, prefixes `>` `#` `@`, recents, finds added pages
- [x] 2.12 Header actions: search, review-inbox bell, pin, "…" menu
- [x] 2.13 Sign-in card on the start page; invitation page asks to sign in first
- [x] 2.14 Invitation email (animated header GIF, CSS animation for Apple Mail/iOS/Samsung, works everywhere, plain-text part) + `/api/invite` + rate limit 20/hour 60/day per organization
- [x] 2.15 Tests for all of the above
- Polish (keep small; research says several of these are low value for a solo owner)
  - [ ] 2.16 S In-app "preview the email" button (sample exists at /email/invite-preview.html)
  - [ ] 2.17 S Resend / re-create an invitation from the Invitations tab
  - [ ] 2.18 S Invitee sees pending invitations after sign-in **Q12**
  - [ ] 2.19 S Breadcrumb "…" overflow menu for hidden middle crumbs
  - [ ] 2.20 S Palette: highlight matched letters, recent searches, Ctrl+Enter new tab
  - [ ] 2.21 S Favourites (table user+doc) at the top of lists; recents stay in localStorage (docs/18 #11)
  - [ ] 2.22 S Display name per person (lists show emails today)
  - [ ] 2.23 DEFERRED move project across organizations (export/import covers it)
  - [ ] 2.24 S Transfer ownership; explain "last owner cannot leave" in the UI
  - [ ] 2.25 DEFERRED keyboard chords; 2.27 DEFERRED visual-regression screenshots; 2.28 DEFERRED logos/accents
  - [ ] 2.26 M Phone: bottom bar, test every page at 360 px
  - [ ] 2.29 M Notification inbox (see 3b.2)
- Owner checks (OWN)
  - [?] 2.30 Real two-account invitation test (Invite > link > private window > sign in as that address > Accept)
  - [?] 2.31 Turn on email sending (section 13)

## PHASE 3: Private by default and sharing (P5-V) — do before any new table work
D1: only signed-in users see docs; public only through deliberate share links.
- [ ] 3.0 S **Grants rule** for every new table: GRANT in the same migration, nothing to `anon` on private tables; matrix asserts `has_table_privilege('anon', t, 'select')` is false and `has_function_privilege('anon', f, 'execute')` is false (docs/16). Lands before 2026-10-30.
- [ ] 3.1 M `get_content_bundle` requires a signed-in member (or a valid share link)
- [ ] 3.2 S Sign-in as the first screen (the start page already shows a card; the spec is still reachable by address until this step)
- [ ] 3.3 M MCP: anonymous tools return nothing; every AI client uses a token
- [ ] 3.4 S Project `geminiforge` set to `private`; check every table, RPC and MCP tool as `anon` (RLS behaviour AND grants)
- [ ] 3.5 M `share_links` (project or document, expiry, revoked, hashed secret, constant-time compare, rate-limited lookup RPC, expiry enforced in the RPC) + route `#/s/<secret>`; `noindex`, `Referrer-Policy: no-referrer` on that route only; payload contains NO editor ids or emails (Notion leak, docs/18); view count + last viewed per link
- [ ] 3.6 S Who may make a project public/unlisted: only organization owners/admins **Q1**
- [ ] 3.7 M Tests: anon gets nothing; share link works until revoked or expired; drafts, Trash, exports, search and comments are not readable by outsiders (BookStack lesson, docs/18)
- [ ] 3.8 S RLS rules: `(select auth.uid())`, `to authenticated` on every policy, index every policy column, no `user_metadata`, `security_invoker` views; run advisors after each migration and fail CI on ERROR (docs/16)
- [ ] 3.9 Confirm with the owner before switching (the site stops working for signed-out visitors) **Q3**
- Research: docs/16 (limits, grants), docs/18 (share-link risks)

## PHASE 3b: Trust and health (new, from the benchmark)
- [ ] 3b.1 M **Verified pages**: owner_id, verified_by, verified_at, verified_until, review_every_days, reviewed_rev; badge, filter, "changed since verified" diff; an AI-accepted edit does NOT renew the review; any later edit flips to "changed since verified"; no bare "still accurate" button (docs/13, docs/18 #1)
- [ ] 3b.2 M **Notifications** table (AI edit waiting, verification due, mention, role change, request access) over Realtime; the bell shows it; no email digest (Q10)
- [ ] 3b.3 S Daily job (pg_cron) flips expired verifications and inserts notifications (max 8 jobs, each under 10 minutes)
- [ ] 3b.4 S **Request access** button + a `restricted` boolean per document (editors/managers only) instead of full per-page permissions
- [ ] 3b.5 S Page views: `doc_view_daily(doc_id, day, count)` upsert RPC (no per-view rows); 30-day views, last viewed, "unread 90 days" staleness signal
- [ ] 3b.6 S In-app link check on save (`doc_links`: broken links, orphans, duplicate titles); markdownlint warnings only (MD001, MD024, MD051-053)
- [ ] 3b.7 S lychee on exported Markdown in CI on a schedule (not every push)
- [ ] 3b.8 S `revisions.actor_kind` (human | ai-token | import) with the token name; keep last N revisions plus every verified one; optional reason on delete
- [ ] 3b.9 S Content-gap list: log every question with no verbatim quote found, with a count; top ten on the dashboard (after phase 7)

## PHASE 4: Core product: master file, phases, steps, decisions (design in docs/13)
- [ ] 4.1 M Tables `plan_nodes` (adjacency list `parent_id`, `kind` phase|step, depth ≤ 4, fractional `position` text COLLATE "C", status todo|doing|done|blocked|cancelled|deferred, weight int default 1, rev, `on delete restrict`), `plan_edges` (blocked_by, cycle-rejecting trigger), `decisions` (MADR fields, never renumbered), `decision_links`; RLS inherits from `project_id`; GRANTs in the same migration (3.0)
- [ ] 4.2 M Progress as a SQL view/RPC, never stored: only leaf steps count; cancelled/deferred leave the denominator; blocked stays and shows a red count with its reason; `doing` counts 0 (optional 25% toggle); empty container shows "no steps"; round down so 99.6% never shows 100%; show n/m, "+N steps added" (baseline when a phase starts), next step
- [ ] 4.3 M Master file view: auto-index of phases with progress; phase view with steps/sub-steps and check marks; dependencies ("waiting on D-0012")
- [ ] 4.4 M Decision log (MADR 4.0): proposed > accepted > deprecated | superseded | rejected; accepted records change only status and supersession; `[[D-0012]]` links; accepting offers to unblock linked steps; `review-by` feeds the stale list
- [ ] 4.5 S Templates: software, research, course, trip, "this master plan" (import via status-character map `x` done, `~` doing, `?` blocked "waiting on owner"); `is_template` flag + "New from template" copy, no variables yet
- [ ] 4.6 S List view only first; board, timeline and ICS DEFERRED
- [ ] 4.7 S Project dashboard: open steps, blocked steps, waiting AI edits, stale pages, content gaps
- [ ] 4.8 M AI proposals never write plan tables: ops `{set_status|move|insert|retitle|edit_notes, node_id, base_rev, value}` go to the Review inbox; accept only if `rev = base_rev` (else stale); AI creates decisions only as `proposed`; check marks are never auto-applied; moves validated for cycles and depth
- [ ] 4.9 S Q9 decide whether this master plan becomes the first project (template)

## PHASE 5: Editor: owner edits everything (docs/17)
- [ ] 5.1 M **CodeMirror 6** Markdown editor with `react-markdown` preview (split or toggle); front matter via `remark-frontmatter`; math (KaTeX) and Mermaid lazy-loaded; sanitize after the last unsafe step; fix-up for `user-content-` id prefix in block anchors; test Urdu/bidirectional text
- [ ] 5.2 M Save with a `version` column (`update … where version = base`); on conflict 3-way merge (`node-diff3`), remaining conflicts shown as a diff; keep BOTH versions on conflict; Supabase Presence only for a soft "X is editing" banner; no offline writes in v1
- [ ] 5.3 L Edit generated spec pages and chapters; migrate derived spec documents to native documents (docs/01 step 6)
- [ ] 5.4 M Add / remove / move / rename chapters and sections; drag-and-drop order (fractional keys)
- [ ] 5.5 M Revision compare of any two versions (`diff` jsdiff 9); restore one paragraph
- [ ] 5.6 M Internal links `[[kind:slug]]` (small micromark/remark plugin, keyed on ids), backlinks panel
- [ ] 5.7 M Per-hunk accept in the Review inbox with `@codemirror/merge` (`unifiedMergeView`, `acceptChunk`/`rejectChunk`); human "suggest" edits from viewers also go through the inbox; comments carry an anchor quote + resolved flag, no threads yet
- [ ] 5.8 M Import/export: Markdown zip in and out first (fflate in a Worker with entry/size/ratio caps, reject `..`/absolute paths); Notion export zip later (strip 32-hex id suffix, rewrite links); .docx later (mammoth > sanitize > turndown, never mammoth Markdown); Obsidian export with standard links; keep zip export working at all times
- [ ] 5.9 S Images only (Supabase 1 GB bucket, 50 MB file cap); other attachments DEFERRED
- [ ] 5.10 DEFERRED Tiptap block editor (ship later behind a round-trip gate: parse > serialize > compare, else source mode), inline live-preview decorations, CRDT (Yjs/Hocuspocus/Liveblocks/Automerge), Mermaid sandbox, PDF export (use print CSS)

## PHASE 6: AI space v2 and token safety (docs/14) — re-ordered
- [ ] 6.1 S **Verify the MCP with Claude Code, Cursor, claude.ai connectors and the Gemini app FIRST** (only Gemini is tested today) **Q5**; then make `header` the default token kind and `path` the exception
- [ ] 6.2 S **Sanitise the Review inbox**: no remote images, link targets shown as text, diffs as plain text (exfiltration through rendering; Notion AI lesson)
- [ ] 6.3 S Token format `gfk_…` + CRC32 base62 checksum, last 4 characters shown, gitleaks rule in CI
- [ ] 6.4 M Two token kinds, path tokens read-only with 24 h default expiry, one per client, revoked on rotation; rotation with overlap
- [ ] 6.5 M Per-token tool and document allow-lists; static tool descriptions; expose a hash of the tool list; token templates (Reader, Typo fixer, Writer)
- [ ] 6.6 S Per-token usage panel (last used, call count, documents touched, from the audit log); MCP tool `report_issue(doc, text)` lands in the Review inbox
- [ ] 6.7 M Review friction: a reason is required to accept high-risk drafts, no bulk accept for them; auto-accept only a narrow class (typo fixes by a named token template), off by default
- [ ] 6.8 M Data protection: purge or hash invitee email after accept/expiry, per-person export and delete, log retention period, no tokens or IPs in logs
- [ ] 6.9 S Append-only audit log + CSV export; weekly head hash emailed to an external mailbox (anchoring) — hash chain/replay DEFERRED
- [ ] 6.10 S Keep the kill switch and per-token limits; anomaly alerts and auto-pause only if cheap
- [ ] 6.11 M OAuth stage ONLY if 6.1 shows a client needs it: Supabase OAuth 2.1 server is a public beta with full-privilege user tokens; needs DCR enabled, a consent page (client name, exact redirect URI, CSRF, anti-framing), RESTRICTIVE RLS for `client_id IS NOT NULL`, an access-token hook setting/checking `aud`, 401 + `resource_metadata` from the Edge Function, manual tokens kept as fallback
- [ ] 6.12 L Support MCP spec 2026-07-28 (stateless, `server/discover`, `ttlMs`) once the clients you use adopt it
- [ ] 6.13 S Per-project retention of activity and AI policy
- DEFERRED: two-person approval; GitHub secret-scanning partner programme

## PHASE 7: Ask-the-docs (docs/15)
- [ ] 7.1 S Decide **Q8/Q14**: Anthropic prepaid with a 5 USD monthly cap in its own workspace (no free tier for private docs, no key rotation)
- [ ] 7.2 S Key stored only as an Edge Function secret through the Supabase dashboard; rotate any key ever pasted in chat
- [ ] 7.3 M Chunks by heading (h2/h3, ≤ 600 tokens, offsets stored) + FTS (generated tsvector, GIN, `websearch_to_tsquery`, heading weight A, `simple` config for Urdu — test)
- [ ] 7.4 M One Edge Function: JWT + membership check, per-user (~30/day) and global (~300/day) limits in `ai_usage`, caps (question 500 chars, context ~6k tokens, max_tokens ~600), cache by hash(question, project, content version), no tools, retrieval under the caller's RLS
- [ ] 7.5 M Verbatim quote check on every answer: NFC + whitespace/quote/dash normalisation, quote must be a contiguous substring of a retrieved chunk, 6-80 words, display text from our database by offsets, retry once, else "No verified answer"; plain-text rendering only, links only to our heading anchors; show the source next to each answer
- [ ] 7.6 M 40-question golden set (24 single-page incl. 8 exact strings, 6 two-page, 4 paraphrases, 6 unanswerable, 2 injection) + metrics (recall@6, quote validity 100%, correctness ≥ 90%, refusals 6/6, false refusals ≤ 10%); re-run on every change
- [ ] 7.7 S Trust boost: verified pages rank higher; cited quotes marked verified/unverified; option "verified documents only"
- [ ] 7.8 S Gemini paid fallback behind the same function; pgvector only if recall@6 < ~90% (gte-small is English-only and truncates at 512 tokens)
- Zero-cost reading aid: NotebookLM ("Gemini Notebook", 50 sources free) cannot be called from the app; Gemini app custom MCP app is US/English/personal-account only (docs/15)

## PHASE 8: Reader and search
- [ ] 8.1 M Stable block anchors + copy link; search filter chips (project, kind, verified, owner, labels); keyword search only until the 40-question set fails
- [ ] 8.2 S Reading position memory, changed-since-I-read markers
- [ ] 8.3 M Offline READ cache only: vite-plugin-pwa precaches the app shell; allow-listed pinned documents in IndexedDB (Dexie); on sign-out delete IndexedDB, caches and the service worker; do not cache API responses; test Safari's 7-day rule on your phone
- [ ] 8.4 DEFERRED semantic search, listen, focus mode, split view
- [ ] 8.5 S Single-key shortcut toggle (WCAG 2.1.4), contrast controls

## PHASE 9: Operations, quality, survival (docs/16)
- [x] 9.1 CI runs typecheck, build, browser suites, MCP offline tests
- [ ] 9.2 S **Keep-alive**: daily Vercel cron to a function that reads a tiny table through PostgREST + a GitHub Actions schedule as second source (public-repo schedules self-disable after 60 days without activity); route the pause-warning email to a mailbox you read
- [ ] 9.3 M **Backups**: nightly Actions job `supabase db dump --db-url <session pooler>` (roles, schema, data `--use-copy`), upload as private artifact/release asset (not git commits), fail if empty or schema-only; Storage bucket exported separately; weekly **restore drill** into a throwaway Postgres + row counts (Atlassian lesson: test restore); encryption DEFERRED until backups leave a private repo
- [ ] 9.4 S Headers in `vercel.json`: CSP (start Report-Only; must allow our Supabase host and Google Fonts), `Referrer-Policy`, `nosniff`, `Permissions-Policy`, HSTS, `frame-ancestors 'none'` (HTTP header only)
- [ ] 9.5 S Dependabot (npm + github-actions weekly), `npm audit --omit=dev` + osv-scanner, gitleaks-action; Playwright artifacts retention 7 days, traces only on failure
- [ ] 9.6 S Edge Function + migrations deployed from CI (scoped token, `supabase/setup-cli`, `db push --dry-run` first)
- [ ] 9.7 M pgTAP (`supabase test db`) next to the live DO-block matrix; axe in CI via @axe-core/playwright (wcag2a/aa, 21a/aa)
- [ ] 9.8 S Monitoring: free uptime ping of the MCP address; errors logged to a small table (Vercel runtime logs last 1 hour on Hobby)
- [ ] 9.9 M Migrate legacy anon/service_role JWT keys to `sb_publishable_`/`sb_secret_` before end of 2026 (pg_net/webhooks then need the secret key in the `apikey` header)
- [ ] 9.10 S Hobby is non-commercial: no payments/ads/paid hosting (check phase 11 ideas); Pro (Supabase 25 USD, Vercel 20 USD) is the real fix for pausing/backups if the project grows
- [ ] 9.11 S Code-split the app (500 kB+ bundle warning), lazy-load labs and the answer engine
- [ ] 9.12 S Decide the Canvas single-file build **Q4** (it has none of the cloud features)
- [ ] 9.13 DEFERRED domain + Resend; restructure R0 (folder layout) after features settle

## PHASE 10: Content corrections (after the app is finished, per owner)
- [ ] 10.1 Decide claims A1-A13 in docs/claims_ledger.md (or "apply all suggested actions")
- [ ] 10.2 Re-audit the GeminiForge documents; separate Gemini deep-research runs for that (not in docs/12)

## PHASE 11: Optional (docs/05, pick later; each needs its own research; Hobby is non-commercial)

## 12. Cut or deferred (and why)
Two-person approval; hash-chain/replay audit; OAuth server (unless 6.1 proves a client needs it); pgvector; board/timeline/ICS; non-image attachments; move project across organizations; keyboard chords; visual-regression screenshots; logos/accents; domain + Resend; listen/focus/split view; four importers at once; backup encryption; CRDT; Tiptap block editor; offline writes; Notion link-graph reconstruction; PDF export; GitHub secret-scanning partner programme. Reasons: a solo owner on free tiers; most of these are Enterprise-tier features elsewhere (docs/18).

## 13. Turn on invitation email (OWN, about 5 minutes)
The website cannot send mail by itself. Supabase's built-in mail reaches only your own team's addresses (2 per hour); Resend's test sender reaches only your own address (docs/10, docs/16). `/api/invite` is deployed and already creates invitations; it emails as soon as it finds two settings.
1. Use a dedicated Gmail account; turn on 2-Step Verification. 2. Create an **app password** (Google Account > Security > App passwords; 16 letters). 3. Vercel dashboard > geminiforge-workbench > Settings > Environment Variables: `GMAIL_USER`, `GMAIL_APP_PASSWORD` (Production, sensitive); redeploy. 4. Open an organization > Invite; the checkbox "Email the invitation now" turns on. Never paste the password into chat or code.
Limits: Gmail about 500/day (third-party figure); the app allows 20/hour and 60/day per organization. UNTESTED against a real mailbox until you add the settings. Edge Functions block ports 25/587, which is why the sender runs on Vercel.

## 14. Questions for the owner (recommendation first)
- **Q1** Who may make a project public/unlisted? Only organization owners/admins.
- **Q2** May any signed-in user create an organization? No, only you for now.
- **Q3** When do we switch to "only signed-in users see docs"? Right after the first real two-account invitation test; note 3.0 (grants) lands before 2026-10-30 regardless.
- **Q4** Keep the Canvas single-file build? Freeze it.
- **Q5** Which AI clients besides Gemini matter (Claude Code, Cursor, claude.ai, ChatGPT)? This decides token kinds and OAuth (6.1).
- **Q6** Dark only? Yes (earlier decision).
- **Q7** Email: Gmail app password now (recommended) or buy a domain first?
- **Q8 (resolved by research)** No key rotation. Q14 below replaces it.
- **Q9** Should this master plan become the first project in the app?
- **Q10** Notifications only inside the app (recommended) or also a daily email?
- **Q11 (recommend: skip)** Moving a project across organizations.
- **Q12** Show people their pending invitations after sign-in? Yes.
- **Q13** What does "Argon High" in your Gemini app refer to? Send a screenshot of the picker.
- **Q14** Ask-the-docs: OK to open an Anthropic API account with a 5 USD monthly cap (about 1-3 USD/month expected)? Free tiers are not safe for private docs.
- **Q15** Turn on TOTP two-factor sign-in for your login (free per the docs, confirm in the dashboard)?
- **Q16** OK to add a daily keep-alive ping so the free project does not pause? (Supabase states no policy against it; Pro is the alternative.)
- **Q17** Do you want "verified pages" (owner + review date + badge)? Recommended: yes, it is the most valuable gap found.
- **Q18** Is a Markdown source editor with preview acceptable (not WYSIWYG)? Recommended; a block editor can come later.
- **Q19** Backups to a private GitHub repo artifact store: OK? (no encryption at first)

## 15. Decisions already made (do not re-ask)
D1 only signed-in users see docs, public only via share links. D2 English UI only (Urdu text inside documents stays possible). D3 invited-only access: members see only invited projects; org owners/admins see all. D4 Trash default: keep until deleted by hand, timer per project. D5 multiple projects are a main feature; everything editable. D6 content corrections after the app is finished. D7 secrets never in chat/code/git; keys enter through dashboards. D8 free Supabase plan (no leaked-password protection). D9 daily research task deleted. D10 start address opens the Organizations page.

## 16. Research map
Done by Claude with sources: docs/10 (UI, email, Gemini, file hand-over), 13 (planning layer, decisions, health), 14 (MCP security, tokens, OAuth, review), 15 (ask-the-docs), 16 (Supabase/Vercel/GitHub limits, ops), 17 (editor, collaboration, offline, Markdown, import/export), 18 (workspace benchmark). Remaining Gemini deep-research prompts: docs/12 (status table at the top).
