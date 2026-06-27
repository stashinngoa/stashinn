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
    .select('*, partner_locations(name, address_line1, city), users(email, full_name)')
    .eq('id', resolvedParams.id)
    .eq('partner_id', partner?.id)
    .single();

  if (!booking) notFound();

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
        </div>

        <div className="lg:col-span-1">
          <OTPTerminal booking={booking} />
        </div>
      </div>
    </div>
  );
}
