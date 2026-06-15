-- Default role for new sign-ups.
--
-- Every newly registered account (email or OAuth) gets the "moderator" role
-- by default. Accounts that already carry a role (e.g. admins created via the
-- Auth admin API with app_metadata.role) are left untouched; bootstrap admins
-- listed in MODERATOR_EMAILS are still resolved to "admin" in app code
-- (see lib/auth.ts#roleOf).
--
-- The role lives in auth.users.raw_app_meta_data->>'role', which Supabase
-- embeds into the JWT, so server-side requireRole() checks pick it up.

create or replace function public.set_default_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_app_meta_data->>'role', '') = '' then
    new.raw_app_meta_data =
      coalesce(new.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'moderator');
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_default_role on auth.users;
create trigger on_auth_user_default_role
  before insert on auth.users
  for each row execute function public.set_default_role();
