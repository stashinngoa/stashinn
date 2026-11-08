'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { ALL_TAGS, MAX_COMMENT, MAX_TAGS, RATING_WORDS } from './reviewShared';

export type ReviewResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function submitReview(formData: FormData): Promise<ReviewResult> {
  const bookingId = String(formData.get('booking_id') || '');
  const rating = Number.parseInt(String(formData.get('rating') || ''), 10);
  const comment = String(formData.get('comment') || '').trim().replace(/\n{3,}/g, '\n\n').slice(0, MAX_COMMENT);
  const tags = [...new Set(formData.getAll('tags').map(String))].filter(t => ALL_TAGS.includes(t)).slice(0, MAX_TAGS);

  if (!UUID.test(bookingId)) return { ok: false, error: 'Booking not found.' };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: 'Choose a rating from 1 to 5 stars.' };
  if (rating <= 2 && !comment && !tags.length) return { ok: false, error: 'Tell us briefly what went wrong, so the location can fix it.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session has expired. Please sign in again.' };

  const { data: booking } = await supabase.from('bookings')
    .select('id, customer_id, partner_id, location_id, status, partner_locations(name)')
    .eq('id', bookingId).eq('customer_id', user.id).maybeSingle();
  if (!booking) return { ok: false, error: 'Booking not found.' };
  if (booking.status !== 'checked_out') return { ok: false, error: 'You can review a booking once you’ve picked up your items.' };

  const row = { booking_id: bookingId, customer_id: user.id, partner_id: booking.partner_id, location_id: booking.location_id, rating, comment: comment || null };
  let { error } = await supabase.from('reviews').insert({ ...row, tags });
  // Before migration 20261110000006 there's no tags column: keep the review, drop the tags
  if (error && /tags/.test(error.message) && (error.code === 'PGRST204' || error.code === '42703')) {
    ({ error } = await supabase.from('reviews').insert(row));
  }
  if (error?.code === '23505') return { ok: false, error: 'You’ve already reviewed this booking.' };
  if (error) return { ok: false, error: 'Couldn’t save your review. Please try again.' };

  // Customers can't write partner rows, so the average and the partner's alert use the service role
  const db = createServiceClient();
  const { data: all } = await db.from('reviews').select('rating').eq('partner_id', booking.partner_id);
  if (all?.length) {
    const avg = all.reduce((s, r) => s + r.rating, 0) / all.length;
    await db.from('partners').update({ total_reviews: all.length, avg_rating: avg.toFixed(2) }).eq('id', booking.partner_id);
  }
  const { data: partner } = await db.from('partners').select('user_id').eq('id', booking.partner_id).maybeSingle();
  if (partner?.user_id) {
    const place = (Array.isArray(booking.partner_locations) ? booking.partner_locations[0] : booking.partner_locations as any)?.name || 'your location';
    await db.from('notifications').insert({
      user_id: partner.user_id,
      title: `New ${rating}★ review · ${place}`,
      message: `${RATING_WORDS[rating]}${tags.length ? `: ${tags.join(', ')}` : ''}${comment ? ` “${comment.slice(0, 120)}${comment.length > 120 ? '…' : ''}”` : ''}`,
      category: 'system',
      action_url: '/dashboard/reviews',
    });
  }

  revalidatePath(`/dashboard/review/${bookingId}`);
  revalidatePath('/dashboard');
  return { ok: true };
}
