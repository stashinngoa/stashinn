import Link from 'next/link';

export default function LocationList({ locations, searchParams, totalCount = 0 }: { locations: any[], searchParams: any, totalCount?: number }) {
  if (!locations || locations.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900">No locations found</h3>
        <p className="text-gray-500 mt-2">Try searching a different area or expanding your map.</p>
      </div>
    );
  }

  const queryParams = new URLSearchParams(searchParams as Record<string, string>).toString();
  const mode = searchParams.mode || 'luggage';
  const vehicleType = searchParams.vehicleType || 'sedan';

  return (
    <div className="p-4 md:p-6 bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalCount > 0 ? totalCount : locations.length} {mode === 'luggage' ? 'storage spots' : 'parking spots'} found</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 lg:gap-6">
      {locations.map((loc) => {
        let pricePerDay = loc.price_per_day;
        let capacity = null;
        
        if (mode === 'garage' && loc.vehicle_pricing && loc.vehicle_pricing.length > 0) {
          const vp = loc.vehicle_pricing[0];
          if (vehicleType === 'bike') { pricePerDay = vp.bike_rate_day || loc.price_per_day; capacity = vp.bike_capacity; }
          if (vehicleType === 'sedan') { pricePerDay = vp.sedan_rate_day || loc.price_per_day; capacity = vp.sedan_capacity; }
          if (vehicleType === 'suv') { pricePerDay = vp.suv_rate_day || loc.price_per_day; capacity = vp.suv_capacity; }
        }

        return (
        <Link 
          key={loc.id} 
          href={`/locations/${loc.id}?${queryParams}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col group h-full"
        >
          <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800 relative shrink-0">
            {loc.photos && loc.photos.length > 0 ? (
              <img src={loc.photos[0]} alt={loc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-600">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          
          <div className="p-5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate pr-4">{loc.name}</h3>
                {loc.distance_km && (
                  <span className="text-xs font-semibold px-2 py-1 bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 rounded-full whitespace-nowrap">
                    {loc.distance_km.toFixed(1)} km
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{loc.address_line1}, {loc.city}</p>
              
              <div className="flex items-center mt-2 space-x-1">
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{loc.avg_rating || 'New'}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {mode === 'luggage' ? (
                  loc.amenities && loc.amenities.length > 0 ? (
                    loc.amenities.map((feature: string) => (
                      <span key={feature} className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-2 py-1 rounded">
                        {feature}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">Basic Storage</span>
                  )
                ) : (
                  <>
                    {capacity !== null && (
                      <span className="text-xs font-bold text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border border-orange-100 dark:border-orange-800/50 px-2 py-1 rounded">
                        {capacity} Slots Available
                      </span>
                    )}
                    {loc.has_cctv && <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-2 py-1 rounded">CCTV</span>}
                    {loc.has_security_guard && <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-2 py-1 rounded">Guard</span>}
                    {loc.has_ev_charging && <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-2 py-1 rounded">EV Charging</span>}
                    {loc.has_lockable_gate && <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-2 py-1 rounded">Gate</span>}
                  </>
                )}
              </div>
            </div>
            
            <div className="mt-5 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
              <div>
                <span className="text-2xl font-black text-gray-900 dark:text-white">₹{pricePerDay || 0}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/day</span>
              </div>
            </div>
          </div>
        </Link>
      )})}
      </div>

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="pt-8 flex justify-center items-center space-x-2">
          {(() => {
            const limit = 10;
            const currentPage = parseInt(searchParams.page as string || '1');
            const totalPages = Math.ceil(totalCount / limit);
            const pages = [];
            
            // Previous Button
            if (currentPage > 1) {
              const prevParams = new URLSearchParams(searchParams as Record<string, string>);
              prevParams.set('page', (currentPage - 1).toString());
              pages.push(
                <Link key="prev" href={`/search?${prevParams.toString()}`} className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </Link>
              );
            }

            // Page Numbers
            for (let i = 1; i <= totalPages; i++) {
              const pageParams = new URLSearchParams(searchParams as Record<string, string>);
              pageParams.set('page', i.toString());
              pages.push(
                <Link 
                  key={i} 
                  href={`/search?${pageParams.toString()}`} 
                  className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-colors ${currentPage === i ? 'bg-orange-600 border-orange-600 text-white font-bold' : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'}`}
                >
                  {i}
                </Link>
              );
            }

            // Next Button
            if (currentPage < totalPages) {
              const nextParams = new URLSearchParams(searchParams as Record<string, string>);
              nextParams.set('page', (currentPage + 1).toString());
              pages.push(
                <Link key="next" href={`/search?${nextParams.toString()}`} className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </Link>
              );
            }

            return pages;
          })()}
        </div>
      )}
    </div>
  );
}
