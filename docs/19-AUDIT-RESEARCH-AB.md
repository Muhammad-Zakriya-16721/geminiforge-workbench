# Audit of the ChatGPT Deep Research report, Parts A + B (2026-10-22)
Raw report: `19a-RESEARCH-AB-CHATGPT-RAW.md` (14.6k words). Audited by Claude against registries, Supabase docs and the live project. Verdict: strong report, usable, but it did not see our code or live schema and has the errors below.

## Verified TRUE (primary source)
- Supabase Data API: opt-out setting 2026-04-28; default for new projects 2026-05-30; all existing projects 2026-10-30. Existing objects keep grants. Official opt-in SQL covers tables, sequences AND functions (docs "Securing your API"): `alter default privileges for role postgres in schema public revoke select,insert,update,delete on tables from anon,authenticated,service_role;` + `revoke execute on functions from anon,authenticated,service_role;` + `revoke usage,select on sequences ...;` + `revoke execute on functions from public;`. Dashboard setting: Integrations > Data API > "Default privileges for new entities". Docs also recommend a dedicated `api` schema as an extra boundary.
- React 19.3 (2026-09-09): View Transitions + Fragment refs stable; 19.3.1 on 2026-10-14. Vite 8 uses Rolldown as the single bundler, Node 20.19+/22.12+. MADR 4.0.0 = 2024-09-17. Anchor positioning: webstatus "limited" (Safari 27 available 2026-09-14), keep as enhancement only.
- GitHub Actions: standard runners free for public repos; private Free plan 2,000 min/month, 500 MB artifacts, 10 GB cache.
## WRONG in the report
- "Supabase Free has managed DB backups": FALSE. Supabase backups doc: daily backups only for Pro/Team/Enterprise; Free should export its own data (`db dump`). Master plan was right.
- Version ledger: merge is 6.12.3 (report 6.12.2, called the PDF stale: the PDF was right); react 19.3.1 (not 19.3.0); zustand 5.0.16 (published 2026-10-22); react-aria-components 1.22.1.
- Missed: functions default privileges (see above). Missed our repo state: already Vite 8.3.4, TS 7.0.2, plugin-react 6, React 18.3.1; browser/invite/MCP already use publishable/secret keys (MCP reads SUPABASE_SECRET_KEYS, falls back to SERVICE_ROLE var).
- SQL pitfalls in its samples: pgcrypto lives in schema `extensions`, so `digest()` must be `extensions.digest()` under `search_path=''`; unique INDEX on (project_id,parent_id,order_key) cannot be deferred so a reorder/renumber UPDATE can hit transient duplicate errors (needs deferrable constraint or two-step renumber; not tested); sample schemas assume names that differ from ours (ours: docs.body not body_md, doc_revisions.rev not revision_no, docs.position integer, docs.parent_ref, private.can_read_project/can_edit_project already exist).
## Live facts (checked 2026-10-22)
PG 17.11; DB size 15 MB of 500 MB (largest table 296 kB); unaccent available; 33 public tables all RLS on; 42 definer functions in public, 28 executable by authenticated (lint 0029), 0 by anon; 35 functions in private schema. anon has SELECT grant but no anon policy on workbench_state, app_admins, project_members (harmless, revoke for least privilege). Public anon reads (docs/doc_revisions/projects) go through private.can_read_project (built-in project is public by design).
## Owner decisions raised
1. Canvas single-file build uses React 18; upgrading to 19 may break Canvas. Keep Canvas or drop it?
2. Report says use native `<select>` for simple lists; owner asked for custom animated dropdowns. Keep custom?
3. Share link: document-only first (report recommends) or project-wide?
## Remaining research (see chat): functions default-privilege behaviour on 10-30 for new RPCs; Realtime 2026 pattern (broadcast-from-DB vs postgres_changes); API-schema/RPC-only architecture; revision retention (low priority).
