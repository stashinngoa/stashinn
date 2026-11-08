-- ============================================================================
-- StashInn Portal — Protect user roles from self-escalation
-- Migration: 20261031000000_protect_user_roles
--
-- Closes two privilege-escalation paths:
--   1. Sign-up: handle_new_user() trusted raw_user_meta_data->>'role', so anyone calling
--      the Auth sign-up API with { role: 'admin' } became an admin. Public sign-ups may now
--      only choose 'customer' or 'partner'.
--   2. Updates: users_update_own / users_admin_update let any user (or any admin) change
--      role / admin_role on rows they can update — e.g. a customer promoting themselves.
--      Role changes from API users now require a superadmin.
--
-- Trusted contexts (service role key, SQL editor / migrations / seed.sql) are unaffected.
-- ============================================================================

-- 1. Sign-up trigger: never grant admin from client-supplied metadata --------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  requested_role TEXT := new.raw_user_meta_data->>'role';
BEGIN
  -- Sign-ups through the Auth API run as supabase_auth_admin; only allow self-service roles.
  -- Direct inserts (seed.sql, SQL editor) keep honouring the metadata role.
  IF session_user = 'supabase_auth_admin' AND requested_role IS DISTINCT FROM 'partner' THEN
    requested_role := 'customer';
  END IF;

  INSERT INTO public.users (id, email, full_name, phone, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    COALESCE(requested_role::public.user_role, 'customer'::public.user_role)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Guard role / admin_role changes ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_user_role_change()
RETURNS trigger AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.admin_role IS DISTINCT FROM OLD.admin_role)
     AND COALESCE(auth.role(), '') IN ('authenticated', 'anon')
     AND NOT public.has_admin_role(ARRAY['superadmin']::admin_role[]) THEN
    RAISE EXCEPTION 'Only a superadmin can change user roles'
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_users_guard_role ON public.users;
CREATE TRIGGER trg_users_guard_role
  BEFORE UPDATE OF role, admin_role ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_role_change();

-- ============================================================================
-- ROLLBACK INSTRUCTIONS:
-- DROP TRIGGER IF EXISTS trg_users_guard_role ON public.users;
-- DROP FUNCTION IF EXISTS public.guard_user_role_change();
-- Re-run the handle_new_user() definition from 20250412000004_auth_triggers.sql
-- ============================================================================
