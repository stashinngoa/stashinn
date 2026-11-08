import { createClient } from '@stashinn/lib/supabase/server';
import { notFound } from 'next/navigation';
import ClientPartnerDetails from './ClientPartnerDetails';
import { getKycDocs } from '../actions';
import { getAmenities } from '@stashinn/lib/services/amenities';

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

  // The signed registration form is stored as a private storage path; link to it with a signed URL
  let signedRegistrationUrl: string | null = null;
  if (partner.signed_registration_doc_url) {
    const { data } = await supabase.storage.from('kyc-documents').createSignedUrl(partner.signed_registration_doc_url, 3600);
    signedRegistrationUrl = data?.signedUrl || null;
  }

  const { data: scoringRules } = await supabase.from('system_scoring_rules').select('*').eq('id', 1).single();

  // Current and upcoming booking pauses set by the partner
  const { data: pauses } = await supabase
    .from('location_pauses')
    .select('id, location_id, starts_at, ends_at, reason, details, created_at')
    .eq('partner_id', partnerId)
    .is('cancelled_at', null)
    .gt('ends_at', new Date().toISOString())
    .order('starts_at');

  return (
    <ClientPartnerDetails
      partner={partner}
      locations={locations || []}
      pocs={pocs || []}
      kycDocs={kycDocs}
      signedRegistrationUrl={signedRegistrationUrl}
      scoringRules={scoringRules}
      pauses={pauses || []}
      amenities={await getAmenities(supabase)}
    />
  );
}
