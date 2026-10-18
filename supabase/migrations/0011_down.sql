-- Rollback of 0011 (run in the SQL editor). Re-run risk_of from 0004 and mcp_audit_recent from 0005 afterwards if you need the old versions.
select cron.unschedule('gf-purge');
drop function if exists private.purge_expired();
drop function if exists public.clear_activity(text, int);
drop function if exists public.purge_trash();
drop function if exists public.mcp_audit_log(text, int);
alter table private.mcp_audit drop column if exists detail;
