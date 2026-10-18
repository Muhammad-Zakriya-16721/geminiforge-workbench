-- Rollback of 0006. Run in the Supabase SQL editor (contains drop statements).
-- Then re-run the 0004 definitions of private.docs_after_write, public.mcp_propose_set, private.apply_draft and public.revert_draft from 0004_ai_space.sql.
drop function if exists public.mcp_list_drafts(text, text, text, text, int);
drop function if exists private.derived_check(public.docs, text, jsonb, text);
drop function if exists private.derived_edit(uuid, text, text, boolean);
drop function if exists private.jreplace(jsonb, text, text);
drop function if exists private.jcount(jsonb, text);
