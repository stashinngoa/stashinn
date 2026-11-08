import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { getBookingRules } from '@stashinn/lib/services/bookingRules';
import { bookingCard, TABS, type TabId } from './bookingView';
import BookingsView from './BookingsView';

export default async function Dashboard({ searchParams }: { searchParams: { filter?: string; sort?: string } | Promise<{ filter?: string; sort?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // All of the customer's bookings at once, so switching tabs and sorting happen instantly in the browser
  const [{ data: bookings }, { data: reviews }, rules] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, status, created_at, start_time, end_time, num_bags, booking_type, vehicle_type, vehicle_license_plate, total_amount, checkin_otp, checkout_otp, cancellation_reason, location_id, partner_locations(name, address_line1, address_line2, city, state, pincode, latitude, longitude, photos), payments(method, status, amount, refund_amount)')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(300),
    supabase.from('reviews').select('booking_id').eq('customer_id', user.id),
    getBookingRules(supabase),
  ]);

  // Contacts are only read for bookings the partner has confirmed. Customers can't read partner
  // contacts themselves, so they're looked up here for this customer's own bookings.
  const confirmedLocationIds = [...new Set((bookings || []).filter(b => ['confirmed', 'checked_in', 'checked_out'].includes(b.status)).map(b => b.location_id))];
  const { data: pocs } = confirmedLocationIds.length
    ? await createServiceClient().from('partner_pocs').select('location_id, name, phone, is_primary').in('location_id', confirmedLocationIds)
    : { data: [] as { location_id: string; name: string; phone: string | null; is_primary: boolean | null }[] };
  const contactFor = (locationId: string) => {
    const c = (pocs || []).filter(p => p.location_id === locationId).sort((a, b) => Number(!!b.is_primary) - Number(!!a.is_primary))[0];
    return c ? { name: c.name, phone: c.phone } : null;
  };
  const reviewed = new Set((reviews || []).map(r => r.booking_id));

  const cards = (bookings || []).map(b =>
    bookingCard(b, { contact: contactFor(b.location_id), reviewed: reviewed.has(b.id), cancelWindowHours: rules.cancellationWindowHours }),
  );

  const initialTab = (TABS.find(t => t.id === params.filter)?.id ?? 'all') as TabId;
  const initialSort = params.sort === 'oldest' ? 'oldest' : 'newest';

  return <BookingsView cards={cards} initialTab={initialTab} initialSort={initialSort} />;
}
