import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import Icon from '../../../../../components/Icon';
import CheckInForm from './CheckInForm';
import { inr, itemsLabel, ref, whenLabel } from '../../bookingShared';
import { partnerShare } from '../../bookingQuery';
import { platformDue } from '@stashinn/lib/services/bookingAvailability';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PartnerCheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, booking_type, num_bags, vehicle_type, vehicle_make, vehicle_model, vehicle_license_plate, check_in_photos, checkin_otp, start_time, total_amount, customer:users!bookings_customer_id_fkey(full_name), commission_amount, gst_amount, partner_amount, base_amount, payments(*), partner_locations(location_type)')
    .eq('id', id)
    .eq('partner_id', partner.id)
    .maybeSingle();
  if (!booking) notFound();
  const b = booking as any;
  const garage = b.booking_type === 'garage' || (Array.isArray(b.partner_locations) ? b.partner_locations[0] : b.partner_locations)?.location_type === 'garage';
  if (b.status !== 'confirmed' || !garage) redirect(`/dashboard/bookings/${b.id}`);

  const customer = Array.isArray(b.customer) ? b.customer[0] : b.customer;
  const payment = Array.isArray(b.payments) ? b.payments[0] : b.payments;
  const atLocation = payment?.method === 'pay_at_location' || payment?.method === 'upi';

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <Link href={`/dashboard/bookings/${b.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-orange-700 dark:hover:text-orange-400">
          <Icon name="back" className="w-4 h-4" /> Booking #{ref(b.id)}
        </Link>
        <h1 className="mt-2 text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Vehicle check-in</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{customer?.full_name || 'Customer'} · {itemsLabel(b)} · {whenLabel(b.start_time)}</p>
      </div>
      <CheckInForm bookingId={b.id} existingPhotos={(b.check_in_photos || []).length} codeLength={String(b.checkin_otp || '').length || 6}
        collect={atLocation && payment?.status === 'pending' ? { total: inr(b.total_amount), owe: inr(platformDue(b)), share: inr(partnerShare(b)) } : null} />
    </div>
  );
}
