-- Rollback of 0004 (AI space). Run in the Supabase SQL editor. Contains drop statements, so it is not run through the MCP tool.
-- Afterwards re-run the apply_draft, mcp_propose, mcp_get_draft, decide_draft and docs_after_write definitions from 0003_projects_docs.sql.
drop function if exists public.revert_draft(uuid);
drop function if exists public.decide_drafts(uuid[], boolean, text);
drop function if exists public.mcp_propose_set(text, text, text, text, text, jsonb, text, text);
drop function if exists private.draft_result(text, text, jsonb);
drop function if exists private.risk_of(text, text, boolean, boolean);
drop function if exists private.bad_chars(text);
alter table public.doc_revisions drop column if exists draft_id;
alter table public.mcp_tokens drop column if exists max_pending, drop column if exists last_client;
alter table public.doc_drafts drop column if exists change_set_id, drop column if exists new_doc, drop column if exists result_title, drop column if exists result_body,
  drop column if exists risk_score, drop column if exists risk_flags, drop column if exists token_id, drop column if exists applied_rev, drop column if exists reject_reason, drop column if exists reverted_at;
drop table if exists public.change_sets;
