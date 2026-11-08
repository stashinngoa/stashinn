'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { notifyAdmins } from '@stashinn/lib/services/notifications';
import { markInfoRequestAnswered } from '../../../lib/infoRequest';
import { ONBOARDING_LIMITS, checkFiles, isValidEmail, isValidPhone, isValidPin } from '../../onboarding/validation';

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

const text = (fd: FormData, key: string) => ((fd.get(key) as string) || '').trim();
const files = (fd: FormData, key: string) => (fd.getAll(key) as File[]).filter(f => f && typeof f !== 'string' && f.size > 0);
const int = (fd: FormData, key: string) => parseInt(text(fd, key)) || 0;

/** Problems with a new location's form, checked on the server (the form checks the same things). */
function validateNewLocation(fd: FormData, existingPocCount: number): string | null {
  const type = text(fd, 'location_type') || 'luggage';
  if (!text(fd, 'name')) return 'Give the location a name.';
  if (!isValidPin(text(fd, 'pincode'))) return 'Enter a valid 6-digit PIN code.';
  if (!text(fd, 'city') || !text(fd, 'state')) return 'Enter the city and state.';
  if (!text(fd, 'address_line1')) return 'Enter the street address.';
  if (!/^\d{2}:\d{2}$/.test(text(fd, 'open_time')) || !/^\d{2}:\d{2}$/.test(text(fd, 'close_time'))) return 'Set opening and closing times.';
  if (type === 'luggage' && int(fd, 'max_bags') < 1) return 'Bag capacity must be at least 1.';
  if (type === 'garage' && int(fd, 'bike_capacity') + int(fd, 'sedan_capacity') + int(fd, 'suv_capacity') < 1) return 'Add at least one parking space.';

  const photoRules = { maxCount: ONBOARDING_LIMITS.maxPhotos, maxMb: ONBOARDING_LIMITS.photoMaxMb, types: ONBOARDING_LIMITS.imageTypes };
  const photoProblem = checkFiles(files(fd, 'photos'), photoRules, 'Location photos');
  if (photoProblem) return photoProblem;

  const pocOption = text(fd, 'poc_option') || 'new';
  if (pocOption === 'existing') {
    if (!existingPocCount || !text(fd, 'existing_poc_id')) return 'Choose a contact for this location.';
  } else {
    if (!text(fd, 'poc_name')) return 'Enter the contact\'s name.';
    if (!isValidPhone(text(fd, 'poc_phone'))) return 'Enter a valid 10-digit mobile number for the contact.';
    if (text(fd, 'poc_email') && !isValidEmail(text(fd, 'poc_email'))) return 'Enter a valid email for the contact, or leave it empty.';
    if (!files(fd, 'poc_id_document').length) return 'Upload the contact\'s ID proof.';
    if (!files(fd, 'poc_photo').length) return 'Upload a photo of the contact.';
    return checkFiles(files(fd, 'poc_id_document'), { maxCount: 1, maxMb: ONBOARDING_LIMITS.docMaxMb, types: ONBOARDING_LIMITS.docTypes }, 'ID proof')
      || checkFiles(files(fd, 'poc_photo'), { maxCount: 1, maxMb: ONBOARDING_LIMITS.photoMaxMb, types: ONBOARDING_LIMITS.imageTypes }, 'Contact photo');
  }
  return null;
}

