-- Rollback of 0014 (SQL editor). Re-run trash_edits / trash_pages / revert_draft with `interval '30 days'` from 0009 first, then:
-- drop function public.set_trash_timer(uuid[], uuid[], int); drop function private.trash_until(uuid); alter table public.projects drop column trash_days;
select 1;
