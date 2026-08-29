import { createClient } from '@stashinn/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import CheckInForm from './CheckInForm';

export default async function PartnerCheckInPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, partner_locations(location_type)')
    .eq('id', resolvedParams.id)
    .single();

  if (!booking) {
    notFound();
  }

  // Ensure only confirmed or checked_in bookings can be accessed here
  if (booking.status !== 'confirmed' && booking.status !== 'checked_in') {
    redirect(`/dashboard/bookings/${booking.id}`);
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Check-In Vehicle</h1>
        <p className="text-gray-500 mt-1">Verify OTP and upload condition photos for booking {booking.id.split('-')[0]}.</p>
      </div>

      <CheckInForm booking={booking} />
    </div>
  );
}
