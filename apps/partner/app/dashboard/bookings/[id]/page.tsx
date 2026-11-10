import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { loadJobConfig, partnerResponseSchedule } from '@stashinn/lib/jobs';
import { normalizeVehicleType, vehicleCapacity, vehicleLabel } from '@stashinn/lib/services/bookingAvailability';
import Icon, { type IconName } from '../../../../components/Icon';
import OTPTerminal from '../OTPTerminal';
import RespondButtons from '../RespondButtons';
import { PAYMENT_METHOD, TONE, VEHICLE, durationLabel, fmtDateTime, inr, itemsLabel, ref, statusOf, whenLabel } from '../bookingShared';
import { partnerShare } from '../bookingQuery';
import { collectionLabel } from '@stashinn/lib/services/dropoffPayment';
import { isClaimable } from '../../damage/damageShared';

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{children}</dd>
    </div>
  );
}

function Section({ title, icon, children, right }: { title: string; icon: IconName; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className={`${card} overflow-hidden`}>
      <div className="px-5 py-3.5 flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800">
        <h2 className="flex items-center gap-2 font-extrabold text-gray-900 dark:text-white"><Icon name={icon} className="w-4 h-4 text-gray-400" />{title}</h2>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default async function BookingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, cancellation_code, cancellation_reason, cancelled_by, booking_type, num_bags, vehicle_type, vehicle_make, vehicle_model, vehicle_license_plate, check_in_photos, checkin_otp, checkout_otp, ' +
      'start_time, end_time, actual_checkin, actual_checkout, confirmed_at, created_at, updated_at, total_amount, base_amount, gst_amount, gst_rate, commission_amount, commission_rate, partner_amount, discount_amount, location_id, ' +
      'customer:users!bookings_customer_id_fkey(full_name, email, phone), partner_locations(name, address_line1, city, location_type, max_bags, vehicle_pricing(*)), payments(*)')
    .eq('id', id)
    .eq('partner_id', partner.id)
    .maybeSingle();
  if (!booking) notFound();
  const b = booking as any;

  const now = new Date();
  const st = statusOf(b, now);
  const customer = one(b.customer) as any;
  const loc = one(b.partner_locations) as any;
  const payment = one(b.payments) as any;
  const garage = b.booking_type === 'garage' || loc?.location_type === 'garage';
  const atLocation = payment?.method === 'pay_at_location' || payment?.method === 'upi';
  const active = ['pending', 'confirmed', 'checked_in'].includes(b.status);

  // Space at this location during this booking (the same count the checkout uses)
  const [{ data: overlapping }, jobConfig] = await Promise.all([
    active
      ? supabase.from('bookings').select('num_bags, vehicle_type').eq('location_id', b.location_id).neq('id', b.id)
          .in('status', ['pending', 'confirmed', 'checked_in']).lt('start_time', b.end_time).gt('end_time', b.start_time)
      : Promise.resolve({ data: null }),
    b.status === 'pending' ? loadJobConfig(createServiceClient()).catch(() => null) : Promise.resolve(null),
  ]);
  let capacity: { used: number; mine: number; max: number; unit: string } | null = null;
  if (active && overlapping) {
    if (garage) {
      const type = normalizeVehicleType(b.vehicle_type);
      capacity = {
        used: overlapping.filter((o: any) => type === 'car' ? normalizeVehicleType(o.vehicle_type) !== 'bike' : normalizeVehicleType(o.vehicle_type) === type).length,
        mine: 1,
        max: vehicleCapacity(loc, type),
        unit: type === 'bike' ? 'bike spaces' : type === 'suv' ? 'SUV spaces' : 'car / SUV spaces',
      };
    } else {
      capacity = { used: overlapping.reduce((s: number, o: any) => s + (Number(o.num_bags) || 0), 0), mine: Number(b.num_bags) || 1, max: Number(loc?.max_bags) || 0, unit: 'bag spaces' };
    }
  }
  const deadline = jobConfig ? partnerResponseSchedule(b, jobConfig.settings).cancel : null;

  const timeline: { label: string; at: string | null; done: boolean; tone?: 'red' }[] = [
    { label: 'Requested', at: b.created_at, done: true },
    { label: 'Accepted', at: b.confirmed_at, done: !!b.confirmed_at || ['confirmed', 'checked_in', 'checked_out'].includes(b.status) },
    { label: 'Dropped off', at: b.actual_checkin, done: !!b.actual_checkin },
    { label: 'Picked up', at: b.actual_checkout, done: !!b.actual_checkout },
  ];
  if (b.status === 'cancelled') {
    const reached = timeline.filter(t => t.done);
    timeline.splice(0, timeline.length, ...reached, { label: st.label, at: b.updated_at, done: true, tone: 'red' });
  }

  const share = partnerShare(b);
  const platformCut = Number(b.commission_amount || 0) + Number(b.gst_amount || 0);
  const summary = `${customer?.full_name || 'Customer'} · ${itemsLabel(b)} · ${whenLabel(b.start_time, now)}`;
  const showContact = b.status === 'confirmed' || b.status === 'checked_in';
  const canReportDamage = isClaimable(b, now.getTime());

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-orange-700 dark:hover:text-orange-400">
          <Icon name="back" className="w-4 h-4" /> All bookings
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Booking <span className="font-mono">#{ref(b.id)}</span></h1>
          <span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${TONE[st.tone]}`}>{st.label}</span>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{summary} · booked {whenLabel(b.created_at, now)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* What to do now (first on phones) */}
        <aside className="space-y-6 lg:order-2">
          <section className={`${card} p-5`}>
            {b.status === 'pending' ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Accept or decline</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">The customer is waiting for your answer. Accept only if you’ll have space and be open at both times.</p>
                  {deadline && (
                    <p className={`mt-2 text-sm font-semibold ${deadline - now.getTime() < 3600e3 ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                      {deadline > now.getTime() ? `Please answer by ${whenLabel(new Date(deadline).toISOString(), now)}, or it’s cancelled automatically.` : 'Please answer now: this booking is due to be cancelled automatically.'}
                    </p>
                  )}
                </div>
                <RespondButtons bookingId={b.id} summary={summary} size="lg" />
              </div>
            ) : b.status === 'confirmed' ? (
              <OTPTerminal bookingId={b.id} mode="checkin" garage={garage} codeLength={String(b.checkin_otp || '').length || 6}
                collect={atLocation && payment?.status === 'pending' ? { total: inr(b.total_amount), owe: inr(platformCut), share: inr(share) } : null} />
            ) : b.status === 'checked_in' ? (
              <OTPTerminal bookingId={b.id} mode="checkout" codeLength={String(b.checkout_otp || '').length || 6} overdue={new Date(b.end_time) < now} />
            ) : b.status === 'checked_out' ? (
              <div className="text-center py-2">
                <span className="mx-auto h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><Icon name="check" className="w-6 h-6" /></span>
                <h3 className="mt-3 text-base font-extrabold text-gray-900 dark:text-white">Completed</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Picked up {b.actual_checkout ? whenLabel(b.actual_checkout, now) : ''}. You earn {inr(share)} from this booking.</p>
              </div>
            ) : (
              <div>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">{st.label}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {b.cancellation_code === 'no_show' ? 'Nothing was dropped off before the booking ended.'
                    : b.cancellation_code === 'partner_no_response' ? 'This request wasn’t answered in time, so it was cancelled and the customer refunded.'
                    : b.status === 'disputed' ? 'StashInn is looking into this booking. We’ll contact you if we need anything.'
                    : 'This booking is no longer active.'}
                </p>
                {b.cancellation_reason && <p className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-950/50 border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{b.cancellation_reason}</p>}
              </div>
            )}
          </section>

          <Section title="Customer" icon="users">
            <p className="text-base font-bold text-gray-900 dark:text-white">{customer?.full_name || 'Customer'}</p>
            {showContact ? (
              <div className="mt-3 space-y-2">
                {customer?.phone && (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-400 hover:underline"><Icon name="phone" className="w-4 h-4" />{customer.phone}</a>
                )}
                {customer?.email && (
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-400 hover:underline break-all"><Icon name="mail" className="w-4 h-4 shrink-0" />{customer.email}</a>
                )}
                {!customer?.phone && !customer?.email && <p className="text-sm text-gray-500 dark:text-gray-400">No contact details on file.</p>}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {b.status === 'pending' ? 'Contact details appear once you accept.' : 'Contact details are hidden after a booking ends. For a problem with this booking, contact support@stashinn.in.'}
              </p>
            )}
          </Section>

          {(canReportDamage || active) && (
            <section className={`${card} p-5 text-sm`}>
              <h2 className="font-extrabold text-gray-900 dark:text-white">Need help?</h2>
              <p className="mt-1 text-gray-500 dark:text-gray-400">Problems with this booking? Email <a href={`mailto:support@stashinn.in?subject=Booking%20%23${ref(b.id)}`} className="font-bold text-orange-700 dark:text-orange-400 hover:underline">support@stashinn.in</a> and mention #{ref(b.id)}.</p>
              {canReportDamage && <Link href={`/dashboard/damage?booking=${b.id}`} className="mt-2 inline-flex items-center gap-1.5 font-bold text-orange-700 dark:text-orange-400 hover:underline"><Icon name="alert" className="w-4 h-4" />Report damage or a problem</Link>}
            </section>
          )}
        </aside>

        <div className="lg:col-span-2 lg:order-1 space-y-6">
          <Section title="Booking" icon="ticket">
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <Detail label="Drop-off">{fmtDateTime(b.start_time)}</Detail>
              <Detail label="Pick-up">{fmtDateTime(b.end_time)}</Detail>
              <Detail label="Duration">{durationLabel(new Date(b.end_time).getTime() - new Date(b.start_time).getTime())}</Detail>
              {garage ? (
                <>
                  <Detail label="Vehicle">{[b.vehicle_make, b.vehicle_model].filter(Boolean).join(' ') || VEHICLE[b.vehicle_type] || 'Vehicle'}</Detail>
                  <Detail label="Type">{vehicleLabel(b.vehicle_type)}</Detail>
                  <Detail label="Number plate"><span className="font-mono">{b.vehicle_license_plate || '—'}</span></Detail>
                </>
              ) : (
                <Detail label="Bags"><span className="text-2xl font-black tabular-nums">{b.num_bags}</span></Detail>
              )}
              <Detail label="Location">{loc?.name || '—'}{loc?.city && <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">{loc.city}</span>}</Detail>
              {b.actual_checkin && <Detail label="Dropped off at">{fmtDateTime(b.actual_checkin)}</Detail>}
              {b.actual_checkout && <Detail label="Picked up at">{fmtDateTime(b.actual_checkout)}</Detail>}
            </dl>

            <ol className="mt-6 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-0">
              {timeline.map((t, i) => (
                <li key={t.label} className="flex sm:flex-col sm:flex-1 items-center sm:items-start gap-3 sm:gap-2 min-w-0">
                  <div className="flex items-center sm:w-full">
                    <span className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center ${
                      t.tone === 'red' ? 'bg-red-500 text-white' : t.done ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
                      {t.tone === 'red' ? <Icon name="x" className="w-3.5 h-3.5" /> : t.done ? <Icon name="check" className="w-3.5 h-3.5" /> : <span className="text-[10px] font-black">{i + 1}</span>}
                    </span>
                    {i < timeline.length - 1 && <span className={`hidden sm:block h-0.5 flex-1 mx-2 rounded ${timeline[i + 1]!.done ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-800'}`} />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${t.done ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>{t.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.at ? whenLabel(t.at, now) : t.done ? '' : '—'}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Payment" icon="wallet" right={<span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{PAYMENT_METHOD[payment?.method] || 'Payment'}</span>}>
            <dl className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              <div className="flex justify-between py-2"><dt className="text-gray-500 dark:text-gray-400">Customer pays</dt><dd className="font-semibold text-gray-900 dark:text-white tabular-nums">{inr(b.total_amount)}</dd></div>
              {Number(b.discount_amount) > 0 && <div className="flex justify-between py-2"><dt className="text-gray-500 dark:text-gray-400">Discount</dt><dd className="text-gray-700 dark:text-gray-300 tabular-nums">{inr(b.discount_amount)}</dd></div>}
              {Number(b.gst_amount) > 0 && <div className="flex justify-between py-2"><dt className="text-gray-500 dark:text-gray-400">GST{b.gst_rate ? ` (${Number(b.gst_rate)}%)` : ''}</dt><dd className="text-gray-700 dark:text-gray-300 tabular-nums">− {inr(b.gst_amount)}</dd></div>}
              <div className="flex justify-between py-2"><dt className="text-gray-500 dark:text-gray-400">StashInn commission{b.commission_rate ? ` (${Number(b.commission_rate)}%)` : ''}</dt><dd className="text-gray-700 dark:text-gray-300 tabular-nums">− {inr(b.commission_amount)}</dd></div>
              <div className="flex justify-between py-2.5"><dt className="font-bold text-gray-900 dark:text-white">You earn</dt><dd className={`font-black tabular-nums ${b.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-emerald-700 dark:text-emerald-400'}`}>{inr(share)}</dd></div>
            </dl>
            {b.status !== 'cancelled' && (
              <p className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-950/50 border border-gray-100 dark:border-gray-800 px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                {!atLocation
                  ? 'The customer paid online. Your earnings are paid out to your bank account with the next settlement.'
                  : payment?.collected_via === 'stashinn_qr'
                    ? `Paid on the StashInn QR${payment.collected_at ? ` on ${fmtDateTime(payment.collected_at)}` : ''}. ${payment.status === 'paid' ? `StashInn confirmed it and pays you ${inr(share)} with your next payout.` : `StashInn is confirming the payment; then it pays you ${inr(share)}.`}`
                    : payment?.collected_via
                      ? `Paid to you (${collectionLabel(payment.collected_via)?.toLowerCase()}) on ${fmtDateTime(payment.collected_at)}. You owe StashInn ${inr(platformCut)} (commission and GST)${b.status === 'checked_out' ? '; settle it from Settlements.' : ' after pick-up.'}`
                      : `The customer pays ${inr(b.total_amount)} at drop-off. If they pay you, you owe StashInn ${inr(platformCut)} (commission and GST); if they use the StashInn QR, StashInn pays you ${inr(share)}.`}
              </p>
            )}
            {Number(payment?.refund_amount) > 0 && <p className="mt-2 text-xs font-semibold text-sky-700 dark:text-sky-400">{inr(payment.refund_amount)} was refunded to the customer.</p>}
          </Section>

          {capacity && capacity.max > 0 && (
            <Section title="Space at this location" icon="building">
              {(() => {
                const total = capacity.used + capacity.mine;
                const over = total > capacity.max;
                const pct = Math.min(100, (total / capacity.max) * 100);
                return (
                  <>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      During this booking, <span className="font-bold tabular-nums">{total} of {capacity.max}</span> {capacity.unit} are booked, including this one
                      {capacity.used ? ` (${capacity.used} by other bookings)` : ''}.
                    </p>
                    <div className="mt-3 h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div className={`h-full rounded-full ${over ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    {over && <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">That’s more than your listed capacity. Update it in Locations if you have more space.</p>}
                  </>
                );
              })()}
            </Section>
          )}

          {garage && (b.check_in_photos?.length || 0) > 0 && (
            <Section title="Vehicle photos" icon="photo">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {b.check_in_photos.map((url: string, i: number) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="block aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Vehicle photo ${i + 1}`} className="h-full w-full object-cover hover:scale-105 transition-transform" />
                  </a>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
