-- ============================================================================
-- StashInn Portal — Amenity catalog
-- Migration: 20261101000001_amenities_catalog
--
-- Amenities were hardcoded in the partner form, customer search and scoring. They now live
-- here and are managed in Admin → Configuration; each active amenity appears in those
-- places automatically. Locations keep storing amenities as before: labels in
-- partner_locations.amenities, or the four existing has_* columns for parking (column_name).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.amenities (
  key          TEXT PRIMARY KEY,                     -- used in system_scoring_rules.amenity_weights
  label        TEXT NOT NULL UNIQUE,                 -- stored on locations, so it isn't renamed
  applies_to   TEXT[] NOT NULL,                      -- 'luggage' and/or 'garage'
  column_name  TEXT,                                 -- has_* column for built-in parking amenities
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,        -- inactive: hidden from new selections
  sort_order   INTEGER NOT NULL DEFAULT 100,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT amenities_applies_to_valid CHECK (
    cardinality(applies_to) > 0 AND applies_to <@ ARRAY['luggage', 'garage']
  )
);

COMMENT ON TABLE public.amenities IS 'Amenities partners can offer at a location; managed by admins';

INSERT INTO public.amenities (key, label, applies_to, column_name, sort_order) VALUES
  ('cctv', 'CCTV', ARRAY['luggage', 'garage'], 'has_cctv', 10),
  ('24_7', '24/7 Security', ARRAY['luggage'], NULL, 20),
  ('security_guard', 'Security guard', ARRAY['garage'], 'has_security_guard', 30),
  ('ac_storage', 'AC Storage', ARRAY['luggage'], NULL, 40),
  ('locker', 'Locker Available', ARRAY['luggage'], NULL, 50),
  ('ev_charging', 'EV charging', ARRAY['garage'], 'has_ev_charging', 60),
  ('lockable_gate', 'Lockable gate', ARRAY['garage'], 'has_lockable_gate', 70)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS amenities_public_select ON public.amenities;
CREATE POLICY amenities_public_select ON public.amenities
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS amenities_admin_all ON public.amenities;
CREATE POLICY amenities_admin_all ON public.amenities
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- ROLLBACK INSTRUCTIONS:
-- DROP TABLE IF EXISTS public.amenities;
-- ============================================================================
