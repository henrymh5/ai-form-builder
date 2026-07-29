-- Workflow automation: workflows, workflow_runs, workflow_run_steps.
--
-- Versioning decision: draft-only for v1 (no publish-snapshot table like
-- form_versions). Instead, every run copies the definition it executed into
-- workflow_runs.definition_snapshot, so individual runs stay reproducible
-- without the complexity of a full version history for workflows.
--
-- workflow_runs / workflow_run_steps follow the ai_generations pattern
-- (0009): no insert/update/delete policy for `authenticated` at all — rows
-- are written exclusively by the server-side workflow engine via the
-- service-role client, because runs are frequently created from the
-- anonymous public-submission path where there is no authenticated user.

create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  name text not null,
  status text not null default 'paused',
  definition jsonb not null,
  schema_version int not null default 1,
  webhook_secret text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint workflows_status_check check (status in ('enabled', 'paused'))
);

create index workflows_form_id_idx on public.workflows (form_id);

alter table public.workflows enable row level security;

create policy workflows_select_member on public.workflows
  for select
  using (
    exists (
      select 1 from public.forms
      where forms.id = workflows.form_id
        and public.is_workspace_member(forms.workspace_id, 'viewer')
    )
  );

create policy workflows_insert_editor on public.workflows
  for insert
  with check (
    exists (
      select 1 from public.forms
      where forms.id = workflows.form_id
        and public.is_workspace_member(forms.workspace_id, 'editor')
    )
  );

create policy workflows_update_editor on public.workflows
  for update
  using (
    exists (
      select 1 from public.forms
      where forms.id = workflows.form_id
        and public.is_workspace_member(forms.workspace_id, 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.forms
      where forms.id = workflows.form_id
        and public.is_workspace_member(forms.workspace_id, 'editor')
    )
  );

create policy workflows_delete_editor on public.workflows
  for delete
  using (
    exists (
      select 1 from public.forms
      where forms.id = workflows.form_id
        and public.is_workspace_member(forms.workspace_id, 'editor')
    )
  );

create table public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  form_id uuid not null references public.forms (id) on delete cascade,
  response_id uuid not null references public.responses (id) on delete cascade,
  status text not null default 'queued',
  trigger_type text not null default 'response_submitted',
  definition_snapshot jsonb not null,
  attempt int not null default 1,
  is_test boolean not null default false,
  error_code text,
  error_message text,
  claimed_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),

  constraint workflow_runs_status_check
    check (status in ('queued', 'running', 'succeeded', 'failed'))
);

-- Idempotency: at most one non-test run per (workflow, response, attempt).
-- Test runs started from the editor are excluded so a user can re-run a
-- sample response as many times as they like.
create unique index workflow_runs_unique_per_response_idx
  on public.workflow_runs (workflow_id, response_id, attempt)
  where is_test = false;

create index workflow_runs_workflow_id_created_at_idx
  on public.workflow_runs (workflow_id, created_at desc);

create index workflow_runs_queued_running_idx
  on public.workflow_runs (status)
  where status in ('queued', 'running');

alter table public.workflow_runs enable row level security;

create policy workflow_runs_select_member on public.workflow_runs
  for select
  using (
    exists (
      select 1 from public.workflows
      join public.forms on forms.id = workflows.form_id
      where workflows.id = workflow_runs.workflow_id
        and public.is_workspace_member(forms.workspace_id, 'viewer')
    )
  );

-- No insert/update/delete policy — written exclusively by the server-side
-- workflow engine via the service-role client (see header comment).

create table public.workflow_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.workflow_runs (id) on delete cascade,
  node_id text not null,
  node_type text not null,
  status text not null,
  input jsonb,
  output jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,

  constraint workflow_run_steps_status_check
    check (status in ('running', 'succeeded', 'failed', 'skipped'))
);

create index workflow_run_steps_run_id_idx on public.workflow_run_steps (run_id);

alter table public.workflow_run_steps enable row level security;

create policy workflow_run_steps_select_member on public.workflow_run_steps
  for select
  using (
    exists (
      select 1 from public.workflow_runs
      join public.workflows on workflows.id = workflow_runs.workflow_id
      join public.forms on forms.id = workflows.form_id
      where workflow_runs.id = workflow_run_steps.run_id
        and public.is_workspace_member(forms.workspace_id, 'viewer')
    )
  );

-- No insert/update/delete policy — written exclusively by the server-side
-- workflow engine via the service-role client (see header comment).

-- ---------------------------------------------------------------------------
-- Table privileges (0011's lesson: RLS restricts rows, but the underlying
-- GRANT is still required or every statement is rejected before RLS even
-- runs). `anon` gets nothing — public submission handling stays exclusively
-- behind Route Handlers using the service-role client.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.workflows to authenticated;
grant select on public.workflow_runs to authenticated;
grant select on public.workflow_run_steps to authenticated;

grant select, insert, update, delete on
  public.workflows,
  public.workflow_runs,
  public.workflow_run_steps
to service_role;
