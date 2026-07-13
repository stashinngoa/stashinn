import { createClient } from '@stashinn/lib/supabase/server';
import PocForm from './PocForm';
export default async function PocManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user?.id)
    .single();

  const { data: pocs } = await supabase
    .from('partner_pocs')
    .select('*, partner_locations(name)')
    .eq('partner_id', partner?.id)
    .order('created_at', { ascending: false });

  const { data: locations } = await supabase
    .from('partner_locations')
    .select('id, name')
    .eq('partner_id', partner?.id);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Staff & Points of Contact</h1>
        <p className="text-gray-500 mt-1">Manage personnel authorized to verify bookings at your locations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {pocs?.map((poc) => (
            <div key={poc.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">{poc.name}</h3>
                  {poc.is_primary && <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded font-medium">Primary</span>}
                  {poc.is_verified ? (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-medium">Verified</span>
                  ) : (
                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded font-medium">Pending Verification</span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-1">{poc.phone} • {poc.email || 'No email provided'}</div>
                <div className="text-sm font-medium text-gray-700 mt-2">
                  📍 {poc.partner_locations?.name || 'All Locations (HQ)'}
                </div>
              </div>
            </div>
          ))}
          {(!pocs || pocs.length === 0) && (
            <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-gray-300">
              <p className="text-gray-500">No staff members or POCs added yet.</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <PocForm partnerId={partner?.id} locations={locations || []} />
        </div>
      </div>
    </div>
  );
}
