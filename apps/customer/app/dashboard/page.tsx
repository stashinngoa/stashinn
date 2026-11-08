import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { redirect } from 'next/navigation';
import { cancelBooking } from './actions';
import Link from 'next/link';
import SortSelect from './SortSelect';

export default async function Dashboard({ searchParams }: { searchParams: { filter?: string, page?: string, sort?: string } | Promise<{ filter?: string, page?: string, sort?: string }> }) {
  const resolvedParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Parse parameters
  const filter = resolvedParams.filter || 'all';
  const sort = resolvedParams.sort || 'newest';
  const page = parseInt(resolvedParams.page as string || '1');
  const limit = 5;
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from('bookings')
    .select('*, partner_locations(name, address_line1, address_line2, city, state, pincode, latitude, longitude, photos), partners(business_name)', { count: 'exact' })
    .eq('customer_id', user.id);

  if (filter === 'active') {
    query = query.in('status', ['pending', 'confirmed', 'checked_in']);
  } else if (filter === 'past') {
    query = query.eq('status', 'checked_out');
  } else if (filter === 'cancelled') {
    query = query.eq('status', 'cancelled');
  }

  if (sort === 'oldest') {
    query = query.order('created_at', { ascending: true });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data: bookings, count } = await query;
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // The exact address and the partner's contact are only shown once a booking exists. Customers
  // can't read partner contacts themselves, so they're looked up here for this customer's bookings.
  const showsDetails = (status: string) => status !== 'cancelled';
  const locationIds = [...new Set((bookings || []).filter(b => showsDetails(b.status)).map(b => b.location_id).filter(Boolean))];
  const { data: pocRows } = locationIds.length
    ? await createServiceClient().from('partner_pocs').select('location_id, name, phone, email, is_primary').in('location_id', locationIds)
    : { data: [] as { location_id: string; name: string; phone: string | null; email: string | null; is_primary: boolean | null }[] };
  const contactFor = (locationId: string) =>
    (pocRows || []).filter(p => p.location_id === locationId).sort((a, b) => Number(!!b.is_primary) - Number(!!a.is_primary))[0] ?? null;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-500 border-yellow-200 dark:border-yellow-800/50';
      case 'confirmed': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800/50';
      case 'checked_in': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800/50';
      case 'checked_out': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800/50';
      case 'cancelled': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800/50';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">My Bookings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your luggage storage sessions</p>
        </div>
        <div className="flex items-center gap-4">
          <SortSelect currentSort={sort} currentFilter={filter} />
        </div>
      </div>

      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'all', label: 'All Bookings' },
          { id: 'active', label: 'Active' },
          { id: 'past', label: 'Past' },
          { id: 'cancelled', label: 'Cancelled' }
        ].map(tab => (
          <Link 
            key={tab.id}
            href={`/dashboard?filter=${tab.id}&sort=${sort}`}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filter === tab.id ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

        {(!bookings || bookings.length === 0) ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No bookings yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">You haven't stored any luggage with us yet.</p>
            <Link href="/" className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors inline-block">
              Find Storage Spots
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
                <div className="p-6 border-b border-gray-50 dark:border-gray-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{booking.partner_locations?.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{booking.partner_locations?.city}{booking.partner_locations?.state ? `, ${booking.partner_locations.state}` : ''}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">Ref: #{booking.id.split('-')[0].toUpperCase()}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusColor(booking.status)}`}>
                    {booking.status.replace('_', ' ')}
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left: Details */}
                  <div className="space-y-4">
                    <div>
                      <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Timeframe</span>
                      <div className="text-gray-900 dark:text-gray-200 font-medium">
                        {new Date(booking.start_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        <span className="mx-2 text-gray-300 dark:text-gray-600">→</span>
                        {new Date(booking.end_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Luggage</span>
                      <div className="text-gray-900 dark:text-gray-200 font-medium">{booking.num_bags} {booking.num_bags === 1 ? 'Bag' : 'Bags'}</div>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Paid</span>
                      <div className="text-gray-900 dark:text-gray-200 font-medium font-mono">₹{booking.total_amount}</div>
                    </div>
                  </div>

                  {/* Right: Security/OTP */}
                  <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-5 border border-gray-100 dark:border-gray-800/50 flex flex-col justify-center items-center text-center relative overflow-hidden">
                    {booking.status === 'pending' ? (
                      <>
                        <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400"></div>
                        <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="block text-sm font-bold text-gray-900 dark:text-white mb-1">Awaiting Confirmation</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">The partner is checking their physical storage capacity.</p>
                      </>
                    ) : booking.status === 'confirmed' ? (
                      <>
                        <span className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-2">Check-in OTP</span>
                        <div className="text-4xl font-black tracking-[0.2em] text-gray-900 dark:text-white mb-2 font-mono">
                          {booking.checkin_otp || '----'}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Give this code to the partner to drop off your bags. Please pay the cash at the location.</p>
                      </>
                    ) : booking.status === 'checked_in' ? (
                      <>
                        <span className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-2">Check-out OTP</span>
                        <div className="text-4xl font-black tracking-[0.2em] text-purple-600 dark:text-purple-400 mb-2 font-mono">
                          {booking.checkout_otp || '----'}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Give this code to retrieve your bags.</p>
                      </>
                    ) : booking.status === 'checked_out' ? (
                      <>
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="block text-sm font-bold text-gray-900 dark:text-white mb-3">Transaction Complete</span>
                        <Link href={`/dashboard/review/${booking.id}`} className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-colors w-full">
                          Leave a Review
                        </Link>
                      </>
                    ) : (
                      <span className="block text-sm font-bold text-gray-500 dark:text-gray-400">Booking Cancelled</span>
                    )}
                  </div>
                </div>

                {showsDetails(booking.status) && booking.partner_locations && (() => {
                  const loc = booking.partner_locations;
                  const contact = contactFor(booking.location_id);
                  return (
                    <div className="mx-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                      <div>
                        <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Address</span>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                          {[loc.address_line1, loc.address_line2, loc.city, loc.state, loc.pincode].filter(Boolean).join(', ')}
                        </p>
                        {loc.latitude && loc.longitude && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 px-3 py-1.5 text-xs font-bold text-white"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Open in Maps
                          </a>
                        )}
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Partner contact</span>
                        {contact ? (
                          <div className="text-sm text-gray-900 dark:text-gray-200">
                            <p className="font-medium">{contact.name}</p>
                            {contact.phone && <a href={`tel:${contact.phone}`} className="block text-orange-700 dark:text-orange-400 font-semibold hover:underline">{contact.phone}</a>}
                            {contact.email && <a href={`mailto:${contact.email}`} className="block text-gray-500 dark:text-gray-400 hover:underline break-all">{contact.email}</a>}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{booking.partners?.business_name || 'The partner'}. Contact StashInn support if you need help reaching them.</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Footer Actions */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <Link href={`/dashboard/disputes?booking_id=${booking.id}`} className="text-sm text-gray-600 dark:text-gray-400 font-semibold hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Contact Support / Raise Dispute
                  </Link>
                  
                  {(booking.status === 'pending' || booking.status === 'confirmed') && (
                    <form action={cancelBooking}>
                      <input type="hidden" name="booking_id" value={booking.id} />
                      <button type="submit" className="px-4 py-2 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-800/50">
                        Cancel Booking
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-8 flex justify-center items-center space-x-2">
                {page > 1 && (
                  <Link href={`/dashboard?filter=${filter}&sort=${sort}&page=${page - 1}`} className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                  </Link>
                )}
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <Link 
                    key={p} 
                    href={`/dashboard?filter=${filter}&sort=${sort}&page=${p}`} 
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border ${page === p ? 'bg-purple-600 border-purple-600 text-white font-bold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {p}
                  </Link>
                ))}

                {page < totalPages && (
                  <Link href={`/dashboard?filter=${filter}&sort=${sort}&page=${page + 1}`} className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </Link>
                )}
              </div>
            )}

            {/* Footer Summary */}
            <div className="mt-12 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl p-8 text-center border border-purple-100 dark:border-purple-900/30 shadow-sm transition-colors">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Need help with your bookings?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-lg mx-auto">Our customer support team is available 24/7 to assist you with any questions, disputes, or modifications to your reservations.</p>
              <Link href="/dashboard/disputes" className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-500/50 hover:text-purple-700 dark:hover:text-purple-400 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-colors shadow-sm">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Contact Customer Care
              </Link>
            </div>
          </div>
      )}
    </div>
  );
}
