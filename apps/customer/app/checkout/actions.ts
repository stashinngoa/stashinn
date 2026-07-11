'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function createBooking(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const locationId = formData.get('location_id') as string;
  const partnerId = formData.get('partner_id') as string;
  const checkIn = formData.get('check_in') as string;
  const checkOut = formData.get('check_out') as string;
  const paymentMethod = formData.get('payment_method') as string;
  const rzpOrderId = formData.get('razorpay_order_id') as string;
  const rzpPaymentId = formData.get('razorpay_payment_id') as string;
  const rzpSignature = formData.get('razorpay_signature') as string;
  const bags = parseInt(formData.get('bags') as string);
  const totalAmount = parseFloat(formData.get('total_amount') as string);

  // Calculate Commission (15%)
  const commissionRate = 0.15;
  const commissionAmount = totalAmount * commissionRate;
  const partnerAmount = totalAmount - commissionAmount;

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      customer_id: user.id,
      partner_id: partnerId,
      location_id: locationId,
      status: 'pending',
      num_bags: bags,
      start_time: checkIn,
      end_time: checkOut,
      base_amount: totalAmount,
      commission_amount: commissionAmount,
      total_amount: totalAmount
    })
    .select('id')
    .single();

  if (error || !booking) {
    redirect('/search?error=booking_failed');
  }

  // Insert Payment record
  await supabase
    .from('payments')
    .insert({
      booking_id: booking.id,
      amount: totalAmount,
      method: paymentMethod || 'pay_at_location',
      status: paymentMethod === 'razorpay' ? 'paid' : 'pending',
      razorpay_order_id: rzpOrderId || null,
      razorpay_payment_id: rzpPaymentId || null,
      razorpay_signature: rzpSignature || null
    });

  // Insert Partner Transaction Ledger Entry
  await supabase
    .from('partner_transactions')
    .insert({
      partner_id: partnerId,
      booking_id: booking.id,
      amount: partnerAmount,
      commission: commissionAmount,
      transfer_status: 'pending'
    });

  // Fetch Partner's user_id to send Notification
  const { data: partnerRecord } = await supabase
    .from('partners')
    .select('user_id')
    .eq('id', partnerId)
    .single();

  if (partnerRecord?.user_id) {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseService = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    await supabaseService.from('notifications').insert({
      user_id: partnerRecord.user_id,
      title: 'New Booking Request',
      message: `You have a new request for ${bags} bags. Please accept or decline in your dashboard.`,
      category: 'booking'
    });
  }

  redirect('/dashboard');
}
