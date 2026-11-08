'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { getAdminContext, requireAccess } from '../../../lib/adminAccess';
import { REMOVAL_REASONS } from './reviewShared';

export type ModerateResult = { ok: true; message: string } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Removes a review. There's no delete policy on reviews for signed-in users, so this uses the
 * service role after the access check (the old version deleted nothing but still logged it).
 * The full review is kept in the audit log, and the partner's rating is recalculated.
 */
export async function removeReview(formData: FormData): Promise<ModerateResult> {
  try {
    await requireAccess('/dashboard/reviews');
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
  const { user } = await getAdminContext();

  const id = String(formData.get('review_id') || '');
  const reasonKey = String(formData.get('reason') || '');
  const note = String(formData.get('note') || '').trim().slice(0, 500);
  const tellCustomer = formData.get('notify') === 'on';
  const reason = REMOVAL_REASONS.find(r => r.value === reasonKey);
  if (!UUID.test(id)) return { ok: false, error: 'Review not found.' };
  if (!reason) return { ok: false, error: 'Choose why the review is being removed.' };
  if (reason.value === 'other' && note.length < 5) return { ok: false, error: 'Add a short note explaining why.' };

  const db = createServiceClient();
  const { data: review } = await db.from('reviews').select('*, partner_locations(name)').eq('id', id).maybeSingle();
  if (!review) return { ok: false, error: 'This review was already removed. Refresh the page.' };

  const { data: deleted, error } = await db.from('reviews').delete().eq('id', id).select('id');
  if (error) return { ok: false, error: `Couldn’t remove the review: ${error.message}` };
  if (!deleted?.length) return { ok: false, error: 'This review was already removed. Refresh the page.' };

  const { partner_locations: loc, ...snapshot } = review as any;
  await db.from('audit_logs').insert({
    user_id: user?.id ?? null,
    action: 'review.deleted',
    entity_type: 'reviews',
    entity_id: id,
    old_values: snapshot,
    new_values: { reason: reason.value, note: note || null, customer_notified: tellCustomer },
  });

  // Keep the partner's average in step
  const { data: rest } = await db.from('reviews').select('rating').eq('partner_id', review.partner_id);
  const total = rest?.length || 0;
  const avg = total ? rest!.reduce((s, r) => s + r.rating, 0) / total : 0;
  await db.from('partners').update({ total_reviews: total, avg_rating: avg.toFixed(2) }).eq('id', review.partner_id);

  if (tellCustomer) {
    const place = (Array.isArray(loc) ? loc[0] : loc)?.name || 'a StashInn location';
    await db.from('notifications').insert({
      user_id: review.customer_id,
      title: 'Your review was removed',
      message: `We removed your review of ${place} because it ${reason.customer}. You can leave a new review for that booking.${note && reason.value === 'other' ? ` Note from StashInn: ${note}` : ''}`,
      category: 'system',
      action_url: `/dashboard/review/${review.booking_id}`,
    });
  }

  revalidatePath('/dashboard/reviews');
  return { ok: true, message: `Review removed${tellCustomer ? ' and the customer told' : ''}. The partner’s rating is now ${total ? `${avg.toFixed(2)} from ${total}` : 'empty'}.` };
}
