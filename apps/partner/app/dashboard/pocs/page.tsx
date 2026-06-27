import { createClient } from '@stashinn/lib/supabase/server';
import PocForm from './PocForm';
import { deletePoc } from './actions';

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
                </div>
                <div className="text-sm text-gray-500 mt-1">{poc.phone} • {poc.email || 'No email provided'}</div>
                <div className="text-sm font-medium text-gray-700 mt-2">
                  📍 {poc.partner_locations?.name || 'All Locations (HQ)'}
                </div>
              </div>
              <form action={async () => {
                'use server';
                await deletePoc(poc.id);
              }}>
                <button type="submit" className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </form>
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
