# GeminiForge Workbench: plan for the next sessions (written 2026-10-18)

Research behind this plan: four read-only research reports (Supabase Realtime; trash and deletion; MCP instructions and token security; review-inbox UX), plus my own checks of the live database, the code and the logs. Items marked UNVERIFIED could not be confirmed (GitHub API was blocked in the research sessions, so most repository dates are unknown).

## 1. Answers to the open questions

| Question | Answer |
|---|---|
| Why is "Added pages" empty? | It lists only documents that are NOT generated from the specification data (accepted new pages, pages you write). Gemini's two accepted edits changed generated chapter text, which shows in the chapters (revision 2). Its two new-page proposals never reached the database because of a bug I introduced (fixed, see section 2). |
| Can the AI message be edited while a token is active? | Yes, already: it is saved per project and read at every `get_guide` call, so a change applies to the next call of every token. No token change needed. A per-token override is planned (Phase 4). |
| Why does the page jump to the top? | When new documentation arrives, the app remounts the whole screen (`key={contentRev}` in `parts/90-app.tsx`). Interim fix shipped: the reading position is restored. Real fix is Phase 1. |

## 2. Problems and errors found

| # | Problem | Status |
|---|---|---|
| E1 | New-document proposals failed with "unavailable" since the reserved-prefix check (ambiguous column `ref`) | Fixed live; regression check added to `scripts/mcp-e2e-propose.mjs` |
| E2 | Undo of an accepted new page failed with "new row violates row-level security" | Fixed (`revert_draft` is now security definer with an explicit owner check) |
| E3 | Whole screen remounts on documentation update, scroll jumps | Interim fix (scroll restore); proper fix Phase 1 |
| E4 | Review inbox cannot open the edited page | Phase 2 |
| E5 | Revoked tokens, old drafts, old activity cannot be deleted | Phase 3 |
| E6 | Failed validation (wrong tool arguments) leaves no trace, so repeated AI retries cannot be diagnosed; audit rows store only a status code, not the message | Phase 4 |
| E7 | A path token appears in the request address. Supabase logs full request URLs (confirmed for REST calls in your own logs). Function-level logs showed only boot lines | Mitigate: read-only, short expiry, header tokens where the client allows; Phase 4 separates "path" tokens |
| E8 | `get_guide` repeats the same sentence for every generated kind (wasted tokens) | Phase 4 (group by edit mode) |
| E9 | No retention for `private.mcp_audit` / `mcp_usage` (grow forever) | Phase 3 |
| E10 | Free plan pauses after a week of inactivity; scheduled jobs then do not run | Design purges to be idempotent and also checked at read time |
| E11 | Four unused indexes reported (INFO only) | Leave until real traffic exists |
| E12 | `supabase-js` 2.118.0 may silently fall back to long-polling in Vite builds, so Realtime reports SUBSCRIBED but delivers nothing (supabase-js issue 2768, opened 2026-10-15, open) | Phase 1: set the WebSocket transport explicitly and test that events arrive |
| E13 | Stale-JWT `CHANNEL_ERROR` after waking a hidden tab (supabase-js issue 2613, open) | Phase 1: on error call `setAuth` with the fresh token and resubscribe |
| E14 | Some test rows remain (revoked tokens, rejected drafts, one soft-deleted page) | Removed in Phase 3 with the new delete tools |

## 3. Phases

STATUS (2026-10-18): Phases 1, 2, 3 and 4 (edit/message/log parts) are DONE and tested (qa-ai 73/73). Phase 4 leftovers: audit v2 (store error text), shorter get_guide, token prefix/checksum, rotation, path-token kind, tools/list cache. Phases 5-8 not started.

### Phase 1: live updates without a visible reload (small, high value)
1. Remove `key={contentRev}`. Make components re-render from the store instead of remounting; memoise heavy parts on `id + updated_at`. Keep the scroll restore as a safety net.
2. Admin only: one Supabase Realtime channel (Postgres Changes) for `content_meta`, `doc_drafts`, `change_sets`, `docs`. Publish them with `alter publication supabase_realtime add table ...` (never publish `mcp_tokens` or `doc_revisions`; no `replica identity full` on `docs`).
3. Use the event only as a signal: refetch that row by id and update `useStore` for exactly that id.
4. Resync on every `SUBSCRIBED`, on tab visible, and with a slow 5 minute poll as fallback. Call `setAuth` after sign-in and on token refresh. Set `realtime.transport = WebSocket` explicitly and add a test that an event really arrives.
5. Public readers get no WebSocket (free plan allows 200 connections). They check `content_meta` on focus and apply changes in place.
6. Tests: mocked Realtime in Playwright, two-tab manual check, scroll-position test (exists).
Acceptance: accept an edit in tab A; tab B shows it within seconds, scroll untouched, no flash.

### Phase 2: open the edited page from the inbox
1. Click a row in Waiting/Decided to open a right-hand side panel (non-modal region, focus moves in, Esc returns focus to the row, j/k keep working). Buttons: enlarge, open full page. State in the URL (`?peek=<draftId>`), mobile: full-screen sheet.
2. Show the page with the changed passage located and highlighted (CSS Custom Highlight API: Chrome/Edge 105, Firefox 140, Safari 17.2; fall back to a marked block). Chapters open at their section anchor; crates, packs etc. reuse the existing side pane.
3. AI-change markers in the reader (small dot or highlight, toggle), "since your last visit" digest, "viewed" marks, per-edit note sent back to the AI.
4. Auto-mark edits stale when the base text changed, with a banner and a one-click "ask the AI to redo".

