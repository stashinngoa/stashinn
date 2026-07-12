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
  }

  revalidatePath('/dashboard/reviews');
}
