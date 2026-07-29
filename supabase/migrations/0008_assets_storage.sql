-- assets table + private storage bucket policies (plan §6 order 8/10, §11.3/§14).

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  kind text not null check (kind in ('theme', 'upload')),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index assets_workspace_id_idx on public.assets (workspace_id);

alter table public.assets enable row level security;

create policy assets_select_member on public.assets
  for select
  using (public.is_workspace_member(workspace_id, 'viewer'));

create policy assets_insert_editor on public.assets
  for insert
  with check (public.is_workspace_member(workspace_id, 'editor'));

create policy assets_delete_editor on public.assets
  for delete
  using (public.is_workspace_member(workspace_id, 'editor'));

-- ---------------------------------------------------------------------------
-- Storage bucket: private, path-prefixed by workspace_id
-- (assets/<workspace_id>/<random>). Public delivery of theme assets on
-- published forms happens via short-lived signed URLs issued server-side
-- (plan §11.3/§14) — never via a public bucket.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('assets', 'assets', false)
on conflict (id) do nothing;

create policy assets_storage_select_member on storage.objects
  for select
  using (
    bucket_id = 'assets'
    and public.is_workspace_member((storage.foldername(name))[1]::uuid, 'viewer')
  );

create policy assets_storage_insert_editor on storage.objects
  for insert
  with check (
    bucket_id = 'assets'
    and public.is_workspace_member((storage.foldername(name))[1]::uuid, 'editor')
  );

create policy assets_storage_delete_editor on storage.objects
  for delete
  using (
    bucket_id = 'assets'
    and public.is_workspace_member((storage.foldername(name))[1]::uuid, 'editor')
  );
