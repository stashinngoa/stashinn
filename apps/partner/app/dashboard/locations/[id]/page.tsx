import { createClient } from '@stashinn/lib/supabase/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Icon, { type IconName } from '../../../../components/Icon';
import { capacitySummary, fmtTime12, hoursOpen, inr, locationStatus, vehiclePricing } from '../locationUi';
import { getGstPercent, gstPercentFor, priceIncGst } from '@stashinn/lib/services/bookingAvailability';
import PauseBookings from '../PauseBookings';
import { activePause } from '../pauseReasons';

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';
const label = 'text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400';

function Fact({ icon, title, value, sub }: { icon: IconName; title: string; value: string; sub?: string }) {
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><Icon name={icon} className="w-4 h-4" /><span className={label}>{title}</span></div>
      <p className="mt-1.5 font-extrabold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function LocationDetailsPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await props.params;
  const { saved } = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: partner } = await supabase.from('partners').select('id, gst_applicable').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');

  const { data: loc } = await supabase
    .from('partner_locations')
    .select('*, vehicle_pricing(*)')
    .eq('id', id)
    .eq('partner_id', partner.id)
    .maybeSingle();
  if (!loc) notFound();

  const [{ data: pocs }, { data: pauses }] = await Promise.all([
    supabase.from('partner_pocs').select('name, phone, email, is_verified, is_primary').eq('location_id', loc.id),
    supabase.from('location_pauses').select('id, starts_at, ends_at, reason, details').eq('location_id', loc.id).is('cancelled_at', null).gt('ends_at', new Date().toISOString()).order('starts_at'),
  ]);
  const pausedNow = activePause(pauses);
  const gstPercent = gstPercentFor(await getGstPercent(supabase), partner);
  const isPrimary = (pocs || []).some(p => p.is_primary);
  const contact = pocs?.[0];

  const st = locationStatus(loc.admin_status);
  const garage = loc.location_type === 'garage';
  const vp = vehiclePricing(loc);
  const hours = hoursOpen(loc.operating_hours);
  const perHour = (hourly: any) => (hourly != null && hourly !== '' ? priceIncGst(Number(hourly), gstPercent) : null);
  const perDay = (hourly: any) => (hours && perHour(hourly) != null ? inr(perHour(hourly)! * hours) : '—');
  const needsChanges = (loc.admin_status === 'update_required' || loc.admin_status === 'rejected') && loc.status_reason;
  const photos: string[] = loc.photos || [];
  const amenities: string[] = [
    ...(loc.amenities || []),
    ...(loc.has_cctv ? ['CCTV'] : []), ...(loc.has_security_guard ? ['Security guard'] : []),
    ...(loc.has_ev_charging ? ['EV charging'] : []), ...(loc.has_lockable_gate ? ['Lockable gate'] : []),
  ];
  const rates: [string, any][] = garage
    ? [['Bike / scooter', vp.bike_rate_hr], ['Car or SUV', vp.sedan_rate_hr]] // SUVs pay the car rate
    : [['Per bag', loc.price_per_hour]];

  return (
    <div className="space-y-6">
      <Link href="/dashboard/locations" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400">
        <Icon name="back" className="w-4 h-4" /> Locations
      </Link>

      {saved && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          <Icon name="check" className="w-4 h-4" />
          {saved === 'new'
            ? 'Location added. StashInn will review it before customers can book it.'
            : `Changes saved.${loc.admin_status === 'pending' ? ' StashInn will review them shortly.' : ''}`}
        </div>
      )}

      {/* Header */}
      <section className={`${card} overflow-hidden`}>
        <div className="relative h-56 md:h-72 bg-gray-100 dark:bg-gray-800">
          {photos.length ? (
            <img src={photos[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-gray-800 dark:to-gray-900 text-orange-400 dark:text-gray-500">
              <Icon name={garage ? 'car' : 'bag'} className="w-12 h-12" />
              <span className="text-xs font-bold uppercase tracking-wider">No photos yet</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold ${st.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-200">
                  <Icon name={garage ? 'car' : 'bag'} className="w-3.5 h-3.5" />{garage ? 'Vehicle parking' : 'Luggage storage'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/90 dark:bg-gray-900/90 text-orange-700 dark:text-orange-400">{isPrimary ? 'Primary' : 'Additional'}</span>
                {pausedNow && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-400 text-amber-950">
                    <Icon name="clock" className="w-3.5 h-3.5" />Bookings paused
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-2xl md:text-3xl font-extrabold text-white drop-shadow truncate">{loc.name}</h1>
              <p className="text-sm text-white/85 truncate">{[loc.address_line1, loc.city, loc.pincode].filter(Boolean).join(', ')}</p>
            </div>
            <Link href={`/dashboard/locations/${loc.id}/edit`} className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-lg transition-colors">
              <Icon name="pencil" className="w-4 h-4" /> Edit location
            </Link>
          </div>
        </div>
        {!needsChanges && <p className="px-5 md:px-6 py-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">{st.hint}</p>}
      </section>

      {needsChanges && (
        <section className="rounded-2xl border border-sky-300 dark:border-sky-700/60 bg-sky-50 dark:bg-sky-950/30 p-5 flex flex-col sm:flex-row gap-4 sm:items-start">
          <span className="h-10 w-10 shrink-0 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 flex items-center justify-center"><Icon name="info" /></span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sky-900 dark:text-sky-200">{loc.admin_status === 'rejected' ? 'StashInn couldn\'t approve this location' : 'StashInn asked for a few changes'}</p>
            <p className="mt-1 text-sm text-sky-900/90 dark:text-sky-100/90 whitespace-pre-line">{loc.status_reason}</p>
            <p className="mt-2 text-xs text-sky-800/80 dark:text-sky-300/80">Saving your changes sends the location back for review and clears this note.</p>
          </div>
          <Link href={`/dashboard/locations/${loc.id}/edit`} className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold">
            <Icon name="pencil" className="w-4 h-4" /> Update details
          </Link>
        </section>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Fact icon={garage ? 'car' : 'bag'} title="Capacity" value={garage ? `${(vp.bike_capacity ?? 0) + (vp.sedan_capacity ?? 0) + (vp.suv_capacity ?? 0)} slots` : `${loc.max_bags} bags`} sub={garage ? capacitySummary(loc) : undefined} />
        <Fact icon="clock" title="Opening hours" value={`${fmtTime12(loc.operating_hours?.open)} – ${fmtTime12(loc.operating_hours?.close)}`} sub={hours ? `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hours a day` : undefined} />
        <Fact icon="users" title="Contact" value={contact?.name || 'Not assigned'} sub={contact ? `${contact.phone} · ${contact.is_verified ? 'Verified' : 'Not verified yet'}` : 'Assign one in Edit'} />
        <Fact icon="photo" title="Photos" value={String(photos.length)} sub={photos.length < 3 ? 'Add a few more to stand out' : 'Looking good'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          {photos.length > 1 && (
            <section className={`${card} p-5`}>
              <h2 className="font-extrabold text-gray-900 dark:text-white mb-3">Photos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((src, i) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer" className="block aspect-[4/3] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                    <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover hover:scale-105 transition-transform" />
                  </a>
                ))}
              </div>
            </section>
          )}

          <section className={`${card} overflow-hidden`}>
            <div className="p-5">
              <h2 className="font-extrabold text-gray-900 dark:text-white">Address</h2>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                {[loc.address_line1, loc.address_line2].filter(Boolean).join(', ')}<br />
                {loc.city}, {loc.state} {loc.pincode}
              </p>
            </div>
            <div className="h-64 bg-gray-100 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-800">
              <iframe title="Location map" width="100%" height="100%" style={{ border: 0 }} loading="lazy" src={`https://maps.google.com/maps?q=${loc.latitude},${loc.longitude}&z=16&output=embed`} />
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <PauseBookings locationId={loc.id} pauses={pauses || []} />

          <section className={`${card} p-5`}>
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-gray-900 dark:text-white">Customer rates</h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-gray-400"><Icon name="lock" className="w-3.5 h-3.5" />Set by StashInn</span>
            </div>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="pb-1.5 font-bold">{garage ? 'Vehicle' : 'Storage'}</th>
                  <th className="pb-1.5 font-bold text-right">Hour</th>
                  <th className="pb-1.5 font-bold text-right">Day{hours ? ` (${Number.isInteger(hours) ? hours : hours.toFixed(1)} h)` : ''}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rates.map(([name, hourly]) => (
                  <tr key={name}>
                    <td className="py-2 text-gray-700 dark:text-gray-300">{name}</td>
                    <td className="py-2 text-right font-bold text-gray-900 dark:text-white tabular-nums">{inr(perHour(hourly))}</td>
                    <td className="py-2 text-right text-gray-600 dark:text-gray-400 tabular-nums">{perDay(hourly)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{rates.every(([, hourly]) => perHour(hourly) == null)
                ? 'StashInn sets your rates during review, before this location goes live.'
                : <>What customers pay{gstPercent > 0 ? `, including ${gstPercent}% GST` : ''}. Rates depend on your location&apos;s amenities and access. Contact support if you think they should change.</>}</p>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="font-extrabold text-gray-900 dark:text-white">Amenities</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {amenities.length ? amenities.map(a => (
                <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  <Icon name="check" className="w-3 h-3 text-emerald-500" />{a}
                </span>
              )) : <p className="text-sm text-gray-500 dark:text-gray-400">None listed. Adding amenities like CCTV helps customers choose you.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
