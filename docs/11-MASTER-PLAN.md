# MASTER PLAN: GeminiForge documentation workspace (living document)

Created 2026-10-21. One place for every phase, step, sub-step, question, decision and improvement. Update the checkboxes as work is verified. `[x]` = done and tested, `[~]` = partly, `[ ]` = not started, `[?]` = waiting for the owner. Sources for facts: docs/09 (trash and invited access research), docs/10 (UI, email, Gemini, file hand-over research, 2026-10-21), docs/08 (audit), docs/03 (older roadmap, superseded by this file), docs/05 (155 feature ideas, NOT verified market research), docs/claims_ledger.md.

How to read the tags: **Q** = question for the owner (with my recommendation), **D** = decision already made, **R** = deep-research prompt in docs/12, **OWN** = something only the owner can do.

---
## 0. Where we are (2026-10-21, v0.7.0)
Live: https://geminiforge-workbench.vercel.app (auto-deploys from `main`). Supabase project `plbvgcnyfclillatpowc`. Tests: qa-ai 152, qa-content 12, prodcheck 101, MCP offline 33, SQL matrix (rls-matrix.sql), Canvas build compiles.

## PHASE 1: Foundations (DONE)
- [x] 1.1 Reader app, answer engine, notes, backups, labs, Canvas single-file build
- [x] 1.2 Supabase sync, runtime content bundle, Realtime live updates
- [x] 1.3 MCP server (Edge Function `docs-mcp`), tokens, audit log, kill switch, Gemini path token tested
- [x] 1.4 AI space: Review inbox, diffs, risk flags, side panel, undo; Trash with timer (default: keep until deleted by hand)
- [x] 1.5 CI (GitHub Actions) with browser tests; Vercel deploy
- [x] 1.6 Organizations > Projects, roles, invitation links, RLS matrix, project switcher

## PHASE 2: Workspace UI v2 (this round, 2026-10-21)
Source of the requests: owner message 2026-10-21; research in docs/10 section A.
- [x] 2.1 **Start address = Organizations page** (cards or list, search, role filter, sort, remembered layout, New organization for the super administrator, card menu: open / rename / delete)
- [x] 2.2 **Soft delete for organizations** (DB: delete_org, restore_org, purge_org; Deleted tab; typed name to delete for good; Undo toast)
- [x] 2.3 **Organization page**: tabs Projects / People / Invitations / Activity / Settings; project cards with search, visibility filter, sort, layout; New project dialog; archived projects with Restore and Delete for good; rename and delete in Settings; Leave for members
- [x] 2.4 **Invite is always reachable**: header button on organization and project pages, palette action "Invite someone", Invitations tab
- [x] 2.5 **Project home** shows all documents (chapters, added pages) and the question bar for the spec project
- [x] 2.6 **Breadcrumbs** app > organization > Projects > project > page, each crumb clickable, switchers on organization and project crumbs, collapse to the last three on narrow screens
- [x] 2.7 **Custom animated dropdowns** (`Select`, `ActionMenu`) replace every native select; keyboard, type-ahead, Escape, works inside dialogs
- [x] 2.8 **Compact hover/click areas**: one density rule set (30 px rows, 7 px radius, inset) applied to sidebar, menus, palette, settings tabs, buttons
- [x] 2.9 **Sidebar reorganised**: collapsible groups (Project, Chapters, Pinned, Questions, Review, Manage), remembered; at the top level it lists organizations and projects
- [x] 2.10 **Account menu** rebuilt: email, Settings, help, shortcuts, release notes, backup, sign out; narrower than the sidebar; no search inside
- [x] 2.11 **One search** (header pill, Ctrl+K): scopes All / Documents / Questions / Notes / Projects / Actions, prefixes `>` `#` `@`, recents on empty query, finds added pages in the AI space
- [x] 2.12 **Header actions**: search, review-inbox bell with count, pin, "…" menu (copy link, print, export, sidebar, shortcuts, help)
- [x] 2.13 **Sign-in card** on the start page when signed out; invitation page asks to sign in first
- [x] 2.14 **Invitation email** (animated header GIF + CSS animation for Apple Mail/iOS/Samsung, works in every client, plain-text part, safety line, link never in the preview text); server function `/api/invite`; rate limit 20/hour 60/day per organization; copy link + "Write an email" fallback
- [x] 2.15 Tests: UI kit, organizations, palette, invitation email, SQL matrix extended (lifecycle, mail gate)
- Remaining polish for phase 2
  - [ ] 2.16 In-app "preview the email" button (sample is at /email/invite-preview.html)
  - [ ] 2.17 Resend / re-create an invitation from the Invitations tab
  - [ ] 2.18 **Invitee sees their pending invitations** after signing in (needs a small RPC by confirmed email) **Q12**
  - [ ] 2.19 Breadcrumb "…" overflow menu for hidden middle crumbs (today they are hidden on phones)
  - [ ] 2.20 Palette: highlight matched letters, recent searches, scope chip with Backspace to widen (APG pattern), Ctrl+Enter new tab
  - [ ] 2.21 Favourite/pinned projects and organizations at the top of the lists
  - [ ] 2.22 Display name and avatar color per person (people lists show emails today)
  - [ ] 2.23 Project duplicate / "save as template"; move a project to another organization **Q11**
  - [ ] 2.24 Transfer ownership; "leave" for the last owner explained in the UI
  - [ ] 2.25 Keyboard navigation chords (g then o / p / i) and a shortcuts overlay (?)
  - [ ] 2.26 Phone: bottom bar for the main sections; test every new page at 360 px
  - [ ] 2.27 Visual regression screenshots of the main screens in CI
  - [ ] 2.28 Org/project logo or color choice; per-project accent
  - [ ] 2.29 Notification panel (bell lists waiting AI edits, new invitations accepted, role changes), not only a count **Q10**