export async function addLocation(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };

  const { data: partner } = await supabase.from('partners').select('id, status, business_name').eq('user_id', user.id).single();
  if (!partner) return { error: 'Partner profile not found.' };

  const { data: partnerPocs } = await supabase.from('partner_pocs').select('*').eq('partner_id', partner.id);
  const problem = validateNewLocation(formData, partnerPocs?.length || 0);
  if (problem) return { error: problem };

  const ext = (f: File) => f.name.split('.').pop()?.toLowerCase() || 'bin';
  const upload = async (bucket: string, path: string, file: File) => {
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw new Error(`Couldn't upload ${file.name}: ${error.message}`);
    return path;
  };

  const locationType = text(formData, 'location_type') === 'garage' ? 'garage' : 'luggage';
  let latitude = parseFloat(text(formData, 'latitude')) || 0;
  let longitude = parseFloat(text(formData, 'longitude')) || 0;
  if (latitude === 0 && longitude === 0) {
    const coords = await geocodeAddress(text(formData, 'address_line1'), text(formData, 'city'), text(formData, 'state'), text(formData, 'pincode'));
    latitude = coords.lat;
    longitude = coords.lng;
  }

  let locationId: string | null = null;
  try {
    const photoUrls: string[] = [];
    for (const file of files(formData, 'photos')) {
      const path = await upload('location-photos', `${partner.id}/loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext(file)}`, file);
      photoUrls.push(supabase.storage.from('location-photos').getPublicUrl(path).data.publicUrl);
    }

    // Review status, live status, prices and commission are set by the database for new
    // locations (see guard_location_admin_fields); StashInn approves the location first.
    const { data: locData, error } = await supabase
      .from('partner_locations')
      .insert({
        partner_id: partner.id,
        name: text(formData, 'name'),
        address_line1: text(formData, 'address_line1'),
        address_line2: text(formData, 'address_line2') || null,
        city: text(formData, 'city'),
        state: text(formData, 'state'),
        pincode: text(formData, 'pincode'),
        latitude,
        longitude,
        max_bags: locationType === 'luggage' ? int(formData, 'max_bags') : 0,
        available_bags: locationType === 'luggage' ? int(formData, 'max_bags') : 0,
        operating_hours: { open: text(formData, 'open_time'), close: text(formData, 'close_time') },
        amenities: formData.getAll('amenities') as string[],
        photos: photoUrls,
        is_active: false,
        location_type: locationType,
        has_cctv: formData.get('has_cctv') === 'on',
        has_security_guard: formData.get('has_security_guard') === 'on',
        has_ev_charging: formData.get('has_ev_charging') === 'on',
        has_lockable_gate: formData.get('has_lockable_gate') === 'on',
      })
      .select('id')
      .single();
    if (error || !locData) throw new Error(`Couldn't save the location: ${error?.message ?? 'unknown error'}`);
    locationId = locData.id;

    if (locationType === 'garage') {
      // Capacities only; StashInn sets the rates
      const { error: vpError } = await supabase.from('vehicle_pricing').insert({
        location_id: locData.id,
        bike_capacity: int(formData, 'bike_capacity'),
        sedan_capacity: int(formData, 'sedan_capacity'),
        suv_capacity: int(formData, 'suv_capacity'),
      });
      if (vpError) throw new Error(`Couldn't save the parking capacity: ${vpError.message}`);
    }

    // Contact: the same person is stored once per location
    if ((text(formData, 'poc_option') || 'new') === 'existing') {
      const existingPoc = (partnerPocs || []).find(p => p.id === text(formData, 'existing_poc_id'));
      if (!existingPoc) throw new Error('That contact couldn\'t be found. Please choose again.');
      const { error: pocError } = await supabase.from('partner_pocs').insert({
        partner_id: partner.id,
        location_id: locData.id,
        name: existingPoc.name,
        phone: existingPoc.phone,
        email: existingPoc.email,
        is_primary: false,
        id_document_url: existingPoc.id_document_url,
        photo_url: existingPoc.photo_url,
        is_verified: existingPoc.is_verified, // the same person, already checked by StashInn
      });
      if (pocError) throw new Error(`Couldn't assign the contact: ${pocError.message}`);
    } else {
      const idFile = files(formData, 'poc_id_document')[0]!;
      const photoFile = files(formData, 'poc_photo')[0]!;
      const idPath = await upload('kyc-documents', `${partner.id}/poc_id_${Date.now()}.${ext(idFile)}`, idFile);
      const photoPath = await upload('kyc-documents', `${partner.id}/poc_photo_${Date.now()}.${ext(photoFile)}`, photoFile);
      const { error: pocError } = await supabase.from('partner_pocs').insert({
        partner_id: partner.id,
        location_id: locData.id,
        name: text(formData, 'poc_name'),
        phone: text(formData, 'poc_phone'),
        email: text(formData, 'poc_email') || null,
        is_primary: false,
        id_document_url: idPath,
        photo_url: photoPath,
      });
      if (pocError) throw new Error(`Couldn't save the contact: ${pocError.message}`);
    }
  } catch (err: any) {
    // Don't leave a half-created location behind (its contact and capacity rows go with it)
    if (locationId) await supabase.from('partner_locations').delete().eq('id', locationId);
    console.error('Add Location Error:', err);
    return { error: `${err?.message || 'Something went wrong.'} Nothing was saved, please try again.` };
  }

  // Every new location is reviewed by StashInn before it goes live
  await notifyAdmins({
    title: 'New location to review',
    message: `${partner.business_name} added "${text(formData, 'name')}" (${locationType === 'garage' ? 'vehicle parking' : 'luggage storage'}, ${text(formData, 'city')}).`,
    category: 'system',
    targetRoles: ['ops'],
    action_url: `/dashboard/partners/${partner.id}`,
  });

  revalidatePath('/dashboard', 'layout');
  redirect(`/dashboard/locations/${locationId}?saved=new`);
}

