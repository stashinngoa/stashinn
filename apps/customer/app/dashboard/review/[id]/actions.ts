'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function submitReview(formData: FormData) {
  const bookingId = formData.get('booking_id') as string;
  const rating = parseInt(formData.get('rating') as string);
  const comment = formData.get('comment') as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Fetch booking to ensure ownership and checked_out status
  const { data: booking } = await supabase
    .from('bookings')
    .select('customer_id, partner_id, location_id, status')
    .eq('id', bookingId)
    .single();

  if (!booking || booking.customer_id !== user.id || booking.status !== 'checked_out') {
    return { error: 'Invalid booking for review.' };
  }

  // 2. Insert Review
  const { error: insertError } = await supabase
    .from('reviews')
    .insert({
      booking_id: bookingId,
      customer_id: user.id,
      partner_id: booking.partner_id,
      location_id: booking.location_id,
      rating: rating,
      comment: comment
    });

  // If review already exists (unique constraint on booking_id), just redirect
  if (insertError && insertError.code !== '23505') {
    return { error: insertError.message };
  }

  // 3. Recalculate Partner Ratings
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('partner_id', booking.partner_id);

  if (reviews && reviews.length > 0) {
    const totalReviews = reviews.length;
    const sumRating = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    const avgRating = (sumRating / totalReviews).toFixed(2);

    await supabase
      .from('partners')
      .update({
        total_reviews: totalReviews,
        avg_rating: avgRating
      })
      .eq('id', booking.partner_id);
  }

  redirect('/dashboard');
}
