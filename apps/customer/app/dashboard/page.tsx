import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cancelBooking } from './actions';
import Link from 'next/link';

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const logout = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  };

  // Fetch customer bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, partner_locations(name, city, address_line1, photos), partners(business_name)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'checked_in': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'checked_out': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 sticky top-0 z-50">
        <Link href="/" className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 flex-1">
          StashInn
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600">{user.email}</span>
          <form action={logout}>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold text-sm transition-colors">
              Log Out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">My Bookings</h1>

        {(!bookings || bookings.length === 0) ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No bookings yet</h3>
            <p className="text-gray-500 mb-6">You haven't stored any luggage with us yet.</p>
            <Link href="/" className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors inline-block">
              Find Storage Spots
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{booking.partner_locations?.name}</h2>
                    <p className="text-sm text-gray-500">{booking.partner_locations?.address_line1}, {booking.partner_locations?.city}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusColor(booking.status)}`}>
                    {booking.status.replace('_', ' ')}
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left: Details */}
                  <div className="space-y-4">
                    <div>
                      <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Timeframe</span>
                      <div className="text-gray-900 font-medium">
                        {new Date(booking.start_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        <span className="mx-2 text-gray-400">→</span>
                        {new Date(booking.end_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Luggage</span>
                      <div className="text-gray-900 font-medium">{booking.num_bags} {booking.num_bags === 1 ? 'Bag' : 'Bags'}</div>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Paid</span>
                      <div className="text-gray-900 font-medium font-mono">₹{booking.total_amount}</div>
                    </div>
                  </div>

                  {/* Right: Security/OTP */}
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex flex-col justify-center items-center text-center relative overflow-hidden">
                    {booking.status === 'pending' ? (
                      <>
                        <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400"></div>
                        <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="block text-sm font-bold text-gray-900 mb-1">Awaiting Confirmation</span>
                        <p className="text-xs text-gray-500">The partner is checking their physical storage capacity.</p>
                      </>
                    ) : booking.status === 'confirmed' ? (
                      <>
                        <span className="block text-sm font-bold text-gray-600 mb-2">Check-in OTP</span>
                        <div className="text-4xl font-black tracking-[0.2em] text-gray-900 mb-2 font-mono">
                          {booking.checkin_otp || '----'}
                        </div>
                        <p className="text-xs text-gray-500">Give this code to the partner to drop off your bags. Please pay the cash at the location.</p>
                      </>
                    ) : booking.status === 'checked_in' ? (
                      <>
                        <span className="block text-sm font-bold text-gray-600 mb-2">Check-out OTP</span>
                        <div className="text-4xl font-black tracking-[0.2em] text-purple-600 mb-2 font-mono">
                          {booking.checkout_otp || '----'}
                        </div>
                        <p className="text-xs text-gray-500">Give this code to retrieve your bags.</p>
                      </>
                    ) : booking.status === 'checked_out' ? (
                      <>
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="block text-sm font-bold text-gray-900 mb-3">Transaction Complete</span>
                        <Link href={`/dashboard/review/${booking.id}`} className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-colors w-full">
                          Leave a Review
                        </Link>
                      </>
                    ) : (
                      <span className="block text-sm font-bold text-gray-500">Booking Cancelled</span>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <form action={cancelBooking}>
                      <input type="hidden" name="booking_id" value={booking.id} />
                      <button type="submit" className="px-4 py-2 text-red-600 text-sm font-bold hover:bg-red-50 rounded-lg transition-colors">
                        Cancel Booking
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
