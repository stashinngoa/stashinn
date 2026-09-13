'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addPoc(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const locationIds = formData.getAll('location_id') as string[];
  const isAll = locationIds.includes('all') || locationIds.length === 0;
  const targetLocs = isAll ? [null] : locationIds;

  let newIdDocUrl = null;
  let newPhotoUrl = null;
  const partnerId = formData.get('partner_id') as string;

  const pocIdFile = formData.get('poc_id_document') as File;
  if (pocIdFile && pocIdFile.size > 0) {
    const ext = pocIdFile.name.split('.').pop();
    const path = `${partnerId}/poc_id_${Date.now()}.${ext}`;
    const { error: err } = await supabase.storage.from('kyc-documents').upload(path, pocIdFile);
    if (!err) newIdDocUrl = path;
  }

  const pocPhotoFile = formData.get('poc_photo') as File;
  if (pocPhotoFile && pocPhotoFile.size > 0) {
    const ext = pocPhotoFile.name.split('.').pop();
    const path = `${partnerId}/poc_photo_${Date.now()}.${ext}`;
    const { error: err } = await supabase.storage.from('kyc-documents').upload(path, pocPhotoFile);
    if (!err) newPhotoUrl = path;
  }

  const inserts = targetLocs.map(locId => ({
    partner_id: partnerId,
    location_id: locId === 'all' ? null : locId,
    name: formData.get('name') as string,
    phone: formData.get('phone') as string,
    email: (formData.get('email') as string) || null,
    is_primary: formData.get('is_primary') === 'true',
    is_verified: false,
    id_document_url: newIdDocUrl,
    photo_url: newPhotoUrl
  }));

  const { error } = await supabase.from('partner_pocs').insert(inserts);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/pocs');
}

export async function editPoc(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Need to ensure the partner is NOT approved if they try to edit directly
  const { data: partner } = await supabase.from('partners').select('status').eq('user_id', user.id).single();
  if (partner?.status === 'approved') return { error: 'Cannot edit directly when approved' };

  const pocIdsStr = formData.get('poc_ids') as string;
  const pocIds = pocIdsStr ? pocIdsStr.split(',') : [formData.get('poc_id') as string];
  
  const locationIds = formData.getAll('location_id') as string[];

  if (locationIds && locationIds.length > 0) {
    // Fetch one existing row to keep URLs and status
    const { data: existingPoc } = await supabase.from('partner_pocs').select('*').in('id', pocIds).limit(1).single();
    
    if (existingPoc) {
      // Delete existing
      await supabase.from('partner_pocs').delete().in('id', pocIds);
      
      // Determine if 'all' is in the array. If so, just make one row with location_id = null
      const isAll = locationIds.includes('all');
      const targetLocs = isAll ? [null] : locationIds.filter(id => id !== 'all');
      
      let newIdDocUrl = existingPoc.id_document_url;
      let newPhotoUrl = existingPoc.photo_url;

      const pocIdFile = formData.get('poc_id_document') as File;
      if (pocIdFile && pocIdFile.size > 0) {
        const ext = pocIdFile.name.split('.').pop();
        const path = `${existingPoc.partner_id}/poc_id_${Date.now()}.${ext}`;
        const { error: err } = await supabase.storage.from('kyc-documents').upload(path, pocIdFile);
        if (!err) newIdDocUrl = path;
      }

      const pocPhotoFile = formData.get('poc_photo') as File;
      if (pocPhotoFile && pocPhotoFile.size > 0) {
        const ext = pocPhotoFile.name.split('.').pop();
        const path = `${existingPoc.partner_id}/poc_photo_${Date.now()}.${ext}`;
        const { error: err } = await supabase.storage.from('kyc-documents').upload(path, pocPhotoFile);
        if (!err) newPhotoUrl = path;
      }
      
      const inserts = targetLocs.map(locId => ({
         partner_id: existingPoc.partner_id,
         location_id: locId,
         name: formData.get('name') as string,
         phone: formData.get('phone') as string,
         email: (formData.get('email') as string) || null,
         is_primary: existingPoc.is_primary,
         is_verified: false, // reset verification on edit if documents might have changed
         id_document_url: newIdDocUrl,
         photo_url: newPhotoUrl
      }));
      
      const { error } = await supabase.from('partner_pocs').insert(inserts);
      if (error) return { error: error.message };
    }
  } else {
    // Fallback if no locations provided (should not happen if they check something)
    const { error } = await supabase
      .from('partner_pocs')
      .update({
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        email: (formData.get('email') as string) || null,
      })
      .in('id', pocIds);
    if (error) return { error: error.message };
  }

  revalidatePath('/dashboard/pocs');
}

export async function deletePoc(pocId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: partner } = await supabase.from('partners').select('status').eq('user_id', user.id).single();
  if (partner?.status === 'approved') return { error: 'Cannot delete directly when approved' };

  const ids = pocId.split(',');

  const { error } = await supabase
    .from('partner_pocs')
    .delete()
    .in('id', ids);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/pocs');
}

export async function createSupportTicket(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('support_tickets')
    .insert({
      partner_id: formData.get('partner_id') as string,
      subject: formData.get('subject') as string,
      description: formData.get('description') as string,
      status: 'open'
    });

  if (error) return { error: error.message };
  revalidatePath('/dashboard/pocs');
}
