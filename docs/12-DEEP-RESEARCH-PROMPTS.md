# Deep-research prompts for Gemini (research about OUR APP, not about the GeminiForge documents)

Written 2026-10-21. Every prompt is self-contained: you can paste it alone. The optional attachment is one file, `docs/context-pack.pdf` (what the app is, the limits, the decisions). Sources behind these instructions are in docs/10 section C.

## 0. Status after the 2026-10-21 research (read first)
Claude already researched many of these with sources (docs/13-18). Run a Gemini prompt only as a CROSS-CHECK of the decision it feeds, or where marked OPEN.
| Prompt | Status | Answered in |
|---|---|---|
| R1 editor and AI-suggestion review | answered (CodeMirror 6 + merge view) | docs/17, 14 |
| R2 master file data model | answered | docs/13 |
| R3 private publishing and share links | partly (limits, grants, leaks); OPEN: share-link implementation details on Supabase | docs/16, 18 |
| R4 ask-the-docs | answered (Anthropic Haiku 5.5 + Citations + FTS); cross-check prices before launch | docs/15 |
| R5 MCP security, OAuth, clients | answered; OPEN: what the consumer Gemini app accepts (plan requirement unclear) | docs/14 |
| R6 transactional email | answered | docs/10, 16 |
| R7 free-plan limits | answered | docs/16 |
| R8 workspace UX benchmark | answered (features); OPEN: screenshot-level navigation comparison | docs/18, 10 |
| R9 accessibility of custom widgets | OPEN | – |
| R10 import/export formats | answered | docs/17 |
| R11 AI-edit review at scale | partly; research on automation bias is thin | docs/14 |
| R12 offline and sync | answered | docs/17 |
| R13 Urdu/bidirectional text, search and sorting in Postgres and CodeMirror | NEW, OPEN | – |
| R14 privacy basics for a solo owner storing invitee emails (GDPR-style duties, retention) | NEW, OPEN | docs/14 (partial) |
| R15 consumer Gemini app custom MCP: exact requirements, plan, regions, limits, what breaks | NEW, OPEN | docs/14 (partial) |

