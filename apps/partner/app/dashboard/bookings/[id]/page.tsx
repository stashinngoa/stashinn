import { createClient } from '@stashinn/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import OTPTerminal from '../OTPTerminal';

export default async function BookingDetailsPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user.id).single();

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, partner_locations(name, address_line1, city, max_bags), users(email, full_name)')
    .eq('id', resolvedParams.id)
    .eq('partner_id', partner?.id)
    .single();

  if (!booking) notFound();

  // Calculate current capacity for this specific location
  const { data: activeBookings } = await supabase
    .from('bookings')
    .select('num_bags')
    .eq('location_id', booking.location_id)
    .eq('status', 'checked_in');

  const currentlyBooked = activeBookings?.reduce((sum, b) => sum + b.num_bags, 0) || 0;
  const maxCapacity = booking.partner_locations?.max_bags || 0;
  const availableSlots = Math.max(0, maxCapacity - currentlyBooked);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Manage Booking</h1>
        <a href="/dashboard/bookings" className="text-sm font-semibold text-purple-600 hover:text-purple-800">
          &larr; Back to all Bookings
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Customer Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase">Name</span>
                <span className="font-semibold text-gray-900">{booking.users?.full_name || 'Customer'}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase">Email</span>
                <span className="font-medium text-gray-600">{booking.users?.email}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Storage Details</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Drop off Time</span>
                <span className="font-semibold text-gray-900">{new Date(booking.start_time).toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Pick up Time</span>
                <span className="font-semibold text-gray-900">{new Date(booking.end_time).toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Bags</span>
                <span className="text-2xl font-black text-gray-900">{booking.num_bags}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Location</span>
                <span className="font-semibold text-gray-900">{booking.partner_locations?.name}</span>
                <span className="block text-sm text-gray-500">{booking.partner_locations?.city}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Location Capacity Status</h2>
            <div className="grid grid-cols-3 gap-4 text-center divide-x divide-gray-100">
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Max Capacity</span>
                <span className="text-2xl font-black text-gray-900">{maxCapacity}</span>
                <span className="block text-xs text-gray-400 mt-1">Bags total</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-purple-600 uppercase mb-1">Currently Booked</span>
                <span className="text-2xl font-black text-purple-600">{currentlyBooked}</span>
                <span className="block text-xs text-gray-400 mt-1">Checked-in bags</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-green-600 uppercase mb-1">Available Slots</span>
                <span className="text-2xl font-black text-green-600">{availableSlots}</span>
                <span className="block text-xs text-gray-400 mt-1">Bags left</span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-6 w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-2.5 rounded-full ${availableSlots <= 2 ? 'bg-red-500' : 'bg-purple-600'}`}
                style={{ width: `${Math.min(100, maxCapacity > 0 ? (currentlyBooked / maxCapacity) * 100 : 0)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <OTPTerminal booking={booking} />
        </div>
      </div>
    </div>
  );
}
