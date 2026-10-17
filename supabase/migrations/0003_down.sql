-- Rollback for 0003_projects_docs.sql (the typed tables, get_content_bundle() and the web app are not touched by 0003).
-- Run in the Supabase SQL editor (the AI tooling cannot run drop statements).
drop trigger if exists content_meta_sync on public.content_meta;
drop function if exists private.on_content_version(), private.sync_derived_docs(), private.apply_draft(uuid, uuid), private.mcp_log(uuid, uuid, text, text, text), private.mcp_fail(text, uuid, text, text),
  private.ref_ok(text[], text), private.mcp_gate(text, text, text, boolean), private.mcp_take(text, int), private.docs_before_write(), private.docs_after_write(),
  private.can_read_project(uuid), private.can_edit_project(uuid), private.is_project_owner(uuid) cascade;
drop function if exists public.mcp_list_projects(text, text), public.mcp_outline(text, text, text, text, text, int, int), public.mcp_search(text, text, text, text, text, int, int),
  public.mcp_read(text, text, text, text[]), public.mcp_dataset(text, text, text, text, jsonb, int, int), public.mcp_refs(text, text, text, text),
  public.mcp_changes(text, text, text, timestamptz, int), public.mcp_propose(text, text, text, text, int, text, jsonb, text, text), public.mcp_get_draft(text, text, text, uuid),
  public.decide_draft(uuid, boolean), public.create_mcp_token(text, text, text, text[], int, int);
drop table if exists private.mcp_usage, private.mcp_audit;
drop table if exists public.mcp_tokens, public.doc_drafts, public.doc_revisions, public.docs, public.project_members, public.projects cascade;
