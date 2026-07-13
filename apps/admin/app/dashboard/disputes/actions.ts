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

  // Fetch dispute and customer info
  const { data: dispute } = await supabase
    .from('damage_reports')
    .select('booking_id, bookings(customer_id, partner_id, partners(user_id))')
    .eq('id', id)
    .single();

  let customerPhone = '';
  let customerEmail = '';

  if (dispute && (dispute.bookings as any)?.customer_id) {
    const { data: customerUser } = await supabase
      .from('users')
      .select('phone, email')
      .eq('id', (dispute.bookings as any).customer_id)
      .single();
    if (customerUser) {
      customerPhone = customerUser.phone || '';
      customerEmail = customerUser.email || '';
    }
  }

  // If resolved_refund is true, trigger the payment gateway refund
  if (status === 'resolved_refund' && refund_amount > 0 && dispute) {
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
              'Content-Type': 'application/x-www-form-urlencoded'
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
                refund_reason: `Razorpay Refund ID: ${rzpData.id}. Dispute: ${admin_notes}`,
                updated_at: new Date().toISOString()
              })
              .eq('id', payment.id);
              
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
          }
        } catch (rzpErr) {
          console.error('Failed to communicate with Razorpay:', rzpErr);
        }
      }
    }
  }

  // Trigger Notification to Customer on Decision
  const isFinalDecision = ['resolved_refund', 'resolved_no_action', 'escalated'].includes(status);
  
  if (isFinalDecision && dispute && (dispute.bookings as any)?.customer_id) {
    const customerId = (dispute.bookings as any).customer_id;
    let title = 'Dispute Update';
    let message = `Your dispute for booking ${dispute.booking_id.substring(0,8)} has been updated to: ${status.replace('_', ' ')}.`;
    
    if (status === 'resolved_refund') {
      title = 'Dispute Resolved - Refund';
      message = `Your dispute was resolved. A refund of ₹${refund_amount} has been initiated. Reason: ${admin_notes}.`;
    } else if (status === 'resolved_no_action') {
      title = 'Dispute Resolved - No Action';
      message = `Your dispute was resolved with no further action. Reason: ${admin_notes}. If you disagree, you can escalate this decision by contacting support@stashinn.com.`;
    } else if (status === 'escalated') {
      title = 'Dispute Escalated';
      message = `Your dispute has been escalated to senior management. Reason: ${admin_notes}. We will contact you shortly.`;
    }

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseService = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. In-App Notification
    const { data: notifData, error: notifError } = await supabaseService
      .from('notifications')
      .insert({
        user_id: customerId,
        title,
        message,
        category: status === 'resolved_refund' ? 'payment' : 'system'
      })
      .select('id')
      .single();

    if (!notifError && notifData) {
      await supabase.from('audit_logs').insert({
        user_id: adminUser ? adminUser.id : null,
        action: 'notification.sent',
        entity_type: 'notifications',
        entity_id: notifData.id,
        new_values: { title, message, channel: 'in_app', recipient: customerId }
      });
    }

    // 2. SMS Notification
    if (customerPhone) {
      await sendSMS({
        to: customerPhone,
        message: `StashInn: ${title}. ${message}`
      });
      
      await supabase.from('audit_logs').insert({
        user_id: adminUser ? adminUser.id : null,
        action: 'notification.sent',
        entity_type: 'notifications',
        entity_id: id,
        new_values: { title, message, channel: 'sms', recipient: customerPhone }
      });
    }

    // 3. Email Notification
    if (customerEmail) {
      const { ExternalNotificationService } = await import('@stashinn/lib/services/notifications');
      await ExternalNotificationService.sendEmail(customerEmail, `${title} - StashInn`, message);
      
      await supabase.from('audit_logs').insert({
        user_id: adminUser ? adminUser.id : null,
        action: 'notification.sent',
        entity_type: 'notifications',
        entity_id: id,
        new_values: { title, message, channel: 'email', recipient: customerEmail }
      });
    }
  }

  revalidatePath('/dashboard/disputes');
}
