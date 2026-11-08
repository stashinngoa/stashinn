-- ============================================================================
-- StashInn Portal — Partners can't verify their own contacts
-- Migration: 20261110000003_guard_partner_pocs
--
-- pocs_partner_insert / pocs_partner_update let a partner write any column of their
-- contact rows, including is_verified. A partner could mark a new contact as verified
-- through the API and skip StashInn's ID check (locations go live in search only when
-- every contact is verified).
--
-- For partner (non-admin) writes:
--   * a row may only be verified if the same person (same partner, same phone) is already
--     verified on another row: assigning a checked person to another location stays verified;
--   * changing the name, phone, ID document or photo makes the row unverified again.
-- Admins (superadmin / ops), the service role and SQL are unaffected.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_partner_poc_changes()
RETURNS trigger AS $$
DECLARE
  digits TEXT := right(regexp_replace(COALESCE(NEW.phone, ''), '\D', '', 'g'), 10);
BEGIN
  IF COALESCE(auth.role(), '') NOT IN ('authenticated', 'anon')
     OR public.has_admin_role(ARRAY['superadmin', 'ops']::admin_role[]) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (
       NEW.name IS DISTINCT FROM OLD.name
       OR NEW.phone IS DISTINCT FROM OLD.phone
       OR NEW.id_document_url IS DISTINCT FROM OLD.id_document_url
       OR NEW.photo_url IS DISTINCT FROM OLD.photo_url) THEN
    NEW.is_verified := FALSE;
    RETURN NEW;
  END IF;

  IF NEW.is_verified AND (TG_OP = 'INSERT' OR NOT OLD.is_verified) THEN
    NEW.is_verified := EXISTS (
      SELECT 1 FROM public.partner_pocs p
      WHERE p.partner_id = NEW.partner_id
        AND p.id <> NEW.id
        AND p.is_verified
        AND right(regexp_replace(p.phone, '\D', '', 'g'), 10) = digits
        AND p.name = NEW.name
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_partner_pocs_guard ON public.partner_pocs;
CREATE TRIGGER trg_partner_pocs_guard
  BEFORE INSERT OR UPDATE ON public.partner_pocs
  FOR EACH ROW EXECUTE FUNCTION public.guard_partner_poc_changes();

-- Rollback:
-- DROP TRIGGER IF EXISTS trg_partner_pocs_guard ON public.partner_pocs;
-- DROP FUNCTION IF EXISTS public.guard_partner_poc_changes();
