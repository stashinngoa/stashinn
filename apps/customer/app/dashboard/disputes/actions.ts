'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { notifyAdmins } from '@stashinn/lib/services/notifications';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_PHOTOS = 5;

/**
 * Files a dispute for one of the customer's own bookings. Ownership is checked with the
 * customer's session; the report and photos are then saved with the service role, since
 * damage_reports and its bucket only let partners write.
 */
export async function submitCustomerDispute(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session has expired. Please sign in again.' };

  const bookingId = String(formData.get('booking_id') || '');
  const category = String(formData.get('category') || '').trim();
  const details = String(formData.get('description') || '').trim();
  if (!bookingId) return { ok: false, error: 'Choose the booking this is about.' };
  if (details.length < 20) return { ok: false, error: 'Please describe what happened in a little more detail (at least 20 characters).' };

  const { data: booking } = await supabase.from('bookings').select('partner_id, customer_id').eq('id', bookingId).single();
  if (!booking || booking.customer_id !== user.id) return { ok: false, error: 'That booking wasn’t found on your account.' };

  const files = (formData.getAll('photos') as File[]).filter(f => f && f.size > 0 && f.name);
  if (files.length > MAX_PHOTOS) return { ok: false, error: `Attach up to ${MAX_PHOTOS} photos.` };
  for (const f of files) {
    if (!PHOTO_TYPES.includes(f.type)) return { ok: false, error: `${f.name} isn’t a JPG, PNG, WebP or GIF image.` };
    if (f.size > 5 * 1024 * 1024) return { ok: false, error: `${f.name} is larger than 5 MB.` };
  }

  const service = createServiceClient();
  const photos: string[] = [];
  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `customer-${user.id}/${bookingId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await service.storage.from('damage_reports').upload(path, file, { contentType: file.type });
    if (error) return { ok: false, error: `Couldn’t upload ${file.name}. Please try again.` };
    photos.push(service.storage.from('damage_reports').getPublicUrl(path).data.publicUrl);
  }

  const { error } = await service.from('damage_reports').insert({
    partner_id: booking.partner_id,
    customer_id: user.id,
    booking_id: bookingId,
    description: category ? `[${category}] ${details}` : details,
    photos,
    status: 'submitted',
  });
  if (error) return { ok: false, error: 'Couldn’t submit your report. Please try again.' };

  await notifyAdmins({
    title: 'New dispute from a customer',
    message: `${category || 'Issue'} reported for booking #${bookingId.split('-')[0]!.toUpperCase()}.`,
    category: 'damage',
    targetRoles: ['support'],
    action_url: '/dashboard/disputes',
  });

  revalidatePath('/dashboard/disputes');
  return { ok: true };
}
