# START HERE (hand-off for any AI / IDE / developer)

Written 2026-10-20 by the previous assistant. Read this file fully before touching anything.
Owner: the repo owner (use "they/them" if unsure). Style they want: direct answers, no fluff, never guess, confirm facts, save important facts in the docs.

## 0. ASK THE OWNER FIRST (do not start building before these are answered)
1. Which job first? Default order: (a) multi-organization/project/document model (docs/01-PRODUCT-VISION.md), (b) editing of all chapters/documents in the app, (c) token safety upgrade (docs/04), (d) API keys + ask-the-docs (docs/06).
2. "May I run the full test suite and rebuild before and after every change?" (yes is the default; it takes ~6 minutes).
3. "Can you give me the keys through the Supabase secret dialog (never in chat)?" (OpenRouter etc., docs/06).
4. "Should I restructure the folders now (docs/02-ARCHITECTURE.md, section R0) or after the product model is done?" Recommendation: after.
5. Confirm still-open decisions in docs/03-ROADMAP-NEXT.md section "Decisions".
Never publish, delete, or change database policies without saying what and why first.

## 1. What this project is
GeminiForge V20 Workbench: a web app (React 18 + TypeScript + Zustand, own dark CSS) that reads/edits a large technical specification, backed by Supabase (Postgres + RLS + Realtime + Edge Function) and hosted on Vercel. The owner now wants it to become a general **documentation workspace**: Organizations > Projects > project documents, with one master file per project that links to phases, steps, decisions and checkmarks (docs/01).
Headline safety rule already built: anything an AI edits through MCP waits in an "AI space" (Review inbox) until the owner accepts it.

## 2. Live systems (no secrets here; ask the owner for access)
- Repo: github.com/Muhammad-Zakriya-16721/geminiforge-workbench (public), branch `main` auto-deploys to Vercel.
- Site: https://geminiforge-workbench.vercel.app
- Supabase project ref: `plbvgcnyfclillatpowc` (DB, Auth, Realtime, Edge Function `docs-mcp` v5, pg_cron job `gf-purge`).
- MCP address: https://plbvgcnyfclillatpowc.supabase.co/functions/v1/docs-mcp (anonymous read; tokens `dk_<64 hex>` add propose mode).
- One auth user = the only admin (table `app_admins`).

## 3. Commands (run from repo root)
```
npm install
node build.mjs                      # REQUIRED before tsc/vite: concatenates parts/*.tsx into App.tsx (git-ignored)
npx tsc --noEmit -p .
npx vite build --outDir dist-prod
npx vite build -c vite.final.config.ts   # single-file "Canvas" build (parts replaced by canvas/*.tsx stubs)
./prodcheck.sh                      # builds, serves dist-prod on :5198, runs check.mjs (expect 101/101)
BASE=http://127.0.0.1:5198/ node qa-ai.mjs        # AI space UI with mocked Supabase (expect 92/92)
BASE=http://127.0.0.1:5198/ node qa-content.mjs   # expect 12/12
node supabase/functions/docs-mcp/test.mjs         # offline MCP tests (31/31)
MCP_URL=https://plbvgcnyfclillatpowc.supabase.co/functions/v1/docs-mcp node scripts/mcp-e2e.mjs   # live (13/13)
```
Source of truth is `parts/*.tsx` (sorted by file name = order in the final file). Never edit `App.tsx`.

## 4. Gotchas that cost hours (all verified)
- The app has its own `const CSS` string: the browser `CSS` object must be read as `globalThis.CSS`.
- Supabase: an UPDATE also needs the SELECT policy; soft-delete with RLS fails -> use security-definer RPCs. All `mcp_*` functions are service_role only; `search_path=''` everywhere.
- Supabase MCP SQL tool: `DROP`, unqualified `UPDATE`, `TRUNCATE` and plain `delete from x;` statements hang it (wrap deletes in `with x as (delete ... returning 1) select ...`, always give UPDATE a WHERE); `DROP` statements hang it (use `create or replace`, new names, `alter policy`); `delete from` inside a function body is fine; patch an existing function by a DO block that `replace()`s inside `pg_get_functiondef(...)` text and `execute`s it (see migration 0012). Test with a DO block that ends in `raise exception 'RESULT ...'` (rolls back). Long runs: background.
- A function call and a subselect in one statement see the same snapshot.
- Playwright tests mock Supabase with `route.fulfill`; count queries need `access-control-expose-headers: content-range`; fake session key `sb-<ref>-auth-token`.
- React 18 must stay (Canvas runtime). Do not add `key={contentRev}` to the root (scroll-jump bug).
- Never put keys in chat, code, or git. Edge Function secrets go through the Supabase dashboard.
- ZWNJ/ZWJ must stay allowed in text (Urdu/Persian/emoji).

- PL/pgSQL: `if not (a or b)` does not fire when the condition is NULL; wrap nullable checks in coalesce(). Run tests/rls-matrix.sql after any change to access functions.

## 5. Where everything is documented
See docs/README.md (index + tree). Order to read: 00 (this), 01 vision, 02 architecture, 03 roadmap, 04 security, 05 ideas, 06 API plan, 07 known limits. Older material: `geminiforge_project_notes.md` (round-by-round log, the most detailed history), `ROADMAP.md` (superseded by 03 but still has the research answers), `SETUP.md`.

## 6. Paste-ready prompt for the next AI
```
You are taking over the GeminiForge Workbench. Read docs/00-START-HERE-FOR-NEXT-AI.md, then docs/01..07 in order.
Do not write code yet. Reply with: (1) a 10-line summary of what exists, (2) the questions from section 0, (3) your proposed
first task and its test plan. Rules: never guess (verify in code/DB/logs), never ask for or print secrets, run the full tests
before and after every change, commit small, update docs/geminiforge_project_notes.md with a new ROUND section after each session,
and keep AI edits behind the Review inbox.
```
