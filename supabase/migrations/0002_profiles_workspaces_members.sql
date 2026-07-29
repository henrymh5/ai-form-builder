-- profiles, workspaces, workspace_members + signup trigger (plan §6 order 2/10, [A2]).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  owner_id uuid not null references auth.users (id) on delete restrict,
  limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Case-insensitive uniqueness on active (non-deleted) workspace slugs.
create unique index workspaces_slug_active_unique_idx
  on public.workspaces (lower(slug))
  where deleted_at is null;

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role workspace_role not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_id_idx on public.workspace_members (user_id);

-- ---------------------------------------------------------------------------
-- Signup trigger: every new auth user gets a profile, a personal workspace,
-- and an owner membership row in that workspace (plan §16 Phase 3, [A2]).
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
  display_name text;
  workspace_slug text;
begin
  display_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1));

  insert into public.profiles (id, display_name)
  values (new.id, display_name);

  -- Slug derived from the user id to guarantee uniqueness without collision
  -- retries; user-chosen workspace names/slugs can be changed later in
  -- settings (plan §10.2).
  workspace_slug := 'ws-' || replace(new.id::text, '-', '');

  insert into public.workspaces (name, slug, owner_id)
  values (display_name || 's Workspace', workspace_slug, new.id)
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
