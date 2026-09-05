'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import { notifyAdmins } from '@stashinn/lib/services/notifications';

export async function submitOnboarding(formData: FormData) {
  const supabase = await createClient();
  
  // Verify auth session again on server side
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== formData.get('user_id')) {
    return { error: 'Unauthorized session.' };
  }

  const partnerType = formData.get('partner_type') as string;
  const businessName = partnerType === 'individual' 
    ? formData.get('full_name') as string 
    : formData.get('business_name') as string;
  const businessType = formData.get('business_type') as string || 'Individual';

  const providesLuggage = formData.get('provides_luggage') === 'true';
  const providesGarage = formData.get('provides_garage') === 'true';

  // 1. Insert into public.partners
  const { data: partnerData, error: partnerError } = await supabase
    .from('partners')
    .insert({
      user_id: user.id,
      business_name: businessName,
      business_type: businessType,
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

  // Update public.users with the contact details
  await supabase
    .from('users')
    .update({ phone: formData.get('contact_phone') as string })
    .eq('id', user.id);

  // Insert default notification preferences
  await supabase
    .from('notification_preferences')
    .insert({
      user_id: user.id,
      in_app: true,
      email: true,
      whatsapp: false,
      sms: false,
      push: false
    });

  // Geocode Address helper
  const geocodeAddress = async (address: string, city: string, state: string, pincode: string) => {
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
    return { lat: 20.5937, lng: 78.9629 }; // Fallback
  };

  // 2. Build Location Objects
  const uploadPhotos = async (files: File[], folderId: string) => {
    const urls = [];
    for (const file of files) {
      if (file.size > 0) {
        const ext = file.name.split('.').pop();
        const path = `${folderId}/loc_{Date.now()}_{Math.random().toString(36).substring(7)}.{ext}`;
        const { error } = await supabase.storage.from('location-photos').upload(path, file);
        if (!error) {
          const { data } = supabase.storage.from('location-photos').getPublicUrl(path);
          urls.push(data.publicUrl);
        }
      }
    }
    return urls;
  };
  
  const locationsToInsert = [];
  
  // We need to insert them one by one to capture their IDs to handle vehicle_pricing for garages
  const insertedLocationIds = [];
  let primaryLocationId = null;

  if (providesLuggage) {
    const addr = formData.get('luggage_address_line1') as string;
    const city = formData.get('luggage_city') as string;
    const state = formData.get('luggage_state') as string;
    const pin = formData.get('luggage_postal_code') as string;
    const coords = await geocodeAddress(addr, city, state, pin);
    
    const { data: insertedLoc, error: locErr } = await supabase.from('partner_locations').insert({
      partner_id: partnerData.id,
      name: `${businessName} - Luggage Space`,
      address_line1: addr,
      address_line2: formData.get('luggage_address_line2') as string || null,
      city: city,
      state: state,
      pincode: pin,
      country: 'India',
      latitude: coords.lat,
      longitude: coords.lng,
      location_type: 'luggage',
      max_bags: parseInt(formData.get('capacity_bags') as string || '0'),
      is_active: false,
      photos: await uploadPhotos(formData.getAll('luggage_photos') as File[], partnerData.id)
    }).select('id').single();
    
    if (!locErr && insertedLoc) {
      insertedLocationIds.push(insertedLoc.id);
      primaryLocationId = insertedLoc.id;
    } else {
      console.error('Luggage Insert Error:', locErr);
    }
  }

  if (providesGarage) {
    const addr = formData.get('garage_address_line1') as string;
    const city = formData.get('garage_city') as string;
    const state = formData.get('garage_state') as string;
    const pin = formData.get('garage_postal_code') as string;
    const coords = await geocodeAddress(addr, city, state, pin);

    const { data: insertedLoc, error: locErr } = await supabase.from('partner_locations').insert({
      partner_id: partnerData.id,
      name: `${businessName} - Garage Space`,
      address_line1: addr,
      address_line2: formData.get('garage_address_line2') as string || null,
      city: city,
      state: state,
      pincode: pin,
      country: 'India',
      latitude: coords.lat,
      longitude: coords.lng,
      location_type: 'garage',
      max_bags: 0,
      is_active: false,
      photos: await uploadPhotos(formData.getAll('garage_photos') as File[], partnerData.id)
    }).select('id').single();

    if (!locErr && insertedLoc) {
      insertedLocationIds.push(insertedLoc.id);
      if (!primaryLocationId) primaryLocationId = insertedLoc.id;
      
      // Insert Vehicle Pricing
      await supabase.from('vehicle_pricing').insert({
        location_id: insertedLoc.id,
        bike_capacity: parseInt(formData.get('capacity_bikes') as string || '0'),
        sedan_capacity: parseInt(formData.get('capacity_cars') as string || '0'), // assuming cars map to sedan
        suv_capacity: 0
      });
    } else {
      console.error('Garage Insert Error:', locErr);
    }
  }

  // 2.5. Upload POC Files
  if (primaryLocationId) {
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
    await supabase.from('partner_pocs').insert({
      partner_id: partnerData.id,
      location_id: primaryLocationId,
      name: formData.get('poc_name') as string,
      phone: formData.get('poc_phone') as string,
      email: formData.get('poc_email') as string || null,
      is_primary: true,
      id_document_url: idDocUrl,
      photo_url: photoUrl
    });
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
    }
  }

  // Route notification to Operations and Superadmin
  await notifyAdmins({
    title: 'New Partner Onboarding',
    message: `${businessName} has submitted their KYC documents and is pending review.`,
    category: 'system',
    targetRoles: ['ops'],
    action_url: '/dashboard/partners'
  });

  // Redirect on absolute success
  redirect('/dashboard?onboarded=true');
}
