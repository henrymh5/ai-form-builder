-- Data retention / purge functions (plan §6 order 10/10, §13.3).
--
-- Called manually or via a scheduled job (pg_cron, P2 — plan §19); not
-- wired to an automatic schedule in V1.

-- Purges rate-limit windows older than 1 day (windows are fixed-size and
-- never queried after they close).
create function public.purge_old_rate_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limits
  where window_start < now() - interval '1 day';
$$;

-- Purges non-completed form sessions (and their cascade-deleted events)
-- older than 90 days (plan §6 "Aufbewahrung: Purge nicht-abgeschlossener
-- Sessions + Events nach 90 Tagen"). Completed sessions with a linked
-- response are retained until the response itself is deleted.
create function public.purge_stale_form_sessions()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.form_sessions
  where status <> 'completed'
    and started_at < now() - interval '90 days';
$$;

-- Purges AI generation logs older than 12 months (plan §5.4).
create function public.purge_old_ai_generations()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.ai_generations
  where created_at < now() - interval '12 months';
$$;
