import { createClient } from '@stashinn/lib/supabase/server';
import { unstable_cache } from 'next/cache';
import LocationList from './LocationList';
import MapWrapper from './MapWrapper';
import SearchHeader from './SearchHeader';

export default async function SearchPage({ searchParams }: { searchParams: { q?: string, in?: string, out?: string, bags?: string, lat?: string, lon?: string, sort?: string, max_price?: string, min_rating?: string, amenities?: string, page?: string } | Promise<{ q?: string, in?: string, out?: string, bags?: string, lat?: string, lon?: string, sort?: string, max_price?: string, min_rating?: string, amenities?: string, page?: string }> }) {
  const resolvedParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const city = resolvedParams.q || 'Goa';
  let lat = resolvedParams.lat ? parseFloat(resolvedParams.lat) : null;
  let lon = resolvedParams.lon ? parseFloat(resolvedParams.lon) : null;
  
  // If no lat/lon provided (e.g. manual text search), try to geocode server-side
  if (!lat || !lon) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&countrycodes=in`, {
        headers: { 'User-Agent': 'StashInn/1.0' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          lat = parseFloat(data[0].lat);
          lon = parseFloat(data[0].lon);
        }
      }
    } catch (e) {
      console.error('Server side geocoding failed', e);
    }
  }

  const sort = resolvedParams.sort || 'distance';
  const maxPrice = resolvedParams.max_price ? parseFloat(resolvedParams.max_price as string) : null;
  const minRating = resolvedParams.min_rating ? parseFloat(resolvedParams.min_rating as string) : null;
  const amenities = resolvedParams.amenities ? (resolvedParams.amenities as string).split(',') : [];
  const page = parseInt(resolvedParams.page as string || '1');
  const limit = 10;
  const offset = (page - 1) * limit;

  // Cached Search Function
  const getCachedSearchResults = unstable_cache(
    async (sLat, sLon, sSort, sMaxPrice, sMinRating, sAmenities, sPage) => {
      // Use standard @supabase/supabase-js client without cookies for caching
      const { createClient: createGenericClient } = require('@supabase/supabase-js');
      const anonClient = createGenericClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

      let query = anonClient.rpc('search_nearby_locations_v2', {
        search_lat: sLat,
        search_lng: sLon,
        radius_km: 50.0
      }, { count: 'exact' });

      // Apply Filters
      if (sMaxPrice) query = query.lte('price_per_day', sMaxPrice);
      if (sMinRating) query = query.gte('avg_rating', sMinRating);
      if (sAmenities && sAmenities.length > 0) {
        query = query.contains('amenities', sAmenities);
      }

      // Apply Sorting
      if (sSort === 'price_asc') query = query.order('price_per_day', { ascending: true });
      else if (sSort === 'price_desc') query = query.order('price_per_day', { ascending: false });
      else if (sSort === 'rating') query = query.order('avg_rating', { ascending: false });
      else query = query.order('distance_km', { ascending: true }); // Default

      // Apply Pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      return { data, error: error?.message, count };
    },
    ['search-locations'], // base key
    { revalidate: 60, tags: ['search'] }
  );

  let locations = null;
  let totalCount = 0;

  if (lat && lon) {
    // We pass serialized string representations for arrays/nulls to keep cache keys primitive
    const res = await getCachedSearchResults(lat, lon, sort, maxPrice, minRating, amenities, page);
    locations = res.data;
    totalCount = res.count || 0;
  } else {
    // V1 Fallback: Generic text search (skip cache for fallback for now)
    const { data: fallbackData, count: fallbackCount } = await supabase
      .from('partner_locations')
      .select('*, partners!inner(id)', { count: 'exact' })
      .eq('is_active', true)
      .or(`city.ilike.%${city}%,name.ilike.%${city}%,address_line1.ilike.%${city}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    locations = fallbackData;
    totalCount = fallbackCount || 0;
  }

  // Default coordinates to India if no locations found or lat/lon missing
  let mapCenter: [number, number] = lat && lon ? [lat, lon] : [20.5937, 78.9629]; 
  
  if (locations && locations.length > 0 && (!lat || !lon)) {
    mapCenter = [locations[0].latitude, locations[0].longitude];
  }

  return (
    <div className="h-screen flex flex-col font-inter bg-gray-100 overflow-hidden">
      {/* Header (Simplified) */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 sticky top-0 z-50">
        <a href="/" className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 mr-8">
          StashInn
        </a>
        
        {/* Active Search Context */}
        <SearchHeader initialSearch={resolvedParams} />

        {/* User Nav */}
        <div className="ml-auto flex items-center space-x-4 lg:space-x-6">
          <a href={process.env.NEXT_PUBLIC_PARTNER_URL || "http://localhost:3001"} className="hidden lg:block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap">Become a Partner</a>
          {user ? (
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="hidden md:block px-5 py-2.5 bg-gray-100 text-gray-900 text-sm font-bold rounded-full hover:bg-gray-200 transition-colors">
                My Bookings
              </a>
              <a href="/dashboard/profile" className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-md hover:shadow-lg transition-all shrink-0" title="Profile Settings">
                {user.user_metadata?.full_name ? user.user_metadata.full_name.charAt(0).toUpperCase() : 'U'}
              </a>
            </div>
          ) : (
            <a href="/login" className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors shadow-sm shrink-0 whitespace-nowrap">
              Sign In
            </a>
          )}
        </div>
      </header>

      {/* Split View */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-gray-100">
        {/* Left Side: List */}
        <div className="w-full lg:w-[600px] h-full overflow-y-auto z-10 px-2 lg:px-4 pb-12 shadow-inner">
          <LocationList locations={locations || []} searchParams={resolvedParams} totalCount={totalCount} />
        </div>
        
        {/* Right Side: Map */}
        <div className="flex-1 h-[350px] lg:h-full relative bg-gray-100 p-4 lg:p-6 lg:pl-0 shrink-0">
          <div className="w-full h-full rounded-2xl overflow-hidden shadow-md border border-gray-300">
            <MapWrapper locations={locations || []} center={mapCenter} />
          </div>
        </div>
      </div>
    </div>
  );
}
