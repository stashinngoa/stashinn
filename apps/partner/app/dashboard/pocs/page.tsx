import { createClient } from '@stashinn/lib/supabase/server';
import PocForm from './PocForm';
import PocItem from './PocItem';

export default async function PocManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: partner } = await supabase
    .from('partners')
    .select('id, status')
    .eq('user_id', user?.id)
    .single();

  const isApproved = partner?.status === 'approved';

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
          {pocs?.map((poc: any) => (
            <PocItem 
              key={poc.id} 
              poc={poc} 
              locations={locations || []} 
              isApproved={isApproved} 
              partnerId={partner?.id} 
            />
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
