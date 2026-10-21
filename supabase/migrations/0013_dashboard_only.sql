-- 0013 (RUN BY HAND in the Supabase SQL editor; the AI SQL tool hangs on DROP statements and rolls the batch back)
-- 1. one SELECT policy on docs instead of two (advisor: multiple permissive policies)
alter policy "docs read" on public.docs using ((deleted_at is null and (select private.can_read_project(project_id))) or (deleted_at is not null and source = 'native' and (select private.can_edit_project(project_id))));
drop policy "docs read trash" on public.docs;
-- 2. replaced by public.mcp_audit_log
drop function public.mcp_audit_recent(text, int);
