-- ============================================================================
-- Customer Geo-Search RPC V4
-- Adds requirement: ALL POCs for a location must be verified.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_nearby_locations_v4(
  search_lat DOUBLE PRECISION,
  search_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 50.0,
  p_location_type text DEFAULT 'luggage'
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address_line1 TEXT,
  city TEXT,
  state TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  price_per_hour DECIMAL(10,2),
  price_per_day DECIMAL(10,2),
  photos TEXT[],
  amenities TEXT[],
  avg_rating DECIMAL(3,2),
  distance_km DOUBLE PRECISION,
  location_type text,
  has_cctv BOOLEAN,
  has_security_guard BOOLEAN,
  has_ev_charging BOOLEAN,
  has_lockable_gate BOOLEAN,
  vehicle_pricing JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pl.id,
    pl.name,
    pl.address_line1,
    pl.city,
    pl.state,
    pl.latitude,
    pl.longitude,
    pl.price_per_hour,
    pl.price_per_day,
    pl.photos,
    pl.amenities,
    p.avg_rating,
    (ST_Distance(
      pl.geo_point, 
      ST_MakePoint(search_lng, search_lat)::geography
    ) / 1000.0) AS distance_km,
    pl.location_type::text,
    pl.has_cctv,
    pl.has_security_guard,
    pl.has_ev_charging,
    pl.has_lockable_gate,
    (
      SELECT jsonb_agg(to_jsonb(vp.*))
      FROM public.vehicle_pricing vp
      WHERE vp.location_id = pl.id
    ) AS vehicle_pricing
  FROM 
    public.partner_locations pl
  INNER JOIN 
    public.partners p ON p.id = pl.partner_id
  WHERE 
    pl.is_active = true
    AND p.status = 'approved'
    AND pl.location_type::text = p_location_type
    AND ST_DWithin(
      pl.geo_point,
      ST_MakePoint(search_lng, search_lat)::geography,
      radius_km * 1000 -- Convert km to meters
    )
    -- Enforce POC Verification: Must have at least one POC, and ALL POCs must be verified.
    AND EXISTS (
      SELECT 1 FROM public.partner_pocs poc WHERE poc.location_id = pl.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.partner_pocs poc WHERE poc.location_id = pl.id AND poc.is_verified = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- Customer Text-Search Fallback RPC V1
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_locations_text_fallback_v1(
  search_term text,
  p_location_type text DEFAULT 'luggage'
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address_line1 TEXT,
  city TEXT,
  state TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  price_per_hour DECIMAL(10,2),
  price_per_day DECIMAL(10,2),
  photos TEXT[],
  amenities TEXT[],
  avg_rating DECIMAL(3,2),
  location_type text,
  has_cctv BOOLEAN,
  has_security_guard BOOLEAN,
  has_ev_charging BOOLEAN,
  has_lockable_gate BOOLEAN,
  vehicle_pricing JSONB,
  partners JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pl.id,
    pl.name,
    pl.address_line1,
    pl.city,
    pl.state,
    pl.latitude,
    pl.longitude,
    pl.price_per_hour,
    pl.price_per_day,
    pl.photos,
    pl.amenities,
    p.avg_rating,
    pl.location_type::text,
    pl.has_cctv,
    pl.has_security_guard,
    pl.has_ev_charging,
    pl.has_lockable_gate,
    (
      SELECT jsonb_agg(to_jsonb(vp.*))
      FROM public.vehicle_pricing vp
      WHERE vp.location_id = pl.id
    ) AS vehicle_pricing,
    jsonb_build_object('id', p.id) AS partners
  FROM 
    public.partner_locations pl
  INNER JOIN 
    public.partners p ON p.id = pl.partner_id
  WHERE 
    pl.is_active = true
    AND p.status = 'approved'
    AND pl.location_type::text = p_location_type
    AND (
      pl.city ILIKE '%' || search_term || '%'
      OR pl.name ILIKE '%' || search_term || '%'
      OR pl.address_line1 ILIKE '%' || search_term || '%'
    )
    -- Enforce POC Verification: Must have at least one POC, and ALL POCs must be verified.
    AND EXISTS (
      SELECT 1 FROM public.partner_pocs poc WHERE poc.location_id = pl.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.partner_pocs poc WHERE poc.location_id = pl.id AND poc.is_verified = false
    )
  ORDER BY pl.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
