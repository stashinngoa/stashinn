import { createClient } from '@stashinn/lib/supabase/server';
import Link from 'next/link';
import PocManagementClient from './PocManagementClient';

export default async function AdminPartnerPocsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const partnerId = params.id;
  const supabase = await createClient();

  const { data: partner } = await supabase
    .from('partners')
    .select('business_name')
    .eq('id', partnerId)
    .single();

  const { data: pocs } = await supabase
    .from('partner_pocs')
    .select('*, partner_locations(name)')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  const { data: locations } = await supabase
    .from('partner_locations')
    .select('id, name')
    .eq('partner_id', partnerId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/dashboard/partners" className="hover:text-gray-300">Partners</Link>
            <span>/</span>
            <span className="text-gray-400">{partner?.business_name}</span>
            <span>/</span>
            <span className="text-white">POCs</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">POC Management</h1>
          <p className="text-gray-500 mt-1">Verify, assign, and manage Points of Contact for this partner.</p>
        </div>
      </div>

      <PocManagementClient 
        initialPocs={pocs || []} 
        locations={locations || []} 
        partnerId={partnerId} 
      />
    </div>
  );
}
