# Deep-research prompts for Gemini (v2, 2026-10-21) — research about OUR APP, at zero cost

Budget rule D11: everything here uses your existing Google AI Pro account only. Nothing in the prompts asks for, or accepts, a paid option.

## 1. What I confirmed online today (and what I could not)
- **Argon.** "Gemini 4 Argon" is a real model, available since 2026-10-13 to Google AI Pro and Ultra subscribers in the Gemini app (secondary sources: mezha.ua, docs.apiyi.com; the API page ai.google.dev/gemini-api/docs/models/gemini-4-argon says thinking levels low/medium/high). **"Argon High" as a Deep Research setting is UNVERIFIED**, and I found no source saying which model Deep Research itself uses. Rule: if your Deep Research screen offers Argon or a "High" setting, choose it; if there is no picker, just run it. A screenshot of your picker would settle this (master plan Q13).
- **Prompt guidance** (Google's Deep Research API page, ai.google.dev/gemini-api/docs/deep-research): "define the desired output format explicitly"; you can request sections, tables and tone (technical, executive, casual); "explicitly ask for visuals" (they appear only when asked; the help page says charts/diagrams need an Ultra plan); "collaborative planning" lets you review and iterate on the plan before research starts; Deep Research accepts images and **PDFs** as inputs and grounds the research in them; after the report you can ask follow-up questions without restarting. The page has no section on handling unknowns; our "write UNKNOWN instead of guessing" rule comes from practitioner guides, not Google.
- **The app flow** (support.google.com/gemini/answer/15719111): submit a prompt, Gemini writes a plan, click **Edit plan**, then **Start research**; export with Share & export > Export to Docs or copy; AI Pro gets "higher limits" with no numbers published (daily requests and simultaneous requests are limited, and Gemini tells you how many are left).
- **Files** (support.google.com/gemini/answer/14903178): up to 10 files per prompt, 100 MB each (non-video); ZIP up to 10 files; "most file types" supported but that page does not list `.md` or `.txt` (a third-party list says Markdown works). Pro has a 1M-token context. **Use the PDFs I prepared** (the API page names PDFs explicitly).
- Limits per plan, parallel runs, whether `.md` is accepted in Deep Research: UNVERIFIED. Test: start two runs, read the message.

## 2. How to write the prompt (rules I follow in section 6)
1 One objective and the decision it feeds. 2 Context block (who, stack, constraints incl. "0 USD", date). 3 Numbered questions, each answerable with evidence. 4 Scope: include / exclude / time frame (2025-2026). 5 Source rules: first-party docs, standards, changelogs, maintainers' trackers first; label vendor marketing and forums. 6 Evidence rules: inline URL + date per claim, two sources for numbers and limits, fact / estimate / opinion, `UNKNOWN` instead of guessing, nothing that costs money. 7 Output format spelled out (summary, findings per question, table, recommendation, steps, source list, least-sure claims). 8 Ask for a plan, then **edit the plan** (delete off-topic items, make sure every numbered question appears) before pressing Start research. 9 One topic per run. 10 Verify afterwards: open the 5 most important links; anything without a working link is a lead, not a fact.

## 3. Research that is DONE (do not re-run)
Editor and diff review (docs/17), planning-layer data model (docs/13), MCP security and clients (docs/14), free-plan limits (docs/16), workspace benchmark (docs/18), email (docs/10), import/export, offline, Markdown (docs/17). Paid parts of docs/15 (Anthropic, etc.) are dropped by D11.

## 4. Research STILL WORTH RUNNING (priority order)
| ID | Topic | Feeds | Why now |
|---|---|---|---|
| **Z1** | Zero-cost "ask the docs" (in-browser models, free API tiers, privacy) | phase 7 | the paid route is out; need the best free route |
| **R15** | Gemini app + custom MCP server (exact requirements) | phase 7.1, 6.1 | it may give you Q&A over your docs for free |
| **R3** | Share links and private-by-default on Supabase (implementation) | phase 3 | next big security step |
| **R9** | Accessibility of our custom select/menu/palette/breadcrumbs | phase 9.7 | quality of the new UI |
| **R13** | Urdu / right-to-left text in editor, search, export | phases 5, 7.3 | your docs can contain Urdu |
| **R14** | Privacy basics for storing invitees' emails | phase 6.8 | small, avoids mistakes |
| **R8** | Navigation benchmark (screens, not features) | phase 2 polish | compare layouts with real products |
| **Z2** | Zero-cost resilience: what if a free tier changes; exit options | phase 9 | protects the "spend nothing" rule |

## 5. Files to attach (all in `docs/pdf/`, inside the project folder so you can open them)
- `01-context-pack.pdf` (30 KB): attach to EVERY run.
- `02-master-plan-v2.pdf`: attach for Z1, R3, Z2 (so it can point at plan steps).
- `03-research-ask-the-docs.pdf`: attach for Z1 only. `04-research-supabase-vercel-limits.pdf`: Z2 and R3. `05-research-mcp-security.pdf`: R15. `06-research-editor-offline.pdf`: R13 and R9.
- Max 10 files; I attach at most 3 per run. If the app refuses a PDF, paste the text of `01-context-pack.md` at the start of the prompt instead.

## 6. How to run (every prompt)
1 Open Gemini > Deep Research (Argon/High if offered). 2 Attach the listed PDFs. 3 Answer the "Answer first" questions below (or keep my defaults) and edit the bracketed parts. 4 Paste. 5 In the plan: Edit plan, then Start research. 6 When finished: Share & export > Export to Docs, then copy the text and send it to me in chunks (or save it as a file in `docs/` through a pull request). I verify the key claims against the sources and update the plan. One run at a time; if you hit a limit wait for the refresh Gemini announces.

### Shared blocks (already expanded inside every prompt below, so each prompt can be pasted as it is; bracketed words like [Pakistan] are your answers: edit them)
**CTX:** I am a solo owner building a documentation workspace web app (React 18 + TypeScript front end; Supabase free plan: Postgres with row-level security, Auth, Realtime, Edge Functions; Vercel Hobby; GitHub Actions free). My budget is exactly 0 USD: only free tiers and free software; no paid plans, API credits, domains or subscriptions. Today is October 2026: use sources from 2025-2026 and flag older ones. The attached PDF "context pack" describes what already exists. UI language is English; documents may contain Urdu.
**EV:** Evidence rules: every significant claim needs an inline URL and the date of the source. Prefer first-party documentation, standards, changelogs and maintainers' issue trackers; label vendor marketing and forum posts as such; avoid SEO listicles. Use two independent sources for numbers and limits. Separate fact, estimate and opinion. Where something is unknown, outdated or conflicting write UNKNOWN; do not estimate or fill gaps. Do not recommend anything that costs money.
**OUT:** Output: (1) executive summary, max 150 words; (2) findings numbered like my questions; (3) a comparison table; (4) a recommended option with reasons, risks and a step-by-step implementation outline sized for one person; (5) a source list with date and type; (6) at the end: the 5 claims you are least sure of and what would verify each.

---
### Z1. Zero-cost "ask the docs"
**Answer first** (defaults in brackets): 1 May private documents be sent to a free API whose terms allow training on prompts? [No: private documents stay private; only the public-facing spec may go to a free tier]. 2 Must it work on a phone? [Yes]. 3 Questions in English only, or also Urdu? [English; Urdu text may appear inside documents]. 4 Acceptable answer time? [up to 15 seconds]. 5 Is using the Gemini app (with our MCP) as the main Q&A place acceptable? [Yes].
**Attach:** 01, 02, 03.
```
Objective: Find the best ZERO-COST way to let one owner (and a few invited people) ask questions about a few hundred private Markdown pages and get answers that quote the pages verbatim, so I can decide what to build.
Context: I am a solo owner building a documentation workspace web app (React 18 + TypeScript front end; Supabase free plan: Postgres with row-level security, Auth, Realtime, Edge Functions; Vercel Hobby; GitHub Actions free). My budget is exactly 0 USD: only free tiers and free software; no paid plans, API credits, domains or subscriptions. Today is October 2026: use sources from 2025-2026 and flag older ones. The attached PDF "context pack" describes what already exists. UI language is English; documents may contain Urdu.
Questions:
1) In October 2026, which free options exist for generative answers over my own documents, with exact current limits, terms on data use and training, and whether a hobby web app may use them: (a) Gemini API free tier through Google AI Studio, (b) OpenRouter free models with ONE account, (c) Cloudflare Workers AI free allowance, (d) Groq, Cerebras, Mistral, Hugging Face free tiers, (e) NotebookLM / Gemini Notebook, (f) the Gemini app connected to my own remote MCP server. For each: limits, privacy/training terms, rules against multiple accounts, stability of the free tier in 2026.
2) In-browser models: current state of WebLLM, Transformers.js and Chrome built-in AI (Prompt API / Gemini Nano) for answering from supplied passages: model sizes and download cost, WebGPU support on Chrome, Safari, Firefox and on Android and iPhone, speed, quality for English and for Urdu, memory limits, how to cache the model. Is a 1-4 billion parameter model good enough for "answer only from these passages and quote them"?
3) Retrieval without a model: how good is PostgreSQL full-text search (tsvector, websearch_to_tsquery, ts_rank) with heading-based chunks for a few hundred pages; when do embeddings help; a free embedding option that runs inside a Supabase Edge Function or in the browser (model, dimensions, languages).
4) An extractive approach (return the best passages verbatim with highlights, no generation): published evidence of how well this answers questions compared to generative answers; UX examples.
5) How to force and verify verbatim quotes (quote-then-answer, substring check after normalisation); published evaluation methods and a recipe for a 40-question test set.
6) Prompt injection when documents are untrusted and how to design a no-tools Q&A endpoint safely.
7) Recommend ONE primary and ONE fallback design at zero cost, with the failure modes of each.
Scope: exclude anything that needs payment, credit, a credit card or a paid subscription. Include a section on privacy: where my documents would be sent in each option.
Evidence rules: every significant claim needs an inline URL and the date of the source. Prefer first-party documentation, standards, changelogs and maintainers' issue trackers; label vendor marketing and forum posts as such; avoid SEO listicles. Use two independent sources for numbers and limits. Separate fact, estimate and opinion. Where something is unknown, outdated or conflicting write UNKNOWN; do not estimate or fill gaps. Do not recommend anything that costs money. Output: (1) executive summary, max 150 words; (2) findings numbered like my questions; (3) a comparison table; (4) a recommended option with reasons, risks and a step-by-step implementation outline sized for one person; (5) a source list with date and type; (6) at the end: the 5 claims you are least sure of and what would verify each.
```

### R15. Gemini app and custom MCP servers
**Answer first:** 1 Country of the Google account? [Pakistan]. 2 App language? [English]. 3 Plan? [Google AI Pro]. 4 Where do you use Gemini? [web and Android]. 5 Is the MCP URL already working in Gemini for you? [Yes, tested earlier with a path token].
**Attach:** 01, 05.
```
Objective: Find exactly what the consumer Gemini app accepts for a custom remote MCP server in October 2026, so I can use it as a free way to ask questions about my documents.
Context: I am a solo owner building a documentation workspace web app (React 18 + TypeScript front end; Supabase free plan: Postgres with row-level security, Auth, Realtime, Edge Functions; Vercel Hobby; GitHub Actions free). My budget is exactly 0 USD: only free tiers and free software; no paid plans, API credits, domains or subscriptions. Today is October 2026: use sources from 2025-2026 and flag older ones. The attached PDF "context pack" describes what already exists. UI language is English; documents may contain Urdu. My MCP server is a Supabase Edge Function using Streamable HTTP; it currently authenticates with a long random token inside the URL path. Account: personal Google account, plan Google AI Pro, country [Pakistan], language [English].
Questions:
1) Official requirements to add a custom app/MCP server in the Gemini app (web and mobile): plan, region, language, account type, age, "Keep Activity", admin settings. Quote Google's help pages and give dates.
2) Authentication it supports: no auth, URL token, custom header, OAuth with Dynamic Client Registration, client metadata documents. What happens with a token in the URL path? Is there a documented workaround?
3) Which MCP spec revision and transports are supported; how tool descriptions, response size, tool count and timeouts are limited; read versus write confirmation behaviour.
4) User reports (forums, issue trackers, social posts from 2026) of problems and workarounds.
5) How Gemini CLI / Antigravity CLI and Google's other surfaces differ, and whether any is free for a Google AI Pro user.
6) What data is sent to Google when a tool returns my document text, and how Keep Activity / Gemini Apps Activity affects retention and training.
7) A step-by-step checklist to set this up, and what to test.
Scope: exclude enterprise-only features.
Evidence rules: every significant claim needs an inline URL and the date of the source. Prefer first-party documentation, standards, changelogs and maintainers' issue trackers; label vendor marketing and forum posts as such; avoid SEO listicles. Use two independent sources for numbers and limits. Separate fact, estimate and opinion. Where something is unknown, outdated or conflicting write UNKNOWN; do not estimate or fill gaps. Do not recommend anything that costs money. Output: (1) executive summary, max 150 words; (2) findings numbered like my questions; (3) a comparison table; (4) a recommended option with reasons, risks and a step-by-step implementation outline sized for one person; (5) a source list with date and type; (6) at the end: the 5 claims you are least sure of and what would verify each.
```

### R3. Share links and private-by-default on Supabase
**Answer first:** 1 Share a single document, a whole project, or both? [both]. 2 Default expiry? [30 days, option for never]. 3 Allow comments on shared pages? [no]. 4 May anyone with a link see the editors' names? [no].
**Attach:** 01, 02, 04.
```
Objective: Design a safe "private by default, optional revocable share links" model on Supabase (Postgres, row-level security, Edge Functions) at zero cost.
Context: I am a solo owner building a documentation workspace web app (React 18 + TypeScript front end; Supabase free plan: Postgres with row-level security, Auth, Realtime, Edge Functions; Vercel Hobby; GitHub Actions free). My budget is exactly 0 USD: only free tiers and free software; no paid plans, API credits, domains or subscriptions. Today is October 2026: use sources from 2025-2026 and flag older ones. The attached PDF "context pack" describes what already exists. UI language is English; documents may contain Urdu. Today one project is public, a content-bundle function can be called by anonymous users, and an MCP server allows anonymous reads. Decision: only signed-in members read documents; public access only through deliberate share links (per document or per project, optional expiry, revocable).
Questions:
1) Recommended schema and functions for share links (hashed secret, constant-time comparison, expiry and revocation enforced in the function, rate limiting) and how to serve the page without exposing the rest of the project. Show the policy/function patterns, and Supabase's current guidance (including the change of 2026-10-30 that stops automatic grants on new tables).
2) Known pitfalls: security-definer functions, policy performance, `auth.uid()` caching, Realtime and Storage exposure, PostgREST exposed schemas, advisor lints.
3) Information leaks of public pages in other products (for example editor names or emails in unauthenticated API responses): how they happened and how to avoid them.
4) Browser side: referrer leakage, link previews, search-engine indexing (noindex), caches and service workers, scanners that open links.
5) How Notion, Google Docs, GitHub, Outline and GitBook implement "anyone with the link" (permissions, expiry, audit).
6) A test plan: what to assert as anonymous, as member, as outsider, for tables, functions, storage and realtime.
Evidence rules: every significant claim needs an inline URL and the date of the source. Prefer first-party documentation, standards, changelogs and maintainers' issue trackers; label vendor marketing and forum posts as such; avoid SEO listicles. Use two independent sources for numbers and limits. Separate fact, estimate and opinion. Where something is unknown, outdated or conflicting write UNKNOWN; do not estimate or fill gaps. Do not recommend anything that costs money. Output: (1) executive summary, max 150 words; (2) findings numbered like my questions; (3) a comparison table; (4) a recommended option with reasons, risks and a step-by-step implementation outline sized for one person; (5) a source list with date and type; (6) at the end: the 5 claims you are least sure of and what would verify each.
```

### R9. Accessibility of custom widgets
**Answer first:** 1 Which assistive tech can you test? [keyboard only; free NVDA on Windows if available]. 2 Target? [WCAG 2.2 AA]. 3 Browsers? [Chrome, Safari on iPhone].
**Attach:** 01, 06.
```
Objective: Produce an audit checklist and fix list for custom UI widgets in a React app against WCAG 2.2 AA, so I can verify my own implementation.
Context: I am a solo owner building a documentation workspace web app (React 18 + TypeScript front end; Supabase free plan: Postgres with row-level security, Auth, Realtime, Edge Functions; Vercel Hobby; GitHub Actions free). My budget is exactly 0 USD: only free tiers and free software; no paid plans, API credits, domains or subscriptions. Today is October 2026: use sources from 2025-2026 and flag older ones. The attached PDF "context pack" describes what already exists. UI language is English; documents may contain Urdu. Widgets: select-only combobox (custom dropdown with a listbox popup), action menus (menu button), command palette (dialog with a combobox and a listbox, aria-activedescendant), breadcrumbs with switcher menus, tabs, modal dialogs using the HTML dialog element, collapsible sidebar groups, 30 px high list rows with inset hover.
Questions:
1) For each widget: the exact W3C APG keyboard and ARIA requirements, and what commonly goes wrong in implementations.
2) Differences in behaviour between screen readers (NVDA, JAWS, VoiceOver iOS/macOS, TalkBack) for these widgets as of 2026, with sources.
3) WCAG 2.2 items most often failed by such UI: target size (24 px), focus not obscured, focus appearance, dragging alternatives, consistent help, accessible authentication.
4) Popups rendered inside a modal dialog (top layer): focus, inert, aria-modal problems.
5) Reduced motion and forced-colors handling for animated popups.
6) Free tools and a manual test script: axe-core with Playwright, accessibility tree inspection, what automation cannot catch.
Evidence rules: every significant claim needs an inline URL and the date of the source. Prefer first-party documentation, standards, changelogs and maintainers' issue trackers; label vendor marketing and forum posts as such; avoid SEO listicles. Use two independent sources for numbers and limits. Separate fact, estimate and opinion. Where something is unknown, outdated or conflicting write UNKNOWN; do not estimate or fill gaps. Do not recommend anything that costs money. Output: (1) executive summary, max 150 words; (2) findings numbered like my questions; (3) a comparison table; (4) a recommended option with reasons, risks and a step-by-step implementation outline sized for one person; (5) a source list with date and type; (6) at the end: the 5 claims you are least sure of and what would verify each.
```

### R13. Urdu and right-to-left text
**Answer first:** 1 Where does Urdu appear? [paragraphs inside English documents, sometimes mixed lines]. 2 Preferred script style? [Nastaliq if readable, else Naskh]. 3 Need Urdu search? [yes]. 4 Urdu questions to the Q&A? [maybe later].
**Attach:** 01, 06.
```
Objective: Make documents that mix English and Urdu work in a Markdown editor (CodeMirror 6), the preview, search and export.
Context: I am a solo owner building a documentation workspace web app (React 18 + TypeScript front end; Supabase free plan: Postgres with row-level security, Auth, Realtime, Edge Functions; Vercel Hobby; GitHub Actions free). My budget is exactly 0 USD: only free tiers and free software; no paid plans, API credits, domains or subscriptions. Today is October 2026: use sources from 2025-2026 and flag older ones. The attached PDF "context pack" describes what already exists. UI language is English; documents may contain Urdu.
Questions:
1) CodeMirror 6 and browser rendering of right-to-left and mixed-direction lines: per-line direction (dir="auto", unicode-bidi), cursor movement, selection, known bugs; Markdown preview with dir="auto".
2) Free web fonts for Urdu (Noto Nastaliq Urdu, Noto Naskh Arabic and others): file sizes, loading strategy, line-height and clipping problems, how to subset.
3) PostgreSQL full-text search for Urdu: available configurations, the `simple` configuration, normalisation of Arabic-script characters (Yeh/Heh/Kaf variants, diacritics, zero-width characters), trigram search, examples that work; collation/sorting.
4) Print and Markdown export pitfalls with right-to-left text.
5) Libraries (free) for normalising Urdu text.
6) A list of tricky test strings.
Evidence rules: every significant claim needs an inline URL and the date of the source. Prefer first-party documentation, standards, changelogs and maintainers' issue trackers; label vendor marketing and forum posts as such; avoid SEO listicles. Use two independent sources for numbers and limits. Separate fact, estimate and opinion. Where something is unknown, outdated or conflicting write UNKNOWN; do not estimate or fill gaps. Do not recommend anything that costs money. Output: (1) executive summary, max 150 words; (2) findings numbered like my questions; (3) a comparison table; (4) a recommended option with reasons, risks and a step-by-step implementation outline sized for one person; (5) a source list with date and type; (6) at the end: the 5 claims you are least sure of and what would verify each.
```

### R14. Privacy basics for a solo owner
**Answer first:** 1 Where do you live? [Pakistan]. 2 Where do invited people live? [unknown, likely Pakistan/EU/US]. 3 How many invitees? [0-5, personal/educational use].
**Attach:** 01.
```
Objective: Know the minimum data-protection duties and good practice for a small personal web app that stores invited people's email addresses, activity logs and documents.
Context: I am a solo owner building a documentation workspace web app (React 18 + TypeScript front end; Supabase free plan: Postgres with row-level security, Auth, Realtime, Edge Functions; Vercel Hobby; GitHub Actions free). My budget is exactly 0 USD: only free tiers and free software; no paid plans, API credits, domains or subscriptions. Today is October 2026: use sources from 2025-2026 and flag older ones. The attached PDF "context pack" describes what already exists. UI language is English; documents may contain Urdu.
Questions:
1) Do GDPR, UK GDPR or comparable rules apply to a personal project with a few invited collaborators; limits of the household/personal exemption; the position of Pakistan's data-protection law as of October 2026.
2) The lawful basis for sending an invitation email to a named person; consent versus legitimate interest; what regulators said about emailing non-users.
3) Retention and deletion: how long to keep invitation records, audit logs and IP addresses; how to answer an erasure or export request in a Supabase app in practice.
4) A short plain-language privacy notice template for such a project.
5) Processor terms of Supabase, Vercel, Google (Gmail sending) and Google AI services as they apply to me.
Evidence rules: every significant claim needs an inline URL and the date of the source. Prefer first-party documentation, standards, changelogs and maintainers' issue trackers; label vendor marketing and forum posts as such; avoid SEO listicles. Use two independent sources for numbers and limits. Separate fact, estimate and opinion. Where something is unknown, outdated or conflicting write UNKNOWN; do not estimate or fill gaps. Do not recommend anything that costs money. Output: (1) executive summary, max 150 words; (2) findings numbered like my questions; (3) a comparison table; (4) a recommended option with reasons, risks and a step-by-step implementation outline sized for one person; (5) a source list with date and type; (6) at the end: the 5 claims you are least sure of and what would verify each.
```

### R8. Navigation benchmark (screens, not features)
**Answer first:** 1 Which products? [Notion, Linear, Outline, Docmost, GitBook, Obsidian]. 2 Which screens? [organization list, organization page, project home, sidebar, search/command palette, invite flow, mobile]. 
**Attach:** 01.
```
Objective: Compare how document and project tools arrange their navigation so I can refine mine.
Context: I am a solo owner building a documentation workspace web app (React 18 + TypeScript front end; Supabase free plan: Postgres with row-level security, Auth, Realtime, Edge Functions; Vercel Hobby; GitHub Actions free). My budget is exactly 0 USD: only free tiers and free software; no paid plans, API credits, domains or subscriptions. Today is October 2026: use sources from 2025-2026 and flag older ones. The attached PDF "context pack" describes what already exists. UI language is English; documents may contain Urdu. My structure is Organizations > Projects > Documents, with breadcrumbs, a collapsible sidebar, one command palette, a notification bell and an account menu.
Questions: For [Notion, Linear, Outline, Docmost, GitBook, Obsidian] describe in words (with links to official screenshots, docs or changelogs from 2025-2026): 1) the organization/workspace list and switcher; 2) the project/space page; 3) sidebar sections, ordering and what is hidden; 4) search and command palette scopes and prefixes; 5) invitation and onboarding flow, pending-invite handling; 6) mobile navigation; 7) what changed in their navigation in 2025-2026 and why (release notes, design posts); 8) patterns shared by most (which users expect) versus unique ones; 9) three concrete changes I should make to my layout.
Evidence rules: every significant claim needs an inline URL and the date of the source. Prefer first-party documentation, standards, changelogs and maintainers' issue trackers; label vendor marketing and forum posts as such; avoid SEO listicles. Use two independent sources for numbers and limits. Separate fact, estimate and opinion. Where something is unknown, outdated or conflicting write UNKNOWN; do not estimate or fill gaps. Do not recommend anything that costs money. Output: (1) executive summary, max 150 words; (2) findings numbered like my questions; (3) a comparison table; (4) a recommended option with reasons, risks and a step-by-step implementation outline sized for one person; (5) a source list with date and type; (6) at the end: the 5 claims you are least sure of and what would verify each.
```

### Z2. Zero-cost resilience and exit plan
**Answer first:** 1 What is the worst thing to lose? [the documents and the database]. 2 Willing to self-host on a free VM? [maybe]. 
**Attach:** 01, 02, 04.
```
Objective: Make sure the project survives changes to free tiers without paying, and know the exit path.
Context: I am a solo owner building a documentation workspace web app (React 18 + TypeScript front end; Supabase free plan: Postgres with row-level security, Auth, Realtime, Edge Functions; Vercel Hobby; GitHub Actions free). My budget is exactly 0 USD: only free tiers and free software; no paid plans, API credits, domains or subscriptions. Today is October 2026: use sources from 2025-2026 and flag older ones. The attached PDF "context pack" describes what already exists. UI language is English; documents may contain Urdu. The attached limits report describes Supabase Free and Vercel Hobby as of 2026-10-21.
Questions:
1) History 2023-2026 of free-tier changes at Supabase, Vercel, Netlify, Cloudflare, Neon, Turso, Render, Fly.io: what was withdrawn or restricted and how much notice was given.
2) Keeping a Supabase free project from pausing within the terms: what counts as activity, evidence from official sources and from users in 2026.
3) Free backup strategies for Postgres from GitHub Actions: pooler connection, size limits, retention, encryption options that cost nothing, restore drills.
4) Zero-cost alternatives for each layer if one is withdrawn: database with auth and realtime (for example a self-hosted Supabase, PocketBase, Neon/Turso), static hosting and functions (Cloudflare Pages/Workers, Netlify), scheduled jobs; their free limits and terms in 2026.
5) An export-and-move plan: what to export (Markdown zip, SQL dump, storage), how often, and how long a migration would take.
6) Terms checks: non-commercial restrictions (Vercel Hobby), inactivity rules, account closure rules.
Evidence rules: every significant claim needs an inline URL and the date of the source. Prefer first-party documentation, standards, changelogs and maintainers' issue trackers; label vendor marketing and forum posts as such; avoid SEO listicles. Use two independent sources for numbers and limits. Separate fact, estimate and opinion. Where something is unknown, outdated or conflicting write UNKNOWN; do not estimate or fill gaps. Do not recommend anything that costs money. Output: (1) executive summary, max 150 words; (2) findings numbered like my questions; (3) a comparison table; (4) a recommended option with reasons, risks and a step-by-step implementation outline sized for one person; (5) a source list with date and type; (6) at the end: the 5 claims you are least sure of and what would verify each.
```

## 7. After the runs
Each report becomes `docs/19-RESEARCH-<ID>.md` with its sources; I verify the key claims, then update the master plan and ask you for decisions. Never paste API keys or passwords into Gemini or into chat.
