-- ============================================================================
-- StashInn Portal — Fix new-location commission
-- Migration: 20261101000000_fix_new_location_commission
--
-- 20261031000004 set commission_rate to NULL when a partner adds a location, but the
-- column is NOT NULL (20260906120500), so adding a location failed with
-- 'null value in column "commission_rate"'. New locations now start at the partner's
-- commission rate (15% if the partner has none), the same back-fill the column got.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_location_admin_fields()
RETURNS trigger AS $$
BEGIN
  IF COALESCE(auth.role(), '') NOT IN ('authenticated', 'anon') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- New locations always start unreviewed and offline. Prices go back to the schema defaults
  -- until an admin scores the location; commission starts at the partner's rate
  -- (partner_locations.commission_rate is NOT NULL).
  IF TG_OP = 'INSERT' THEN
    NEW.admin_status := 'pending';
    NEW.status_reason := NULL;
    NEW.is_active := FALSE;
    NEW.commission_rate := COALESCE((SELECT p.commission_rate FROM public.partners p WHERE p.id = NEW.partner_id), 15.00);
    NEW.price_per_hour := 50.00;
    NEW.price_per_day := 200.00;
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

-- ============================================================================
-- ROLLBACK INSTRUCTIONS:
-- Re-run guard_location_admin_fields() from 20261031000004_protect_partner_locations.sql
-- ============================================================================
