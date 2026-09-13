import { createClient } from '@stashinn/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ClientPartnerDetails from './ClientPartnerDetails';
import { getKycDocs } from '../actions';

export default async function PartnerDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const partnerId = params.id;
  const supabase = await createClient();

  const { data: partner, error } = await supabase
    .from('partners')
    .select('*, users!partners_user_id_fkey(email, full_name, phone)')
    .eq('id', partnerId)
    .single();

  if (error || !partner) {
    notFound();
  }

  const { data: locations } = await supabase
    .from('partner_locations')
    .select('*, vehicle_pricing(*)')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  const { data: pocsData } = await supabase
    .from('partner_pocs')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  const pocs = await Promise.all(
    (pocsData || []).map(async (poc) => {
      let signedPhotoUrl = null;
      let signedIdDocUrl = null;

      if (poc.photo_url) {
        const { data } = await supabase.storage.from('kyc-documents').createSignedUrl(poc.photo_url, 3600);
        signedPhotoUrl = data?.signedUrl || null;
      }

      if (poc.id_document_url) {
        const { data } = await supabase.storage.from('kyc-documents').createSignedUrl(poc.id_document_url, 3600);
        signedIdDocUrl = data?.signedUrl || null;
      }

      return {
        ...poc,
        signed_photo_url: signedPhotoUrl,
        signed_id_doc_url: signedIdDocUrl,
      };
    })
  );

  const kycDocs = await getKycDocs(partnerId);

  const { data: scoringRules } = await supabase.from('system_scoring_rules').select('*').eq('id', 1).single();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/partners" className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Partner Details</h1>
          <p className="text-gray-500 mt-1">Manage partner profile, locations, and points of contact.</p>
        </div>
      </div>

      <ClientPartnerDetails 
        partner={partner} 
        locations={locations || []} 
        pocs={pocs || []} 
        kycDocs={kycDocs} 
        scoringRules={scoringRules}
      />
    </div>
  );
}
