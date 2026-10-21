# Remaining work: audit of every request and decision (2026-10-21)

Method: read all 70 user messages of the project transcript, docs/geminiforge_project_notes.md (rounds 1-18), docs/ROADMAP.md, docs/claims_ledger.md, then checked the code (grep), the live database (SQL), advisors and CI config. Status words: DONE (verified), PARTLY, NOT DONE, NEEDS YOU. Anything I could not check is marked UNVERIFIED.

## A. Verified current state
Live DB: 1 project, 120 derived docs, 0 native docs, `project_members` = 0 rows (admin comes only from `app_admins`), 7 tokens (1 active), 8 drafts (0 pending), 1 cron job, extensions pg_cron + vault, Vault holds 0 secrets, scratch tables from round 13 are gone. No API key exists anywhere in git history, the work tree or Vault (searched). Advisors: security = 9 "signed-in users can execute SECURITY DEFINER function" warnings (intentional RPCs, each checks `can_edit_project`; app calls them) + leaked-password protection off; performance = 3 unused indexes (info) + `docs` has two permissive SELECT policies (`docs read`, `docs read trash`).

## B. Remaining from earlier plans (with where it was asked)
| # | Item | Asked / decided | Status |
|---|------|-----------------|--------|
| B1 | Organizations > projects > documents, switcher, per-project settings | latest message; round 12 phase 1/5 | NOT DONE in UI. DB has `projects`, `project_members` (empty), `project_id` on docs/tokens/drafts. Code still picks "the first project" (`.limit(1)` in 49-ai, 49-pages, 49-tools). The reader/content bundle is GeminiForge-only (not per project) |
| B2 | Master file > phases > steps/decisions/checkmarks as the core product | latest message | NOT DONE (design in docs/01) |
| B3 | Everything editable: chapters, sections, add/remove, all other things | latest message | NOT DONE. Today generated pages change only through the AI inbox; native "Added pages" are editable; no owner "edit this passage"; no add/remove chapter |
| B4 | Ask-the-docs with an LLM (verified quotes, eval) | round 12 phase 4, user said use OpenRouter | NOT DONE. Local rule-based answer engine exists (DONE, user's first request) |
| B5 | Store the 5 OpenRouter keys (one Edge secret via dashboard dialog), "test 1 key through me, then rotate" | round 12/13, user message "test 1 key through u, so I rotate it" | NOT DONE. Keys were pasted in chat, so treat them as exposed; no key was ever saved |
| B6 | Trash timer chosen in the app | latest message | NOT DONE (retention is fixed 30 days; design in docs/07) |
| B7 | OAuth stage (Supabase Auth OAuth server) so clients get short-lived tokens | round 12 stage S3 | NOT DONE; Gemini works today with path tokens |
| B8 | Token safety upgrades (path vs header kind, rotation, prefix+checksum, anomaly alerts) | latest message, docs/04 | NOT DONE |
| B9 | Verify the MCP in Claude Code / Cursor (only Gemini was tested) | round 12 phase 2 | NOT DONE (UNVERIFIED for those clients) |
| B10 | Content re-audit: claims ledger A1-A13 need your decisions; app text changes only after you decide | rounds 1-6 ("after the page is done") | NEEDS YOU. In-app review page exists |
| B11 | Reader upgrades from the research: stable block anchors + copy link, search hits via Custom Highlight API, MiniSearch, section review dates/states, decision log, backlinks panel, reading progress, focus mode, text/contrast controls, listen (speechSynthesis), single-key shortcut toggle (WCAG 2.1.4), `hidden=until-found` | round 12 UX picks | PARTLY: peek highlight, outline rail scroll-spy, "AI edited" trail, text size/width/font exist; the rest NOT DONE |
| B12 | Context pack builder, health report, evidence ledger, weekly digest, AGENTS.md export | round 14 NEXT / ROADMAP phase 6 | NOT DONE (llms.txt export DONE) |
| B13 | Native-project import/export zip, mdast Markdown reader | round 14 NEXT | PARTLY: single-file import (.md) and export, JSON backup DONE; zip and project-level export NOT DONE |
| B14 | Hash-chained audit, stale-edit rebase, per-revision delete, pending-cap race fix, log failed validation | rounds 14-17 skipped list | NOT DONE |
| B15 | Single TSX file for Canvas "when I ask" | standing rule | Canvas build exists and compiles (stubs for cloud). It has none of the cloud/AI/multi-project features. Decide if it stays |
| B16 | Gemini "Work/Spark" naming, OAuth-only claims | round 11-12 | Google's pages call it Spark/Task; "Gemini Work" UNCONFIRMED; your Pakistan personal account connects without OAuth today (do not rely on it staying so; re-test) |

## C. Needs you (I cannot do these)
1. Revoke the 1 still-active token (it appears in Supabase request logs) and any test tokens.
2. Decide A1-A13 in docs/claims_ledger.md (or tell me "apply all suggested actions").
3. OpenRouter keys: the notes say multi-account rotation breaks OpenRouter's terms (2026-08-31, s.7(3)); you accepted the risk; free limit is 20 requests/min and 50/day per account without bought credit, 1000/day with $10 credit (one account). Choose: rotate 5 (risk of suspension) or $10 on one account. Enter keys only through the Supabase secret dialog; rotate the ones pasted in chat.
4. The pasted Cloudflare `cfat_` tokens are account-wide API tokens: revoke them in Cloudflare unless you still need them.
5. Turn on leaked-password protection and MFA for the owner login (dashboard).
6. Answer the open questions in docs/03 (roles, visibility, public sites, languages, which AI clients).

## D. Improvements to things that exist (all verified in code/DB)
1. **App-docs / Features page is stale**: parts/35-features.tsx and the changelog stop at v0.4.0 (2026-10-17) and list nothing about the AI space, Trash, tokens, MCP, live updates. package.json version is still 0.4.0. You asked for a page listing everything the app does.
2. **README.md** said "no server needed" (fixed now) and there are two overlapping plan files (ROADMAP.md, 03). This file (08) is now the single "what is left" list.
3. **CI** (.github/workflows/ci.yml) runs typecheck, build, qa-merge, qa-auto, qa, check but NOT `qa-ai.mjs` (92 tests), `qa-content.mjs`, the MCP offline tests (31) or the SQL/RLS checks. Whether CI is green on GitHub is UNVERIFIED (no GitHub access from here).
4. **Policies**: merge `docs read` + `docs read trash` into one SELECT policy (advisor warning); `mcp_audit_recent` is unused now (replaced by `mcp_audit_log`) and can be dropped from the dashboard (DROP hangs my SQL tool).
5. **Security leftovers**: path tokens in logs (docs/04); pending-cap/idempotency races; `private.apply_draft`/`derived_edit` still granted to `authenticated`; calls rejected by the Edge Function's argument validation leave no audit row; no per-IP limit for the Edge Function before the database call.
6. **Accessibility/UX leftovers from the UI audit**: toast Undo should pause on hover/focus; the peek panel on phones is not a real modal; unsaved Added-page text is lost on navigation without a warning; forced-colors fallback only covers the inbox cards; checkbox targets in lists are 20 px (target 24 px).
7. **Data**: `project_members` is empty and unused, so "editor"/"viewer" roles are untested in the app; every non-admin path is only covered by SQL reasoning, not by tests. Add an RLS matrix test (anon / member / editor / admin x every table).
8. **Free-plan risk**: the project pauses after about a week of no traffic; pg_cron then stops (purge also runs when you open Trash).
9. **Edge Function deploys are manual** (paste files). Add `supabase functions deploy` from CI with a token.

## E. Suggested order (smallest risk first)
1. Quick fixes: D1 (features page + version), D4, D6 items, add qa-ai/qa-content/mcp tests to CI (D3).
2. B6 trash timer (small, SQL + one setting).
3. B1-B3 together as one design (Organizations > projects > master file/phases/steps; editor; migrate the spec to native docs). Needs your answers to C6 first.
4. B8 token upgrades, then B4/B5 ask-the-docs after you pick the key option (C3).
5. B11/B12 reader features, B7 OAuth last.

## F. Progress log
- 2026-10-21 Step 1 done: Features page + changelog + version 0.5.0 list the AI space, Trash, pages, tokens, backup; toast pauses on hover/focus; list checkboxes 24 px; unsaved page text warns on tab close; CI now also runs qa-ai, qa-content and the MCP offline tests. Left from Step 1: merge the two `docs` SELECT policies and drop `mcp_audit_recent` (both need the SQL dashboard because DROP hangs the SQL tool).
- Owner answers 2026-10-21: token revoked; keys not a concern; MFA/leaked-password not available (free plan); docs private + optional share links; English only. See docs/03.
- 2026-10-21 Step 1 completion (round 20), verified:
  - GitHub Actions (read through the public API): the Step 1 commit FAILED in "Browser tests": qa-ai could not find `.env` (git-ignored) and the CI build had no Supabase settings. Fixed: CI sets the two public VITE_SUPABASE_* values for the job and qa-ai reads them from the environment. Earlier commits were green.
  - SQL (supabase/migrations/0013_step1_fixes.sql, applied): per-token advisory lock in `mcp_propose_set` (cap and idempotency cannot race); `private.derived_edit` no longer callable by signed-in users (`private.apply_draft` must stay callable because `decide_drafts` is not security definer; accept and undo were re-tested as the signed-in owner for a new page and for a generated chapter); `mcp_note_failure` + Edge Function v6: calls refused for wrong arguments now appear in the activity log with the reason (capped at 200 rows per token per day); tested live with a temporary token (revoked).
  - Still by hand in the Supabase SQL editor (AI SQL tool hangs on DROP): supabase/migrations/0013_dashboard_only.sql = merge the two `docs` SELECT policies + drop `mcp_audit_recent`.
  - UI: the page panel on phones is now a real modal dialog (role dialog, aria-modal, Tab kept inside, list behind it inert); Accept/Reject buttons in the page panel were already added; forced-colors: the app already draws an outline for every focus ring (checked in 20-styles), the inbox cards got their own.
  - Tests: qa-ai 95, qa-content 12, MCP offline 33, live e2e 13.
