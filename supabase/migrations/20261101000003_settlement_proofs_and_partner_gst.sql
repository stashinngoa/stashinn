-- ============================================================================
-- StashInn Portal — Settlement proofs + per-partner GST
-- Migration: 20261101000003_settlement_proofs_and_partner_gst
--
-- 1. Partner settlement proofs could never work: payments used a 'pending_validation' status
--    the enum didn't have, and the settlement_proofs storage bucket didn't exist.
--    Proofs are private; the apps read them through signed links.
-- 2. partners.gst_applicable: decided by an admin while reviewing a partner.
--      TRUE   GST is added to this partner's bookings
--      FALSE  no GST on this partner's bookings
--      NULL   not decided yet (a partner can't be approved until it is)
--    Partners already approved or suspended were being charged GST, so they stay TRUE.
-- ============================================================================

ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'pending_validation';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'settlement_proofs',
  'settlement_proofs',
  FALSE,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS gst_applicable BOOLEAN;

COMMENT ON COLUMN public.partners.gst_applicable IS 'Whether GST is added to this partner''s bookings; NULL until an admin decides';

UPDATE public.partners SET gst_applicable = TRUE WHERE status IN ('approved', 'suspended');

-- Same guard as 20261031000003, now also protecting gst_applicable
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
     OR NEW.gst_applicable IS DISTINCT FROM OLD.gst_applicable
     OR NEW.avg_rating IS DISTINCT FROM OLD.avg_rating
     OR NEW.total_reviews IS DISTINCT FROM OLD.total_reviews
     OR NEW.signed_registration_doc_url IS DISTINCT FROM OLD.signed_registration_doc_url
     OR NEW.info_request IS DISTINCT FROM OLD.info_request
     OR NEW.info_request_items IS DISTINCT FROM OLD.info_request_items
     OR NEW.info_requested_at IS DISTINCT FROM OLD.info_requested_at THEN
    RAISE EXCEPTION 'This partner field can only be changed by StashInn admins' USING ERRCODE = '42501';
  END IF;

  -- Partners may only mark an open request as done (a request is open while info_requested_at is set;
  -- the note itself is optional now that areas can be ticked)
  IF NEW.info_responded_at IS DISTINCT FROM OLD.info_responded_at AND OLD.info_requested_at IS NULL THEN
    RAISE EXCEPTION 'There is no open info request to respond to' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS:
-- Re-run guard_partner_admin_fields() from 20261031000003_partner_info_request_areas.sql
-- ALTER TABLE public.partners DROP COLUMN IF EXISTS gst_applicable;
-- (Enum values can't be removed; the empty bucket can be deleted in Supabase Storage.)
-- ============================================================================
