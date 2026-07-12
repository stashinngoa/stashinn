'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendSMS } from '@stashinn/lib/services/messaging';

export async function resolveDispute(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get('id') as string;
  const status = formData.get('status') as string;
  const admin_notes = formData.get('admin_notes') as string;
  const refund_amount = parseFloat(formData.get('refund_amount') as string) || 0;

  if (!['submitted', 'under_review', 'resolved_refund', 'resolved_no_action', 'escalated'].includes(status)) {
    throw new Error('Invalid status');
  }

  // Validate refund amount limits
  if (status === 'resolved_refund' && refund_amount > 0) {
    const { data: disputeInfo } = await supabase.from('damage_reports').select('booking_id').eq('id', id).single();
    if (disputeInfo) {
      const { data: bookingInfo } = await supabase.from('bookings').select('total_amount').eq('id', disputeInfo.booking_id).single();
      if (bookingInfo && refund_amount > bookingInfo.total_amount) {
        throw new Error(`Refund amount (₹${refund_amount}) cannot exceed the total booking amount (₹${bookingInfo.total_amount}).`);
      }
    }
  }

  const { error } = await supabase
    .from('damage_reports')
    .update({
      status,
      admin_notes,
      refund_amount,
      resolved_at: status.startsWith('resolved') ? new Date().toISOString() : null
    })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  // Insert Audit Log for dispute resolution
  const { data: { user: adminUser } } = await supabase.auth.getUser();
  if (adminUser) {
    await supabase.from('audit_logs').insert({
      user_id: adminUser.id,
      action: 'dispute.resolved',
      entity_type: 'damage_reports',
      entity_id: id,
      new_values: { status, admin_notes, refund_amount }
    });
  }

  // If resolved_refund is true, trigger the payment gateway refund
  if (status === 'resolved_refund' && refund_amount > 0) {
    // Get the booking ID for this dispute
    const { data: dispute } = await supabase
      .from('damage_reports')
      .select('booking_id, bookings(customer_id, partner_id, partners(user_id))')
      .eq('id', id)
      .single();

    if (dispute) {
      // Find the successful razorpay payment
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', dispute.booking_id)
        .eq('status', 'paid')
        .eq('method', 'razorpay')
        .single();

      if (payment && payment.razorpay_payment_id) {
        const rzpKeyId = process.env.RAZORPAY_KEY_ID;
        const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;

        if (rzpKeyId && rzpKeySecret) {
          const authString = Buffer.from(`${rzpKeyId}:${rzpKeySecret}`).toString('base64');
          
          try {
            // Amount in paise
            const refundPayload = { amount: Math.round(refund_amount * 100) };
            
            const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${payment.razorpay_payment_id}/refund`, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(refundPayload)
            });

            if (rzpRes.ok) {
              const rzpData = await rzpRes.json();
              
              // Determine new payment status based on whether it's a full or partial refund
              const newPaymentStatus = refund_amount >= payment.amount ? 'refunded' : 'partially_refunded';
              
              await supabase
                .from('payments')
                .update({ 
                  status: newPaymentStatus,
                  refund_amount: payment.refund_amount + refund_amount,
                  updated_at: new Date().toISOString()
                })
                .eq('id', payment.id);
                
              // Notify customer of refund
              if ((dispute.bookings as any)?.customer_id) {
                await supabase.from('notifications').insert({
                  user_id: (dispute.bookings as any).customer_id,
                  title: 'Refund Issued',
                  message: `A refund of ₹${refund_amount} has been issued for your dispute.`,
                  category: 'payment'
                });
                await sendSMS({
                  to: '+1234567890', // In real app, fetch customer phone
                  message: `StashInn: We have initiated a refund of ₹${refund_amount} for your recent dispute. It will reflect in 5-7 days.`
                });
              }
              // Notify partner
              if ((dispute.bookings as any)?.partners?.user_id || (dispute.bookings as any)?.partners?.[0]?.user_id) {
                const pUserId = (dispute.bookings as any).partners.user_id || (dispute.bookings as any).partners[0].user_id;
                await supabase.from('notifications').insert({
                  user_id: pUserId,
                  title: 'Dispute Resolved',
                  message: `Dispute ${id} was resolved. A refund of ₹${refund_amount} was issued to the customer.`,
                  category: 'damage'
                });
              }
            } else {
              const errBody = await rzpRes.text();
              console.error('Razorpay Refund API Error:', errBody);
              // For V1, we log the error but don't crash, the admin can retry or handle manually.
            }
          } catch (rzpErr) {
            console.error('Failed to communicate with Razorpay:', rzpErr);
          }
        }
      }
    }
  }

  revalidatePath('/dashboard/disputes');
}
