'use server';

import { createClient, createAdminClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import { notifyAdmins } from '@stashinn/lib/services/notifications';
import { ONBOARDING_LIMITS, checkFiles, isValidGstin, isValidPan, isValidPhone, isValidPin } from './validation';

const text = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();
const files = (fd: FormData, key: string) => (fd.getAll(key) as File[]).filter(f => f && typeof f !== 'string' && f.size > 0);
const int = (fd: FormData, key: string) => parseInt(text(fd, key) || '0', 10) || 0;

/** Server-side copy of the form's checks, so a crafted request can't create a broken application. */
function validate(fd: FormData): string | null {
  const partnerType = text(fd, 'partner_type');
  const luggage = fd.get('provides_luggage') === 'true';
  const garage = fd.get('provides_garage') === 'true';

  if (!luggage && !garage) return 'Select at least one space type (luggage or vehicle).';
  if (partnerType === 'individual' ? !text(fd, 'full_name') : !text(fd, 'business_name')) return 'Name is required.';
  if (!isValidPan(text(fd, 'pan_number'))) return 'Enter a valid PAN (e.g. ABCDE1234F).';
  if (partnerType !== 'individual' && text(fd, 'gst_number') && !isValidGstin(text(fd, 'gst_number'))) return 'Enter a valid 15-character GSTIN, or leave it blank.';
  if (!isValidPhone(text(fd, 'contact_phone'))) return 'A valid 10-digit contact phone is required.';

  for (const [on, prefix, label] of [[luggage, 'luggage', 'Luggage'], [garage, 'garage', 'Vehicle']] as const) {
    if (!on) continue;
    if (!text(fd, `${prefix}_address_line1`) || !text(fd, `${prefix}_city`) || !text(fd, `${prefix}_state`)) return `${label} space address is incomplete.`;
    if (!isValidPin(text(fd, `${prefix}_postal_code`))) return `${label} space needs a valid 6-digit PIN code.`;
  }
  if (luggage && int(fd, 'capacity_bags') < 1) return 'Luggage capacity must be at least 1 bag.';
  if (garage && int(fd, 'capacity_bikes') + int(fd, 'capacity_sedans') + int(fd, 'capacity_suvs') < 1) return 'Vehicle space must fit at least one vehicle.';

  if (!text(fd, 'poc_name') || !isValidPhone(text(fd, 'poc_phone'))) return 'Point of contact name and a valid 10-digit phone are required.';

  const docs = { maxCount: 1, maxMb: ONBOARDING_LIMITS.docMaxMb, types: ONBOARDING_LIMITS.docTypes };
  const photos = { maxCount: ONBOARDING_LIMITS.maxPhotos, maxMb: ONBOARDING_LIMITS.photoMaxMb, types: ONBOARDING_LIMITS.imageTypes };
  // An individual who is their own point of contact reuses the contact ID document as ID proof
  const ownerIsContact = partnerType === 'individual'
    && text(fd, 'poc_name').toLowerCase() === text(fd, 'full_name').toLowerCase()
    && text(fd, 'poc_phone').replace(/\D/g, '').slice(-10) === text(fd, 'contact_phone').replace(/\D/g, '').slice(-10);
  if (!ownerIsContact && !files(fd, 'kyc_document').length) {
    return partnerType === 'individual' ? 'Your ID proof document is required.' : 'Business registration document is required.';
  }
  if (!files(fd, 'poc_id_document').length) return 'Point of contact ID document is required.';
  if (!files(fd, 'poc_photo').length) return 'Point of contact photo is required.';
  return (
    checkFiles(files(fd, 'kyc_document'), docs, 'KYC document') ||
    checkFiles(files(fd, 'poc_id_document'), docs, 'Contact ID document') ||
    checkFiles(files(fd, 'poc_photo'), { ...photos, maxCount: 1 }, 'Contact photo') ||
    checkFiles(files(fd, 'luggage_photos'), photos, 'Luggage space photos') ||
    checkFiles(files(fd, 'garage_photos'), photos, 'Vehicle space photos')
  );
}

// Used when an address can't be geocoded; admins can correct the pin from Partners → Locations.
const PILOT_REGION_CENTRE = { lat: 15.4909, lng: 73.8278 }; // Panaji, Goa

async function geocodeAddress(address: string, city: string, state: string, pincode: string) {
  const queries = [
    `${address}, ${city}, ${state}, ${pincode}, India`,
    `${address}, ${city}, India`,
    `${city}, ${pincode}, India`,
    `${city}, India`,
  ];
  for (const q of queries) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, {
        headers: { 'User-Agent': 'StashInn/1.0' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (err) {
      console.error(`Nominatim geocoding failed for: ${q}`, err);
    }
  }
  return PILOT_REGION_CENTRE;
}

export async function submitOnboarding(formData: FormData) {
  const supabase = await createClient();

  // Verify auth session again on server side
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== formData.get('user_id')) {
    return { error: 'Your session has expired. Please sign in again.' };
  }

  const problem = validate(formData);
  if (problem) return { error: problem };

  const { data: existing } = await supabase.from('partners').select('id').eq('user_id', user.id).maybeSingle();
  if (existing) return { error: 'You have already submitted an application.' };

  const partnerType = text(formData, 'partner_type');
  const businessName = partnerType === 'individual' ? text(formData, 'full_name') : text(formData, 'business_name');
  const businessType = partnerType === 'individual' ? 'Individual' : (text(formData, 'business_type') || 'Hostel');
  const providesLuggage = formData.get('provides_luggage') === 'true';
  const providesGarage = formData.get('provides_garage') === 'true';

  // 1. Business profile
  const { data: partnerData, error: partnerError } = await supabase
    .from('partners')
    .insert({
      user_id: user.id,
      business_name: businessName,
      business_type: businessType,
      gstin: partnerType === 'individual' ? null : (text(formData, 'gst_number').toUpperCase() || null),
      pan: text(formData, 'pan_number').toUpperCase(),
      status: 'pending',
    })
    .select('id')
    .single();

  if (partnerError || !partnerData) {
    console.error('Partner insert error:', partnerError);
    return { error: partnerError?.message || 'Failed to create your business profile.' };
  }

  const adminClient = createAdminClient();

  // Everything below belongs to this application. If any part fails, remove the partner row
  // (locations, contacts and vehicle pricing cascade) so the applicant can simply try again
  // instead of being stuck with a half-created profile.
  const uploaded: { bucket: string; path: string }[] = [];
  const fail = async (message: string) => {
    await adminClient.from('partners').delete().eq('id', partnerData.id);
    for (const bucket of new Set(uploaded.map(u => u.bucket))) {
      await adminClient.storage.from(bucket).remove(uploaded.filter(u => u.bucket === bucket).map(u => u.path));
    }
    return { error: message };
  };

  const upload = async (bucket: string, path: string, file: File) => {
    const { error } = await supabase.storage.from(bucket).upload(path, file); // paths are unique; storage RLS only grants partners INSERT here
    if (error) throw new Error(`Upload failed for ${file.name}: ${error.message}`);
    uploaded.push({ bucket, path });
    return path;
  };
  const ext = (file: File) => file.name.split('.').pop()?.toLowerCase() || 'bin';

  try {
    await supabase.from('users').update({ phone: text(formData, 'contact_phone') }).eq('id', user.id);
    await supabase.from('notification_preferences').upsert(
      { user_id: user.id, in_app: true, email: true, whatsapp: false, sms: false, push: false },
      { onConflict: 'user_id' }
    );

    const uploadPhotos = async (list: File[]) => {
      const urls: string[] = [];
      for (const file of list) {
        const path = await upload('location-photos', `${partnerData.id}/loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext(file)}`, file);
        urls.push(supabase.storage.from('location-photos').getPublicUrl(path).data.publicUrl);
      }
      return urls;
    };

    // 2. Locations (one per space type)
    const insertedLocationIds: string[] = [];
    for (const type of ['luggage', 'garage'] as const) {
      if (type === 'luggage' ? !providesLuggage : !providesGarage) continue;
      const addr = text(formData, `${type}_address_line1`);
      const city = text(formData, `${type}_city`);
      const state = text(formData, `${type}_state`);
      const pin = text(formData, `${type}_postal_code`);
      const coords = await geocodeAddress(addr, city, state, pin);

      const { data: loc, error: locErr } = await adminClient.from('partner_locations').insert({
        partner_id: partnerData.id,
        name: `${businessName} - ${type === 'luggage' ? 'Luggage' : 'Garage'} Space`,
        address_line1: addr,
        address_line2: text(formData, `${type}_address_line2`) || null,
        city,
        state,
        pincode: pin,
        country: 'India',
        latitude: coords.lat,
        longitude: coords.lng,
        location_type: type,
        max_bags: type === 'luggage' ? int(formData, 'capacity_bags') : 0,
        is_active: false,
        photos: await uploadPhotos(files(formData, `${type}_photos`)),
      }).select('id').single();
      if (locErr || !loc) throw new Error(`Couldn't save your ${type === 'luggage' ? 'luggage' : 'vehicle'} space: ${locErr?.message ?? 'unknown error'}`);
      insertedLocationIds.push(loc.id);

      if (type === 'garage') {
        const { error: vpErr } = await adminClient.from('vehicle_pricing').insert({
          location_id: loc.id,
          bike_capacity: int(formData, 'capacity_bikes'),
          sedan_capacity: int(formData, 'capacity_sedans'),
          suv_capacity: int(formData, 'capacity_suvs'),
        });
        if (vpErr) throw new Error(`Couldn't save vehicle capacity: ${vpErr.message}`);
      }
    }

    // 3. Point of contact (with ID and photo) for every new location
    const pocId = files(formData, 'poc_id_document')[0]!;
    const pocPhoto = files(formData, 'poc_photo')[0]!;
    const idDocPath = await upload('kyc-documents', `${partnerData.id}/poc_id_${Date.now()}.${ext(pocId)}`, pocId);
    const photoPath = await upload('kyc-documents', `${partnerData.id}/poc_photo_${Date.now()}.${ext(pocPhoto)}`, pocPhoto);
    const { error: pocErr } = await adminClient.from('partner_pocs').insert(insertedLocationIds.map(locId => ({
      partner_id: partnerData.id,
      location_id: locId,
      name: text(formData, 'poc_name'),
      phone: text(formData, 'poc_phone'),
      email: text(formData, 'poc_email') || null,
      is_primary: true,
      id_document_url: idDocPath,
      photo_url: photoPath,
    })));
    if (pocErr) throw new Error(`Couldn't save your point of contact: ${pocErr.message}`);

    // 4. Owner / business document (individuals who are their own contact already uploaded their ID above)
    const kyc = files(formData, 'kyc_document')[0];
    if (kyc) await upload('kyc-documents', `${partnerData.id}/kyc_proof_${Date.now()}.${ext(kyc)}`, kyc);
  } catch (err: any) {
    console.error('Onboarding failed, rolling back partner', partnerData.id, err);
    return fail(`${err?.message || 'Something went wrong.'} Nothing was saved — please try again.`);
  }

  // Route notification to Operations and Superadmin
  await notifyAdmins({
    title: 'New Partner Onboarding',
    message: `${businessName} has submitted their KYC documents and is pending review.`,
    category: 'system',
    targetRoles: ['ops'],
    action_url: '/dashboard/partners',
  });

  redirect('/dashboard?onboarded=true');
}
