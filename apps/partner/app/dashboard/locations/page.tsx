import { createClient } from '@stashinn/lib/supabase/server';
import Link from 'next/link';
import LocationCard from './LocationCard';

export default async function LocationsList() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user?.id)
    .single();

  const { data: locations } = await supabase
    .from('partner_locations')
    .select('*')
    .eq('partner_id', partner?.id)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Locations</h1>
          <p className="text-gray-500 mt-1">Manage your active physical storage spots.</p>
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
          <LocationCard key={loc.id} location={loc} />
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
