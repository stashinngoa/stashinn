import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function PartnerReviewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, bookings(id, start_time, end_time), users(full_name)')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false });

  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">Reviews left by customers after checkout.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-black text-gray-900">{avgRating}</p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Rating</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-purple-600">{reviews?.length || 0}</p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {(!reviews || reviews.length === 0) ? (
          <div className="p-12 text-center">
            <p className="text-xl font-bold text-gray-900 mb-2">No reviews yet</p>
            <p className="text-gray-500">Reviews will appear here after customers complete their stash.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reviews.map((review: any) => (
              <div key={review.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center text-yellow-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{review.users?.full_name || 'Customer'}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(review.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-gray-700 text-sm">&ldquo;{review.comment}&rdquo;</p>
                    )}
                  </div>
                  <span className="text-xs font-mono text-gray-400 shrink-0">
                    Booking #{review.bookings?.id?.split('-')[0]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
