-- Rollback of 0009 (run in the SQL editor; drop statements). Then re-run revert_draft from 0006_derived_edits.sql.
drop trigger if exists change_sets_log_purge on public.change_sets;
drop trigger if exists docs_log_purge on public.docs;
drop trigger if exists tokens_log_purge on public.mcp_tokens;
drop function if exists private.log_purge();
drop function if exists public.trash_edits(uuid[]);
drop function if exists public.restore_edits(uuid[]);
drop function if exists public.trash_pages(uuid[]);
drop function if exists public.restore_pages(uuid[]);
drop policy if exists "docs read trash" on public.docs;
drop policy if exists "change sets purge" on public.change_sets;
drop policy if exists "tokens purge" on public.mcp_tokens;
drop table if exists public.trash_log;
alter table public.change_sets drop column if exists deleted_at, drop column if exists deleted_by, drop column if exists purge_after;
alter table public.docs drop column if exists deleted_by, drop column if exists purge_after;
