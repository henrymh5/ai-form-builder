-- Base table privileges for `authenticated` (plan §7.2/§14).
--
-- Enabling RLS restricts which ROWS a role can see/touch, but never
-- substitutes for the underlying GRANT — without an explicit table
-- privilege, Postgres rejects the operation before RLS is ever evaluated.
-- Migrations 0002-0010 defined RLS policies but never granted the matching
-- table privileges, so every authenticated query failed with "permission
-- denied for table ..." regardless of policy outcome (caught by the Phase-3
-- RLS integration tests). `anon` intentionally gets nothing here: per
-- 0006's design, anonymous/public form access goes exclusively through
-- Route Handlers using the service-role client, never direct table access.

grant select, update on public.profiles to authenticated;
grant select, update on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update on public.forms to authenticated;
grant select, insert on public.form_versions to authenticated;
grant select on public.form_sessions to authenticated;
grant select on public.form_events to authenticated;
grant select, update, delete on public.responses to authenticated;
grant select, delete on public.response_answers to authenticated;
grant select, insert, delete on public.assets to authenticated;
grant select on public.ai_generations to authenticated;
-- rate_limits: no grants at all to authenticated/anon — service-role only
-- (matches 0009's comment).

-- ---------------------------------------------------------------------------
-- service_role has BYPASSRLS (confirmed via pg_roles), but that only skips
-- RLS policy evaluation — it does NOT imply table privileges, and none were
-- ever granted here either. Every service-role code path (server-only
-- clients in lib/db, the future AI operation runner, rate limiter, and
-- retention jobs) needs full CRUD on all application tables.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on
  public.profiles,
  public.workspaces,
  public.workspace_members,
  public.forms,
  public.form_versions,
  public.form_sessions,
  public.form_events,
  public.responses,
  public.response_answers,
  public.assets,
  public.ai_generations,
  public.rate_limits
to service_role;

-- ---------------------------------------------------------------------------
-- form_versions was missing its INSERT policy entirely: publish_form() (0005)
-- is `security invoker`, so its internal `insert into form_versions` runs as
-- the calling role and is subject to RLS like any other statement — with no
-- policy, RLS's default-deny blocked every publish, even for workspace
-- owners/editors. This mirrors the editor-membership check already used by
-- forms_insert_editor (0004).
-- ---------------------------------------------------------------------------
create policy form_versions_insert_editor on public.form_versions
  for insert
  with check (
    exists (
      select 1 from public.forms
      where forms.id = form_versions.form_id
        and public.is_workspace_member(forms.workspace_id, 'editor')
    )
  );

-- Revoke PUBLIC's default EXECUTE on functions meant to be service-role-only
-- (plan §2.4/§13.3) — Postgres grants EXECUTE to PUBLIC by default at
-- creation time, which these functions never had explicitly revoked.
revoke execute on function public.increment_rate_limit(text, timestamptz) from public;
revoke execute on function public.purge_old_rate_limits() from public;
revoke execute on function public.purge_stale_form_sessions() from public;
revoke execute on function public.purge_old_ai_generations() from public;

grant execute on function public.increment_rate_limit(text, timestamptz) to service_role;
grant execute on function public.purge_old_rate_limits() to service_role;
grant execute on function public.purge_stale_form_sessions() to service_role;
grant execute on function public.purge_old_ai_generations() to service_role;
