-- responses + response_answers (plan §6 order 7/10, §7.2).

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete restrict,
  form_version_id uuid not null references public.form_versions (id) on delete restrict,
  session_id uuid not null references public.form_sessions (id) on delete restrict,
  status response_status not null default 'completed',
  submitted_at timestamptz not null default now(),
  duration_ms int,
  idempotency_key text not null,
  read_at timestamptz,
  note text,

  constraint responses_session_idempotency_unique unique (session_id, idempotency_key)
);

create index responses_form_id_submitted_at_idx on public.responses (form_id, submitted_at desc);
create index responses_session_id_idx on public.responses (session_id);

alter table public.responses enable row level security;

create policy responses_select_member on public.responses
  for select
  using (
    exists (
      select 1 from public.forms
      where forms.id = responses.form_id
        and public.is_workspace_member(forms.workspace_id, 'viewer')
    )
  );

create policy responses_update_editor on public.responses
  for update
  using (
    exists (
      select 1 from public.forms
      where forms.id = responses.form_id
        and public.is_workspace_member(forms.workspace_id, 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.forms
      where forms.id = responses.form_id
        and public.is_workspace_member(forms.workspace_id, 'editor')
    )
  );

create policy responses_delete_editor on public.responses
  for delete
  using (
    exists (
      select 1 from public.forms
      where forms.id = responses.form_id
        and public.is_workspace_member(forms.workspace_id, 'editor')
    )
  );

create table public.response_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses (id) on delete cascade,
  field_id text not null,
  field_type text not null,
  value jsonb,
  created_at timestamptz not null default now(),

  constraint response_answers_response_field_unique unique (response_id, field_id)
);

create index response_answers_response_id_idx on public.response_answers (response_id);

alter table public.response_answers enable row level security;

create policy response_answers_select_member on public.response_answers
  for select
  using (
    exists (
      select 1 from public.responses
      join public.forms on forms.id = responses.form_id
      where responses.id = response_answers.response_id
        and public.is_workspace_member(forms.workspace_id, 'viewer')
    )
  );

create policy response_answers_delete_editor on public.response_answers
  for delete
  using (
    exists (
      select 1 from public.responses
      join public.forms on forms.id = responses.form_id
      where responses.id = response_answers.response_id
        and public.is_workspace_member(forms.workspace_id, 'editor')
    )
  );
