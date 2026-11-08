'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { notifyAdmins } from '@stashinn/lib/services/notifications';
import { PARTNER_CLAIM_CATEGORIES } from '@stashinn/lib/constants';
import { CLAIM_WINDOW_DAYS, MAX_CLAIM_PHOTOS, isClaimable, parseReport } from './damageShared';

export type ClaimResult = { ok: true; message: string } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHOTO_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const OPEN = ['submitted', 'under_review', 'escalated'];

/**
 * Files a claim for one of the partner's own bookings. Ownership and eligibility are checked
 * with the partner's session; photos go to the same bucket admin Disputes reads from.
 */
export async function submitDamageReport(formData: FormData): Promise<ClaimResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session has expired. Please sign in again.' };
  const { data: partner } = await supabase.from('partners').select('id, business_name').eq('user_id', user.id).maybeSingle();
  if (!partner) return { ok: false, error: 'Partner account not found.' };

  const bookingId = String(formData.get('booking_id') || '');
  const category = String(formData.get('category') || '');
  const details = String(formData.get('description') || '').trim().slice(0, 3000);
  const amountRaw = String(formData.get('amount') || '').replace(/[,₹\s]/g, '');
  const amount = amountRaw ? Number(amountRaw) : 0;

  if (!UUID.test(bookingId)) return { ok: false, error: 'Choose the booking this is about.' };
  if (!(PARTNER_CLAIM_CATEGORIES as readonly string[]).includes(category)) return { ok: false, error: 'Choose what happened.' };
  if (details.length < 20) return { ok: false, error: 'Describe what happened in a little more detail (at least 20 characters).' };
  if (amountRaw && (!Number.isFinite(amount) || amount < 0 || amount > 500000)) return { ok: false, error: 'Enter the amount in rupees, or leave it blank.' };

  const { data: booking } = await supabase.from('bookings')
    .select('id, partner_id, customer_id, status, end_time, actual_checkout')
    .eq('id', bookingId).eq('partner_id', partner.id).maybeSingle();
  if (!booking) return { ok: false, error: 'That booking wasn’t found on your account.' };
  if (!isClaimable(booking)) return { ok: false, error: `Claims can be filed while items are stored, or up to ${CLAIM_WINDOW_DAYS} days after pick-up.` };

  const db = createServiceClient();
  const { data: existing } = await db.from('damage_reports').select('id, description, photos').eq('booking_id', bookingId).in('status', OPEN);
  if ((existing || []).some(r => parseReport(r.description, r.photos).source === 'partner')) {
    return { ok: false, error: 'You already have an open claim for this booking. StashInn will update you on it; reply to their email to add details.' };
  }

  const files = (formData.getAll('photos') as File[]).filter(f => f && typeof f !== 'string' && f.size > 0);
  if (files.length > MAX_CLAIM_PHOTOS) return { ok: false, error: `Attach up to ${MAX_CLAIM_PHOTOS} photos.` };
  for (const f of files) {
    if (!PHOTO_TYPES[f.type]) return { ok: false, error: `${f.name} isn’t a JPG, PNG or WebP photo.` };
    if (f.size > 5 * 1024 * 1024) return { ok: false, error: `${f.name} is larger than 5 MB.` };
  }

  const photos: string[] = [];
  for (const [i, f] of files.entries()) {
    const path = `partner-${partner.id}/${bookingId}-${Date.now()}-${i}.${PHOTO_TYPES[f.type]}`;
    const { error } = await db.storage.from('damage_reports').upload(path, f, { contentType: f.type });
    if (error) return { ok: false, error: `Couldn’t upload ${f.name}. Please try again.` };
    photos.push(db.storage.from('damage_reports').getPublicUrl(path).data.publicUrl);
  }

  const description = `[${category}] ${details}${amount > 0 ? `\n\nAmount claimed: ₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : ''}`;
  const { data: inserted, error } = await db.from('damage_reports').insert({
    partner_id: partner.id,
    customer_id: booking.customer_id,
    booking_id: bookingId,
    description,
    photos,
    status: 'submitted',
  }).select('id').single();
  if (error) return { ok: false, error: 'Couldn’t submit your claim. Please try again.' };

  const ref = bookingId.split('-')[0]!.toUpperCase();
  await db.from('audit_logs').insert({
    user_id: user.id, action: 'damage.partner_claim_filed', entity_type: 'damage_reports', entity_id: inserted.id,
    new_values: { booking_id: bookingId, category, amount: amount || null, photos: photos.length },
  });
  await notifyAdmins({
    title: 'New claim from a partner',
    message: `${partner.business_name}: ${category}${amount > 0 ? ` (₹${amount.toLocaleString('en-IN')})` : ''} for booking #${ref}.`,
    category: 'damage',
    targetRoles: ['support'],
    action_url: '/dashboard/disputes',
  }).catch(() => null);

  revalidatePath('/dashboard/damage');
  return { ok: true, message: `Claim filed for booking #${ref}. StashInn support usually replies within 2 working days.` };
}