### Phase 3: delete, history cleanup and Trash
Rules from the research: 30 day retention; soft delete with an undo toast; only permanent delete gets a heavy confirmation; restore and purge are audited.
1. Data: `deleted_at`, `deleted_by`, `deletion_id`, `purge_after` on change sets and documents; a `trash_events` table (id, type, title, deleted_at, restored_at, purged_at) as tombstones.
2. Functions (security definer, return which ids were refused and why): `trash_items`, `restore_items`, `purge_items(ids, confirm_text)`, `empty_trash(type, confirm_text)`, `purge_trash()` (scheduled, idempotent). Revoke DELETE from the signed-in role so the app can only trash.
3. Protected items (cannot be trashed, only hidden): applied change sets (AI provenance), the current revision and any revision an applied edit depends on.
4. Tokens: no restore (a revoked token must never become valid again). Delete removes the secret and keeps a tombstone without the hash. "Clear revoked and expired" does the same in bulk.
5. Audit rows are append-only (trigger blocks update/delete); only the scheduled purge removes rows after 365 days and writes one summary row.
6. UI: row checkboxes and "Delete selected" on Waiting/Decided, tokens and activity; a Trash page with tabs (All, Pages, Edits, Tokens) and filters (type, deleted by, date, original page, status), "purges in N days" badges, read-only items with Restore and Delete forever; empty trash is two steps (summary of counts, then type EMPTY TRASH).
7. Check first: whether `pg_cron` is enabled on this project (Dashboard, Integrations, Cron). If not, run the purge when the owner opens Trash.
8. Test trash and restore as a real signed-in user: an UPDATE also needs the read policy, which is what broke Undo.

### Phase 4: token and message management
1. Edit in place while active: name, note, expiry (extend or shorten), daily limit, waiting-edits cap, id prefixes (narrowing freely; widening or read to propose asks for confirmation and is audited). The token hash, id and creation date are immutable: column grants plus a trigger.
2. Message versions: an append-only `instruction_versions` table (scope project or token, body, hash, author, time, reason) with an active pointer; rollback moves the pointer. Precedence: fixed server preamble from the token row, then the token override if set, otherwise the project message. Cap about 3,500 characters (Claude Code truncates instructions at 4,096). Reject hidden Unicode instead of silently changing it. Return a `guide_version`.
3. The message never grants authority. Mode, prefixes and limits are checked from the token row on every call.
4. Token format with a prefix and checksum (secret-scanning friendly), last used time, last address hash, client name, call counter, anomaly alerts (new client, spike, repeated failures), rotation with overlap.
5. "Path" tokens as a separate lower-trust kind: read-only default, 7 to 30 day expiry, tight limit.
6. Audit v2: store the error code and message and failed argument validation; cheaper `get_guide` text.
7. Lower `tools/list` cache time for token requests and mark path-token responses private.

### Phase 5: native projects and editor
Project switcher and routes, a generic Markdown reader (safe renderer already exists for Added pages), editor with preview (exists in a basic form), history and restore (exists), import/export zip, cross-project search (MiniSearch), project admin screen, claim-admin flow.

### Phase 6: reader upgrades and extra features
Block anchors and copy link, changed-since-read marker, single-key shortcut toggle, reduced-motion and forced-colors review, context-pack builder, "since last session" brief, AGENTS.md / CLAUDE.md / llms.txt export, decision log, contradiction and number checker, verified-until dates and weekly health report, Markdown export to a repository, scheduled digest of pending edits.

### Phase 7: ask-the-docs
OpenRouter Edge Function with a pinned model order, verbatim quote checks, cache, gap log and a 40 question evaluation. You enter the five keys as one secret through the Supabase secret dialog (never in chat). Test one key first.

### Phase 8: operations and hardening
CI, backup and export, retention jobs, monitoring, Firefox and screen-reader passes, hardening checklist below.

## 4. Security checklist (from the research)
1. Authority only from the token row, checked on every call. Fail closed.
2. Token hash immutable (column grants plus trigger); never selectable from the app.
3. Instruction edits versioned and audited; admin-only; hidden Unicode rejected.
4. Header tokens preferred; path tokens read-only with short expiry; never echo a token in a response or error.
5. Per token and per address rate limits including failed attempts; same error for unknown and expired tokens.
6. Sanitise document text in tool outputs (done: hidden characters stripped, random-id envelope).
7. Test the real clients: whether Gemini obeys `get_guide` text (it called it in the last test); Cursor, Claude.ai, ChatGPT UNVERIFIED.

## 5. Decisions (defaults applied: trash 30 days; accepted edits kept as history until undone; per-token message yes; no WebSocket for public visitors; audit retention not implemented; change any of these on request)
1. Trash retention (default 30 days) and audit retention (default 365 days).
2. Should applied AI edits ever be deletable? Recommendation: no, only hidden.
3. Per-token message as well as the project message? Recommendation: yes.
4. Do public visitors need live updates? Recommendation: no WebSocket for them; update on focus.
5. Order of phases after Phase 1 and 2.

## 6. Source notes
Realtime limits (free plan): 200 connections, 100 messages per second, 1,024 KB change payload. Missed Postgres Changes events are not replayed, so always resync. Delete events are not filtered by row security. Custom Highlight API support from MDN and caniuse (Baseline 2025). Claude Code and Gemini CLI use server instructions; Gemini app, Claude.ai, Cursor and ChatGPT UNVERIFIED. Trash conventions: Notion, Google Drive, Gmail, Linear, BookStack, Outline use about 30 days; Vercel uses type-to-confirm. Repositories worth borrowing ideas from: payloadcms/payload (trash UX, MIT), BookStackApp/BookStack (deletion records, MIT), IBM/mcp-context-forge, obot-platform/obot, mcpjungle/MCPJungle (token and audit features), react-resizable-panels (MIT), jsdiff (BSD-3). langchain-ai/agent-inbox was archived on 2026-09-20, borrow ideas only.
