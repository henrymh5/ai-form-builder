-- Workflow trigger expansion: schedule / scheduled_once / webhook_inbound /
-- manual trigger types alongside response_submitted (0012/0013).
--
-- Runs without a triggering response (schedule/webhook/manual) carry a
-- digest context instead: the new responses since the workflow's last run,
-- with the window frozen into workflow_runs.trigger_context at enqueue time
-- so retries reuse the exact same window. workflows.last_digest_at is
-- advanced AT ENQUEUE TIME — each response is covered by at most one digest.
--
-- The pg_cron + pg_net job that ticks the scheduler is deliberately NOT a
-- migration (it needs the deployed app URL and CRON_SECRET) — see
-- docs/cron-setup.sql.

-- ---------------------------------------------------------------------------
-- 1. Runs without a response — and digest runs span multiple forms, so the
--    single form reference becomes optional too.
-- ---------------------------------------------------------------------------
alter table public.workflow_runs alter column response_id drop not null;
alter table public.workflow_runs alter column form_id drop not null;

-- ---------------------------------------------------------------------------
-- 2. Uniform idempotency key replacing the response-only unique index.
--    Values: 'response:<id>' | 'schedule:<tickISO>' | 'once:<runAtISO>'
--            | 'webhook:<nanoid>' | 'manual:<nanoid>'
-- ---------------------------------------------------------------------------
alter table public.workflow_runs add column dedupe_key text;

update public.workflow_runs set dedupe_key = 'response:' || response_id::text;

alter table public.workflow_runs alter column dedupe_key set not null;

drop index public.workflow_runs_unique_per_response_idx;

create unique index workflow_runs_unique_per_dedupe_idx
  on public.workflow_runs (workflow_id, dedupe_key, attempt)
  where is_test = false;

-- ---------------------------------------------------------------------------
-- 3. Trigger context snapshot: digest window and/or inbound webhook payload,
--    frozen at enqueue time.
-- ---------------------------------------------------------------------------
alter table public.workflow_runs add column trigger_context jsonb;

-- ---------------------------------------------------------------------------
-- 4. Scheduling + digest state on workflows. next_run_at is computed by
--    application code (computeNextRunAt) on save/enable and re-computed by
--    the cron route after each fire.
-- ---------------------------------------------------------------------------
alter table public.workflows add column next_run_at timestamptz;
alter table public.workflows add column last_digest_at timestamptz;

create index workflows_due_schedule_idx on public.workflows (next_run_at)
  where status = 'enabled' and next_run_at is not null;

-- ---------------------------------------------------------------------------
-- 5. Inbound webhook token — separate from webhook_secret (which is the
--    OUTBOUND HMAC signing key and must never appear in a URL/proxy log).
--    Application code (nanoid) generates tokens for new workflows in
--    createWorkflow; this backfill only covers pre-existing rows. Built from
--    two core gen_random_uuid() calls (256 bits) rather than pgcrypto's
--    gen_random_bytes — no extension dependency, and this is a one-time
--    backfill for existing rows, not the production token generator.
-- ---------------------------------------------------------------------------
alter table public.workflows add column inbound_token text;

update public.workflows
set inbound_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where inbound_token is null;

alter table public.workflows alter column inbound_token set not null;

create unique index workflows_inbound_token_idx on public.workflows (inbound_token);

-- No RLS changes: workflow_runs stays service-role-write-only (0012), and
-- the new workflows columns are covered by the existing editor policies +
-- table-level grants from 0011/0013.
