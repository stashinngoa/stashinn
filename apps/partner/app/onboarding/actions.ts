'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function submitOnboarding(formData: FormData) {
  const supabase = await createClient();
  
  // Verify auth session again on server side
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== formData.get('user_id')) {
    return { error: 'Unauthorized session.' };
  }

  // 1. Insert into public.partners
  const { data: partnerData, error: partnerError } = await supabase
    .from('partners')
    .insert({
      user_id: user.id,
      business_name: formData.get('business_name') as string,
      business_type: formData.get('business_type') as string,
      gstin: formData.get('gst_number') as string || null,
      pan: formData.get('pan_number') as string,
      status: 'pending'
    })
    .select('id')
    .single();

  if (partnerError || !partnerData) {
    console.error('Partner Insert Error:', partnerError);
    return { error: partnerError?.message || 'Failed to create business profile.' };
  }

  // Update public.users with the contact details (since phone is stored there)
  await supabase
    .from('users')
    .update({ phone: formData.get('contact_phone') as string })
    .eq('id', user.id);

  // 2. Insert into public.partner_locations (Initial Location)
  const { error: locationError } = await supabase
    .from('partner_locations')
    .insert({
      partner_id: partnerData.id,
      name: `${formData.get('business_name')} - Main Location`,
      address_line1: formData.get('address_line1') as string,
      address_line2: formData.get('address_line2') as string || null,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      pincode: formData.get('postal_code') as string,
      country: 'India',
      latitude: 0, // Default for now, we will add geocoding later
      longitude: 0 // Default for now
    });

  if (locationError) {
    console.error('Location Insert Error:', locationError);
    // Note: the partner was already created, but we failed to add a location. 
    // In production we would use a transaction or RPC for this.
  } else {
    // 2.5. Upload POC Files
    let idDocUrl = null;
    let photoUrl = null;

    const pocIdFile = formData.get('poc_id_document') as File;
    if (pocIdFile && pocIdFile.size > 0) {
      const ext = pocIdFile.name.split('.').pop();
      const path = `${partnerData.id}/poc_id_${Date.now()}.${ext}`;
      const { error: err } = await supabase.storage.from('kyc-documents').upload(path, pocIdFile);
      if (!err) idDocUrl = path;
    }

    const pocPhotoFile = formData.get('poc_photo') as File;
    if (pocPhotoFile && pocPhotoFile.size > 0) {
      const ext = pocPhotoFile.name.split('.').pop();
      const path = `${partnerData.id}/poc_photo_${Date.now()}.${ext}`;
      const { error: err } = await supabase.storage.from('kyc-documents').upload(path, pocPhotoFile);
      if (!err) photoUrl = path;
    }

    // 2.6 Insert POC
    const { data: locData } = await supabase.from('partner_locations').select('id').eq('partner_id', partnerData.id).single();
    if (locData) {
      await supabase.from('partner_pocs').insert({
        partner_id: partnerData.id,
        location_id: locData.id,
        name: formData.get('poc_name') as string,
        phone: formData.get('poc_phone') as string,
        email: formData.get('poc_email') as string || null,
        is_primary: true,
        id_document_url: idDocUrl,
        photo_url: photoUrl
      });
    }
  }

  // 3. Upload KYC Document to Storage
  const kycFile = formData.get('kyc_document') as File;
  if (kycFile && kycFile.size > 0) {
    const fileExt = kycFile.name.split('.').pop();
    const fileName = `kyc_proof_${Date.now()}.${fileExt}`;
    const filePath = `${partnerData.id}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(filePath, kycFile, {
        upsert: true
      });
      
    if (uploadError) {
      console.error('Storage Upload Error:', uploadError);
      // We don't fail the whole onboarding if document upload fails, 
      // but admins will see they don't have a document in the bucket.
    }
  }

  // Redirect on absolute success
  redirect('/dashboard');
}
