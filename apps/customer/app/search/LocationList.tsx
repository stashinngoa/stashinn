import Link from 'next/link';

export default function LocationList({ locations, searchParams }: { locations: any[], searchParams: any }) {
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

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{locations.length} storage spots found</h2>
      
      {locations.map((loc) => (
        <div key={loc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col sm:flex-row group">
          <div className="sm:w-48 h-48 sm:h-auto bg-gray-100 relative shrink-0">
            {loc.photos && loc.photos.length > 0 ? (
              <img src={loc.photos[0]} alt={loc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          
          <div className="p-5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-gray-900 truncate pr-4">{loc.name}</h3>
                {loc.distance_km && (
                  <span className="text-xs font-semibold px-2 py-1 bg-purple-50 text-purple-700 rounded-full whitespace-nowrap">
                    {loc.distance_km.toFixed(1)} km
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1 line-clamp-1">{loc.address_line1}, {loc.city}</p>
              
              <div className="mt-3 flex flex-wrap gap-2">
                {['24/7 Security', 'CCTV'].map((feature) => (
                  <span key={feature} className="text-xs text-gray-600 bg-gray-50 border border-gray-100 px-2 py-1 rounded">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="mt-4 flex items-end justify-between pt-4 border-t border-gray-50">
              <div>
                <span className="text-xs text-gray-500 block">Starting from</span>
                <span className="text-lg font-black text-gray-900">₹{loc.price_per_day} <span className="text-sm font-normal text-gray-500">/ day</span></span>
              </div>
              <Link href={`/locations/${loc.id}?${queryParams}`} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors">
                View & Book
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
