'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function addLocation(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized.' };

  const { data: partner } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!partner) return { error: 'Partner profile not found.' };

  const amenities = formData.getAll('amenities') as string[];
  const photosFiles = formData.getAll('photos') as File[];
  const photoUrls: string[] = [];
  
  if (photosFiles && photosFiles.length > 0) {
    for (const file of photosFiles) {
      if (file.size === 0) continue;
      const fileExt = file.name.split('.').pop();
      const fileName = `loc_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${partner.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('location-photos')
        .upload(filePath, file, { upsert: true });
        
      if (!uploadError) {
        const { data } = supabase.storage.from('location-photos').getPublicUrl(filePath);
        photoUrls.push(data.publicUrl);
      }
    }
  }

  const { data: locData, error } = await supabase
    .from('partner_locations')
    .insert({
      partner_id: partner.id,
      name: formData.get('name') as string,
      address_line1: formData.get('address_line1') as string,
      address_line2: formData.get('address_line2') as string || null,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      pincode: formData.get('pincode') as string,
      latitude: parseFloat(formData.get('latitude') as string) || 0,
      longitude: parseFloat(formData.get('longitude') as string) || 0,
      max_bags: parseInt(formData.get('max_bags') as string),
      available_bags: parseInt(formData.get('max_bags') as string),
      operating_hours: {
        open: formData.get('open_time') as string,
        close: formData.get('close_time') as string
      },
      amenities,
      photos: photoUrls,
      is_active: formData.get('is_active') === 'true'
    })
    .select('id')
    .single();

  if (error || !locData) {
    console.error('Add Location Error:', error);
    return { error: error?.message || 'Failed to create location' };
  }

  // Handle POC Creation / Duplication
  const pocOption = formData.get('poc_option');
  
  if (pocOption === 'existing') {
    const existingPocId = formData.get('existing_poc_id') as string;
    if (existingPocId) {
      const { data: existingPoc } = await supabase.from('partner_pocs').select('*').eq('id', existingPocId).single();
      if (existingPoc) {
        // Duplicate the POC for the new location
        await supabase.from('partner_pocs').insert({
          partner_id: partner.id,
          location_id: locData.id,
          name: existingPoc.name,
          phone: existingPoc.phone,
          email: existingPoc.email,
          is_primary: true,
          id_document_url: existingPoc.id_document_url,
          photo_url: existingPoc.photo_url
        });
      }
    }
  } else if (pocOption === 'new') {
    // Process new POC uploads
    let idDocUrl = null;
    let photoUrl = null;

    const pocIdFile = formData.get('poc_id_document') as File;
    if (pocIdFile && pocIdFile.size > 0) {
      const ext = pocIdFile.name.split('.').pop();
      const path = `${partner.id}/poc_id_${Date.now()}.${ext}`;
      const { error: err } = await supabase.storage.from('kyc-documents').upload(path, pocIdFile);
      if (!err) idDocUrl = path;
    }

    const pocPhotoFile = formData.get('poc_photo') as File;
    if (pocPhotoFile && pocPhotoFile.size > 0) {
      const ext = pocPhotoFile.name.split('.').pop();
      const path = `${partner.id}/poc_photo_${Date.now()}.${ext}`;
      const { error: err } = await supabase.storage.from('kyc-documents').upload(path, pocPhotoFile);
      if (!err) photoUrl = path;
    }

    await supabase.from('partner_pocs').insert({
      partner_id: partner.id,
      location_id: locData.id,
      name: formData.get('poc_name') as string,
      phone: formData.get('poc_phone') as string,
      email: formData.get('poc_email') as string || null,
      is_primary: true,
      id_document_url: idDocUrl,
      photo_url: photoUrl
    });
  }

  revalidatePath('/dashboard/locations');
  redirect('/dashboard/locations');
}

export async function updateLocation(formData: FormData) {
  const supabase = await createClient();
  const locationId = formData.get('id') as string;
  const amenities = formData.getAll('amenities') as string[];
  const photosFiles = formData.getAll('photos') as File[];
  const photoUrls: string[] = [];
  
  if (photosFiles && photosFiles.length > 0) {
    for (const file of photosFiles) {
      if (file.size === 0) continue;
      // Note: In a real app we'd need to fetch the partner ID to construct the path properly,
      // but the bucket allows any folder if RLS allows. Let's just upload it.
      const fileExt = file.name.split('.').pop();
      const fileName = `loc_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { data: { user } } = await supabase.auth.getUser();
      const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user?.id).single();
      const filePath = `${partner?.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('location-photos')
        .upload(filePath, file, { upsert: true });
        
      if (!uploadError) {
        const { data } = supabase.storage.from('location-photos').getPublicUrl(filePath);
        photoUrls.push(data.publicUrl);
      }
    }
  }

  // Fetch existing photos to merge if we uploaded new ones, or just let them overwrite?
  // Since this is a simple implementation, if they upload new photos, we append to existing.
  const { data: existingLoc } = await supabase.from('partner_locations').select('photos').eq('id', locationId).single();
  const finalPhotos = photoUrls.length > 0 ? [...(existingLoc?.photos || []), ...photoUrls] : (existingLoc?.photos || []);

  const { error } = await supabase
    .from('partner_locations')
    .update({
      name: formData.get('name') as string,
      address_line1: formData.get('address_line1') as string,
      address_line2: formData.get('address_line2') as string || null,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      pincode: formData.get('pincode') as string,
      latitude: parseFloat(formData.get('latitude') as string) || 0,
      longitude: parseFloat(formData.get('longitude') as string) || 0,
      max_bags: parseInt(formData.get('max_bags') as string),
      operating_hours: {
        open: formData.get('open_time') as string,
        close: formData.get('close_time') as string
      },
      amenities,
      photos: finalPhotos,
      is_active: formData.get('is_active') === 'true'
    })
    .eq('id', locationId);

  if (error) {
    console.error('Update Location Error:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard/locations');
  redirect('/dashboard/locations');
}

export async function deleteLocation(locationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('partner_locations')
    .delete()
    .eq('id', locationId);

  if (error) {
    return { error: error.message };
  }
  revalidatePath('/dashboard/locations');
  return { success: true };
}
