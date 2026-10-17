-- Leftovers from building 0003 (superseded functions and scratch tables). Run once in the Supabase SQL editor.
drop function if exists private.mcp_hit(text, int), private.mcp_scope(text, text, text, boolean), private.rebuild_links(uuid), public._f1(int);
drop table if exists public._t1, public._t2, public._t3, public._t4, public._t5, public._t6, public._t7;
-- optional retention for the usage/audit tables (keeps 30 days)
-- delete from private.mcp_usage where day < current_date - 7;
-- delete from private.mcp_audit where ts < now() - interval '30 days';
