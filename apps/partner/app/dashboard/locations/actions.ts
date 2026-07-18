'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function geocodeAddress(address: string, city: string, state: string, pincode: string): Promise<{ lat: number, lng: number }> {
  const queries = [
    `${address}, ${city}, ${state}, ${pincode}, India`,
    `${address}, ${city}, India`,
    `${city}, ${pincode}, India`,
    `${city}, India`
  ];

  for (const q of queries) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, {
        headers: { 'User-Agent': 'StashInn/1.0' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          };
        }
      }
    } catch (err) {
      console.error(`Nominatim Geocoding Failed for: ${q}`, err);
    }
  }
  return { lat: 20.5937, lng: 78.9629 }; // Fallback to India center
}

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

  let latitude = parseFloat(formData.get('latitude') as string) || 0;
  let longitude = parseFloat(formData.get('longitude') as string) || 0;

  if (latitude === 0 && longitude === 0) {
    const address = formData.get('address_line1') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const pincode = formData.get('pincode') as string;
    const coords = await geocodeAddress(address, city, state, pincode);
    latitude = coords.lat;
    longitude = coords.lng;
  }

  const locationType = formData.get('location_type') as string || 'luggage';
  const hasCctv = formData.get('has_cctv') === 'on';
  const hasSecurityGuard = formData.get('has_security_guard') === 'on';
  const hasEvCharging = formData.get('has_ev_charging') === 'on';
  const hasLockableGate = formData.get('has_lockable_gate') === 'on';

  const pocOption = formData.get('poc_option');

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
      latitude,
      longitude,
      max_bags: locationType === 'luggage' ? parseInt(formData.get('max_bags') as string) : 0,
      available_bags: locationType === 'luggage' ? parseInt(formData.get('max_bags') as string) : 0,
      operating_hours: {
        open: formData.get('open_time') as string,
        close: formData.get('close_time') as string
      },
      amenities,
      photos: photoUrls,
      is_active: pocOption === 'new' ? false : formData.get('is_active') === 'true',
      location_type: locationType,
      has_cctv: hasCctv,
      has_security_guard: hasSecurityGuard,
      has_ev_charging: hasEvCharging,
      has_lockable_gate: hasLockableGate
    })
    .select('id')
    .single();

  if (error || !locData) {
    console.error('Add Location Error:', error);
    return { error: error?.message || 'Failed to create location' };
  }

  // If garage, upsert vehicle_pricing
  if (locationType === 'garage') {
    await supabase.from('vehicle_pricing').insert({
      location_id: locData.id,
      bike_capacity: parseInt(formData.get('bike_capacity') as string) || 0,
      bike_rate_hr: parseFloat(formData.get('bike_rate_hr') as string) || null,
      bike_rate_day: parseFloat(formData.get('bike_rate_day') as string) || null,
      sedan_capacity: parseInt(formData.get('sedan_capacity') as string) || 0,
      sedan_rate_hr: parseFloat(formData.get('sedan_rate_hr') as string) || null,
      sedan_rate_day: parseFloat(formData.get('sedan_rate_day') as string) || null,
      suv_capacity: parseInt(formData.get('suv_capacity') as string) || 0,
      suv_rate_hr: parseFloat(formData.get('suv_rate_hr') as string) || null,
      suv_rate_day: parseFloat(formData.get('suv_rate_day') as string) || null
    });
  }

  // Handle POC Creation / Duplication
  
  
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

  let latitude = parseFloat(formData.get('latitude') as string) || 0;
  let longitude = parseFloat(formData.get('longitude') as string) || 0;

  if (latitude === 0 && longitude === 0) {
    const address = formData.get('address_line1') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const pincode = formData.get('pincode') as string;
    const coords = await geocodeAddress(address, city, state, pincode);
    latitude = coords.lat;
    longitude = coords.lng;
  }

  const locationType = formData.get('location_type') as string || 'luggage';
  const hasCctv = formData.get('has_cctv') === 'on';
  const hasSecurityGuard = formData.get('has_security_guard') === 'on';
  const hasEvCharging = formData.get('has_ev_charging') === 'on';
  const hasLockableGate = formData.get('has_lockable_gate') === 'on';

  // Check if location has a verified POC
  const { data: pocs } = await supabase.from('partner_pocs').select('is_verified').eq('location_id', locationId);
  const hasVerifiedPoc = pocs && pocs.some((p: any) => p.is_verified);
  const isActive = hasVerifiedPoc ? formData.get('is_active') === 'true' : false;

  const { error } = await supabase
    .from('partner_locations')
    .update({
      name: formData.get('name') as string,
      address_line1: formData.get('address_line1') as string,
      address_line2: formData.get('address_line2') as string || null,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      pincode: formData.get('pincode') as string,
      latitude,
      longitude,
      max_bags: locationType === 'luggage' ? parseInt(formData.get('max_bags') as string) : 0,
      operating_hours: {
        open: formData.get('open_time') as string,
        close: formData.get('close_time') as string
      },
      amenities,
      photos: finalPhotos,
      is_active: isActive,
      location_type: locationType,
      has_cctv: hasCctv,
      has_security_guard: hasSecurityGuard,
      has_ev_charging: hasEvCharging,
      has_lockable_gate: hasLockableGate
    })
    .eq('id', locationId);

  if (error) {
    console.error('Update Location Error:', error);
    return { error: error.message };
  }

  // If garage, upsert vehicle_pricing
  if (locationType === 'garage') {
    const { data: existingPricing } = await supabase.from('vehicle_pricing').select('id').eq('location_id', locationId).single();
    
    const pricingData = {
      location_id: locationId,
      bike_capacity: parseInt(formData.get('bike_capacity') as string) || 0,
      bike_rate_hr: parseFloat(formData.get('bike_rate_hr') as string) || null,
      bike_rate_day: parseFloat(formData.get('bike_rate_day') as string) || null,
      sedan_capacity: parseInt(formData.get('sedan_capacity') as string) || 0,
      sedan_rate_hr: parseFloat(formData.get('sedan_rate_hr') as string) || null,
      sedan_rate_day: parseFloat(formData.get('sedan_rate_day') as string) || null,
      suv_capacity: parseInt(formData.get('suv_capacity') as string) || 0,
      suv_rate_hr: parseFloat(formData.get('suv_rate_hr') as string) || null,
      suv_rate_day: parseFloat(formData.get('suv_rate_day') as string) || null
    };

    if (existingPricing) {
      await supabase.from('vehicle_pricing').update(pricingData).eq('id', existingPricing.id);
    } else {
      await supabase.from('vehicle_pricing').insert(pricingData);
    }
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
