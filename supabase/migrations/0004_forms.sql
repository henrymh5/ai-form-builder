-- forms table + RLS (plan §6 order 4/10). The draft lives as JSONB directly
-- on this table (schema decision [A4]) — form_versions (0005) holds only
-- immutable published snapshots.

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete restrict,
  title text not null,
  slug text not null,
  status form_status not null default 'draft',
  draft_definition jsonb not null,
  draft_revision int not null default 1,
  schema_version int not null,
  published_version_id uuid,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint forms_published_requires_version
    check (status <> 'published' or published_version_id is not null)
);

create unique index forms_slug_active_unique_idx
  on public.forms (lower(slug))
  where deleted_at is null;

create index forms_workspace_id_idx on public.forms (workspace_id);
create index forms_workspace_updated_at_idx on public.forms (workspace_id, updated_at desc);

alter table public.forms enable row level security;

create policy forms_select_member on public.forms
  for select
  using (public.is_workspace_member(workspace_id, 'viewer'));

create policy forms_insert_editor on public.forms
  for insert
  with check (public.is_workspace_member(workspace_id, 'editor'));

create policy forms_update_editor on public.forms
  for update
  using (public.is_workspace_member(workspace_id, 'editor'))
  with check (public.is_workspace_member(workspace_id, 'editor'));

-- Hard delete is intentionally not exposed via RLS delete policy — forms are
-- soft-deleted via an UPDATE to deleted_at (covered by forms_update_editor).

-- Optimistic-concurrency save function (plan §6): the draft is only written
-- if the caller's `expected_revision` still matches; returns the new
-- revision, or no rows if the caller's basis was stale (409 in the API).
create function public.save_form_draft(
  p_form_id uuid,
  p_expected_revision int,
  p_definition jsonb
)
returns table (draft_revision int)
language sql
security invoker
as $$
  update public.forms
  set draft_definition = p_definition,
      draft_revision = forms.draft_revision + 1,
      updated_at = now()
  where forms.id = p_form_id
    and forms.draft_revision = p_expected_revision
  returning forms.draft_revision;
$$;