## 1. What I could and could not confirm
- **Gemini 4 Argon** exists (Google's flagship reasoning model, thinking levels low/medium/high; API docs page updated 2026-10-14). "Argon High" as a named mode in the Deep Research screen is **UNVERIFIED**. If your picker shows "Argon" with a "High" option, choose that. If the Deep Research screen has no model picker, just run it. Please send me a screenshot of the picker so I can write this correctly (**Q13** in the master plan).
- Google's pages give no fixed Deep Research counts for AI Pro (usage is compute-based, refreshes every 5 hours with a weekly cap) and do not state how many runs can go in parallel. Test: start two runs at once on one account.
- Gemini accepts up to 10 files per prompt, 100 MB each (upload help page). I could not confirm that Deep Research accepts `.md`/`.txt`, which is why the context pack is a **PDF**.

## 2. How to run (3 accounts)
1. Open Gemini > Tools > Deep Research. Attach `context-pack.pdf` (optional but it improves relevance).
2. Paste the prompt. Gemini shows a research plan: click **Edit plan**, delete anything off-topic, make sure every numbered question appears, then **Start research**.
3. When done: **Export to Docs**. Keep the source links (Gemini shows them at the end).
4. Spread the runs: account 1 = R1, R2, R3, R4; account 2 = R5, R6, R7, R8; account 3 = R9, R10, R11, R12. Run at most 2 at a time per account.
5. Send me the exported text (paste in chunks, or put the Google Doc text into a file in `/home/user/gf/docs` through a pull request). I will check the claims against sources before anything goes into the plan: a report is a lead, not a fact.

## 3. Rules that make Deep Research better (from Google's API guidance and practitioner guides)
Say the objective and the decision it feeds; give scope, exclusions and a time frame; name preferred source types (official docs, standards, changelogs, first-party engineering blogs, maintainers' issue trackers); demand an inline URL and a date for every claim; ask for "unknown" instead of estimates; separate fact, estimate and opinion; ask for a table where you want comparison; end with the claims it is least sure of; edit the plan before starting; split big topics into separate runs.

## 4. Template (fill the brackets)
```
Objective: Produce a decision-grade report on [QUESTION] so I can decide [DECISION].
Context: I am a solo owner building a documentation workspace (React 18 + TypeScript, Supabase free plan, Vercel hobby plan, Postgres RLS, MCP server in a Supabase Edge Function). Constraints: no paid services unless named, today is Oct 2026, English UI. [attached context-pack.pdf is authoritative for what already exists]
Scope: include [A, B, C]; exclude [X, Y]; time frame: sources from 2025-2026, flag anything older.
Questions: 1) ... 2) ... 3) ...
Sources: prefer official documentation, changelogs, standards, maintainers' issue trackers and first-party engineering blogs; label vendor marketing and forum posts as such; avoid SEO listicles.
Evidence rules: every significant claim gets an inline URL and the source's date; use two independent sources for numbers and limits; separate fact / estimate / opinion; where something is unknown, outdated or conflicting write "UNKNOWN" instead of estimating.
Output: executive summary (max 150 words); findings per question; a comparison table; a recommended option with the reasons and the risks; a short implementation outline; a source list with date and type.
Final check: end with the claims you are least sure of and what would verify them.
```

## 5. The prompts

### R1. Editor choice and AI-suggestion review (feeds master plan phase 5)
```
Objective: Recommend how to build the document editor of a documentation workspace and how humans should review AI-proposed edits, so I can decide the editor technology.
Context: [template context]. Documents are Markdown today; AI tools propose find/replace or whole-page edits that wait in a review inbox with a diff; the owner must be able to edit every page directly, autosave, see history and restore one paragraph. No UI component library; I write my own CSS. React 18.
Questions: 1) Compare in Oct 2026: plain Markdown source + preview, CodeMirror 6, ProseMirror/Tiptap, Lexical, BlockNote, Milkdown, Plate: license, bundle size, React 18 support, Markdown round-trip fidelity, tables, collaboration readiness, accessibility, maintenance status. 2) How do Notion, Google Docs suggestions, Cursor, GitHub PR review and Outline present machine-proposed changes (inline vs side-by-side, per-hunk accept, provenance labels)? What do usability studies or maintainers say works? 3) Best practice for autosave and conflict handling for a single-owner app with occasional AI edits (3-way merge vs CRDT such as Yjs): when is a CRDT worth its cost? 4) Which choice keeps the Markdown files portable (Obsidian/Git)?
Scope: exclude Word-like WYSIWYG suites that need a paid license.
[then the template's Sources, Evidence rules, Output, Final check]
```
Attach: context-pack.pdf.

### R2. Master file, phases, steps, decisions (phase 4)
```
Objective: Design the data model and views for a "master file > phases > steps > sub-steps with check marks, plus decisions" planning layer inside a documentation workspace.
Context: [template context]. Everything is a document with a stable id; steps have status, optional dependencies, due dates; decisions record options, choice, reason and what they supersede; AI tools may propose changes but the owner approves.
Questions: 1) How do Notion databases, Linear, Obsidian Tasks/Dataview, Org-mode, GitHub Projects, Basecamp Hill Charts and ADR (architecture decision records) tooling model hierarchy, status, dependencies and decisions? 2) Which fields are essential and which are bloat for a solo owner? 3) How should progress be computed from nested checkboxes (counting rules, blocked steps, weights)? 4) Recommended Postgres schema (adjacency list vs ltree vs closure table vs storing the tree inside Markdown) with RLS in mind, plus the trade-offs for AI edits that touch many steps. 5) Template examples for software project, research project, course, trip. 6) Which views (list, board, timeline, roadmap) are worth building first?
[then Sources, Evidence rules, Output, Final check]
```

### R3. Private-by-default publishing and share links (phase 3)
```
Objective: Find the safest design for "only signed-in users read documents; optional revocable share links" on Supabase.
Context: [template context]. Today one project is public, a content-bundle RPC is callable by anonymous users, and the MCP server allows anonymous reads.
Questions: 1) Row-level-security patterns for private projects, share links with expiry and revocation, and anonymous read through a function; known pitfalls (security definer functions, policy performance, `auth.uid()` caching, realtime and storage exposure). 2) How to hash and compare share secrets, rate-limit guessing, and avoid leaking through referrers, logs, link previews and search engines (noindex, headers). 3) How do Notion, Google Docs, GitHub and Vercel implement "anyone with the link" (permissions, expiry, audit)? 4) Edge cases: link scanners opening links, link given to a crawler, revoking while a page is open, cached content bundles and service workers. 5) A test plan (what to assert as anon, as member, as outsider).
[then Sources ... Final check]
```

### R4. Ask-the-docs (retrieval-augmented answers with verified quotes) (phase 7)
```
Objective: Choose the architecture and provider plan for answering questions about the documents with an LLM, with every answer quoting the source text verbatim.
Context: [template context]. Documents are small (hundreds of pages at most). A rule-based local answer engine exists. Budget: free tiers first; possibly one account with 10 USD of credit.
Questions: 1) As of Oct 2026, current free-tier limits, terms and data-use rules of: Gemini API, OpenRouter (including the rule about using several accounts), Groq, Cerebras, Mistral, Cloudflare Workers AI, Hugging Face inference. Which allow server-side use from a hobby app? 2) Retrieval for small corpora: Postgres full-text vs pgvector vs hybrid; chunking by headings; do we even need embeddings at this size? 3) How to force and verify verbatim quotes (structured output, quote-then-answer, string-match check, refusing when no evidence); published evaluation methods for groundedness; how to build a 40-question gold set. 4) Prompt-injection risks when documents contain instructions, and mitigations. 5) Cost and latency estimate per question.
[then Sources ... Final check]
```

### R5. MCP security, OAuth and client compatibility (phase 6)
```
Objective: Make the MCP server (documents readable and proposable by AI clients) safe and compatible with the main clients.
Context: [template context]. Today clients use a long random token in the URL path or header; calls are rate-limited and audited; writes only create proposals.
Questions: 1) Current MCP specification status as of Oct 2026: authorization (OAuth 2.1, dynamic client registration, resource indicators), transport, and what Claude Code, Cursor, Gemini apps, ChatGPT connectors and VS Code actually support (versions, known bugs). 2) Token design: prefix and checksum for secret scanning, rotation with overlap, scopes per project/document, short-lived tokens, where tokens must never appear (URLs in logs, referrers). 3) Documented prompt-injection and tool-poisoning attacks against MCP servers and mitigations (output wrapping, allow-lists, human approval). 4) Supabase Auth as an OAuth server: capabilities, limits on the free plan. 5) Anomaly alerts worth building (spikes, new client, new IP).
[then Sources ... Final check]
```

### R6. Transactional email for a solo owner (phase 9)
```
Objective: Pick the sender setup for invitation emails and describe the most reliable way to send them.
Context: [template context]. Today the plan is Gmail SMTP with an app password from a Vercel function. No domain is owned.
Questions: 1) Compare, with current free limits and conditions in Oct 2026: Gmail app password, Google Apps Script mail, Resend, Brevo, MailerSend, Postmark, Mailtrap, Amazon SES, Cloudflare Email Service, Supabase custom SMTP. Which can send to any recipient without a domain? 2) Cost of the cheapest domain route (registrar prices, DNS setup, SPF/DKIM/DMARC steps) and what deliverability gain it brings. 3) Gmail sending limits, suspension risks for automated mail, and safer practices. 4) Animated and interactive email: current support matrix (CSS animation, GIF, AMP) by client, and size limits (Gmail clipping). 5) Invitation-email best practice (subject, expiry, link scanners consuming one-time links).
[then Sources ... Final check]
```

### R7. Free-plan limits and growth costs (phase 9)
```
Objective: Know exactly what breaks first on Supabase free and Vercel hobby for a small documentation workspace, and what each upgrade costs.
Questions: 1) Current limits (Oct 2026) for: project pausing after inactivity, database size, egress, Realtime connections and messages, Edge Function invocations and runtime, storage, pg_cron, auth emails; Vercel hobby function limits, bandwidth, build minutes, commercial-use rule. 2) Which of our features approach those limits (Realtime live updates, MCP calls, nightly backups)? 3) Pause-prevention options that comply with the terms. 4) Cost of Supabase Pro and Vercel Pro and what they unlock (MFA, leaked-password protection, backups, no pausing). 5) Backup/restore options on the free plan.
[then Sources ... Final check]
```

### R8. Workspace UX benchmark (phase 2 polish)
```
Objective: Compare the navigation and information architecture of document workspaces to refine ours.
Questions: 1) For Notion, Linear, Outline, Docmost, BookStack, Confluence, GitBook and Slab (as of 2026): how are organizations/workspaces, projects/spaces, documents, search, favorites, recents, notifications and settings arranged? Provide screenshots-level descriptions and links to official pages or changelogs. 2) What changed in their navigation in 2025-2026 and why (release notes, design blog posts)? 3) Mobile navigation patterns. 4) Empty states, onboarding and invitation flows (first-run, accept-invite, pending invitations). 5) Which patterns are consistently shared (so users expect them) and which are unique?
[then Sources ... Final check]
```

### R9. Accessibility of custom widgets (phase 9)
```
Objective: Produce an audit checklist for custom dropdowns (select-only combobox), menus, command palette, dialogs, breadcrumbs and tabs in a React app, against WCAG 2.2 AA.
Questions: 1) The exact keyboard and ARIA requirements from the W3C APG for each widget, with known differences between screen readers (NVDA, JAWS, VoiceOver, TalkBack) in Oct 2026. 2) Common failures in custom selects and palettes found in audits. 3) Target size and focus-appearance rules and how a 30 px row with inset hover passes. 4) Automated tools (axe-core, Playwright accessibility tests) and what they cannot catch; a manual test script. 5) Reduced motion and forced-colors handling for animated popups.
[then Sources ... Final check]
```

### R10. Import and export formats (phase 5)
```
Objective: Decide import/export formats so documents are never locked in.
Questions: 1) Structure of Obsidian vaults, Notion Markdown/CSV exports, Google Docs exports, Confluence exports and docx; known conversion pitfalls (links, tables, attachments, front matter). 2) Libraries (remark/unified, mammoth, turndown, JSZip) and their licenses/sizes in Oct 2026. 3) Which Markdown flavor and front-matter schema to standardise on. 4) How to export a whole project as a zip that round-trips. 5) Security of importing untrusted files (zip bombs, HTML injection, path traversal).
[then Sources ... Final check]
```

### R11. AI-edit review at scale (phase 6)
```
Objective: Learn how mature products let humans safely review many AI-proposed edits.
Questions: 1) Review UX in Cursor, GitHub Copilot code review, Google Docs suggestions, Notion AI, Grammarly, Outline and Docmost: risk labelling, batch accept rules, undo, provenance. 2) Published research or case studies on automation bias in reviewing AI changes and what reduces it. 3) Rules worth offering: auto-accept tiny typo fixes, risk thresholds, two-person approval. 4) Audit trail best practice (hash chains, signed entries). 5) Metrics to show (review backlog, acceptance rate, time to review).
[then Sources ... Final check]
```

### R12. Offline and sync (phase 8)
```
Objective: Decide how far to go with offline reading and sync for a small docs app.
Questions: 1) PWA and service-worker caching patterns for a Vite/React app in 2026 (update strategies, privacy of cached private documents, cache clearing on sign-out). 2) Local-first options (CRDT: Yjs, Automerge; sync engines) vs 3-way merge as we use now: when is the extra complexity justified for one owner plus a few collaborators? 3) Storage limits and eviction on iOS Safari and Android Chrome. 4) Security: encrypting cached documents, what happens on shared computers.
[then Sources ... Final check]
```

### R13. Urdu and bidirectional text (NEW)
```
Objective: Make sure documents containing Urdu (right-to-left, Nastaliq or Naskh fonts) and English mix work in a Markdown editor, search and export.
Context: [template context]. UI is English only; documents may contain Urdu paragraphs and mixed lines.
Questions: 1) CodeMirror 6 and Markdown preview in the browser: per-line text direction (`dir="auto"`, unicode-bidi), cursor movement, known bugs. 2) Fonts: best free web fonts for Urdu on the web (Noto Nastaliq Urdu, Noto Naskh Arabic, others), loading cost, line-height problems. 3) PostgreSQL full-text search for Urdu: available dictionaries/configs (`simple`), tokenization, normalization of Arabic-script characters (Yeh/Heh variants, diacritics), trigram search; examples. 4) Sorting/collation of Urdu in Postgres. 5) PDF/print export and Markdown export pitfalls with RTL. 6) A test list of tricky strings.
[then Sources ... Final check]
```

### R14. Privacy basics for a solo owner (NEW)
```
Objective: Know the minimum data-protection duties and good practice when a small web app stores invited people's email addresses and activity logs.
Questions: 1) Does GDPR or comparable law apply to a personal project with a few invited collaborators; household/personal exemption limits; UK/EU/Pakistan (PDPB status as of Oct 2026) angles. 2) Lawful basis for sending an invitation email to a named person. 3) Retention and deletion: how long to keep invite records, audit logs, IP addresses; per-person export and erasure requests: practical implementation for a Supabase app. 4) What to put in a short privacy notice. 5) Data-processor terms with Supabase, Vercel, Google (Gmail), Anthropic.
[then Sources ... Final check]
```

### R15. Consumer Gemini app and custom MCP servers (NEW)
```
Objective: Find exactly what the consumer Gemini app (web and mobile) accepts for a custom remote MCP server in Oct 2026.
Questions: 1) Official requirements: plan (Google AI Pro vs free), region, language, account type, Keep Activity setting; how to add it step by step. 2) Authentication options (header token, OAuth, none; Dynamic Client Registration; client metadata documents; token in URL path) and what happens when the server uses none of them. 3) Which MCP spec revision and transports are supported; read vs write confirmation behavior. 4) Known limits (tool count, response size, timeouts), bugs and workarounds reported by users in 2026. 5) How Gemini CLI/Antigravity CLI differ.
[then Sources ... Final check]
```

## 6. What I will do with the results
Each report goes into docs/ as `13-RESEARCH-R<n>.md` with the source list; I verify the key claims against the original pages, mark UNVERIFIED where I cannot, then update the master plan (docs/11) and ask you for decisions.
