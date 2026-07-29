-- Workflows become a standalone, workspace-scoped entity instead of being
-- owned by a single form. A workflow's trigger can now reference MULTIPLE
-- forms — the selection lives both in the trigger node's JSONB config
-- (`config.formIds`, the UI source of truth) and in a normalized join table
-- `workflow_form_triggers` (the enqueue-lookup source of truth), kept in
-- sync by every repository writer (lib/db/repositories/workflows.ts).
--
-- `workspace_id` replaces `form_id` as the RLS anchor on `workflows` — a
-- workflow no longer belongs to one form's workspace, it belongs to a
-- workspace directly. `workflow_runs.form_id` is untouched: a run is always
-- for one response of one specific form, regardless of how many forms the
-- workflow's trigger is configured for.
--
-- Ordering matters: policies referencing `workflows.form_id` must be
-- dropped before the column itself is dropped.

-- ---------------------------------------------------------------------------
-- 1. New workspace anchor, backfilled from the form each workflow currently
--    belongs to (live/dev data at time of writing: zero workflow rows, but
--    this must still be correct for any environment that has some).
-- ---------------------------------------------------------------------------
alter table public.workflows
  add column workspace_id uuid references public.workspaces (id) on delete cascade;

update public.workflows w
set workspace_id = f.workspace_id
from public.forms f
where f.id = w.form_id;

alter table public.workflows alter column workspace_id set not null;

create index workflows_workspace_id_idx on public.workflows (workspace_id);

-- ---------------------------------------------------------------------------
-- 2. Join table: which forms trigger which workflows. This is what
--    lib/db/repositories/workflow-runs.ts's `listEnabledWorkflowsForForm`
--    queries on every public submission — a plain indexed join, not a JSONB
--    containment scan.
-- ---------------------------------------------------------------------------
create table public.workflow_form_triggers (
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  form_id uuid not null references public.forms (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (workflow_id, form_id)
);

create index workflow_form_triggers_form_id_idx on public.workflow_form_triggers (form_id);

-- ---------------------------------------------------------------------------
-- 3. Data migration: seed the join table from the old form_id, and stamp the
--    same form id into each workflow's trigger node config (`formIds`), so
--    existing definitions keep working under the new multi-form schema
--    (lib/workflow-schema/nodes.ts's trigger config gets `formIds` with a
--    zod `.default([])` — this backfill just makes existing rows already
--    reflect their one prior form instead of relying on the default).
-- ---------------------------------------------------------------------------
insert into public.workflow_form_triggers (workflow_id, form_id)
select id, form_id from public.workflows;

update public.workflows
set definition = jsonb_set(
  definition,
  '{nodes}',
  (
    select coalesce(jsonb_agg(
      case when node->>'type' = 'trigger'
        then jsonb_set(node, '{config,formIds}', to_jsonb(array[form_id::text]))
        else node
      end
    ), '[]'::jsonb)
    from jsonb_array_elements(definition->'nodes') as node
  )
);

-- ---------------------------------------------------------------------------
-- 4. Rewrite `workflows` RLS on workspace_id — no more join through `forms`.
-- ---------------------------------------------------------------------------
drop policy workflows_select_member on public.workflows;
drop policy workflows_insert_editor on public.workflows;
drop policy workflows_update_editor on public.workflows;
drop policy workflows_delete_editor on public.workflows;

create policy workflows_select_member on public.workflows
  for select
  using (public.is_workspace_member(workspace_id, 'viewer'));

create policy workflows_insert_editor on public.workflows
  for insert
  with check (public.is_workspace_member(workspace_id, 'editor'));

create policy workflows_update_editor on public.workflows
  for update
  using (public.is_workspace_member(workspace_id, 'editor'))
  with check (public.is_workspace_member(workspace_id, 'editor'));

create policy workflows_delete_editor on public.workflows
  for delete
  using (public.is_workspace_member(workspace_id, 'editor'));

-- ---------------------------------------------------------------------------
-- 5. Rewrite the run/step select policies — they used to join
--    workflows -> forms to find the workspace; now workflows carries it
--    directly.
-- ---------------------------------------------------------------------------
drop policy workflow_runs_select_member on public.workflow_runs;

create policy workflow_runs_select_member on public.workflow_runs
  for select
  using (
    exists (
      select 1 from public.workflows
      where workflows.id = workflow_runs.workflow_id
        and public.is_workspace_member(workflows.workspace_id, 'viewer')
    )
  );

drop policy workflow_run_steps_select_member on public.workflow_run_steps;

create policy workflow_run_steps_select_member on public.workflow_run_steps
  for select
  using (
    exists (
      select 1 from public.workflow_runs
      join public.workflows on workflows.id = workflow_runs.workflow_id
      where workflow_runs.id = workflow_run_steps.run_id
        and public.is_workspace_member(workflows.workspace_id, 'viewer')
    )
  );

-- ---------------------------------------------------------------------------
-- 6. RLS for the join table. The insert check additionally requires the
--    referenced form to belong to the SAME workspace as the workflow —
--    otherwise a workspace member could attach another workspace's form id
--    to their own workflow's trigger and receive that workspace's response
--    data through the enqueue path. This is enforced at the DB level, not
--    just in application code.
-- ---------------------------------------------------------------------------
alter table public.workflow_form_triggers enable row level security;

create policy workflow_form_triggers_select_member on public.workflow_form_triggers
  for select
  using (
    exists (
      select 1 from public.workflows
      where workflows.id = workflow_form_triggers.workflow_id
        and public.is_workspace_member(workflows.workspace_id, 'viewer')
    )
  );

create policy workflow_form_triggers_insert_editor on public.workflow_form_triggers
  for insert
  with check (
    exists (
      select 1 from public.workflows
      join public.forms on forms.id = workflow_form_triggers.form_id
      where workflows.id = workflow_form_triggers.workflow_id
        and forms.workspace_id = workflows.workspace_id
        and public.is_workspace_member(workflows.workspace_id, 'editor')
    )
  );

create policy workflow_form_triggers_delete_editor on public.workflow_form_triggers
  for delete
  using (
    exists (
      select 1 from public.workflows
      where workflows.id = workflow_form_triggers.workflow_id
        and public.is_workspace_member(workflows.workspace_id, 'editor')
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Drop the old column last — its index (workflows_form_id_idx) drops
--    with it automatically.
-- ---------------------------------------------------------------------------
alter table public.workflows drop column form_id;

-- ---------------------------------------------------------------------------
-- 8. Grants (0011's lesson: RLS restricts rows, but the underlying GRANT is
--    still required or every statement is rejected before RLS ever runs).
-- ---------------------------------------------------------------------------
grant select, insert, delete on public.workflow_form_triggers to authenticated;

grant select, insert, update, delete on public.workflow_form_triggers to service_role;
