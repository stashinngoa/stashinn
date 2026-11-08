-- ============================================================================
-- StashInn Portal — Booking vehicle type + partner booking pauses
-- Migration: 20261031000005_vehicle_type_and_location_pauses
--
-- 1. bookings.vehicle_type records which vehicle a parking booking is for, so capacity can
--    be counted (bikes; cars, which may also use free SUV slots; SUVs). Existing parking
--    bookings have no type and are counted as cars.
-- 2. location_pauses: a partner can stop new bookings at one of their locations for a
--    period (maintenance, holiday...). Customers can't book across a pause; the reason is
--    only visible to the partner and StashInn admins (bookings are checked server-side).
-- ============================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT CHECK (vehicle_type IN ('bike', 'car', 'suv'));

COMMENT ON COLUMN public.bookings.vehicle_type IS 'Parking bookings only: bike, car or suv (SUVs pay the car rate)';

CREATE TABLE IF NOT EXISTS public.location_pauses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id   UUID NOT NULL REFERENCES public.partner_locations(id) ON DELETE CASCADE,
  partner_id    UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ NOT NULL,
  reason        TEXT NOT NULL,           -- maintenance, renovation, holiday, staff, other
  details       TEXT,
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at  TIMESTAMPTZ,             -- set when the partner ends or cancels the pause early
  CONSTRAINT location_pauses_valid_window CHECK (ends_at > starts_at),
  CONSTRAINT location_pauses_max_length CHECK (ends_at - starts_at <= INTERVAL '90 days')
);

COMMENT ON TABLE public.location_pauses IS 'Periods when a partner location takes no new bookings';

CREATE INDEX IF NOT EXISTS idx_location_pauses_window ON public.location_pauses (location_id, starts_at, ends_at) WHERE cancelled_at IS NULL;

ALTER TABLE public.location_pauses ENABLE ROW LEVEL SECURITY;

-- Partners manage pauses for their own locations
DROP POLICY IF EXISTS location_pauses_partner_select ON public.location_pauses;
CREATE POLICY location_pauses_partner_select ON public.location_pauses
  FOR SELECT USING (partner_id = public.get_partner_id());

DROP POLICY IF EXISTS location_pauses_partner_insert ON public.location_pauses;
CREATE POLICY location_pauses_partner_insert ON public.location_pauses
  FOR INSERT WITH CHECK (
    partner_id = public.get_partner_id()
    AND EXISTS (SELECT 1 FROM public.partner_locations pl WHERE pl.id = location_id AND pl.partner_id = public.get_partner_id())
  );

DROP POLICY IF EXISTS location_pauses_partner_update ON public.location_pauses;
CREATE POLICY location_pauses_partner_update ON public.location_pauses
  FOR UPDATE USING (partner_id = public.get_partner_id()) WITH CHECK (partner_id = public.get_partner_id());

-- Admins see and manage all pauses
DROP POLICY IF EXISTS location_pauses_admin_all ON public.location_pauses;
CREATE POLICY location_pauses_admin_all ON public.location_pauses
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- ROLLBACK INSTRUCTIONS:
-- DROP TABLE IF EXISTS public.location_pauses;
-- ALTER TABLE public.bookings DROP COLUMN IF EXISTS vehicle_type;
-- ============================================================================
