import { createClient } from '@stashinn/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import ReviewForm from './ReviewForm';

export default async function ReviewPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, partner_locations(name, city), partners(business_name)')
    .eq('id', resolvedParams.id)
    .eq('customer_id', user.id)
    .single();

  if (!booking) notFound();
  
  if (booking.status !== 'checked_out') {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Cannot Review Yet</h1>
        <p className="text-gray-600 mb-8">You can only leave a review after you have successfully picked up your bags.</p>
        <Link href="/dashboard" className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Check if they already left a review
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', booking.id)
    .maybeSingle();

  if (existingReview) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Review Submitted</h1>
        <p className="text-gray-600 mb-8">Thank you for sharing your experience!</p>
        <Link href="/dashboard" className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8">
      <Link href="/dashboard" className="text-sm font-semibold text-purple-600 hover:text-purple-800 mb-6 inline-block">
        &larr; Back to Dashboard
      </Link>
      
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <div className="text-center border-b border-gray-100 pb-6 mb-6">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Review your storage with</div>
          <h1 className="text-2xl font-bold text-gray-900">{booking.partners?.business_name}</h1>
          <p className="text-gray-500">{booking.partner_locations?.name}, {booking.partner_locations?.city}</p>
        </div>

        <ReviewForm booking={booking} />
      </div>
    </div>
  );
}
