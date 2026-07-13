-- ============================================================================
-- Customer Geo-Search RPC
-- Finds active locations within a radius using PostGIS ST_Distance
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_nearby_locations(
  search_lat DOUBLE PRECISION,
  search_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 50.0
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
  distance_km DOUBLE PRECISION
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
    (ST_Distance(
      pl.geo_point, 
      ST_MakePoint(search_lng, search_lat)::geography
    ) / 1000.0) AS distance_km
  FROM 
    public.partner_locations pl
  INNER JOIN 
    public.partners p ON p.id = pl.partner_id
  WHERE 
    pl.is_active = true
    AND p.status = 'approved'
    AND ST_DWithin(
      pl.geo_point,
      ST_MakePoint(search_lng, search_lat)::geography,
      radius_km * 1000 -- Convert km to meters
    )
  ORDER BY 
    distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
