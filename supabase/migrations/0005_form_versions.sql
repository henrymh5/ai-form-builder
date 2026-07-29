-- form_versions (immutable published snapshots) + publish_form() transaction
-- function (plan §6 order 5/10, §10.1).

create table public.form_versions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete restrict,
  version_number int not null,
  schema_version int not null,
  definition jsonb not null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint form_versions_form_version_unique unique (form_id, version_number)
);

create index form_versions_form_id_version_idx
  on public.form_versions (form_id, version_number desc);

alter table public.forms
  add constraint forms_published_version_fk
  foreign key (published_version_id) references public.form_versions (id)
  deferrable initially deferred;

alter table public.form_versions enable row level security;

create policy form_versions_select_member on public.form_versions
  for select
  using (
    exists (
      select 1 from public.forms
      where forms.id = form_versions.form_id
        and public.is_workspace_member(forms.workspace_id, 'viewer')
    )
  );

-- No insert/update/delete policy for regular users — versions are created
-- exclusively by publish_form() below (security definer), and are otherwise
-- immutable (enforced by the trigger further down).

-- ---------------------------------------------------------------------------
-- publish_form(): validates the caller's revision, snapshots the current
-- draft as an immutable version, and flips the form's published pointer —
-- all within one transaction (plan §10.1). Business-rule validation (Zod +
-- validateFormDefinition) happens in the application layer BEFORE this is
-- called; this function only enforces the revision check and the atomic
-- snapshot + pointer update.
-- ---------------------------------------------------------------------------
create function public.publish_form(
  p_form_id uuid,
  p_expected_revision int,
  p_user_id uuid
)
returns table (version_number int, version_id uuid)
language plpgsql
security invoker
as $$
declare
  v_form record;
  v_next_version int;
  v_version_id uuid;
begin
  select * into v_form
  from public.forms
  where id = p_form_id
  for update;

  if not found then
    raise exception 'Formular nicht gefunden.' using errcode = 'P0002';
  end if;

  if v_form.draft_revision <> p_expected_revision then
    raise exception 'Die Formularrevision ist veraltet.' using errcode = 'P0001';
  end if;

  select coalesce(max(fv.version_number), 0) + 1 into v_next_version
  from public.form_versions fv
  where fv.form_id = p_form_id;

  insert into public.form_versions (form_id, version_number, schema_version, definition, created_by)
  values (p_form_id, v_next_version, v_form.schema_version, v_form.draft_definition, p_user_id)
  returning id into v_version_id;

  update public.forms
  set published_version_id = v_version_id,
      status = 'published',
      updated_at = now()
  where id = p_form_id;

  return query select v_next_version, v_version_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Immutability guard: form_versions rows are insert-only (plan §3.3).
-- ---------------------------------------------------------------------------
create function public.reject_form_version_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Veröffentlichte Formularversionen sind unveränderlich.'
    using errcode = 'P0001';
end;
$$;

create trigger form_versions_prevent_update
  before update on public.form_versions
  for each row execute function public.reject_form_version_mutation();

create trigger form_versions_prevent_delete
  before delete on public.form_versions
  for each row execute function public.reject_form_version_mutation();
