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
    .select('*, partner_locations(id, name)')
    .eq('partner_id', partner?.id)
    .order('created_at', { ascending: false });

  const { data: locations } = await supabase
    .from('partner_locations')
    .select('id, name')
    .eq('partner_id', partner?.id);

  // Group identical POCs by phone (or name if phone missing)
  const groupedPocs: any[] = [];
  
  // Need to await inside loop for signed URLs, so we use a standard for-of
  if (pocs) {
    for (const poc of pocs) {
      const key = poc.phone || poc.name;
      const existing = groupedPocs.find(p => (p.phone || p.name) === key);
      if (existing) {
        if (poc.partner_locations) existing.assignedLocations.push(poc.partner_locations);
        existing.poc_ids.push(poc.id);
      } else {
        let idDocPublic = null;
        let photoPublic = null;
        
        if (poc.id_document_url) {
          const { data } = await supabase.storage.from('kyc-documents').createSignedUrl(poc.id_document_url, 3600);
          if (data) idDocPublic = data.signedUrl;
        }
        if (poc.photo_url) {
          const { data } = await supabase.storage.from('kyc-documents').createSignedUrl(poc.photo_url, 3600);
          if (data) photoPublic = data.signedUrl;
        }
        
        groupedPocs.push({
          ...poc,
          idDocPublic,
          photoPublic,
          assignedLocations: poc.partner_locations ? [poc.partner_locations] : [],
          poc_ids: [poc.id]
        });
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Staff & Points of Contact</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage personnel authorized to verify bookings at your locations.</p>
        </div>
        <PocForm partnerId={partner?.id} locations={locations || []} />
      </div>

      <div className="space-y-4">
        {groupedPocs.map((poc: any) => (
          <PocItem 
            key={poc.id} 
            poc={poc} 
            locations={locations || []} 
            isApproved={isApproved} 
            partnerId={partner?.id} 
          />
        ))}
        {(!pocs || pocs.length === 0) && (
          <div className="bg-white dark:bg-gray-950 p-12 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No staff members or POCs added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
