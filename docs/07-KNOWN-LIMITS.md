# Known limits and fixes

| # | Limit | Fix |
|---|-------|-----|
| 1 | Only one project and one admin; spec chapters are generated (`derived`), edited only through AI inbox | docs/01 steps 1-6 |
| 2 | Free plan: project pauses after ~1 week of inactivity (pg_cron then does not run) | purge also runs when Trash opens; upgrade or keep-alive ping |
| 3 | Realtime free plan: 200 connections, public visitors get no live updates (they check on focus) | fine for now |
| 4 | supabase-js WebSocket issues (2768, 2613): explicit WebSocket transport set; resync on SUBSCRIBED; retry loop fixed | monitor |
| 5 | Calls rejected by the Edge Function's zod validation leave no audit row | log in Edge Function before returning (small change in core.mjs) |
| 6 | No per-revision deletion, no rebase of stale AI edits | stale edit -> "ask AI to redo" button |
| 7 | Pending-cap / idempotency races | advisory lock on token id in mcp_propose_set |
| 8 | Trashed page with an applied AI edit is purged after the retention time | retention is becoming a per-project setting (below) |
| 9 | Peek panel on phones is not a true modal (no focus trap) | make it a `<dialog>` below 900 px |
| 10 | Test rows remain (revoked e2e tokens, rejected drafts) | delete them with Trash/Clear tools |
| 11 | `diffWordsWithSpace` on huge texts may be slow | jsdiff `timeout` option |
| 12 | Canvas single-file build lacks all cloud features | by design (stubs) |
| 13 | Large files: parts/ is one global scope | restructure R0 |
| 14 | Edge Function must be redeployed by pasting files (deploy tool) | add `supabase functions deploy` to CI with a token |

## Trash timer (owner request)
Make retention a setting: `projects.settings.trash_days` (1-365, default 30) and a per-delete choice ("keep in Trash for 7 / 30 / 90 days / forever"). Implementation: `trash_edits/trash_pages` read the project setting instead of the literal `interval '30 days'`; Trash page shows "purges in N days" (exists) and lets the owner change the date of one item (`update ... set purge_after`) via a new RPC `set_purge_after(ids, ts)`. Cron and `purge_trash()` already honour `purge_after`.
