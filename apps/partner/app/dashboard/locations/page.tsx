import { createClient } from '@stashinn/lib/supabase/server';
import Link from 'next/link';
import LocationCard from './LocationCard';

export default async function LocationsList() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from('partners')
    .select('id, status')
    .eq('user_id', user?.id)
    .single();

  const { data: locations } = await supabase
    .from('partner_locations')
    .select('*, vehicle_pricing(*)')
    .eq('partner_id', partner?.id)
    .order('created_at', { ascending: false });

  const { data: primaryPocs } = await supabase
    .from('partner_pocs')
    .select('location_id')
    .eq('partner_id', partner?.id)
    .eq('is_primary', true);
    
  // Support multiple primary locations if user onboarded with both
  const primaryLocationIds = new Set(primaryPocs?.map(p => p.location_id) || []);
  
  // Fallback to oldest location if no explicit primary POC
  if (primaryLocationIds.size === 0 && locations && locations.length > 0) {
    primaryLocationIds.add(locations[locations.length - 1].id);
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Locations</h1>
          <p className="text-gray-500 mt-1">Manage your physical storage spots.</p>
        </div>
        
        <Link 
          href="/dashboard/locations/new" 
          className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Location
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations?.map((loc) => (
          <LocationCard 
            key={loc.id} 
            location={loc} 
            partnerStatus={partner?.status} 
            isPrimary={primaryLocationIds.has(loc.id)} 
          />
        ))}
        {(!locations || locations.length === 0) && (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-dashed border-gray-300">
            <p className="text-gray-500">You haven't added any locations yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