export async function updateLocation(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };

  const { data: partner } = await supabase.from('partners').select('id, business_name, status').eq('user_id', user.id).single();
  if (!partner) return { error: 'Partner profile not found.' };

  const locationId = formData.get('id') as string;
  const { data: current } = await supabase
    .from('partner_locations')
    .select('id, name, location_type, admin_status')
    .eq('id', locationId)
    .eq('partner_id', partner.id)
    .maybeSingle();
  if (!current) return { error: 'Location not found.' };

  const { data: pocs } = await supabase.from('partner_pocs').select('is_primary').eq('location_id', locationId);
  const isPrimary = (pocs || []).some((p: any) => p.is_primary);

  const amenities = formData.getAll('amenities') as string[];
  const photoUrls: string[] = [];
  for (const file of formData.getAll('photos') as File[]) {
    if (file.size === 0) continue;
    const fileExt = file.name.split('.').pop();
    const filePath = `${partner.id}/loc_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('location-photos').upload(filePath, file);
    if (uploadError) return { error: `Couldn't upload ${file.name}: ${uploadError.message}` };
    photoUrls.push(supabase.storage.from('location-photos').getPublicUrl(filePath).data.publicUrl);
  }
  const finalPhotos = [...(formData.getAll('existing_photos') as string[]), ...photoUrls];

  let latitude = parseFloat(formData.get('latitude') as string) || 0;
  let longitude = parseFloat(formData.get('longitude') as string) || 0;
  if (latitude === 0 && longitude === 0) {
    const coords = await geocodeAddress(
      formData.get('address_line1') as string, formData.get('city') as string,
      formData.get('state') as string, formData.get('pincode') as string,
    );
    latitude = coords.lat;
    longitude = coords.lng;
  }

  // The primary location (created at onboarding) keeps its type
  const locationType = isPrimary ? current.location_type : ((formData.get('location_type') as string) || current.location_type);
  // A location the team flagged goes back for review, and the old note is cleared
  const resubmitted = current.admin_status === 'update_required' || current.admin_status === 'rejected';

  // is_active, rates and commission are managed by StashInn, so they're not written here
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
      location_type: locationType,
      has_cctv: formData.get('has_cctv') === 'on',
      has_security_guard: formData.get('has_security_guard') === 'on',
      has_ev_charging: formData.get('has_ev_charging') === 'on',
      has_lockable_gate: formData.get('has_lockable_gate') === 'on',
      ...(resubmitted ? { admin_status: 'pending', status_reason: null } : {}),
    })
    .eq('id', locationId);

  if (error) {
    console.error('Update Location Error:', error);
    return { error: error.message };
  }

  // Handle POC assignment/creation on update
  const pocOption = formData.get('poc_option') as string;
  if (pocOption === 'existing' || pocOption === 'new') {
    const currentIsPrimary = isPrimary;

    if (pocOption === 'existing') {
      const existingPocId = formData.get('existing_poc_id') as string;
      if (existingPocId) {
        const { data: existingPoc } = await supabase.from('partner_pocs').select('*').eq('id', existingPocId).single();
        if (existingPoc) {
          await supabase.from('partner_pocs').delete().eq('location_id', locationId);
          await supabase.from('partner_pocs').insert({
            partner_id: partner.id,
            location_id: locationId,
            name: existingPoc.name,
            phone: existingPoc.phone,
            email: existingPoc.email,
            is_primary: currentIsPrimary,
            id_document_url: existingPoc.id_document_url,
            photo_url: existingPoc.photo_url,
            is_verified: existingPoc.is_verified
          });
          if (!existingPoc.is_verified) await supabase.from('partner_locations').update({ is_active: false }).eq('id', locationId);
        }
      }
    } else {
      await supabase.from('partner_pocs').delete().eq('location_id', locationId);
      await supabase.from('partner_pocs').insert({
        partner_id: partner.id,
        location_id: locationId,
        name: formData.get('poc_name') as string,
        phone: formData.get('poc_phone') as string,
        email: formData.get('poc_email') as string || null,
        is_primary: currentIsPrimary,
        is_verified: false
      });
      await supabase.from('partner_locations').update({ is_active: false }).eq('id', locationId);
    }
  }

  // Vehicle capacities (rates are set by StashInn and left untouched)
  if (locationType === 'garage') {
    const capacities = {
      bike_capacity: parseInt(formData.get('bike_capacity') as string) || 0,
      sedan_capacity: parseInt(formData.get('sedan_capacity') as string) || 0,
      suv_capacity: parseInt(formData.get('suv_capacity') as string) || 0,
    };
    const { data: existingPricing } = await supabase.from('vehicle_pricing').select('id').eq('location_id', locationId).maybeSingle();
    const { error: vpError } = existingPricing
      ? await supabase.from('vehicle_pricing').update(capacities).eq('id', existingPricing.id)
      : await supabase.from('vehicle_pricing').insert({ location_id: locationId, ...capacities });
    if (vpError) return { error: `Couldn't save vehicle capacity: ${vpError.message}` };
  }

  if (resubmitted || partner.status === 'pending') {
    await notifyAdmins({
      title: resubmitted ? 'Location resubmitted for review' : 'Pending Location Updated',
      message: resubmitted
        ? `${partner.business_name} updated "${current.name}" after your review note.`
        : `${partner.business_name} has updated their pending location details.`,
      category: 'system',
      targetRoles: ['ops'],
      action_url: `/dashboard/partners/${partner.id}`
    });
  }
  await markInfoRequestAnswered(supabase, partner.id, 'locations');

  revalidatePath('/dashboard', 'layout');
  redirect(`/dashboard/locations/${locationId}?saved=1`);
}

export async function deleteLocation(locationId: string) {
  const supabase = await createClient();
  const { data: primary } = await supabase.from('partner_pocs').select('id').eq('location_id', locationId).eq('is_primary', true).limit(1);
  if (primary?.length) return { error: 'Your primary location can\'t be deleted.' };

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
