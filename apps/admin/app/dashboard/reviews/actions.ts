'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function moderateReview(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const reviewId = formData.get('review_id') as string;
  const action = formData.get('action') as string; // 'delete'

  if (action === 'delete') {
    // Get partner_id before deleting
    const { data: review } = await supabase
      .from('reviews')
      .select('partner_id')
      .eq('id', reviewId)
      .single();

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'review.deleted',
      entity_type: 'reviews',
      entity_id: reviewId,
      new_values: { deleted_by: user.id }
    });

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {
      throw new Error(error.message);
    }

    // Recalculate Partner Ratings after successful deletion
    if (review?.partner_id) {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('partner_id', review.partner_id);

      const totalReviews = reviews ? reviews.length : 0;
      const sumRating = reviews ? reviews.reduce((acc, curr) => acc + curr.rating, 0) : 0;
      const avgRating = totalReviews > 0 ? (sumRating / totalReviews).toFixed(2) : '0.00';

      await supabase
        .from('partners')
        .update({
          total_reviews: totalReviews,
          avg_rating: avgRating
        })
        .eq('id', review.partner_id);
    }
  }

  revalidatePath('/dashboard/reviews');
}
