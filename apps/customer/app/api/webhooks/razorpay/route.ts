import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@stashinn/lib/services/logger';

// We need to use the service role key to bypass RLS since this is a server-to-server webhook
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    // Verify cryptographic signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Parse the payload
    const event = JSON.parse(rawBody);

    // Handle the payment.captured event
    if (event.event === 'payment.captured') {
      const paymentEntity = event.payload.payment.entity;
      const razorpayPaymentId = paymentEntity.id;
      const razorpayOrderId = paymentEntity.order_id;

      // Update the payments table
      // We look up the payment by the order_id, which we generated during checkout
      const { error } = await supabase
        .from('payments')
        .update({ 
          status: 'paid',
          razorpay_payment_id: razorpayPaymentId
        })
        .eq('razorpay_order_id', razorpayOrderId)
        // Idempotency: only update if it's currently pending, to avoid re-triggering logic
        .eq('status', 'pending');

      if (error) {
        logger.critical('Failed to update payment status on Razorpay capture', error, { razorpayOrderId });
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      // Optionally, we could also update the `partner_transactions` table here
      // But since that was inserted as 'pending', the payout engine will handle it.
      
    } else if (event.event === 'payment.failed') {
      const paymentEntity = event.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('razorpay_order_id', razorpayOrderId);
        
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('razorpay_order_id', razorpayOrderId);

    } else if (event.event === 'refund.processed') {
      // Find original payment
      const paymentEntity = event.payload.refund.entity;
      const razorpayPaymentId = paymentEntity.payment_id;

      // Update booking to cancelled/refunded
      const { data: payment } = await supabase
        .from('payments')
        .select('booking_id')
        .eq('razorpay_payment_id', razorpayPaymentId)
        .single();
        
      if (payment?.booking_id) {
        await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', payment.booking_id);
      }
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    logger.error('Webhook handler failed', { error });
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
