-- Rollback of 0005. Run in the Supabase SQL editor (contains drop statements). Then re-run private.mcp_gate from 0003_projects_docs.sql.
drop function if exists public.mcp_audit_recent(text, int);
alter table public.projects drop column if exists ai_paused;
