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
  const bags = parseInt(formData.get('bags') as string);
  const totalAmount = parseFloat(formData.get('total_amount') as string);

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
      status: 'pending'
    });

  redirect('/dashboard');
}
