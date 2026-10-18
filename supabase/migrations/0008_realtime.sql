-- 0008: live updates for the signed-in owner. The app subscribes (Postgres Changes) only while an admin is signed in and uses each event as a signal to refetch.
-- Never publish mcp_tokens or doc_revisions; no replica identity full on docs (delete events are not filtered by row security).
alter publication supabase_realtime add table public.content_meta, public.doc_drafts, public.change_sets, public.docs;
