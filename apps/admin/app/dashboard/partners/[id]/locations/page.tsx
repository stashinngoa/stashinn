import { createClient } from '@stashinn/lib/supabase/server';
import { updateLocationCoordinates } from '../../actions';
import Link from 'next/link';

export default async function PartnerLocationsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const partnerId = params.id;
  const supabase = await createClient();

  // Fetch partner
  const { data: partner } = await supabase
    .from('partners')
    .select('*, users!partners_user_id_fkey(full_name, email)')
    .eq('id', partnerId)
    .single();

  if (!partner) {
    return (
      <div className="p-8 text-center text-gray-400">
        Partner not found.
      </div>
    );
  }

  // Fetch locations
  const { data: locations } = await supabase
    .from('partner_locations')
    .select('*, vehicle_pricing(*)')
    .eq('partner_id', partnerId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/partners" className="px-4 py-2 bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm font-bold rounded-lg transition-colors">
          ← Back to Partners
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-white">Manage Locations</h1>
          <p className="text-gray-500 mt-1">
            Editing locations for <span className="text-purple-400 font-bold">{partner.business_name}</span> (Owner: {(partner.users as any)?.full_name || '—'})
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {!locations || locations.length === 0 ? (
          <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
            This partner has not added any storage locations yet.
          </div>
        ) : (
          locations.map((loc) => (
            <div key={loc.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-200">{loc.name} <span className="text-sm font-normal text-gray-400 capitalize bg-gray-800 px-2 py-0.5 rounded ml-2">{loc.location_type || 'luggage'}</span></h3>
                <p className="text-sm text-gray-500">{loc.address_line1}, {loc.city}, {loc.state} - {loc.pincode}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${loc.is_active ? 'bg-green-900/40 text-green-400 border border-green-700/30' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                    {loc.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {loc.location_type === 'garage' && (
                    <>
                      {loc.has_cctv && <span className="inline-block px-2 py-0.5 text-xs bg-purple-900/40 text-purple-400 border border-purple-700/30 rounded">CCTV</span>}
                      {loc.has_security_guard && <span className="inline-block px-2 py-0.5 text-xs bg-purple-900/40 text-purple-400 border border-purple-700/30 rounded">Guard</span>}
                    </>
                  )}
                </div>

                {loc.location_type === 'garage' && loc.vehicle_pricing && loc.vehicle_pricing.length > 0 && (
                  <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 text-xs">
                    <p className="font-bold text-gray-300 mb-2 uppercase tracking-wide">Vehicle Rates & Capacity</p>
                    <div className="grid grid-cols-3 gap-2 text-gray-400">
                      <div><span className="text-gray-300">Bike:</span> {loc.vehicle_pricing[0].bike_capacity} slots (₹{loc.vehicle_pricing[0].bike_rate_day}/d)</div>
                      <div><span className="text-gray-300">Sedan:</span> {loc.vehicle_pricing[0].sedan_capacity} slots (₹{loc.vehicle_pricing[0].sedan_rate_day}/d)</div>
                      <div><span className="text-gray-300">SUV:</span> {loc.vehicle_pricing[0].suv_capacity} slots (₹{loc.vehicle_pricing[0].suv_rate_day}/d)</div>
                    </div>
                  </div>
                )}
              </div>

              <form action={updateLocationCoordinates} className="space-y-4 pt-4 border-t border-gray-800">
                <input type="hidden" name="location_id" value={loc.id} />
                <input type="hidden" name="partner_id" value={partnerId} />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Latitude</label>
                    <input 
                      type="number" 
                      step="any"
                      name="latitude" 
                      defaultValue={loc.latitude || 0}
                      required 
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-purple-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Longitude</label>
                    <input 
                      type="number" 
                      step="any"
                      name="longitude" 
                      defaultValue={loc.longitude || 0}
                      required 
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-purple-500" 
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors">
                    Update Coordinates
                  </button>
                </div>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
