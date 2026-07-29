-- RLS helper function + policies for the 0002 tables (plan §6 order 3/10, §7).

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

-- SECURITY DEFINER + fixed search_path avoids RLS policy recursion when
-- policies on workspace_members itself need to check membership (plan §7.2).
create function public.is_workspace_member(
  target_workspace_id uuid,
  min_role workspace_role default 'viewer'
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = target_workspace_id
      and m.user_id = auth.uid()
      and (
        min_role = 'viewer'
        or (min_role = 'editor' and m.role in ('editor', 'owner'))
        or (min_role = 'owner' and m.role = 'owner')
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles: a user reads/updates only their own profile row. Profiles of
-- fellow workspace members are readable too (needed for member lists).
-- ---------------------------------------------------------------------------
create policy profiles_select_own_or_co_member on public.profiles
  for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.workspace_members mine
      join public.workspace_members theirs
        on theirs.workspace_id = mine.workspace_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profiles.id
    )
  );

create policy profiles_update_own on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- workspaces: members read; only the owner updates/deletes (soft delete is
-- a normal update to deleted_at, plan §6). Insert happens only via the
-- signup trigger (security definer) — no direct insert policy for users.
-- ---------------------------------------------------------------------------
create policy workspaces_select_member on public.workspaces
  for select
  using (public.is_workspace_member(id, 'viewer'));

create policy workspaces_update_owner on public.workspaces
  for update
  using (public.is_workspace_member(id, 'owner'))
  with check (public.is_workspace_member(id, 'owner'));

-- ---------------------------------------------------------------------------
-- workspace_members: members read the roster; only the owner manages
-- membership (plan §7.1 permission matrix).
-- ---------------------------------------------------------------------------
create policy workspace_members_select_member on public.workspace_members
  for select
  using (public.is_workspace_member(workspace_id, 'viewer'));

create policy workspace_members_insert_owner on public.workspace_members
  for insert
  with check (public.is_workspace_member(workspace_id, 'owner'));

create policy workspace_members_update_owner on public.workspace_members
  for update
  using (public.is_workspace_member(workspace_id, 'owner'))
  with check (public.is_workspace_member(workspace_id, 'owner'));

create policy workspace_members_delete_owner on public.workspace_members
  for delete
  using (public.is_workspace_member(workspace_id, 'owner'));

-- ---------------------------------------------------------------------------
-- Guard: the last remaining owner of a workspace cannot be removed or
-- demoted, and a workspace can never end up with zero owners (plan §7.1).
-- ---------------------------------------------------------------------------
create function public.prevent_last_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_owners int;
begin
  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    select count(*) into remaining_owners
    from public.workspace_members
    where workspace_id = old.workspace_id
      and role = 'owner'
      and user_id <> old.user_id;

    if remaining_owners = 0 then
      raise exception 'Der letzte Owner eines Workspace kann nicht entfernt oder herabgestuft werden.'
        using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger workspace_members_prevent_last_owner_removal
  before update or delete on public.workspace_members
  for each row execute function public.prevent_last_owner_removal();
