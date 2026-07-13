'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendSMS } from '@stashinn/lib/services/messaging';

export async function cancelBooking(formData: FormData) {
  const bookingId = formData.get('booking_id') as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // 1. Fetch booking to check refund rules
  const { data: bookingToCancel } = await supabase
    .from('bookings')
    .select('id, start_time, total_amount, status, payments(*)')
    .eq('id', bookingId)
    .eq('customer_id', user.id)
    .in('status', ['pending', 'confirmed'])
    .single();

  if (!bookingToCancel) {
    throw new Error('Booking not found or cannot be cancelled');
  }

  const startTime = new Date(bookingToCancel.start_time);
  const now = new Date();
  const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  let refundAmount = 0;
  let isFullRefund = false;
  if (hoursUntilStart >= 12) {
    refundAmount = bookingToCancel.total_amount;
    isFullRefund = true;
  }

  // 2. Update booking status
  const { error } = await supabase
    .from('bookings')
    .update({ 
      status: 'cancelled',
      cancellation_reason: `Cancelled by customer. ${isFullRefund ? 'Full refund eligible' : 'Late cancellation - no refund'}`,
      cancelled_by: 'customer'
    })
    .eq('id', bookingId);

  if (error) {
    console.error('Cancel Error:', error);
    throw new Error('Could not cancel booking.');
  }

  // 3. Process Refund if eligible
  if (refundAmount > 0) {
    const payment = bookingToCancel.payments?.[0];
    if (payment && payment.method === 'razorpay' && payment.razorpay_payment_id) {
      const rzpKeyId = process.env.RAZORPAY_KEY_ID;
      const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;

      if (rzpKeyId && rzpKeySecret) {
        const authString = Buffer.from(`${rzpKeyId}:${rzpKeySecret}`).toString('base64');
        try {
          const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${payment.razorpay_payment_id}/refund`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${authString}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: Math.round(refundAmount * 100) })
          });
          if (rzpRes.ok) {
            const rzpData = await rzpRes.json();
            await supabase.from('payments').update({
              status: 'refunded',
              refund_amount: payment.refund_amount + refundAmount,
              refund_reason: `Razorpay Refund ID: ${rzpData.id}. Customer cancellation.`,
              updated_at: new Date().toISOString()
            }).eq('id', payment.id);
          }
        } catch (err) {
          console.error('Customer Cancellation Refund Error:', err);
        }
      }
    }
  }

  // Fetch booking details for notifications
  const { data: booking } = await supabase
    .from('bookings')
    .select('partner_id, partners(user_id)')
    .eq('id', bookingId)
    .single();

  if (booking && (booking.partners as any)?.user_id) {
    // Notify Partner
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseService = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabaseService.from('notifications').insert({
      user_id: (booking.partners as any).user_id,
      title: 'Booking Cancelled',
      message: `Booking ${bookingId} was cancelled by the customer.`,
      category: 'booking'
    });
  }

  // Notify Customer
  const refundMsg = isFullRefund ? ` A full refund of ₹${refundAmount} has been initiated.` : ` Note: Cancellations within 12h of check-in are non-refundable.`;
  await sendSMS({
    to: user.phone || '+1234567890',
    message: `StashInn: Your booking ${bookingId} has been successfully cancelled.${refundMsg}`
  });

  revalidatePath('/dashboard');
}
