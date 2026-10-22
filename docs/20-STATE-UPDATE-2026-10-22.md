# State update and corrections (2026-10-22). Newer than the other documents in this file set; where they disagree, THIS wins.

## Verified live facts (2026-10-22)
- Database: PostgreSQL 17.11, 15 MB used of 500 MB, 33 public tables, RLS on all; 5 migrations applied live (the repo holds more migration files because early ones were applied differently). About 42 SECURITY DEFINER functions in `public`, 28 callable by signed-in users (advisor lint 0029), none by anon. A `private` schema holds 35 helper functions (can_read_project, can_edit_project, project_role, org_role...). Extensions installed: plpgsql, supabase_vault, pg_cron, pg_stat_statements, pgcrypto (schema `extensions`), uuid-ossp; pg_trgm, unaccent, ltree, pgtap, vector available but not installed. Advisor: leaked-password protection off (Pro feature).
- Existing table layout: `docs` (body, rev, position integer, parent_ref, deleted_at...), `doc_revisions` (rev, full body snapshot, content_hash). One built-in public project readable by anon on purpose.
- Repo is now PUBLIC on GitHub (may go private again). Frontend already on Vite 8.3.4, TypeScript 7.0.2, React 18.3.1; browser, invitation function and MCP function already use `sb_publishable_` / `sb_secret_` keys (the MCP function falls back to the legacy variable). No `vercel.json` (no security headers or CSP yet). Sign-in is email + password only; no MFA; no account-creation path in the app yet. CI has no secret scanning, Dependabot, CodeQL or dependency audit.

## Corrections to older documents
- The Canvas single-file build is DROPPED (owner, 2026-10-22). Ignore every statement about Canvas as a runtime.
- Supabase Free has NO managed database backups (verified on Supabase's backup page: daily backups only on Pro/Team/Enterprise; free projects must export their own data). Any statement that Free has backups is wrong.
- Supabase stops auto-granting new `public` tables AND functions to anon/authenticated/service_role: opt-out setting 2026-04-28, default for new projects 2026-05-30, all existing projects 2026-10-30 (existing objects keep their grants). Behaviour for new functions on 10-30 is not confirmed.
- Current versions (npm, 2026-10-22): react 19.3.1, zustand 5.0.16, vite 8.3.5, @codemirror/merge 6.12.3, @codemirror/lang-markdown 6.5.2, react-aria-components 1.22.1, react-router 8.5.0, @tanstack/react-router 1.170.x, jotai 3.0.1, @reduxjs/toolkit 2.13.0, rehype-sanitize 6.0.0, react-markdown 10.1.0.

## Owner decisions (do not re-ask)
Zero cost (D11). English only (D2). Custom animated dropdowns stay (D13). Share links are PROJECT-WIDE, read-only, expiring, revocable (D14). Markdown source editor with preview (CodeMirror 6), not WYSIWYG.

## Added after the Part C audit (2026-10-22)
- Full git history (53 commits) scanned: no secrets, no real email addresses, no zip/env/trace files; all commits authored "Claude (noreply@anthropic.com)".
- Live site headers today: Vercel already sends HSTS (`max-age=63072000; includeSubDomains; preload`); no CSP, no Referrer-Policy; `/share` returns 404; static files send `access-control-allow-origin: *`. Vercel Hobby deployment protection covers preview/deployment URLs only, not the production domain.
- Supabase Auth on Free: sessions never expire by default; time-box, inactivity timeout and single-session are Pro-only; passkeys are experimental; Turnstile/hCaptcha supported; TOTP MFA available; default SMTP is best-effort and rate limited.
- Design decisions proposed in master plan v2.1 section 3: share links at `/share#secret` with a server proxy, invite-bound account creation, TOTP + AAL2 in sensitive RPCs, real CSP after moving inline CSS.
