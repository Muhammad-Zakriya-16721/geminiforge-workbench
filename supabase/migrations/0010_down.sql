-- Rollback of 0010 (run in the SQL editor; drop statements). Then re-run public.mcp_guide from 0007_ai_guide.sql and re-grant update on mcp_tokens if you want the old behaviour.
drop trigger if exists tokens_before_update on public.mcp_tokens;
drop trigger if exists tokens_after_update on public.mcp_tokens;
drop trigger if exists projects_guide_check on public.projects;
drop function if exists private.tokens_before_update();
drop function if exists private.tokens_after_update();
drop function if exists private.projects_guide_check();
drop function if exists private.hidden_text(text);
drop table if exists public.token_events;
drop table if exists public.instruction_versions;
alter table public.mcp_tokens drop column if exists ai_note;
grant update on public.mcp_tokens to authenticated;