- Owner checks (OWN)
  - [?] 2.30 Real invitation test with a second email: Invite > Create invitation > open the link in a private window > sign in as that address > Accept
  - [?] 2.31 **Turn on email sending** (5 minutes, section 12 below)

## PHASE 3: Private by default and sharing (P5-V)
Decision D1 (2026-10-21): only signed-in users see documentation; public pages only as deliberate share links.
- [ ] 3.1 `get_content_bundle` requires a signed-in member (or a valid share link)
- [ ] 3.2 Sign-in screen is the first screen (the start page already shows a sign-in card; the spec is still reachable by address until this step)
- [ ] 3.3 MCP: anonymous tools return nothing; every AI client uses a token
- [ ] 3.4 Project `geminiforge` set to `private`; check every table, RPC and MCP tool as `anon` (extend the SQL matrix)
- [ ] 3.5 `share_links` table (project or document, expiry, revoked, hashed secret) + read-only route `#/s/<secret>`, `noindex`, `Referrer-Policy: no-referrer`
- [ ] 3.6 Who may make a project public or unlisted: only organization owners/admins **Q1**
- [ ] 3.7 Tests: anon gets nothing; share link works until revoked or expired
- [ ] 3.8 Confirm with the owner before switching (the site stops working for signed-out visitors)  **Q3**
- Research: R3

## PHASE 4: Core product: master file, phases, steps, decisions
Design in docs/01. Everything below is editable by the owner.
- [ ] 4.1 Node types: master, phase, step, decision, note, checklist item; statuses; ordering
- [ ] 4.2 Master file view: auto-index of phases with progress bars from step checkboxes
- [ ] 4.3 Phase view: steps with sub-steps and check marks; dependencies ("blocked by")
- [ ] 4.4 Decision log: options, choice, reason, superseded-by chain
- [ ] 4.5 Templates: software project, research, course, trip, "this master plan" (import this very file as the first template)
- [ ] 4.6 Views: list, board (kanban), timeline; milestones with due dates; ICS feed (ideas 3-12 in docs/05)
- [ ] 4.7 Project dashboard: open steps, waiting AI edits, stale pages
- [ ] 4.8 AI tools may propose changes to steps and checkmarks only through the Review inbox
- Questions: **Q9** (do you want this very document to become the first project?)
- Research: R2

## PHASE 5: Editor: owner edits everything
- [ ] 5.1 Choose the editor approach (Markdown source + preview vs block editor) **R1**
- [ ] 5.2 Direct editing of added pages with autosave drafts and conflict-safe save (3-way merge)
- [ ] 5.3 Edit generated spec pages and chapters; migrate derived spec documents to native documents (docs/01 step 6)
- [ ] 5.4 Add / remove / move / rename chapters and sections; drag-and-drop order
- [ ] 5.5 Revision compare of any two versions; restore one paragraph
- [ ] 5.6 Internal links `[[kind:slug]]`, backlinks panel
- [ ] 5.7 Comments on a passage; suggestion mode for human collaborators
- [ ] 5.8 Import: Markdown zip, Obsidian vault, Notion export, .docx; Export: project zip, Obsidian vault, PDF/print **R10**
- [ ] 5.9 Tables, callouts, code blocks, images, attachments (storage limits on the free plan)

