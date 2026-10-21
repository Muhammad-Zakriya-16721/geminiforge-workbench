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
- **P5a DONE 2026-10-22** Organizations + membership + RLS rewrite (`app_admins` stays super-admin).  **P5b DONE 2026-10-22** project switcher, project settings, invitation links.  **P5c** node types, templates, master/phase views, checkboxes, decisions.
- **P5d** direct editor for every document + migrate derived spec docs to native (docs/01 step 6).  **P5e** drag-and-drop order, internal links, backlinks.
- **P6** retention setting + timer UI; token upgrade (docs/04 items 1-5); anomaly alerts.
- **P7** ask-the-docs (OpenRouter pinned model list, verbatim quote check, cache, 40-question eval) after keys.
- **P8** CI (GitHub Actions: build, tsc, qa suites, mcp tests), Edge deploy from CI, backups to a private repo, monitoring, restructure R0 (docs/02).
- **P9** features from docs/05, ordered by the owner.

## Decisions (answered 2026-10-21)
- Visibility: only signed-in users see documentation. Public pages are allowed only as optional **share links** the owner creates on purpose (one project or one document, with an optional expiry, revocable). NOTE: today the project `geminiforge` is `public`, the content bundle RPC is public and the MCP has anonymous read tools, so this is a change to build (see P5-V below), not the current behaviour.
- Language: English only (no RTL/Urdu UI work; Urdu text in documents must still be allowed).
- Roles (recommendation, based on documented models of Docmost: workspace Owner/Admin/Member + space Full access/Can edit/Can view; BookStack: stackable roles with per-item overrides): Organization: Owner, Admin, Member. Project: Manager (settings, members, tokens), Editor (edit + accept AI edits), Viewer (read). AI tokens are a separate kind of principal (read or propose, limited to ids/projects), never a member. You are the only user now, so build the tables and keep all rules inside `private.can_read_project` / `private.can_edit_project`; add a "Commenter" role only if you invite people who must not edit.
- MFA and leaked-password protection are not available on the free plan (owner), so they are dropped from the to-do list.
- Documentation (content) corrections happen after the whole app is finished (claims ledger A1-A13 waits).

## P5-V Private-by-default build (new, from the answer above)
1. Make `get_content_bundle` require a signed-in member (or a valid share link). 2. Sign-in screen as the first screen. 3. MCP: anonymous tools return nothing; every AI client uses a token (the Gemini path token already works). 4. `share_links` table (id, project/doc, expires_at, revoked_at, hashed secret) + read-only reader route `#/s/<secret>`. 5. Tests: anon gets nothing from every table/RPC/MCP tool; share link works until revoked. Confirm with the owner before switching, because the site stops working for signed-out visitors.

## Decisions still open
1. DECIDED 2026-10-21: a member sees only the projects they are invited to; organization admins see all (design and schema in docs/09 section B). 2. Keep the Canvas single-file build? 3. Which AI clients matter (Gemini app tested; Claude Code/Cursor untested)?
