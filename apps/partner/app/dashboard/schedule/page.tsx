import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import CalendarView from './CalendarView';

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: partner } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!partner) redirect('/onboarding');

  // Fetch all bookings that are active or upcoming (we fetch a wide range to populate the calendar)
  // For V1, we'll fetch all bookings and filter them client-side by month to keep it simple,
  // or just fetch bookings from the start of the current month minus a bit.
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, start_time, end_time, num_bags, status, location_id, partner_locations(name), users(full_name)')
    .eq('partner_id', partner.id)
    .in('status', ['pending', 'confirmed', 'checked_in'])
    .order('start_time', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Schedule & Capacity</h1>
        <p className="text-gray-500 text-sm">View upcoming bags across your locations</p>
      </div>

      <CalendarView bookings={bookings || []} />
    </div>
  );
}
