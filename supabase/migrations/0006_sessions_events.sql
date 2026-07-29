-- form_sessions + form_events (plan §6 order 6/10, §7.2).
--
-- Anonymous visitors never get a direct RLS policy on these tables — all
-- public writes go through Route Handlers using the service-role client
-- after explicit server-side validation (plan §7.2/§11.2). RLS here only
-- grants read access to authenticated workspace members; everyone else,
-- including anon, is denied by the absence of a matching policy (default
-- deny once RLS is enabled).

create table public.form_sessions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete restrict,
  form_version_id uuid not null references public.form_versions (id) on delete restrict,
  status form_session_status not null default 'started',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_page_id text,
  duration_ms int,
  is_test boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

create index form_sessions_form_id_started_at_idx
  on public.form_sessions (form_id, started_at desc);
create index form_sessions_form_version_id_idx on public.form_sessions (form_version_id);

alter table public.form_sessions enable row level security;

create policy form_sessions_select_member on public.form_sessions
  for select
  using (
    exists (
      select 1 from public.forms
      where forms.id = form_sessions.form_id
        and public.is_workspace_member(forms.workspace_id, 'viewer')
    )
  );

create table public.form_events (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete restrict,
  form_version_id uuid not null references public.form_versions (id) on delete restrict,
  session_id uuid not null references public.form_sessions (id) on delete cascade,
  event_type form_event_type not null,
  page_id text,
  field_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index form_events_form_id_created_at_idx on public.form_events (form_id, created_at);
create index form_events_session_id_idx on public.form_events (session_id);
create index form_events_form_id_event_type_created_at_idx
  on public.form_events (form_id, event_type, created_at);

alter table public.form_events enable row level security;

create policy form_events_select_member on public.form_events
  for select
  using (
    exists (
      select 1 from public.forms
      where forms.id = form_events.form_id
        and public.is_workspace_member(forms.workspace_id, 'viewer')
    )
  );
