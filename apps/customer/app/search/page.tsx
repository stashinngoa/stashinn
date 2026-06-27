import { createClient } from '@stashinn/lib/supabase/server';
import LocationList from './LocationList';
import MapWrapper from './MapWrapper';

export default async function SearchPage({ searchParams }: { searchParams: { q?: string, in?: string, out?: string, bags?: string } | Promise<{ q?: string, in?: string, out?: string, bags?: string }> }) {
  const resolvedParams = await searchParams;
  const supabase = await createClient();
  const city = resolvedParams.q || 'Goa';
  
  // V1 Fallback: Generic text search on multiple fields.
  // Note: We removed the strict 'partners.status = approved' check for now since there is no Admin Panel to approve partners yet.
  const { data: locations, error } = await supabase
    .from('partner_locations')
    .select('*, partners!inner(id)')
    .eq('is_active', true)
    .or(`city.ilike.%${city}%,name.ilike.%${city}%,address_line1.ilike.%${city}%`)
    .order('created_at', { ascending: false });

  // Default coordinates to India if no locations found
  let mapCenter: [number, number] = [20.5937, 78.9629]; 
  
  if (locations && locations.length > 0) {
    mapCenter = [locations[0].latitude, locations[0].longitude];
  }

  return (
    <div className="min-h-screen flex flex-col font-inter bg-gray-50">
      {/* Header (Simplified) */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 sticky top-0 z-50">
        <a href="/" className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 mr-8">
          StashInn
        </a>
        
        {/* Active Search Context */}
        <div className="flex-1 max-w-2xl hidden md:flex items-center bg-gray-50 rounded-full border border-gray-200 px-4 py-2">
          <div className="text-sm font-semibold text-gray-800 pr-3 border-r border-gray-300">{resolvedParams.q || 'Anywhere'}</div>
          <div className="text-sm text-gray-500 px-3 border-r border-gray-300">{resolvedParams.in ? new Date(resolvedParams.in).toLocaleDateString() : 'Dates'}</div>
          <div className="text-sm text-gray-500 pl-3">{resolvedParams.bags || 1} Bags</div>
        </div>
      </header>

      {/* Split View */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: List */}
        <div className="w-full lg:w-[600px] h-full overflow-y-auto bg-gray-50 shadow-inner z-10">
          <LocationList locations={locations || []} searchParams={resolvedParams} />
        </div>
        
        {/* Right Side: Map */}
        <div className="flex-1 h-[50vh] lg:h-auto relative bg-gray-200">
          <MapWrapper locations={locations || []} center={mapCenter} />
        </div>
      </div>
    </div>
  );
}
