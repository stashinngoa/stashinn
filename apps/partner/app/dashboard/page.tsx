import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import WelcomeModal from './WelcomeModal';

export default async function DashboardOverview({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const showWelcomeModal = params?.onboarded === 'true';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!partner) {
    redirect('/onboarding');
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, users(full_name, email), partner_locations(name)')
    .eq('partner_id', partner.id)
    .order('start_time', { ascending: true });

  const activeOrPendingBookings = bookings?.filter(b => ['pending', 'confirmed', 'checked_in'].includes(b.status)) || [];

  const activeBookingsCount = bookings?.filter(b => ['confirmed', 'checked_in'].includes(b.status)).length || 0;
  
  // Calculate Today's Checkins
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const todaysCheckinsCount = bookings?.filter(b => {
    const startTime = new Date(b.start_time);
    return ['confirmed', 'checked_in'].includes(b.status) && startTime >= startOfToday && startTime <= endOfToday;
  }).length || 0;

  // Calculate Pending Payouts from partner_transactions
  const { data: transactions } = await supabase
    .from('partner_transactions')
    .select(`
      *,
      bookings (
        payments (
          method
        )
      )
    `)
    .eq('partner_id', partner.id)
    .eq('transfer_status', 'pending');

  let pendingPayoutsVal = 0;
  transactions?.forEach(tx => {
    const payment = tx.bookings?.payments?.[0];
    if (payment?.method === 'razorpay') {
      pendingPayoutsVal += Number(tx.amount);
    }
  });

  const avgRating = partner.avg_rating || 0;

  return (
    <div className="space-y-6">
      {showWelcomeModal && <WelcomeModal />}

      {partner.status === 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start space-x-3 shadow-sm mb-6">
          <svg className="w-6 h-6 text-yellow-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-bold text-yellow-800">Your account is currently Pending Review</h3>
            <p className="text-sm text-yellow-700 mt-1">
              You cannot accept bookings or update your profile until our team has verified your details. You can review your onboarding application in the Profile tab.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
        <div className={`px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wider ${partner.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {partner.status}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <a href="/dashboard/bookings" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-purple-300 hover:shadow-md transition-all group block">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 group-hover:text-purple-600 transition-colors">Active Bookings</div>
          <div className="text-4xl font-black text-gray-900">{activeBookingsCount}</div>
        </a>
        <a href="/dashboard/bookings" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-purple-300 hover:shadow-md transition-all group block">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 group-hover:text-purple-600 transition-colors">Today's Check-ins</div>
          <div className="text-4xl font-black text-gray-900">{todaysCheckinsCount}</div>
        </a>
        <a href="/dashboard/settlements" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-green-300 hover:shadow-md transition-all group block">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 group-hover:text-green-600 transition-colors">Pending Payouts</div>
          <div className="text-4xl font-black text-gray-900">₹{pendingPayoutsVal.toFixed(2)}</div>
        </a>
        <a href="/dashboard/reviews" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-yellow-300 hover:shadow-md transition-all group block">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 group-hover:text-yellow-600 transition-colors">Average Rating</div>
          <div className="text-4xl font-black text-gray-900">★ {avgRating ? Number(avgRating).toFixed(1) : '—'}</div>
        </a>
      </div>

      <div className="mt-8">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-bold text-gray-900">Action Required Bookings</h2>
          <a href="/dashboard/bookings" className="text-sm font-bold text-purple-600 hover:text-purple-800">
            View All Bookings &rarr;
          </a>
        </div>
        
        {(!activeOrPendingBookings || activeOrPendingBookings.length === 0) ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">You're all caught up!</h2>
            <p className="text-gray-500">No active or pending bookings at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeOrPendingBookings.map(b => (
              <a key={b.id} href={`/dashboard/bookings/${b.id}`} className="block group">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow h-full flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        b.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        b.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {b.status.replace('_', ' ')}
                      </span>
                      <span className="font-mono text-xs text-gray-400">#{b.id.split('-')[0]}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{b.users?.full_name || 'Customer'}</h3>
                    <p className="text-sm text-gray-500 mb-4">{b.partner_locations?.name}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Check-in:</span>
                        <span className="font-medium text-gray-900">{new Date(b.start_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Check-out:</span>
                        <span className="font-medium text-gray-900">{new Date(b.end_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Bags:</span>
                        <span className="font-medium text-gray-900">{b.num_bags}</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-50 mt-auto flex justify-between items-center group-hover:text-purple-600 transition-colors">
                    <span className="text-sm font-bold">Manage Booking</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
