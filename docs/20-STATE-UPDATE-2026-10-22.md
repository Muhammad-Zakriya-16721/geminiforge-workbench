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

## Owner decisions added 2026-10-22 (do not re-ask)
D15 project-wide share shows all NON-restricted documents. D16 TOTP mandatory for owner, org admins and project managers. D17 the repo stays public; therefore never upload unencrypted data as workflow artifacts (any signed-in GitHub user can download artifacts; default retention 90 days). D18 Gmail will be Supabase Auth custom SMTP.

## Added after the Part E+F audit (2026-10-22; details docs/22)
- Verified: Supabase pause = low activity over 7 days; restore window after a pause is 1 YEAR on the live page (the MCP docs search index still returns 90 days: stale); Edge Functions block outbound ports 25 and 587 (465 not documented), free wall-clock 150 s; Vercel Hobby cron = once a day, +-59 min; GitHub disables scheduled workflows in a public repo after 60 days without activity; Gmail app passwords need 2-Step Verification (not security-keys-only), no Advanced Protection, revoked on password change; Healthchecks Hobbyist 20 checks; UptimeRobot Free 50 monitors / 5 min; Neon Free 100 projects x 1 GB, no card; Backblaze B2 first 10 GB free; GitHub artifacts 90 days default (public max 90).
- UNVERIFIED: B2 sign-up without card (likely, phone number probably needed), personal-Gmail daily cap, `smtp.gmail.com:465`, exact auth/storage coverage of `supabase db dump`, whether a role other than `postgres` can dump RLS tables, mail-scanner behaviour.
- Design: ops_keepalive table read by Vercel cron + GitHub schedule; nightly dump restored in the same job, `age`-encrypted, 14-day artifact + B2; Healthchecks + UptimeRobot; quarterly Neon exit drill. Report code bugs listed in docs/22 section 3.
- Open owner questions: Q26 dedicated Gmail, Q27 B2 sign-up, Q28 two offline copies of the age key, Q29 Healthchecks/UptimeRobot accounts.

## Research status
Done and audited: A+B (docs/19), C (docs/21), E+F (docs/22). Prompts for the remaining four runs (5 D+G, 6 AI/MCP, 7 features, 8 UX/visual) are in docs/23.

## Added after the Part D+G audit (2026-10-22; details docs/24)
- Verified: WCAG 2.5.8 AA 24x24 CSS px; 3.2.6 is Level A; axe finds about 57% on average; WCAG 3.0 still a Working Draft (2026-09-10); React 19.3 (2026-09-09) stable ViewTransition and Fragment Refs; Vite 8 default target Chrome/Edge 111, Firefox 114, Safari 16.4; public-repo standard runners free; WebKit quota 60% / 80% of disk; versions: vitest 5.0.5, vite-plugin-pwa 2.0.0, workbox 7.4.1, eslint 10.13.0, react-aria-components 1.22.1, oxlint 1.89.0, biome 2.6.2, web-vitals 6.2.3, typescript-eslint 8.72.0, knip 6.42.1, MCP Inspector 2.12.0, pa11y 10.0.0.
- Our TypeScript is 7.0.2: typescript-eslint supports only TypeScript <6.1 (TS 7.0 has no programmatic API; 7.1 beta on npm since 2026-10-20), and eslint-plugin-jsx-a11y is stale (last release 2024-10-26, ESLint <=9). Lint plan = Oxlint + tsc.
- Vercel Speed Insights free tier: Real Experience Score only, 10,000 events per rolling 30 days then collection pauses at least 14 days; no LCP/INP/CLS values.
- Code audit: org tabs are state-backed role=tab buttons without arrow keys/tabindex/panels; no skip link, no per-route title or focus handling; control borders --line/--line2 are 1.04 to 1.62:1 (3:1 needed where a border is the only identifier); Select aria-controls points at a wrapper without the listbox role. Good already: 5 native dialogs, popups portalled into the open dialog, APG-style select-only combobox, motion setting, toast pause on hover.
- Open: Q30 route-backed tabs, Q31 React Aria spike, Q32 devices for screen-reader tests, Q33 offline scope.
