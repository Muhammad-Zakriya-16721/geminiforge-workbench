# Architecture and folder tree (current, verified 2026-10-20)

```
geminiforge-workbench/
├─ README.md                  short intro
├─ package.json  tsconfig.json  vite.config.ts  vite.final.config.ts
├─ index.html  main.tsx       entry of the normal (Vercel) build
├─ index.final.html  main.final.tsx   entry of the single-file "Canvas" build
├─ build.mjs                  parts/*.tsx  ->  App.tsx            (git-ignored output)
├─ build-final.mjs            parts/ + canvas/ stubs -> App.final.tsx (git-ignored)
├─ prodcheck.sh               build + preview :5198 + check.mjs
│
├─ parts/                     *** SOURCE OF TRUTH of the app (28 files, joined in name order) ***
│  ├─ 00-header.tsx           imports, icons, types (View union)
│  ├─ 10-data.tsx 11-chapters.tsx 12-content.tsx   built-in spec data and chapter text
│  ├─ 20-styles.tsx           the whole CSS string (const CSS)
│  ├─ 30-store.tsx            Zustand store, routing (parseHash/toHash/sanitizeView)
│  ├─ 31-index.tsx 35-features.tsx 36-audit.tsx 40-primitives.tsx   search index, features, helpers
│  ├─ 45-engine.tsx 46-smart.tsx   answer engine ("ask a question")
│  ├─ 47-cloud.tsx            Supabase client, auth, cloud sync of user state
│  ├─ 48-content-live.tsx     runtime content download / version check / cache
│  ├─ 49-ai.tsx               Review inbox, AI access (tokens, message, activity)
│  ├─ 49-live.tsx             Realtime channel (owner live updates)
│  ├─ 49-pages.tsx            Added pages: Markdown renderer (Md), editor, history
│  ├─ 49-peek.tsx             side panel with highlighted passage
│  ├─ 49-trash.tsx            Trash view + ConfirmDialog/useConfirm
│  ├─ 49-tools.tsx            backup/llms.txt export, access checks, tab badge, AI trail
│  ├─ 50-composer.tsx 55-notes.tsx 60-doc.tsx 70-pane.tsx 80-views.tsx 82-settings.tsx 84-history.tsx 85-audit.tsx
│  └─ 90-app.tsx              App root, shortcuts, layout
├─ canvas/                    stubs that replace cloud parts in the Canvas build (same file names)
│
├─ supabase/
│  ├─ migrations/             0001..0012 (+ *_down.sql). Applied live. Order matters. See list below.
│  ├─ functions/docs-mcp/     core.mjs (tools), index.ts (Deno entry), deno.json, test.mjs
│  └─ seed/                   seed SQL for built-in content
├─ scripts/                   content-map/make-seed-sql/seed-content/snapshot/verify-content, mcp-e2e*.mjs
│
├─ qa-ai.mjs qa-content.mjs qa-merge.mjs qa-auto.mjs qa.mjs check.mjs ffcheck.mjs   Playwright suites
├─ dbg*.mjs prof*.mjs shots*.mjs pdf.mjs      throw-away debugging/profiling/screenshot helpers (candidates for /tools)
└─ docs/                      all documentation (this folder)
```

## Migrations (what each does)
0001 workbench_state (per-user saved state) · 0002 content (typed spec tables + RLS + get_content_bundle) · 0003 projects_docs (projects, docs, doc_revisions, MCP read functions, tokens, gate) · 0004 ai_space (change sets, drafts, risk, accept/reject) · 0005 ai_access (pause, audit view) · 0006 derived_edits (write-back to typed tables) · 0007 ai_guide · 0008 realtime · 0009 trash (soft delete, restore, purge, log) · 0010 token_edit (edit tokens, messages, versions, events) · 0011 retention (pg_cron, clear activity, audit detail, injection flag) · 0012 hardening (gate limits, policies, unicode, locks).

## Data flow
Reader: browser -> `get_content_bundle` RPC (public) -> `applyContent` -> screens. Owner: browser (Supabase Auth JWT) -> RLS tables + RPCs (`decide_drafts`, `trash_*`, ...). AI: client -> Edge Function `docs-mcp` -> `mcp_*` SQL functions (service role) -> `private.mcp_gate` (token, limits) -> drafts only. Accepting runs `private.apply_draft`. Realtime tells the owner's browser to refetch.

## R0: planned restructure (NOT done; do it after the product model, with a green test run before and after)
The code is split by number prefix inside one flat `parts/`. Target:
```
src/app/ (shell, routing, store)   src/features/{reader,ai-space,pages,trash,access,projects,orgs,editor}/   src/lib/{supabase,markdown,diff}/
supabase/{migrations,functions,seed}   tests/{e2e,mcp,content}   tools/{debug,profile,screenshots}   docs/
```
Steps: (1) keep `build.mjs` working by adding a manifest file listing parts in order; (2) move one feature at a time into src/features with real ES imports; (3) once every part is a module, delete build.mjs and the `canvas/` mechanism (use a Vite alias for the Canvas build); (4) move dbg/prof/shots to tools/. Why not now: the concatenated single-module design shares globals; renaming breaks the Canvas stubs and every test selector at once.
