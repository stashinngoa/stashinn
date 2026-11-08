-- ============================================================================
-- StashInn Portal — Protect admin-owned location fields + lock down vehicle_pricing
-- Migration: 20261031000004_protect_partner_locations
--
-- 1. vehicle_pricing was created without row level security, so anyone holding the public
--    anon key could read, change or delete every location's vehicle capacity and rates.
--    It now has RLS: everyone may read (rates are shown in search), partners manage rows of
--    their own locations, admins manage all.
-- 2. locations_partner_update let partners change any column of their own locations,
--    including admin_status, is_active (going live without approval), commission and rates.
--    Partners may now edit their location details only. They can:
--      - resubmit a location the admin flagged (update_required/rejected -> pending), which
--        also clears the admin's note, and
--      - take a location offline (is_active true -> false), never put it live.
--    Rates (price_per_hour/day, vehicle *_rate_*) are set by StashInn admins.
--    The type of a primary location (the one created at onboarding) can't change.
--
-- Trusted contexts (service role key, SQL editor / migrations) and admins are unaffected.
-- ============================================================================

-- 1. vehicle_pricing RLS -------------------------------------------------------------------
ALTER TABLE public.vehicle_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vehicle_pricing_public_select ON public.vehicle_pricing;
CREATE POLICY vehicle_pricing_public_select ON public.vehicle_pricing
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS vehicle_pricing_partner_insert ON public.vehicle_pricing;
CREATE POLICY vehicle_pricing_partner_insert ON public.vehicle_pricing
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.partner_locations pl WHERE pl.id = location_id AND pl.partner_id = public.get_partner_id()
  ));

DROP POLICY IF EXISTS vehicle_pricing_partner_update ON public.vehicle_pricing;
CREATE POLICY vehicle_pricing_partner_update ON public.vehicle_pricing
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.partner_locations pl WHERE pl.id = location_id AND pl.partner_id = public.get_partner_id()
  ));

DROP POLICY IF EXISTS vehicle_pricing_partner_delete ON public.vehicle_pricing;
CREATE POLICY vehicle_pricing_partner_delete ON public.vehicle_pricing
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.partner_locations pl WHERE pl.id = location_id AND pl.partner_id = public.get_partner_id()
  ));

DROP POLICY IF EXISTS vehicle_pricing_admin_all ON public.vehicle_pricing;
CREATE POLICY vehicle_pricing_admin_all ON public.vehicle_pricing
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Partners may change capacities, not rates
CREATE OR REPLACE FUNCTION public.guard_vehicle_pricing_rates()
RETURNS trigger AS $$
BEGIN
  IF COALESCE(auth.role(), '') NOT IN ('authenticated', 'anon') OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.bike_rate_hr := NULL; NEW.bike_rate_day := NULL;
    NEW.sedan_rate_hr := NULL; NEW.sedan_rate_day := NULL;
    NEW.suv_rate_hr := NULL; NEW.suv_rate_day := NULL;
    RETURN NEW;
  END IF;
  IF NEW.location_id IS DISTINCT FROM OLD.location_id
     OR NEW.bike_rate_hr IS DISTINCT FROM OLD.bike_rate_hr OR NEW.bike_rate_day IS DISTINCT FROM OLD.bike_rate_day
     OR NEW.sedan_rate_hr IS DISTINCT FROM OLD.sedan_rate_hr OR NEW.sedan_rate_day IS DISTINCT FROM OLD.sedan_rate_day
     OR NEW.suv_rate_hr IS DISTINCT FROM OLD.suv_rate_hr OR NEW.suv_rate_day IS DISTINCT FROM OLD.suv_rate_day THEN
    RAISE EXCEPTION 'Vehicle rates are set by StashInn admins' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_vehicle_pricing_guard_rates ON public.vehicle_pricing;
CREATE TRIGGER trg_vehicle_pricing_guard_rates
  BEFORE INSERT OR UPDATE ON public.vehicle_pricing
  FOR EACH ROW EXECUTE FUNCTION public.guard_vehicle_pricing_rates();

-- 2. partner_locations guard -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_location_admin_fields()
RETURNS trigger AS $$
BEGIN
  IF COALESCE(auth.role(), '') NOT IN ('authenticated', 'anon') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- New locations always start unreviewed and offline. Prices go back to the schema defaults
  -- until an admin scores the location; NULL commission falls back to the partner's rate.
  IF TG_OP = 'INSERT' THEN
    NEW.admin_status := 'pending';
    NEW.status_reason := NULL;
    NEW.is_active := FALSE;
    NEW.commission_rate := NULL;
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

DROP TRIGGER IF EXISTS trg_locations_guard_admin_fields ON public.partner_locations;
CREATE TRIGGER trg_locations_guard_admin_fields
  BEFORE INSERT OR UPDATE ON public.partner_locations
  FOR EACH ROW EXECUTE FUNCTION public.guard_location_admin_fields();

-- ============================================================================
-- ROLLBACK INSTRUCTIONS:
-- DROP TRIGGER IF EXISTS trg_locations_guard_admin_fields ON public.partner_locations;
-- DROP FUNCTION IF EXISTS public.guard_location_admin_fields();
-- DROP TRIGGER IF EXISTS trg_vehicle_pricing_guard_rates ON public.vehicle_pricing;
-- DROP FUNCTION IF EXISTS public.guard_vehicle_pricing_rates();
-- DROP POLICY IF EXISTS vehicle_pricing_public_select ON public.vehicle_pricing;
-- DROP POLICY IF EXISTS vehicle_pricing_partner_insert ON public.vehicle_pricing;
-- DROP POLICY IF EXISTS vehicle_pricing_partner_update ON public.vehicle_pricing;
-- DROP POLICY IF EXISTS vehicle_pricing_partner_delete ON public.vehicle_pricing;
-- DROP POLICY IF EXISTS vehicle_pricing_admin_all ON public.vehicle_pricing;
-- ALTER TABLE public.vehicle_pricing DISABLE ROW LEVEL SECURITY;
-- ============================================================================
