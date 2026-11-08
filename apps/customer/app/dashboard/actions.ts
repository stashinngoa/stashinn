'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { getBookingRules } from '@stashinn/lib/services/bookingRules';
import { cancelBooking as cancel, isPaidOnline, livePayment, refundableAmount, rupees } from '@stashinn/lib/services/bookingLifecycle';
import { bookingRef } from '@stashinn/lib/services/bookingEmails';

/** Cancels the customer's own pending or confirmed booking, refunding online payments inside the free window. */
export async function cancelBooking(bookingId: string): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session has expired. Please sign in again.' };

  // Ownership is checked with the customer's own session
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, start_time, status, partner_id, partners(user_id)')
    .eq('id', bookingId)
    .eq('customer_id', user.id)
    .in('status', ['pending', 'confirmed'])
    .maybeSingle();
  if (!booking) return { ok: false, error: 'This booking can no longer be cancelled.' };

  const db = createServiceClient();
  const { cancellationWindowHours } = await getBookingRules(db);
  const hoursUntilStart = (new Date(booking.start_time).getTime() - Date.now()) / 3_600_000;
  const payment = await livePayment(db, bookingId);
  const paidOnline = isPaidOnline(payment);
  const fullRefund = paidOnline && hoursUntilStart >= cancellationWindowHours;
  const refund = fullRefund ? refundableAmount(payment) : 0;

  const r = await cancel(db, bookingId, {
    by: 'customer',
    code: 'customer',
    reason: `Cancelled by customer.${paidOnline ? (fullRefund ? ' Full refund.' : ' Late cancellation, no refund.') : ''}`,
    refund: fullRefund ? 'full' : 'none',
  });
  if (!r.ok) return { ok: false, error: r.reason === 'changed' ? r.error : 'Could not cancel the booking. Please try again.' };

  const ref = bookingRef(bookingId);
  const partnerUserId = (Array.isArray(booking.partners) ? booking.partners[0] : booking.partners as any)?.user_id;
  if (partnerUserId) {
    await db.from('notifications').insert({
      user_id: partnerUserId,
      title: 'Booking cancelled',
      message: `Booking #${ref} was cancelled by the customer.`,
      category: 'booking',
      action_url: '/dashboard/bookings',
    });
  }

  const outcome = r.refunded > 0
    ? `A refund of ${rupees(r.refunded)} has been started and should reach you in 5–7 business days.`
    : r.refundQueued > 0
      ? `Your refund of ${rupees(r.refundQueued)} is being processed. If it doesn’t show within 7 business days, contact support.`
      : paidOnline
        ? `Cancellations within ${cancellationWindowHours} hours of drop-off aren't refunded.`
        : 'You weren’t charged for this booking.';
  await db.from('notifications').insert({
    user_id: user.id,
    title: 'Booking cancelled',
    message: `Your booking #${ref} has been cancelled. ${outcome}`,
    category: refund > 0 ? 'payment' : 'booking',
    action_url: '/dashboard',
  });

  revalidatePath('/dashboard');
  return { ok: true, message: `Booking cancelled. ${outcome}` };
}
