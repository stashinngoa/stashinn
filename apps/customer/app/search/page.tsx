import { createClient } from '@stashinn/lib/supabase/server';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import SearchHeader from './SearchHeader';
import SearchResults from './SearchResults';
import ThemeToggle from '../../components/ThemeToggle';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { getGstPercent, gstPercentFor, hourlyRate, parseIndiaTime } from '@stashinn/lib/services/bookingAvailability';
import { getAmenities } from '@stashinn/lib/services/amenities';
import { publicLocation } from '../../lib/locationPrivacy';

export const revalidate = 300; // Cache search locations for 5 minutes

export default async function SearchPage({ searchParams }: { searchParams: { q?: string, in?: string, out?: string, bags?: string, lat?: string, lon?: string, sort?: string, max_price?: string, min_rating?: string, amenities?: string, page?: string, mode?: string, vehicleType?: string, max_distance?: string } | Promise<{ q?: string, in?: string, out?: string, bags?: string, lat?: string, lon?: string, sort?: string, max_price?: string, min_rating?: string, amenities?: string, page?: string, mode?: string, vehicleType?: string, max_distance?: string }> }) {
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

  const [gstPercent, amenityCatalog] = await Promise.all([getGstPercent(createServiceClient()), getAmenities(supabase)]);

  const sort = resolvedParams.sort || 'distance';
  const maxPrice = resolvedParams.max_price ? parseFloat(resolvedParams.max_price as string) : null;
  const minRating = resolvedParams.min_rating ? parseFloat(resolvedParams.min_rating as string) : null;
  const maxDistance = resolvedParams.max_distance ? parseFloat(resolvedParams.max_distance as string) : 50.0;
  const amenities = resolvedParams.amenities ? (resolvedParams.amenities as string).split(',') : [];
  const page = parseInt(resolvedParams.page as string || '1');
  const mode = resolvedParams.mode || 'luggage';
  const vehicleType = resolvedParams.vehicleType === 'bike' || resolvedParams.vehicleType === 'suv' ? resolvedParams.vehicleType : 'car';
  const limit = 10;
  const offset = (page - 1) * limit;

  // Cached Search Function
  const getCachedSearchResults = unstable_cache(
    async (sLat, sLon, sSort, sMaxPrice, sMinRating, sMaxDistance, sAmenities, sPage, sMode, sVehicleType) => {
      // Use standard @supabase/supabase-js client without cookies for caching
      const { createClient: createGenericClient } = require('@supabase/supabase-js');
      const anonClient = createGenericClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

      let query = anonClient.rpc('search_nearby_locations_v4', {
        search_lat: sLat,
        search_lng: sLon,
        radius_km: sMaxDistance,
        p_location_type: sMode
      }, { count: 'exact' });

      // Apply Filters
      if (sMaxPrice) query = query.lte('price_per_hour', sMaxPrice);
      if (sMinRating) query = query.gte('avg_rating', sMinRating);
      if (sAmenities && sAmenities.length > 0) {
        if (sMode === 'luggage') {
          query = query.contains('amenities', sAmenities);
        } else {
          sAmenities.forEach((am: string) => {
            if (am === 'has_cctv') query = query.eq('has_cctv', true);
            if (am === 'has_security_guard') query = query.eq('has_security_guard', true);
            if (am === 'has_ev_charging') query = query.eq('has_ev_charging', true);
            if (am === 'has_lockable_gate') query = query.eq('has_lockable_gate', true);
            if (!am.startsWith('has_')) query = query.contains('amenities', [am]);
          });
        }
      }

      // Apply Sorting
      if (sSort === 'price_asc') query = query.order('price_per_hour', { ascending: true });
      else if (sSort === 'price_desc') query = query.order('price_per_hour', { ascending: false });
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
    const res = await getCachedSearchResults(lat, lon, sort, maxPrice, minRating, maxDistance, amenities, page, mode, vehicleType);
    locations = res.data;
    totalCount = res.count || 0;
  } else {
    // V1 Fallback: Generic text search (skip cache for fallback for now)
    // V2 Fallback: Text search RPC enforcing POC verification
    let query = supabase.rpc('search_locations_text_fallback_v1', {
      search_term: city,
      p_location_type: mode
    }, { count: 'exact' });

    // Apply Sorting
    if (sort === 'price_asc') query = query.order('price_per_hour', { ascending: true });
    else if (sort === 'price_desc') query = query.order('price_per_hour', { ascending: false });
    else if (sort === 'rating') query = query.order('avg_rating', { ascending: false });

    // Apply Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: fallbackData, count: fallbackCount } = await query;
    
    locations = fallbackData;
    totalCount = fallbackCount || 0;
  }

  // Hide locations that are paused for the requested times (or right now). Pause records
  // are private, so they're read with the service client and only the location ids are used.
  if (locations && locations.length > 0) {
    const start = resolvedParams.in ? parseIndiaTime(resolvedParams.in) : new Date();
    const end = resolvedParams.out ? parseIndiaTime(resolvedParams.out) : new Date(start.getTime() + 3_600_000);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
      const { data: paused } = await createServiceClient()
        .from('location_pauses')
        .select('location_id')
        .in('location_id', locations.map((l: any) => l.id))
        .is('cancelled_at', null)
        .lt('starts_at', end.toISOString())
        .gt('ends_at', start.toISOString());
      const pausedIds = new Set((paused || []).map((p: any) => p.location_id));
      if (pausedIds.size) {
        locations = locations.filter((l: any) => !pausedIds.has(l.id));
        totalCount = Math.max(0, totalCount - pausedIds.size);
      }
    }
  }

  // A location without a rate isn't offered (it needs its score applied by an admin)
  if (locations && locations.length > 0) {
    const priced = locations.filter((l: any) => hourlyRate(l, mode === 'garage' ? 'garage' : 'luggage', vehicleType) > 0);
    totalCount = Math.max(0, totalCount - (locations.length - priced.length));
    locations = priced;
  }

  // Prices shown include GST for partners it applies to
  if (locations && locations.length > 0) {
    const { data: partnerGst } = await createServiceClient()
      .from('partner_locations')
      .select('id, partners(gst_applicable)')
      .in('id', locations.map((l: any) => l.id));
    const gstById = new Map((partnerGst || []).map((l: any) => [l.id, gstPercentFor(gstPercent, l.partners)]));
    locations = locations.map((l: any) => ({ ...l, gst_percent: gstById.get(l.id) ?? gstPercent }));
  }

  // Only the area before booking: the street address and PIN code never reach the browser
  if (locations) locations = locations.map((l: any) => publicLocation(l));

  // Plain string params for the client components
  const params = Object.fromEntries(Object.entries(resolvedParams).filter(([, v]) => typeof v === 'string')) as Record<string, string>;

  // Default coordinates to India if no locations found or lat/lon missing
  let mapCenter: [number, number] = lat && lon ? [lat, lon] : [20.5937, 78.9629]; 
  
  if (locations && locations.length > 0 && (!lat || !lon)) {
    mapCenter = [locations[0].latitude, locations[0].longitude];
  }

  return (
    <div className="min-h-screen flex flex-col font-inter bg-gray-50 dark:bg-gray-950 transition-colors">
      <header className="h-16 sticky top-0 z-50 shrink-0 flex items-center gap-3 md:gap-5 px-4 md:px-6 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="StashInn home">
          <img src="/StashInn_Light_no_text.png" alt="" className="h-8 md:h-9 w-auto dark:hidden" />
          <img src="/StashInn_Dark_no_text.png" alt="" className="h-8 md:h-9 w-auto hidden dark:block" />
          <span className="hidden sm:inline xl:hidden 2xl:inline text-xl md:text-2xl font-black tracking-tighter">
            <span className="text-gray-900 dark:text-white">Stash</span><span className="text-orange-500">Inn</span>
          </span>
        </Link>

        <SearchHeader initialSearch={params} />

        <nav className="flex items-center gap-1.5 md:gap-3 shrink-0">
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/dashboard" title="My bookings" className="hidden md:inline-flex items-center gap-2 h-10 px-3 2xl:px-4 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:border-orange-300 dark:hover:border-orange-600/60 transition-colors whitespace-nowrap">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="xl:hidden 2xl:inline">My bookings</span>
              </Link>
              <Link href="/dashboard/profile" title="Profile" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center shrink-0">
                {user.user_metadata?.full_name ? user.user_metadata.full_name.charAt(0).toUpperCase() : 'U'}
              </Link>
            </>
          ) : (
            <Link href="/login" className="inline-flex items-center gap-1.5 h-10 px-3 md:px-4 rounded-full bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition-colors shrink-0 whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <span className="hidden md:inline">Sign in</span>
            </Link>
          )}
        </nav>
      </header>

      <SearchResults
        locations={locations || []}
        totalCount={totalCount}
        searchParams={params}
        amenityCatalog={amenityCatalog}
        center={mapCenter}
      />

      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="px-4 md:px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>© {new Date().getFullYear()} StashInn</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <a href="/help" className="hover:text-gray-900 dark:hover:text-white">Help Centre</a>
            <a href="/safety" className="hover:text-gray-900 dark:hover:text-white">Safety</a>
            <a href="/cancellation" className="hover:text-gray-900 dark:hover:text-white">Cancellation options</a>
            <a href="/report-concern" className="hover:text-gray-900 dark:hover:text-white">Report a concern</a>
            <a href="/terms" className="hover:text-gray-900 dark:hover:text-white">Terms</a>
            <a href="/privacy" className="hover:text-gray-900 dark:hover:text-white">Privacy</a>
            <a href={process.env.NEXT_PUBLIC_PARTNER_URL || 'http://localhost:3001'} className="hover:text-gray-900 dark:hover:text-white">Become a partner</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
