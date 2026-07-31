-- Provisions the pg_cron + pg_net job that drives scheduled/one-off workflow
-- triggers (POST /api/cron/workflows every 5 minutes). This is deliberately
-- NOT a Supabase migration: it needs the deployed app's public URL and the
-- CRON_SECRET at the time it's run, neither of which a migration file can
-- know across environments (local/staging/prod all differ).
--
-- Run this once per environment in the Supabase SQL editor (or `psql`)
-- after setting CRON_SECRET in the app's environment variables. Re-running
-- it is safe — it unschedules any existing job with the same name first.
--
-- Local dev: pg_net can't reach `localhost` from inside the Supabase
-- Docker network, so scheduled triggers don't fire locally via this job.
-- Test them by calling the route directly instead:
--   curl -X POST http://localhost:3000/api/cron/workflows \
--     -H "Authorization: Bearer $CRON_SECRET"

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('workflow-scheduler-tick')
where exists (select 1 from cron.job where jobname = 'workflow-scheduler-tick');

select cron.schedule(
  'workflow-scheduler-tick',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := '{{APP_URL}}/api/cron/workflows',
    headers := jsonb_build_object(
      'Authorization', 'Bearer {{CRON_SECRET}}',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Replace {{APP_URL}} (e.g. https://your-app.example.com) and
-- {{CRON_SECRET}} (must match the app's CRON_SECRET env var) before running.
