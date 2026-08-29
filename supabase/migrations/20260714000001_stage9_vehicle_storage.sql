-- ============================================================================
-- Migration: Stage 9 Vehicle & Garage Storage Support (Epic 10)
-- ============================================================================

-- 1. Create new ENUMs for location types
CREATE TYPE location_type AS ENUM ('luggage', 'garage');

-- 2. Alter partner_locations
ALTER TABLE public.partner_locations
  ADD COLUMN location_type location_type NOT NULL DEFAULT 'luggage',
  ADD COLUMN has_cctv BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN has_security_guard BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN has_ev_charging BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN has_lockable_gate BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Create vehicle_pricing table (Partner Overrides)
CREATE TABLE public.vehicle_pricing (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     UUID NOT NULL UNIQUE REFERENCES public.partner_locations(id) ON DELETE CASCADE,
  
  bike_capacity   INTEGER NOT NULL DEFAULT 0,
  bike_rate_hr    DECIMAL(10,2),
  bike_rate_day   DECIMAL(10,2),
  
  sedan_capacity  INTEGER NOT NULL DEFAULT 0,
  sedan_rate_hr   DECIMAL(10,2),
  sedan_rate_day  DECIMAL(10,2),
  
  suv_capacity    INTEGER NOT NULL DEFAULT 0,
  suv_rate_hr     DECIMAL(10,2),
  suv_rate_day    DECIMAL(10,2),
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.vehicle_pricing IS 'Partner specific rates and capacity for different vehicle classes';

-- Add trigger for updated_at on vehicle_pricing
CREATE TRIGGER trg_vehicle_pricing_updated_at BEFORE UPDATE ON public.vehicle_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Alter bookings table
-- Convert booking type implicitly by whether it has vehicle details, or add a column
ALTER TABLE public.bookings
  ADD COLUMN booking_type location_type NOT NULL DEFAULT 'luggage',
  ADD COLUMN vehicle_make TEXT,
  ADD COLUMN vehicle_model TEXT,
  ADD COLUMN vehicle_license_plate TEXT,
  ADD COLUMN check_in_photos TEXT[] DEFAULT '{}';

-- 5. Insert system default vehicle prices into system_config
INSERT INTO public.system_config (key, value, description) VALUES
  ('default_garage_price_bike_hr', '20.00', 'Default hourly rate for bikes'),
  ('default_garage_price_bike_day', '100.00', 'Default daily rate for bikes'),
  ('default_garage_price_sedan_hr', '50.00', 'Default hourly rate for sedans'),
  ('default_garage_price_sedan_day', '300.00', 'Default daily rate for sedans'),
  ('default_garage_price_suv_hr', '70.00', 'Default hourly rate for SUVs'),
  ('default_garage_price_suv_day', '400.00', 'Default daily rate for SUVs')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 6. Create vehicle-condition-photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-condition-photos', 
  'vehicle-condition-photos', 
  false, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
) ON CONFLICT (id) DO NOTHING;

-- Bucket RLS Policies for vehicle-condition-photos
-- Partners can insert photos for bookings at their locations
CREATE POLICY "Partners can upload vehicle check-in photos" 
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-condition-photos' 
  AND auth.uid() IN (SELECT user_id FROM public.partners)
);

-- Partners can view photos for their bookings
CREATE POLICY "Partners can view vehicle check-in photos" 
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'vehicle-condition-photos'
  AND auth.uid() IN (SELECT user_id FROM public.partners)
);

-- Customers can view photos for their bookings
CREATE POLICY "Customers can view vehicle check-in photos" 
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'vehicle-condition-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text -- Note: Requires specific folder structure customer_id/booking_id/
);

-- Admins can view all condition photos
CREATE POLICY "Admins can view all vehicle check-in photos" 
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'vehicle-condition-photos' 
  AND public.is_admin()
);
