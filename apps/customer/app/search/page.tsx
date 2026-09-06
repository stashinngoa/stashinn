import { createClient } from '@stashinn/lib/supabase/server';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import LocationList from './LocationList';
import MapWrapper from './MapWrapper';
import SearchHeader from './SearchHeader';
import ThemeToggle from '../../components/ThemeToggle';

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

  const sort = resolvedParams.sort || 'distance';
  const maxPrice = resolvedParams.max_price ? parseFloat(resolvedParams.max_price as string) : null;
  const minRating = resolvedParams.min_rating ? parseFloat(resolvedParams.min_rating as string) : null;
  const maxDistance = resolvedParams.max_distance ? parseFloat(resolvedParams.max_distance as string) : 50.0;
  const amenities = resolvedParams.amenities ? (resolvedParams.amenities as string).split(',') : [];
  const page = parseInt(resolvedParams.page as string || '1');
  const mode = resolvedParams.mode || 'luggage';
  const vehicleType = resolvedParams.vehicleType || 'sedan';
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
      if (sMaxPrice) query = query.lte('price_per_day', sMaxPrice);
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
          });
        }
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
    if (sort === 'price_asc') query = query.order('price_per_day', { ascending: true });
    else if (sort === 'price_desc') query = query.order('price_per_day', { ascending: false });
    else if (sort === 'rating') query = query.order('avg_rating', { ascending: false });

    // Apply Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: fallbackData, count: fallbackCount } = await query;
    
    locations = fallbackData;
    totalCount = fallbackCount || 0;
  }

  // Default coordinates to India if no locations found or lat/lon missing
  let mapCenter: [number, number] = lat && lon ? [lat, lon] : [20.5937, 78.9629]; 
  
  if (locations && locations.length > 0 && (!lat || !lon)) {
    mapCenter = [locations[0].latitude, locations[0].longitude];
  }

  return (
    <div className="min-h-screen flex flex-col font-inter bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Modern Header */}
      <header className="h-20 bg-white/80 dark:bg-black backdrop-blur-md dark:backdrop-blur-none border-b border-gray-100 dark:border-gray-900 flex items-center px-4 md:px-6 sticky top-0 z-50 shrink-0 transition-colors">
        <Link href="/" className="flex items-center gap-2 mr-4 md:mr-8 shrink-0">
          <img src="/StashInn_Light_no_text.png" alt="StashInn Logo" className="h-8 md:h-10 w-auto dark:hidden" />
          <img src="/StashInn_Dark_no_text.png" alt="StashInn Logo" className="h-8 md:h-10 w-auto hidden dark:block" />
          <span className="text-xl md:text-2xl font-black tracking-tighter shrink-0">
            <span className="text-gray-900 dark:text-white">Stash</span><span className="text-orange-500">Inn</span>
          </span>
        </Link>
        
        {/* Active Search Context */}
        <SearchHeader initialSearch={resolvedParams} />

        {/* User Nav */}
        <div className="ml-auto flex items-center gap-2 md:gap-4 shrink-0 pl-2">
          <ThemeToggle />
          
          <a href={process.env.NEXT_PUBLIC_PARTNER_URL || "http://localhost:3001"} className="hidden lg:flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors whitespace-nowrap">
            <svg className="w-5 h-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
            </svg>
            Become a Partner
          </a>
          
          {user ? (
            <div className="flex items-center gap-2 md:gap-4">
              <Link href="/dashboard" className="hidden md:flex items-center px-5 py-2.5 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm font-bold rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors border border-transparent dark:border-gray-800">
                My Bookings
              </Link>
              <Link href="/dashboard/profile" className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 text-white font-bold shadow-md hover:shadow-lg transition-all shrink-0" title="Profile Settings">
                {user.user_metadata?.full_name ? user.user_metadata.full_name.charAt(0).toUpperCase() : 'U'}
              </Link>
            </div>
          ) : (
            <Link href="/login" className="flex items-center px-4 py-2 md:px-5 md:py-2.5 bg-gray-900 dark:bg-orange-600 text-white text-sm font-medium rounded-full hover:bg-gray-800 dark:hover:bg-orange-700 transition-colors shadow-sm shrink-0">
              <svg className="w-5 h-5 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <svg className="w-5 h-5 hidden md:block md:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span className="hidden md:inline-block">Sign In</span>
            </Link>
          )}
        </div>
      </header>

      {/* Split View */}
      <div className="flex-1 flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-950 transition-colors relative">
        {/* Left Side: List */}
        <div className="w-full lg:w-1/2 min-h-[50vh] shadow-[0_0_15px_rgba(0,0,0,0.05)] dark:shadow-[0_0_20px_rgba(0,0,0,0.3)] bg-gray-50 dark:bg-gray-950 z-10">
          <div className="px-2 lg:px-4 py-4 pb-12">
            <LocationList locations={locations || []} searchParams={resolvedParams} totalCount={totalCount} />
          </div>
        </div>
        
        {/* Right Side: Map */}
        <div className="w-full lg:w-1/2 h-[400px] lg:h-[calc(100vh-80px)] lg:sticky lg:top-20 bg-gray-50 dark:bg-gray-950 p-4 lg:p-6 lg:pl-0 shrink-0 transition-colors z-0">
          <div className="w-full h-full rounded-2xl overflow-hidden shadow-md border border-gray-300 dark:border-gray-800 transition-colors">
            <MapWrapper locations={locations || []} center={mapCenter} />
          </div>
        </div>
      </div>

      {/* Airbnb-style Footer (Matching Home Page) */}
      <footer className="w-full relative overflow-hidden bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 pt-10 pb-8 z-20">
        {/* Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-orange-300/10 dark:bg-orange-900/10 blur-[120px] rounded-full"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 border-b border-gray-200 dark:border-gray-800 pb-8">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:underline">Help Centre</a></li>
                <li><a href="#" className="hover:underline">Safety information</a></li>
                <li><a href="#" className="hover:underline">Cancellation options</a></li>
                <li><a href="#" className="hover:underline">Report a concern</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-3">Partner with us</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href={process.env.NEXT_PUBLIC_PARTNER_URL || "http://localhost:3001"} className="hover:underline">Become a StashInn Partner</a></li>
                <li><a href="#" className="hover:underline">Hosting resources</a></li>
                <li><a href="#" className="hover:underline">Community forum</a></li>
                <li><a href="#" className="hover:underline">Hosting responsibly</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-3">StashInn</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:underline">Newsroom</a></li>
                <li><a href="#" className="hover:underline">New features</a></li>
                <li><a href="#" className="hover:underline">Careers</a></li>
                <li><a href="#" className="hover:underline">Investors</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 flex-wrap">
              <span>© {new Date().getFullYear()} StashInn, Inc.</span>
              <span className="hidden md:inline">·</span>
              <div className="flex gap-3 flex-wrap">
                <a href="#" className="hover:underline">Privacy</a>
                <a href="#" className="hover:underline">Terms</a>
                <a href="#" className="hover:underline">Sitemap</a>
                <a href="#" className="hover:underline">Company details</a>
              </div>
            </div>
            <div className="flex items-center gap-3 font-medium text-gray-900 dark:text-gray-300">
              <button className="flex items-center gap-1 hover:underline shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                English (IN)
              </button>
              <button className="hover:underline shrink-0">₹ INR</button>
              <div className="flex gap-2 ml-1 shrink-0">
                <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </footer>
    </div>
  );
}