## PHASE 6: AI space v2 and token safety
- [ ] 6.1 "Edit this passage" by the owner creates a self-accepted draft with provenance
- [ ] 6.2 Rebase stale AI edits; redo-with-reason; per-token tool and document allow-lists; token templates (Reader, Typo fixer, Writer)
- [ ] 6.3 Token upgrades (docs/04): path vs header kind, rotation with overlap, prefix + checksum for secret scanning, new-client alert, auto-pause on spike
- [ ] 6.4 Hash-chained audit log; CSV export; replay
- [ ] 6.5 OAuth stage so clients get short-lived tokens (Supabase Auth OAuth server) **R5**
- [ ] 6.6 Verify the MCP with Claude Code and Cursor (only Gemini was tested) **Q5**
- [ ] 6.7 Prompt-injection scanner v2; quarantine zone for unknown clients; two-person approval for high-risk edits (optional)
- [ ] 6.8 Per-project retention of activity; per-project AI policy

## PHASE 7: Ask-the-docs (RAG)
- [ ] 7.1 Decide the model/key plan **Q8** (OpenRouter free limits: 50 requests/day per account unless credit is bought; rotating five accounts breaks their terms)
- [ ] 7.2 Keys stored only through the Supabase secret dialog (never in chat or code); rotate any key pasted in chat earlier
- [ ] 7.3 Retrieval: Postgres full-text first, pgvector optional; answers must quote verbatim, the app checks the quote exists
- [ ] 7.4 40-question evaluation set; cost guard; cache
- Research: R4

## PHASE 8: Reader and search upgrades
- [ ] 8.1 Stable block anchors + copy link; search hits highlighted; filters by project/kind/status; saved searches
- [ ] 8.2 Reading position memory, changed-since-I-read markers, reading progress, focus mode, split view
- [ ] 8.3 Offline/PWA with a service worker cache **R12**
- [ ] 8.4 Semantic search (pgvector)
- [ ] 8.5 Listen (speech synthesis), `hidden=until-found`, single-key shortcut toggle (WCAG 2.1.4), contrast controls
- [ ] 8.6 Docs linter: broken links, orphan pages, duplicate titles, number contradictions

## PHASE 9: Operations, quality, safety
- [x] 9.1 CI runs typecheck, build, all browser suites, MCP offline tests
- [ ] 9.2 Edge Function deploy from CI (needs a Supabase access token as a CI secret)
- [ ] 9.3 Nightly backup to a private repo; backup encryption
- [ ] 9.4 Monitoring: uptime check of the MCP address, error reporting, web vitals
- [ ] 9.5 Security headers (CSP, `Referrer-Policy`), dependency audit and secret scanning in CI
- [ ] 9.6 Free-plan risks: project pauses after about a week without traffic (cron stops); decide on Pro or a keep-alive **R7**
- [ ] 9.7 Accessibility: axe on every view in CI; audit the custom select/menu/palette against WCAG 2.2 **R9**
- [ ] 9.8 Restructure R0 (folder layout, docs/02) after the features settle
- [ ] 9.9 Decide whether the Canvas single-file build stays **Q4** (it has none of the cloud features)
- [ ] 9.10 Production email: custom domain + Resend (deliverability, branded sender) **R6**

## PHASE 10: Content corrections (after the app is finished, per owner)
- [ ] 10.1 Decide claims A1-A13 in docs/claims_ledger.md (or "apply all suggested actions")
- [ ] 10.2 Re-audit the GeminiForge documents themselves; separate Gemini deep-research runs for that (NOT in docs/12)

## PHASE 11: Optional features (pick later; list in docs/05)
Integrations (GitHub links, webhooks), phone share target, voice notes, CLI sync, etc. Pick with the owner; each needs its own research.

