-- ============================================================================
-- StashInn Portal — GST on bookings; no default prices
-- Migration: 20261101000002_booking_gst_and_scored_pricing
--
-- 1. Bookings record the split used at checkout, so settlements don't have to recalculate:
--      total_amount    what the customer pays, GST included
--      base_amount     total_amount with GST removed (bookings before this migration hold
--                      the full total here; their gst_amount is NULL)
--      gst_rate, gst_amount, commission_rate, commission_amount
--      partner_amount  base_amount minus commission
--    partner_amount was also read by reports and the monthly settlement but never existed.
-- 2. Prices come only from admin scoring. The ₹50 / ₹200 column defaults are gone, and any
--    location that was never scored loses the default price it was carrying. It can't be
--    found or booked until an admin applies its score.
-- 3. A location can't be approved or go live until it has been scored and has rates.
-- ============================================================================

-- 1. Booking amounts -------------------------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS partner_amount DECIMAL(10,2);

COMMENT ON COLUMN public.bookings.base_amount IS 'Total with GST removed. Older bookings (gst_amount NULL) hold the full total';
COMMENT ON COLUMN public.bookings.gst_rate IS 'GST % applied when the booking was made';
COMMENT ON COLUMN public.bookings.gst_amount IS 'GST included in total_amount; NULL on bookings made before GST was recorded';
COMMENT ON COLUMN public.bookings.commission_rate IS 'Commission % applied to base_amount when the booking was made';
COMMENT ON COLUMN public.bookings.partner_amount IS 'Partner share: base_amount minus commission_amount';

-- Bookings made before this migration: commission was taken on the full total
UPDATE public.bookings SET partner_amount = total_amount - commission_amount WHERE partner_amount IS NULL;

-- 2. No default prices -------------------------------------------------------------------------
ALTER TABLE public.partner_locations
  ALTER COLUMN price_per_hour DROP NOT NULL,
  ALTER COLUMN price_per_hour DROP DEFAULT,
  ALTER COLUMN price_per_day DROP NOT NULL,
  ALTER COLUMN price_per_day DROP DEFAULT;

-- Applying a score always sets auto_score above 0, so 0 means it was never scored
UPDATE public.partner_locations SET price_per_hour = NULL WHERE auto_score = 0;
UPDATE public.partner_locations SET price_per_day = NULL; -- day rates are worked out from the hourly rate and opening hours

UPDATE public.vehicle_pricing vp
SET bike_rate_hr = NULL, bike_rate_day = NULL, sedan_rate_hr = NULL, sedan_rate_day = NULL, suv_rate_hr = NULL, suv_rate_day = NULL
FROM public.partner_locations pl
WHERE pl.id = vp.location_id AND pl.auto_score = 0;

DELETE FROM public.system_config WHERE key LIKE 'default_garage_price_%'; -- never read by the app

CREATE OR REPLACE FUNCTION public.guard_location_admin_fields()
RETURNS trigger AS $$
BEGIN
  IF COALESCE(auth.role(), '') NOT IN ('authenticated', 'anon') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- New locations always start unreviewed, offline and unpriced: an admin scores them before
  -- approval. Commission starts at the partner's rate (commission_rate is NOT NULL).
  IF TG_OP = 'INSERT' THEN
    NEW.admin_status := 'pending';
    NEW.status_reason := NULL;
    NEW.is_active := FALSE;
    NEW.commission_rate := COALESCE((SELECT p.commission_rate FROM public.partners p WHERE p.id = NEW.partner_id), 15.00);
    NEW.price_per_hour := NULL;
    NEW.price_per_day := NULL;
    NEW.auto_score := 0;
    NEW.score_padding := 0;
    NEW.final_score := 0;
    RETURN NEW;
  END IF;

  IF NEW.partner_id IS DISTINCT FROM OLD.partner_id
     OR NEW.commission_rate IS DISTINCT FROM OLD.commission_rate
     OR NEW.price_per_hour IS DISTINCT FROM OLD.price_per_hour
     OR NEW.price_per_day IS DISTINCT FROM OLD.price_per_day
     OR NEW.auto_score IS DISTINCT FROM OLD.auto_score
     OR NEW.score_padding IS DISTINCT FROM OLD.score_padding
     OR NEW.final_score IS DISTINCT FROM OLD.final_score
     OR NEW.transit_proximity IS DISTINCT FROM OLD.transit_proximity THEN
    RAISE EXCEPTION 'Pricing, commission and scoring are set by StashInn admins' USING ERRCODE = '42501';
  END IF;

  IF NEW.admin_status IS DISTINCT FROM OLD.admin_status
     AND NOT (NEW.admin_status = 'pending' AND OLD.admin_status IN ('update_required', 'rejected')) THEN
    RAISE EXCEPTION 'Only StashInn admins can change a location''s review status' USING ERRCODE = '42501';
  END IF;

  IF NEW.status_reason IS DISTINCT FROM OLD.status_reason
     AND NOT (NEW.status_reason IS NULL AND NEW.admin_status = 'pending') THEN
    RAISE EXCEPTION 'Only StashInn admins can write review notes' USING ERRCODE = '42501';
  END IF;

  IF NEW.is_active AND NOT OLD.is_active THEN
    RAISE EXCEPTION 'A location goes live only after StashInn approves it' USING ERRCODE = '42501';
  END IF;

  IF NEW.location_type IS DISTINCT FROM OLD.location_type
     AND EXISTS (SELECT 1 FROM public.partner_pocs p WHERE p.location_id = OLD.id AND p.is_primary) THEN
    RAISE EXCEPTION 'The type of your primary location can''t be changed' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Scoring before approval -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.require_location_scored()
RETURNS trigger AS $$
DECLARE
  priced BOOLEAN;
BEGIN
  IF (NEW.admin_status = 'approved' AND OLD.admin_status IS DISTINCT FROM 'approved')
     OR (NEW.is_active AND NOT OLD.is_active) THEN
    IF NEW.location_type = 'garage' THEN
      SELECT COALESCE(vp.bike_rate_hr, 0) > 0 AND COALESCE(vp.sedan_rate_hr, 0) > 0 INTO priced
      FROM public.vehicle_pricing vp WHERE vp.location_id = NEW.id;
    ELSE
      priced := COALESCE(NEW.price_per_hour, 0) > 0;
    END IF;
    IF NEW.auto_score <= 0 OR NOT COALESCE(priced, FALSE) THEN
      RAISE EXCEPTION 'Apply this location''s score and rates before approving it' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_locations_require_scored ON public.partner_locations;
CREATE TRIGGER trg_locations_require_scored
  BEFORE UPDATE ON public.partner_locations
  FOR EACH ROW EXECUTE FUNCTION public.require_location_scored();

-- ============================================================================
-- ROLLBACK INSTRUCTIONS:
-- DROP TRIGGER IF EXISTS trg_locations_require_scored ON public.partner_locations;
-- DROP FUNCTION IF EXISTS public.require_location_scored();
-- Re-run guard_location_admin_fields() from 20261101000000_fix_new_location_commission.sql
-- ALTER TABLE public.partner_locations ALTER COLUMN price_per_hour SET DEFAULT 50.00, ALTER COLUMN price_per_day SET DEFAULT 200.00;
-- ALTER TABLE public.bookings DROP COLUMN gst_rate, DROP COLUMN gst_amount, DROP COLUMN commission_rate, DROP COLUMN partner_amount;
-- Rates cleared by this migration are not restored.
-- ============================================================================
