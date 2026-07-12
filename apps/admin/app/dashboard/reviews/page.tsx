import { createClient } from '@stashinn/lib/supabase/server';
import DeleteReviewButton from './DeleteReviewButton';

export default async function AdminReviewsPage() {
  const supabase = await createClient();

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, bookings(id), partners(business_name), users(full_name)')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Review Moderation</h1>
        <p className="text-gray-500 mt-1">Monitor and remove abusive customer reviews.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {(!reviews || reviews.length === 0) ? (
          <div className="p-12 text-center text-gray-500">No reviews found.</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {reviews.map((review: any) => (
              <div key={review.id} className="p-6 hover:bg-gray-800/50 transition-colors flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-500 font-bold text-lg">★ {review.rating}/5</span>
                    <span className="text-gray-400 text-sm">
                      {review.users?.full_name} &rarr; {review.partners?.business_name}
                    </span>
                  </div>
                  <p className="text-gray-200 text-sm">"{review.comment}"</p>
                  <p className="text-gray-600 text-xs mt-2">
                    Booking: {review.bookings?.id.split('-')[0]} • Posted: {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <DeleteReviewButton reviewId={review.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