---
## 12. Turn on invitation email (OWN, about 5 minutes)
Why this is needed: the website cannot send mail by itself. Supabase's built-in mail only reaches addresses of your own Supabase team (2 per hour); Resend's test sender only reaches your own address; both are useless for inviting other people (docs/10 section B). The function `/api/invite` is deployed and already creates invitations; it sends the email as soon as it finds two settings.
1. Use a Gmail account (preferably a dedicated one, not your main). Turn on 2-Step Verification.
2. Create an **app password** (Google Account > Security > App passwords). It is 16 letters.
3. In the Vercel dashboard: project geminiforge-workbench > Settings > Environment Variables > add `GMAIL_USER` (the address) and `GMAIL_APP_PASSWORD` (the 16 letters), Production, mark sensitive. Redeploy.
4. Open an organization > Invite. The checkbox "Email the invitation now" turns on. Never paste the password into chat or code.
Limits: Gmail allows roughly 500 mails a day (third-party figure); the app allows 20 per hour and 60 per day per organization. Mail comes from that Gmail address with the inviter's name and a Reply-To of the inviter. Later upgrade: buy a domain (about 10 USD/year) and use Resend.
Not yet tested against a real mailbox (no credentials exist): sending through Gmail from Vercel is UNTESTED until you add the two settings.

## 13. Questions for the owner (answer when convenient; my recommendation first)
- **Q1** Who may make a project public/unlisted? Recommend: only organization owners and admins (managers keep private/unlisted off).
- **Q2** Should any signed-in user be allowed to create an organization? Recommend: no, only you for now.
- **Q3** When do we switch to "only signed-in users see docs"? Recommend: right after the first real two-account invitation test.
- **Q4** Keep the Canvas single-file build? Recommend: freeze it and stop adding features there.
- **Q5** Which AI clients matter besides Gemini (Claude Code, Cursor, others)?
- **Q6** Keep the app dark only? Recommend: yes (earlier decision); the account menu then needs no theme item.
- **Q7** Email sender: Gmail app password now (recommended), or buy a domain first?
- **Q8** OpenRouter keys: one account with 10 USD credit (recommended, 1000 requests/day) or rotate several free accounts (terms risk)?
- **Q9** Should this master plan become the first real project in the app (template for phase 4)?
- **Q10** Notifications: only inside the app, or also a daily email digest?
- **Q11** May a project move to another organization?
- **Q12** Should people see their pending invitations after signing in? Recommend: yes.
- **Q13** What exactly does the label "Argon High" in your Gemini app refer to? Send a screenshot of the picker (research could not confirm it; docs/10 section C).

## 14. Decisions already made (do not re-ask)
D1 only signed-in users see docs, public only via share links. D2 English UI only (Urdu text inside documents is still allowed). D3 invited-only access: members see only projects they are invited to; org owners/admins see all. D4 trash default: keep until deleted by hand, timer per project. D5 multiple projects are a main feature; everything editable. D6 content corrections happen after the app is finished. D7 secrets never in chat/code/git; keys enter through dashboards only. D8 free Supabase plan (no MFA, no leaked-password protection). D9 daily research task deleted; research on demand. D10 start address opens the Organizations page.

## 15. Improvements noted per area (from research and review; not yet scheduled)
- **Invitations**: resend, expiry reminder, bulk invite (paste several emails), roles preview, invite link per project from the project page (done), GitHub/Vercel use 7-day expiry (our default 7).
- **Organizations/projects**: per-project retention and AI policy, archive instead of delete as the first suggestion (done: archive then delete for good), counts in delete dialogs (done for projects count), member counts on cards (done).
- **Search**: Cmd+K should also find people and settings; show keyboard hints per action.
- **Sidebar**: let the owner reorder or hide groups (Linear does), "show N" per group.
- **Dropdowns**: use native `appearance: base-select` only after Chrome/Safari/Firefox support is stable; our own select stays for now.
- **Accessibility**: 24 px minimum target (rows are 30 px); focus by outline; test with a screen reader; `aria-activedescendant` in the palette (done).
- **Performance**: code-split the app (single 500 kB+ bundle warning), lazy-load labs and the answer engine.
- **Docs hygiene**: ROADMAP.md and 03-ROADMAP-NEXT.md are superseded by this file; keep one list.

## 16. Research map (docs/12 has the prompts)
R1 editor and AI-suggestion review UX, R2 master-file data model and templates, R3 private publishing and share links on Supabase, R4 ask-the-docs design and provider limits, R5 MCP security, OAuth and client compatibility, R6 transactional email, R7 free-plan limits and hosting costs, R8 workspace UX benchmark, R9 accessibility of custom widgets, R10 import/export formats, R11 AI-edit review UX, R12 offline and sync.
