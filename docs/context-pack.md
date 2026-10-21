# Context pack: GeminiForge Workbench (the app, not its documents)
Date: 2026-10-21. Use this as background for every research prompt.

## What it is
A documentation workspace that one owner uses, with invited collaborators and AI tools. Structure: Organizations > Projects > Documents. The first project holds a large technical specification ("GeminiForge V20": chapters, a library of crates/packs/prompts, a rule-based question answering engine). Other projects hold ordinary Markdown pages. The planned core product: a master file with phases, steps, sub-steps with check marks, and decisions. Everything is editable by the owner.

## Stack and limits
React 18 + TypeScript + Zustand, own dark CSS (no UI library, no Tailwind). Supabase free plan (Postgres with row-level security, Auth, Realtime, Edge Functions, pg_cron). Vercel hobby plan (static site + serverless functions, auto-deploy from GitHub). GitHub Actions CI with Playwright browser tests. No paid services unless named. English UI only; Urdu text inside documents must be possible. Solo owner; today is October 2026.

## What exists (v0.7.0)
- Start page = Organizations (cards or list, search, filter, sort, create, rename, soft delete, restore). Organization page: Projects, People, Invitations, Activity, Settings. Project home with documents and a question bar.
- Roles: organization owner / admin / member; project manager / editor / viewer. Members see only projects they are invited to; invitations are single-use links bound to the invited email, hashed in the database, optional email through a serverless function.
- Breadcrumbs, one command palette (Ctrl+K) with scopes and prefixes, collapsible sidebar groups, custom animated dropdowns, compact hover areas.
- AI space: AI tools (through an MCP server in a Supabase Edge Function) read documents and propose edits; every proposal waits in a Review inbox with a diff and risk flags; the owner accepts or rejects; undo; Trash with a timer (default: keep until deleted by hand); tokens with limits, audit log, kill switch.
- Live updates, backups (JSON, llms.txt), import/export of single pages.

## Decisions already made
Only signed-in users may see documents (public only through deliberate share links, not built yet). Invited-only access. Keep until deleted by hand is the default for the Trash. Secrets never go into chat, code or git. Documentation content corrections come after the app is finished. Free Supabase plan: no leaked-password protection (TOTP MFA is free per docs/16, to be confirmed in the dashboard).

## Open topics (see the research prompts R1-R12)
Editor technology; master-file data model; private publishing and share links; ask-the-docs with verified quotes; MCP security and OAuth; transactional email; free-plan limits; navigation benchmark; accessibility of custom widgets; import/export; AI-edit review at scale; offline and sync.
