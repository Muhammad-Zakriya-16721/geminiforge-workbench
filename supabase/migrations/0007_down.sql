-- Rollback of 0007 (run in the SQL editor; contains drop statements). Then re-run public.mcp_read and public.mcp_outline from 0003_projects_docs.sql.
drop function if exists public.mcp_guide(text, text, text);
drop function if exists private.edit_mode(text, text);
alter table public.projects drop column if exists ai_guide;
