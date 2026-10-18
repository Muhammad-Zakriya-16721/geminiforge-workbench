-- Rollback of 0008 (run in the SQL editor).
alter publication supabase_realtime drop table public.content_meta, public.doc_drafts, public.change_sets, public.docs;
