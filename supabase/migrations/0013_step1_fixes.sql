-- 0013: round 19 fixes. Applied live (tested in rolled-back transactions).
--   * mcp_propose_set takes a per-token advisory lock so the waiting-edits cap and idempotency keys cannot race.
--   * private.derived_edit is no longer executable by signed-in users (only the definer functions that need it call it).
--     private.apply_draft MUST stay executable by `authenticated`: public.decide_drafts is not security definer and calls it (it checks can_edit_project itself).
do $$ declare def text; d2 text; begin
  select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'mcp_propose_set';
  d2 := replace(def, 'if s.err is not null then return private.mcp_fail(''propose_changes'', s.token_id, s.err, s.hint); end if;', 'if s.err is not null then return private.mcp_fail(''propose_changes'', s.token_id, s.err, s.hint); end if;
  perform pg_advisory_xact_lock(hashtextextended(''gf-propose:'' || s.token_id::text, 0));');
  if d2 = def then raise exception 'replace failed'; end if;
  execute d2;
end $$;
revoke execute on function private.derived_edit(uuid, text, text, boolean) from authenticated, anon, public;

-- calls rejected by the Edge Function's argument validation never reach the gate; the function notes them for the owner's activity log
-- (capped at 200 rows per token per day so it cannot be used to flood the log)
create or replace function public.mcp_note_failure(p_token text, p_ip text, p_tool text, p_msg text) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.mcp_tokens;
begin
  select * into t from public.mcp_tokens k where k.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex') and k.revoked_at is null;
  if t.id is null then return; end if;
  if not private.mcp_take('fail:' || t.id, 200) then return; end if;
  insert into private.mcp_audit (token_id, project_id, tool, ref, status, detail) values (t.id, t.project_id, left(coalesce(p_tool, 'unknown'), 60), null, 'mcp:bad_arguments', left(coalesce(p_msg, ''), 300));
end;
$$;
revoke all on function public.mcp_note_failure(text, text, text, text) from public, anon, authenticated;
grant execute on function public.mcp_note_failure(text, text, text, text) to service_role;
