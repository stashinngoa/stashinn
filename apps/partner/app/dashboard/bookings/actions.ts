'use server';

import { randomInt } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { sendSMS } from '@stashinn/lib/services/messaging';
import { DECLINE_REASONS, itemsLabel } from './bookingShared';
import { COLLECTION_METHODS, isCollectedVia } from '@stashinn/lib/services/dropoffPayment';
import { BOOKING_DEFAULTS } from '@stashinn/lib/constants';

export type ActionResult = { success: true; message: string; error?: undefined } | { success?: undefined; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OTP_MAX_FAILS = 5;
const OTP_LOCK_MIN = 15;
const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' };

const BOOKING_FIELDS =
  'id, customer_id, partner_id, location_id, status, booking_type, num_bags, vehicle_type, vehicle_make, vehicle_model, vehicle_license_plate, ' +
  'start_time, end_time, actual_checkin, actual_checkout, total_amount, checkin_otp, checkout_otp, check_in_photos, ' +
  'partner_locations(name, location_type, address_line1, address_line2, city, state, pincode, latitude, longitude)';

const customerUrl = () => process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3000';
// Check-in / pick-up codes: system_config.otp_length digits (6 by default; 4 to 8 allowed).
// Bookings accepted earlier may still hold 4-digit codes, so checking accepts any 4 to 8 digits.
const OTP_MIN = 4;
const OTP_MAX = 8;
async function otpLength(db: ReturnType<typeof createServiceClient>): Promise<number> {
  const { data } = await db.from('system_config').select('value').eq('key', 'otp_length').maybeSingle();
  const n = parseInt(String(data?.value ?? '').replace(/"/g, ''), 10);
  return Number.isInteger(n) && n >= OTP_MIN && n <= OTP_MAX ? n : BOOKING_DEFAULTS.otpLength;
}
const newOtp = (digits: number) => String(randomInt(10 ** (digits - 1), 10 ** digits));

/**
 * The signed-in partner and one of their bookings. Ownership is checked against the
 * partner's own record; writes then use the service role (partners can't update bookings directly).
 */
async function loadBooking(bookingId: string) {
  if (!bookingId || !UUID.test(bookingId)) return { error: 'Booking not found.' } as const;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Your session has expired. Please sign in again.' } as const;
  const { data: partner } = await supabase.from('partners').select('id, business_name').eq('user_id', user.id).maybeSingle();
  if (!partner) return { error: 'Partner account not found.' } as const;

  const db = createServiceClient();
  const { data: booking } = await db.from('bookings').select(BOOKING_FIELDS).eq('id', bookingId).eq('partner_id', partner.id).maybeSingle();
  if (!booking) return { error: 'Booking not found.' } as const;
  return { user, partner, db, booking: booking as any };
}

function refresh(bookingId: string) {
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath('/dashboard/bookings');
  revalidatePath('/dashboard/schedule');
  revalidatePath('/dashboard');
}

async function customerOf(db: ReturnType<typeof createServiceClient>, customerId: string) {
  const { data } = await db.from('users').select('id, email, phone, full_name').eq('id', customerId).maybeSingle();
  return data as { id: string; email: string | null; phone: string | null; full_name: string | null } | null;
}

const firstName = (c: { full_name: string | null } | null) => (c?.full_name || '').split(' ')[0] || 'there';

async function sendTemplate(to: string | null | undefined, slug: string, vars: Record<string, string>) {
  if (!to) return;
  try {
    const { renderBookingEmail } = await import('@stashinn/lib/services/bookingEmails');
    const mail = await renderBookingEmail(slug, vars);
    if (!mail) return;
    const { ExternalNotificationService } = await import('@stashinn/lib/services/notifications');
    await ExternalNotificationService.sendEmail(to, mail.subject, mail.html);
  } catch (e) {
    console.error(`[BOOKING_EMAIL] ${slug} failed:`, e);
  }
}

// ── OTP attempts ─────────────────────────────────────────────────────────────
// Counted in audit_logs so the limit holds across server instances (an in-memory counter doesn't on Vercel).

async function otpLockedFor(db: ReturnType<typeof createServiceClient>, bookingId: string, kind: 'checkin' | 'checkout'): Promise<number> {
  const since = new Date(Date.now() - OTP_LOCK_MIN * 60_000).toISOString();
  const { data } = await db.from('audit_logs').select('created_at')
    .eq('entity_id', bookingId).eq('action', `booking.otp_failed_${kind}`).gte('created_at', since)
    .order('created_at', { ascending: false }).limit(OTP_MAX_FAILS);
  if (!data || data.length < OTP_MAX_FAILS) return 0;
  // Locked until the oldest of the last five failures falls out of the window
  const unlockAt = new Date(data[data.length - 1]!.created_at).getTime() + OTP_LOCK_MIN * 60_000;
  return Math.max(1, Math.ceil((unlockAt - Date.now()) / 60_000));
}

async function checkOtp(
  ctx: { db: ReturnType<typeof createServiceClient>; user: { id: string }; booking: any },
  kind: 'checkin' | 'checkout',
  input: string,
): Promise<string | null> {
  const otp = (input || '').replace(/\D/g, '');
  if (otp.length < OTP_MIN || otp.length > OTP_MAX) return 'Enter the customer’s code.';
  const lockedMin = await otpLockedFor(ctx.db, ctx.booking.id, kind);
  if (lockedMin) return `Too many wrong codes. Try again in ${lockedMin} minute${lockedMin === 1 ? '' : 's'}, or contact support@stashinn.in.`;

  const expected = kind === 'checkin' ? ctx.booking.checkin_otp : ctx.booking.checkout_otp;
  if (expected && otp === String(expected)) return null;

  await ctx.db.from('audit_logs').insert({
    user_id: ctx.user.id, action: `booking.otp_failed_${kind}`, entity_type: 'bookings', entity_id: ctx.booking.id, new_values: { type: kind },
  });
  const left = OTP_MAX_FAILS - (await countRecentFails(ctx.db, ctx.booking.id, kind));
  return left > 0
    ? `That code doesn’t match. Check it with the customer (${left} attempt${left === 1 ? '' : 's'} left).`
    : `That code doesn’t match. Too many wrong codes, so this booking is locked for ${OTP_LOCK_MIN} minutes.`;
}

async function countRecentFails(db: ReturnType<typeof createServiceClient>, bookingId: string, kind: string) {
  const since = new Date(Date.now() - OTP_LOCK_MIN * 60_000).toISOString();
  const { count } = await db.from('audit_logs').select('id', { count: 'exact', head: true })
    .eq('entity_id', bookingId).eq('action', `booking.otp_failed_${kind}`).gte('created_at', since);
  return count || 0;
}

// ── Accept / decline ─────────────────────────────────────────────────────────

export async function acceptBooking(formData: FormData): Promise<ActionResult> {
  const bookingId = String(formData.get('booking_id') || '');
  const ctx = await loadBooking(bookingId);
  if ('error' in ctx) return { error: ctx.error! };
  const { db, booking, user } = ctx;

  if (booking.status !== 'pending') return { error: 'This booking has already been answered. Refresh to see its status.' };
  if (new Date(booking.end_time) <= new Date()) return { error: 'This booking’s time has already passed, so it can’t be accepted.' };

  const digits = await otpLength(db);
  const checkinOtp = newOtp(digits);
  let checkoutOtp = newOtp(digits);
  while (checkoutOtp === checkinOtp) checkoutOtp = newOtp(digits);

  const { data: updated, error } = await db.from('bookings').update({
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
    checkin_otp: checkinOtp,
    checkout_otp: checkoutOtp,
  }).eq('id', bookingId).eq('status', 'pending').select('id');
  if (error) return { error: `Couldn’t accept the booking: ${error.message}` };
  if (!updated?.length) return { error: 'This booking has already been answered. Refresh to see its status.' };

  await db.from('audit_logs').insert({ user_id: user.id, action: 'booking.accepted', entity_type: 'bookings', entity_id: bookingId, new_values: { status: 'confirmed' } });

  const loc = booking.partner_locations || {};
  const locationName = loc.name || 'The partner';
  await db.from('notifications').insert({
    user_id: booking.customer_id,
    title: 'Booking confirmed',
    message: `${locationName} has accepted your booking. Your check-in code and the address are in your booking.`,
    category: 'booking',
    action_url: '/dashboard',
  });

  const customer = await customerOf(db, booking.customer_id);
  if (customer?.phone) {
    await sendSMS({ to: customer.phone, message: `StashInn: ${locationName} confirmed your booking. Your check-in code is ${checkinOtp}.` }).catch(() => false);
  }
  if (customer?.email) {
    // The exact address and the location's contact are shared only once the booking is confirmed
    const { data: contacts } = await db.from('partner_pocs').select('name, phone, is_primary').eq('location_id', booking.location_id);
    const contact = [...(contacts || [])].sort((a: any, b: any) => Number(!!b.is_primary) - Number(!!a.is_primary))[0];
    const { BOOKING_EMAIL_SLUGS, bookingRef, emailTime } = await import('@stashinn/lib/services/bookingEmails');
    await sendTemplate(customer.email, BOOKING_EMAIL_SLUGS.customerConfirmed, {
      customer_name: firstName(customer),
      booking_ref: bookingRef(bookingId),
      location_name: loc.name || 'your StashInn location',
      address: [loc.address_line1, loc.address_line2, loc.city, loc.state, loc.pincode].filter(Boolean).join(', '),
      directions_url: loc.latitude && loc.longitude ? `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}` : '',
      contact_name: contact?.name || 'The partner',
      contact_phone: contact?.phone || '',
      drop_off: emailTime(booking.start_time),
      pick_up: emailTime(booking.end_time),
      items: itemsLabel(booking),
      total: Number(booking.total_amount || 0).toFixed(2),
      checkin_otp: checkinOtp,
      dashboard_url: `${customerUrl()}/dashboard`,
    });
  }

  refresh(bookingId);
  return { success: true, message: 'Booking accepted. The customer has their check-in code.' };
}

export async function declineBooking(formData: FormData): Promise<ActionResult> {
  const bookingId = String(formData.get('booking_id') || '');
  const reasonKey = String(formData.get('reason') || 'other');
  const note = String(formData.get('note') || '').trim().slice(0, 300);
  const ctx = await loadBooking(bookingId);
  if ('error' in ctx) return { error: ctx.error! };
  const { db, booking, user } = ctx;

  if (booking.status !== 'pending') return { error: 'This booking has already been answered. Refresh to see its status.' };
  const reason = DECLINE_REASONS.find(r => r.value === reasonKey) ?? DECLINE_REASONS[DECLINE_REASONS.length - 1]!;
  if (reason.value === 'other' && note.length < 5) return { error: 'Please say briefly why you’re declining.' };

  const { cancelBooking, rupees } = await import('@stashinn/lib/services/bookingLifecycle');
  const r = await cancelBooking(db, bookingId, {
    by: 'partner',
    code: 'partner',
    reason: `Declined by the partner: ${reason.label}${note ? `. ${note}` : ''}`,
    refund: 'full',
    fromStatuses: ['pending'],
  });
  if (!r.ok) return { error: r.error };

  await db.from('audit_logs').insert({
    user_id: user.id, action: 'booking.declined', entity_type: 'bookings', entity_id: bookingId,
    new_values: { status: 'cancelled', reason: reason.value, note: note || null, refunded: r.refunded, refund_queued: r.refundQueued },
  });

  // The customer sees the reason category, not the partner's free-text note
  const locationName = booking.partner_locations?.name || 'The partner';
  const money = r.refunded > 0
    ? `Your payment of ${rupees(r.refunded)} has been refunded; it usually shows within 5–7 business days.`
    : r.refundQueued > 0
      ? `Your refund of ${rupees(r.refundQueued)} is being processed.`
      : 'You haven’t been charged.';
  const why = reason.value === 'full' ? ' They don’t have space for those times.' : reason.value === 'closed' ? ' They’re closed at those times.' : '';
  await db.from('notifications').insert({
    user_id: booking.customer_id,
    title: 'Booking declined',
    message: `${locationName} couldn’t accept your booking.${why} ${money} You can book another location nearby.`,
    category: 'booking',
    action_url: '/search',
  });
  const customer = await customerOf(db, booking.customer_id);
  if (customer?.email) {
    const { ExternalNotificationService } = await import('@stashinn/lib/services/notifications');
    await ExternalNotificationService.sendEmail(
      customer.email,
      'Booking declined · StashInn',
      `Unfortunately ${locationName} couldn’t accept your booking.${why} ${money}

You can find another location nearby: ${customerUrl()}/search`,
    ).catch(() => null);
  }

  refresh(bookingId);
  return { success: true, message: r.refunded > 0 || r.refundQueued > 0 ? 'Booking declined and the customer refunded.' : 'Booking declined. The customer has been told.' };
}

// ── Drop-off and pick-up ─────────────────────────────────────────────────────

async function uploadPhotos(db: ReturnType<typeof createServiceClient>, booking: any, files: File[]): Promise<{ urls: string[] } | { error: string }> {
  const real = files.filter(f => f && typeof f !== 'string' && f.size > 0);
  if (real.length > MAX_PHOTOS) return { error: `Add at most ${MAX_PHOTOS} photos.` };
  for (const f of real) {
    if (!PHOTO_TYPES[f.type]) return { error: `${f.name} isn’t a supported photo (use JPG, PNG, WebP or HEIC).` };
    if (f.size > MAX_PHOTO_BYTES) return { error: `${f.name} is larger than 8 MB.` };
  }
  const urls: string[] = [];
  for (let i = 0; i < real.length; i++) {
    const f = real[i]!;
    const path = `${booking.customer_id}/${booking.id}/partner-${Date.now()}-${i}.${PHOTO_TYPES[f.type]}`;
    const { error } = await db.storage.from('vehicle-condition-photos').upload(path, f, { contentType: f.type });
    if (error) return { error: `Couldn’t upload ${f.name}: ${error.message}` };
    urls.push(db.storage.from('vehicle-condition-photos').getPublicUrl(path).data.publicUrl);
  }
  return { urls };
}

async function checkIn(formData: FormData, garage: boolean): Promise<ActionResult> {
  const bookingId = String(formData.get('booking_id') || '');
  const ctx = await loadBooking(bookingId);
  if ('error' in ctx) return { error: ctx.error! };
  const { db, booking, user } = ctx;

  if (booking.status === 'checked_in') return { error: 'This booking is already checked in.' };
  if (booking.status !== 'confirmed') return { error: booking.status === 'pending' ? 'Accept the booking before checking it in.' : 'This booking can’t be checked in any more.' };
  const isGarage = booking.booking_type === 'garage' || booking.partner_locations?.location_type === 'garage';
  if (isGarage && !garage) return { error: 'Vehicle bookings are checked in from the vehicle check-in page.' };

  // Pay at drop-off: the partner says who received the money, so dues are only raised when they did
  const { data: payment } = await db.from('payments').select('*').eq('booking_id', bookingId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  const atDropoff = (payment?.method === 'pay_at_location' || payment?.method === 'upi') && payment?.status === 'pending';
  const collectedVia = String(formData.get('collected_via') || '');
  const qrReference = String(formData.get('qr_reference') || '').replace(/\s/g, '').toUpperCase().slice(0, 40);
  if (atDropoff && !isCollectedVia(collectedVia)) return { error: 'Choose how the customer paid before checking in.' };

  const otpError = await checkOtp(ctx, 'checkin', String(formData.get('otp') || ''));
  if (otpError) return { error: otpError };

  let photos: string[] = booking.check_in_photos || [];
  if (isGarage) {
    const uploaded = await uploadPhotos(db, booking, formData.getAll('photos') as File[]);
    if ('error' in uploaded) return { error: uploaded.error };
    photos = [...photos, ...uploaded.urls];
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await db.from('bookings').update({
    status: 'checked_in',
    actual_checkin: now,
    ...(isGarage ? { check_in_photos: photos.length ? photos : null } : {}),
  }).eq('id', bookingId).eq('status', 'confirmed').select('id');
  if (error) return { error: `Couldn’t check in: ${error.message}` };
  if (!updated?.length) return { error: 'This booking changed in the meantime. Refresh and try again.' };

  await db.from('audit_logs').insert({
    user_id: user.id, action: isGarage ? 'booking.otp_verified_garage' : 'booking.otp_verified', entity_type: 'bookings', entity_id: bookingId,
    new_values: { type: 'checkin', status: 'checked_in', photos: isGarage ? photos.length : undefined, collected_via: atDropoff ? collectedVia : undefined },
  });

  if (atDropoff && payment) {
    const { error: payErr } = await db.from('payments').update({
      collected_via: collectedVia,
      collected_at: now,
      collected_amount: Number(booking.total_amount) || 0,
      qr_reference: collectedVia === 'stashinn_qr' && qrReference ? qrReference : null,
      updated_at: now,
    }).eq('id', payment.id);
    // Don't undo a completed check-in over this; it shows up as "not recorded" for finance
    if (payErr) console.error('[CHECK_IN] couldn’t record how the customer paid:', payErr.message);
    else if (collectedVia === 'stashinn_qr') {
      const { notifyAdmins } = await import('@stashinn/lib/services/notifications');
      await notifyAdmins({
        title: 'StashInn QR payment to confirm',
        message: `${ctx.partner.business_name} says the customer paid ₹${Number(booking.total_amount || 0).toLocaleString('en-IN')} on the StashInn QR for booking #${bookingId.split('-')[0]!.toUpperCase()}${qrReference ? ` (ref ${qrReference})` : ''}. Check it arrived.`,
        category: 'payment',
        targetRoles: ['finance'],
        action_url: '/dashboard/settlements',
      }).catch(() => null);
    }
  }

  const locationName = booking.partner_locations?.name || 'the partner';
  await db.from('notifications').insert({
    user_id: booking.customer_id,
    title: 'Dropped off',
    message: `${locationName} has checked in your ${itemsLabel(booking)}. Show your pick-up code when you collect.`,
    category: 'booking',
    action_url: '/dashboard',
  });
  const customer = await customerOf(db, booking.customer_id);
  const { BOOKING_EMAIL_SLUGS, bookingRef, emailTime } = await import('@stashinn/lib/services/bookingEmails');
  await sendTemplate(customer?.email, BOOKING_EMAIL_SLUGS.customerDroppedOff, {
    customer_name: firstName(customer),
    booking_ref: bookingRef(bookingId),
    location_name: booking.partner_locations?.name || 'your StashInn location',
    dropped_off: emailTime(now),
    pick_up: emailTime(booking.end_time),
    items: itemsLabel(booking),
    checkout_otp: String(booking.checkout_otp || ''),
    dashboard_url: `${customerUrl()}/dashboard`,
  });

  refresh(bookingId);
  const paidNote = atDropoff ? ` Payment recorded: ${COLLECTION_METHODS.find(m => m.value === collectedVia)!.short}.` : '';
  return { success: true, message: `${isGarage ? 'Vehicle' : itemsLabel(booking)} checked in.${paidNote}` };
}

export async function verifyCheckInOTP(formData: FormData): Promise<ActionResult> {
  return checkIn(formData, false);
}

export async function verifyGarageCheckIn(formData: FormData): Promise<ActionResult> {
  return checkIn(formData, true);
}

export async function verifyCheckOutOTP(formData: FormData): Promise<ActionResult> {
  const bookingId = String(formData.get('booking_id') || '');
  const ctx = await loadBooking(bookingId);
  if ('error' in ctx) return { error: ctx.error! };
  const { db, booking, user } = ctx;

  if (booking.status === 'checked_out') return { error: 'This booking is already picked up.' };
  if (booking.status !== 'checked_in') return { error: 'Only items that are checked in can be picked up.' };

  const otpError = await checkOtp(ctx, 'checkout', String(formData.get('otp') || ''));
  if (otpError) return { error: otpError };

  const now = new Date().toISOString();
  const { data: updated, error } = await db.from('bookings').update({
    status: 'checked_out',
    actual_checkout: now,
  }).eq('id', bookingId).eq('status', 'checked_in').select('id');
  if (error) return { error: `Couldn’t check out: ${error.message}` };
  if (!updated?.length) return { error: 'This booking changed in the meantime. Refresh and try again.' };

  await db.from('audit_logs').insert({
    user_id: user.id, action: 'booking.otp_verified', entity_type: 'bookings', entity_id: bookingId,
    new_values: { type: 'checkout', status: 'checked_out', late_minutes: Math.max(0, Math.round((Date.parse(now) - Date.parse(booking.end_time)) / 60000)) },
  });

  // The review request is sent later by the booking.review_request job, so it isn't asked for twice
  const locationName = booking.partner_locations?.name || 'the partner';
  await db.from('notifications').insert({
    user_id: booking.customer_id,
    title: 'Picked up',
    message: `You've collected your ${itemsLabel(booking)} from ${locationName}. Thanks for using StashInn!`,
    category: 'booking',
    action_url: '/dashboard',
  });
  const customer = await customerOf(db, booking.customer_id);
  const { BOOKING_EMAIL_SLUGS, bookingRef, emailTime } = await import('@stashinn/lib/services/bookingEmails');
  await sendTemplate(customer?.email, BOOKING_EMAIL_SLUGS.customerPickedUp, {
    customer_name: firstName(customer),
    booking_ref: bookingRef(bookingId),
    location_name: booking.partner_locations?.name || 'your StashInn location',
    dropped_off: booking.actual_checkin ? emailTime(booking.actual_checkin) : emailTime(booking.start_time),
    picked_up: emailTime(now),
    items: itemsLabel(booking),
    total: Number(booking.total_amount || 0).toFixed(2),
    dashboard_url: `${customerUrl()}/dashboard`,
  });

  refresh(bookingId);
  return { success: true, message: 'Picked up. The booking is complete.' };
}
