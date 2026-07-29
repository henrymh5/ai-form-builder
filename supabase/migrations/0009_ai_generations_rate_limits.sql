-- ai_generations (usage/cost log) + rate_limits (plan §6 order 9/10, §5.4).

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  form_id uuid references public.forms (id) on delete set null,
  operation text not null,
  prompt_version text not null,
  model text not null,
  input_tokens int,
  output_tokens int,
  latency_ms int,
  status text not null,
  error_code text,
  created_at timestamptz not null default now()
);

create index ai_generations_workspace_id_created_at_idx
  on public.ai_generations (workspace_id, created_at desc);

alter table public.ai_generations enable row level security;

create policy ai_generations_select_member on public.ai_generations
  for select
  using (
    workspace_id is not null and public.is_workspace_member(workspace_id, 'viewer')
  );

-- No insert/update/delete policy — written exclusively by the server-side
-- AI operation runner via the service-role client (plan §5.4).

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (key, window_start)
);

-- No RLS policies at all — accessed exclusively via the service-role client
-- from lib/security's rate limiter (plan §2.4/§14); never exposed to any
-- authenticated or anonymous client role.
alter table public.rate_limits enable row level security;

-- Atomic fixed-window increment used by lib/security's Postgres rate limiter
-- (plan §2.4). Returns the count for the window after incrementing.
create function public.increment_rate_limit(
  p_key text,
  p_window_start timestamptz
)
returns int
language sql
security definer
set search_path = public
as $$
  insert into public.rate_limits (key, window_start, count)
  values (p_key, p_window_start, 1)
  on conflict (key, window_start)
  do update set count = rate_limits.count + 1
  returning count;
$$;
