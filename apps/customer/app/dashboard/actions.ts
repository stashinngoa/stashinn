'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function cancelBooking(formData: FormData) {
  const bookingId = formData.get('booking_id') as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  // Only allow cancellation if pending or confirmed
  const { error } = await supabase
    .from('bookings')
    .update({ 
      status: 'cancelled',
      cancellation_reason: 'Cancelled by customer via dashboard',
      cancelled_by: 'customer'
    })
    .eq('id', bookingId)
    .eq('customer_id', user.id)
    .in('status', ['pending', 'confirmed']);

  if (error) {
    console.error('Cancel Error:', error);
    return { error: 'Could not cancel booking.' };
  }

  revalidatePath('/dashboard');
}
