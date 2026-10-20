# Roadmap from 2026-10-20 (supersedes ROADMAP.md; that file keeps the research answers)

## Done (do not redo)
Live updates (Realtime), review inbox + side panel + highlight, Trash + retention + restore, token edit/messages/versions/log, backup + llms.txt, access checks, import/export pages, hardening (0011, 0012). Tests: qa-ai 92, qa-content 12, prodcheck 101, mcp 31+13.

## Owner decisions made (2026-10-20)
- Multiple projects are a MAIN feature: Organization > Project > project documents, each with own settings (docs/01).
- Owner must be able to edit generated pages/chapters directly; chapters and everything else are not fixed (add/edit/move/delete).
- Trash retention must be chosen in the app (toggle/timer) (docs/07).
- API keys later, when we get to ask-the-docs; plan all APIs now (docs/06).
- The daily research task was deleted (it only cost tokens). Do research on demand.
- The master-file -> phases -> steps/decisions/checkmarks structure is the core product (docs/01).

## Phases
- **P5a** Organizations + membership + RLS rewrite (keep `app_admins` as super-admin).  **P5b** project switcher, routes, project settings.  **P5c** node types, templates, master/phase views, checkboxes, decisions.
- **P5d** direct editor for every document + migrate derived spec docs to native (docs/01 step 6).  **P5e** drag-and-drop order, internal links, backlinks.
- **P6** retention setting + timer UI; token upgrade (docs/04 items 1-5); anomaly alerts.
- **P7** ask-the-docs (OpenRouter pinned model list, verbatim quote check, cache, 40-question eval) after keys.
- **P8** CI (GitHub Actions: build, tsc, qa suites, mcp tests), Edge deploy from CI, backups to a private repo, monitoring, restructure R0 (docs/02).
- **P9** features from docs/05, ordered by the owner.

## Decisions still open (ask)
1. Org roles: owner/admin/editor/viewer enough? 2. Can an org member see all projects or only invited ones? 3. Public sites per project (published reader URL)? 4. Keep Canvas single-file build alive? 5. Language(s) for UI (English only vs Urdu RTL)? 6. Which AI clients matter (Gemini app, Claude, Cursor, ChatGPT)?
