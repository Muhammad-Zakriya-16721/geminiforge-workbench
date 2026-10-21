-- Rollback of 0013 (SQL editor). mcp_propose_set: re-run the function from 0012 state (remove the advisory lock line).
select 1; -- drop function public.mcp_note_failure(text, text, text, text);  (run by hand: DROP hangs the AI SQL tool)
grant execute on function private.derived_edit(uuid, text, text, boolean) to authenticated;
