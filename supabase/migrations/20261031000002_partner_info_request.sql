-- ============================================================================
-- StashInn Portal — Partner-level info requests + protect admin-owned partner fields
-- Migration: 20261031000002_partner_info_request
--
-- 1. Info requests: an admin can ask a partner to fix something that isn't about a single
--    location (PAN/GSTIN, documents, contact person). The partner sees the note on their
--    dashboard and marks it done; the admin then clears it.
-- 2. partners_update_own let a partner update ANY column of their own row, so a pending
--    partner could set status = 'approved', kyc_verified = true or their commission_rate
--    through the API. Partners may now only edit their profile fields. The one status
--    change they may cause is approved -> pending (editing PAN/GSTIN, or the
--    trg_downgrade_partner_if_invalid trigger when they lose their last verified location).
--
-- Trusted contexts (service role key, SQL editor / migrations) are unaffected.
-- ============================================================================

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS info_request       TEXT,
  ADD COLUMN IF NOT EXISTS info_requested_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS info_responded_at  TIMESTAMPTZ;

COMMENT ON COLUMN public.partners.info_request IS 'Open admin request for the partner to fix profile/KYC/contact details; NULL when none';
COMMENT ON COLUMN public.partners.info_responded_at IS 'When the partner marked the open info request as done';

CREATE OR REPLACE FUNCTION public.guard_partner_admin_fields()
RETURNS trigger AS $$
BEGIN
  -- Service role / SQL editor, and partner-managing admins, may change anything
  IF COALESCE(auth.role(), '') NOT IN ('authenticated', 'anon')
     OR public.has_admin_role(ARRAY['superadmin', 'ops']::admin_role[]) THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (OLD.status = 'approved' AND NEW.status = 'pending') THEN
    RAISE EXCEPTION 'Only StashInn admins can change a partner''s status' USING ERRCODE = '42501';
  END IF;

  IF NEW.kyc_verified AND NOT OLD.kyc_verified THEN
    RAISE EXCEPTION 'Only StashInn admins can mark KYC as verified' USING ERRCODE = '42501';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.commission_rate IS DISTINCT FROM OLD.commission_rate
     OR NEW.avg_rating IS DISTINCT FROM OLD.avg_rating
     OR NEW.total_reviews IS DISTINCT FROM OLD.total_reviews
     OR NEW.signed_registration_doc_url IS DISTINCT FROM OLD.signed_registration_doc_url
     OR NEW.info_request IS DISTINCT FROM OLD.info_request
     OR NEW.info_requested_at IS DISTINCT FROM OLD.info_requested_at THEN
    RAISE EXCEPTION 'This partner field can only be changed by StashInn admins' USING ERRCODE = '42501';
  END IF;

  -- Partners may only mark an open request as done
  IF NEW.info_responded_at IS DISTINCT FROM OLD.info_responded_at AND OLD.info_request IS NULL THEN
    RAISE EXCEPTION 'There is no open info request to respond to' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_partners_guard_admin_fields ON public.partners;
CREATE TRIGGER trg_partners_guard_admin_fields
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.guard_partner_admin_fields();

-- ============================================================================
-- ROLLBACK INSTRUCTIONS:
-- DROP TRIGGER IF EXISTS trg_partners_guard_admin_fields ON public.partners;
-- DROP FUNCTION IF EXISTS public.guard_partner_admin_fields();
-- ALTER TABLE public.partners DROP COLUMN IF EXISTS info_request,
--   DROP COLUMN IF EXISTS info_requested_at, DROP COLUMN IF EXISTS info_responded_at;
-- ============================================================================
