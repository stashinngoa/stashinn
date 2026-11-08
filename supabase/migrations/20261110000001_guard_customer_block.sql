-- ============================================================================
-- StashInn Portal — Only staff can block or unblock an account
-- Migration: 20261110000001_guard_customer_block
--
-- users.is_blocked is set from Admin → Customers. Users may update their own row (name,
-- phone), so without this guard a blocked customer could unblock themselves through the API.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_user_block_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked
     AND COALESCE(auth.role(), '') IN ('authenticated', 'anon')
     AND NOT public.has_admin_role(ARRAY['superadmin', 'support']::admin_role[]) THEN
    RAISE EXCEPTION 'Only StashInn staff can block or unblock an account'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_users_guard_block ON public.users;
CREATE TRIGGER trg_users_guard_block
  BEFORE UPDATE OF is_blocked ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_block_change();

-- Rollback:
-- DROP TRIGGER IF EXISTS trg_users_guard_block ON public.users;
-- DROP FUNCTION IF EXISTS public.guard_user_block_change();
