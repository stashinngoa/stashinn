import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { getBookingRules } from '@stashinn/lib/services/bookingRules';
import { getAmenities } from '@stashinn/lib/services/amenities';
import { getGstPercent, gstPercentFor, normalizeVehicleType, vehicleLabel } from '@stashinn/lib/services/bookingAvailability';
import { loadLegal } from '@stashinn/lib/services/legal';
import ThemeToggle from '../../../components/ThemeToggle';
import { publicLocation } from '../../../lib/locationPrivacy';
import BookingSidebar from './BookingSidebar';
import PhotoGallery from './PhotoGallery';
import ReviewsSection, { Stars, type PublicReview } from './ReviewsSection';

type Search = { in?: string; out?: string; bags?: string; vehicleType?: string; error?: string; msg?: string; q?: string; lat?: string; lon?: string; mode?: string };

const TRANSIT_LABEL: Record<string, string> = { under_1km: 'Under 1 km', '1_to_3km': '1–3 km', over_3km: 'Over 3 km' };
const fmt12 = (t?: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${((h! + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h! < 12 ? 'AM' : 'PM'}`;
};

const ICON = {
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  box: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  car: 'M5 13l1.5-4.5A2 2 0 018.4 7h7.2a2 2 0 011.9 1.5L19 13M5 13h14M5 13a2 2 0 00-2 2v2h18v-2a2 2 0 00-2-2M7 17v2m10-2v2',
  transit: 'M8 7h8m-8 4h8M6 3h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2zm1 14l-2 4m12-4l2 4',
  refund: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  check: 'M5 13l4 4L19 7',
  pin: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  qr: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z',
  id: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  ban: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
};
const Icon = ({ d, className = 'w-5 h-5' }: { d: string; className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>
);

export default async function LocationDetailsPage({ params, searchParams }: {
  params: { id: string } | Promise<{ id: string }>;
  searchParams: Search | Promise<Search>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const supabase = await createClient();
  const service = createServiceClient();

  const [{ data: { user } }, { data: location }, bookingRules, systemGst, amenityCatalog, { data: pauses }, legal, { data: reviewRows }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('partner_locations').select('*, partners(business_name, gst_applicable, avg_rating), vehicle_pricing(*)').eq('id', id).single(),
    // system_config is only readable when signed in, so read the public booking rules server-side
    getBookingRules(service),
    getGstPercent(service),
    getAmenities(supabase),
    // Upcoming booking pauses (times only; the partner's reason stays private)
    service.from('location_pauses').select('starts_at, ends_at').eq('location_id', id).is('cancelled_at', null).gt('ends_at', new Date().toISOString()).order('starts_at'),
    // StashGuard limits come from the business details on Admin → Configuration → Legal documents
    loadLegal(service),
    // This location's reviews. Reviewer names are private, so they're read here and shortened to
    // "First L."; nothing else about the customer is sent to the page. (* picks up tags once they exist.)
    service.from('reviews').select('*, users!reviews_customer_id_fkey(full_name), bookings(booking_type, num_bags, vehicle_make, vehicle_model)')
      .eq('location_id', id).order('created_at', { ascending: false }).limit(500),
  ]);
  if (!location) notFound();

  // Before booking only the area is shown: the street address and PIN code stay on the server
  const pub = publicLocation(location);
  const gstPercent = gstPercentFor(systemGst, location.partners);
  const isGarage = location.location_type === 'garage';
  const vehicleType = normalizeVehicleType(search.vehicleType);
  const label = isGarage ? vehicleLabel(vehicleType) : 'Luggage Storage';
  const reviews: PublicReview[] = (reviewRows || []).map((r: any) => {
    const u = Array.isArray(r.users) ? r.users[0] : r.users;
    const b = Array.isArray(r.bookings) ? r.bookings[0] : r.bookings;
    const parts = String(u?.full_name || '').trim().split(/\s+/).filter(Boolean);
    const name = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.` : parts[0] || 'StashInn guest';
    const stay = b?.booking_type === 'garage'
      ? ([b.vehicle_make, b.vehicle_model].filter(Boolean).join(' ') || 'Vehicle parked')
      : `Stored ${Number(b?.num_bags) || 1} bag${Number(b?.num_bags) === 1 || !b?.num_bags ? '' : 's'}`;
    return {
      id: r.id,
      rating: r.rating,
      comment: (r.comment || '').trim(),
      tags: Array.isArray(r.tags) ? r.tags : [],
      name,
      stay,
      when: new Date(r.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
      at: Date.parse(r.created_at),
    };
  });
  // This location's own rating (the partner's average covers all their locations)
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const rating = reviews.length ? avgRating.toFixed(1) : null;
  const hours = location.operating_hours || { open: '08:00', close: '22:00' };
  const vp = (Array.isArray(location.vehicle_pricing) ? location.vehicle_pricing[0] : location.vehicle_pricing) || {};
  const host = location.partners?.business_name || 'StashInn partner';

  // Amenities stored as labels (or keys), plus the built-in parking ones kept in columns
  const labelFor = (v: string) => amenityCatalog.find(a => a.key === v || a.label === v)?.label ?? v;
  const amenities = [
    ...amenityCatalog.filter(a => a.column && location[a.column]).map(a => a.label),
    ...((location.amenities as string[] | null) || []).map(labelFor),
  ].filter((v, i, all) => all.indexOf(v) === i);

  // Back to the same search (dates, bags, filters)
  const back = new URLSearchParams(Object.entries(search).filter(([k, v]) => typeof v === 'string' && v && !['error', 'msg'].includes(k)) as [string, string][]);
  const backHref = `/search${back.toString() ? `?${back.toString()}` : ''}`;

  const facts = [
    { icon: ICON.clock, title: `${fmt12(hours.open)} – ${fmt12(hours.close)}`, sub: 'Open every day' },
    isGarage
      ? {
          icon: ICON.car,
          title: [vp.bike_capacity && `${vp.bike_capacity} bike`, vp.sedan_capacity && `${vp.sedan_capacity} car`, vp.suv_capacity && `${vp.suv_capacity} SUV`].filter(Boolean).join(' · ') || 'Vehicle parking',
          sub: 'Parking spaces',
        }
      : { icon: ICON.box, title: `Up to ${location.max_bags || 0} bags`, sub: 'Storage capacity' },
    ...(location.transit_proximity && TRANSIT_LABEL[location.transit_proximity]
      ? [{ icon: ICON.transit, title: TRANSIT_LABEL[location.transit_proximity]!, sub: 'From public transport' }]
      : []),
    { icon: ICON.refund, title: 'Free cancellation', sub: `Up to ${bookingRules.cancellationWindowHours} hours before drop-off` },
  ];

  const rupees = (v?: string) => {
    const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
    return n > 0 ? `₹${n.toLocaleString('en-IN')}` : null;
  };
  const guardBooking = rupees(legal.details.stashguard_max_booking);
  const guardItem = rupees(legal.details.stashguard_max_item);

  const card = 'rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8';
  const h2 = 'text-lg font-extrabold text-gray-900 dark:text-white';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-inter">
      <header className="h-16 sticky top-0 z-50 flex items-center gap-3 px-4 md:px-6 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="StashInn home">
          <img src="/StashInn_Light_no_text.png" alt="" className="h-8 w-auto dark:hidden" />
          <img src="/StashInn_Dark_no_text.png" alt="" className="h-8 w-auto hidden dark:block" />
          <span className="hidden sm:inline text-xl font-black tracking-tighter">
            <span className="text-gray-900 dark:text-white">Stash</span><span className="text-orange-500">Inn</span>
          </span>
        </Link>
        <Link href={backHref} className="ml-2 sm:ml-4 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          <span className="hidden sm:inline">Back to results</span><span className="sm:hidden">Back</span>
        </Link>
        <nav className="ml-auto flex items-center gap-2 md:gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/dashboard" className="hidden md:inline-flex items-center h-10 px-4 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:border-orange-300 dark:hover:border-orange-600/60">My bookings</Link>
              <Link href="/dashboard/profile" title="Profile" className="w-10 h-10 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center">
                {user.user_metadata?.full_name ? user.user_metadata.full_name.charAt(0).toUpperCase() : 'U'}
              </Link>
            </>
          ) : (
            <Link href="/login" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold">Sign in</Link>
          )}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {search.error === 'unavailable' && search.msg && (
          <div role="alert" className="mb-6 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-800 dark:text-red-300">
            {search.msg}
          </div>
        )}

        {/* Title */}
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 text-xs font-bold text-orange-700 dark:text-orange-400">
              <Icon d={isGarage ? ICON.car : ICON.box} className="w-3.5 h-3.5" />
              {isGarage ? 'Vehicle parking' : 'Luggage storage'}
            </span>
            <a href="#stashguard" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-500">
              <Icon d={ICON.shield} className="w-3.5 h-3.5" /> StashGuard protected
            </a>
            {rating ? (
              <a href="#reviews" className="inline-flex items-center gap-1 text-sm font-bold text-gray-800 dark:text-gray-100 hover:underline underline-offset-2">
                <span className="text-amber-500">★</span>{rating}
                <span className="font-semibold text-gray-500 dark:text-gray-400">· {reviews.length} review{reviews.length === 1 ? '' : 's'}</span>
              </a>
            ) : (
              <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">New on StashInn</span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">{location.name}</h1>
          <p className="mt-1.5 flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-400">
            <Icon d={ICON.pin} className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
            {pub.area} <span className="text-gray-400 dark:text-gray-500">· exact address shared after booking</span>
          </p>
        </div>

        <PhotoGallery photos={location.photos || []} name={location.name} />

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start">
          <div className="space-y-6 min-w-0">
            {/* Host + key facts */}
            <section className={card}>
              <div className="flex items-center gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
                <span className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-white text-lg font-black flex items-center justify-center">
                  {host.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">Hosted by {host}</p>
                  <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <Icon d={ICON.shield} className="w-3.5 h-3.5" /> Verified StashInn partner
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Contact details shared after booking</p>
                </div>
              </div>
              <dl className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                {facts.map(f => (
                  <div key={f.sub} className="flex gap-3">
                    <span className="w-10 h-10 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center"><Icon d={f.icon} /></span>
                    <div className="min-w-0">
                      <dt className="text-sm font-bold text-gray-900 dark:text-white">{f.title}</dt>
                      <dd className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{f.sub}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </section>

            <section className={card}>
              <h2 className={h2}>About this place</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
                {isGarage
                  ? `Park your bike or car at ${location.name} in ${location.city} and explore without worrying about street parking. The space is checked by StashInn before it goes live, and every booking is confirmed at check-in.`
                  : `Leave your bags at ${location.name} in ${location.city} and enjoy the day hands-free. The storage area is checked by StashInn before it goes live, and your bags are checked in and out with your booking.`}
              </p>
            </section>

            <section className={card}>
              <h2 className={h2}>What this place offers</h2>
              {amenities.length ? (
                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {amenities.map(a => (
                    <li key={a} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 px-3.5 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                      <span className="w-7 h-7 shrink-0 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center"><Icon d={ICON.check} className="w-4 h-4" /></span>
                      {a}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Secure {isGarage ? 'parking' : 'storage'} checked by StashInn. The partner hasn&apos;t listed extra amenities yet.</p>
              )}
            </section>

            {/* StashGuard (Customer Terms & Conditions, section 6) */}
            <section id="reviews" className={`${card} scroll-mt-24`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className={h2}>Reviews</h2>
                {reviews.length > 0 && <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100"><Stars n={avgRating} />{rating}</span>}
              </div>
              {reviews.length > 0 ? (
                <ReviewsSection reviews={reviews} />
              ) : (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No reviews yet. This location is new on StashInn, and every booking is protected by StashGuard. Guests can review after they pick up.</p>
              )}
            </section>

            <section id="stashguard" className="scroll-mt-24 rounded-3xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-gray-900 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <StashGuardStamp />
                <div className="min-w-0">
                  <h2 className={h2}>Protected by StashGuard</h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Free with every booking you make and pay for on StashInn. If your {isGarage ? 'vehicle is' : 'bags are'} lost or damaged while this partner has {isGarage ? 'it' : 'them'}, StashInn covers {guardBooking ? <>up to <strong className="text-gray-900 dark:text-white">{guardBooking}</strong> per booking{guardItem ? <> and <strong className="text-gray-900 dark:text-white">{guardItem}</strong> per {isGarage ? 'item' : 'bag'}</> : ''}</> : 'the loss, within the StashGuard limits'}.
                  </p>
                </div>
              </div>
              <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  'Book and pay through StashInn, not in cash to the partner',
                  `${isGarage ? 'Park' : 'Drop off'} within your booked time and get checked in`,
                  'Report a problem before you leave, then claim within 48 hours',
                  'Not covered: cash, jewellery, documents, electronics and prohibited items',
                ].map(t => (
                  <li key={t} className="flex gap-2.5 text-gray-700 dark:text-gray-300">
                    <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center"><Icon d={ICON.check} className="w-3 h-3" /></span>
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                StashGuard is StashInn&apos;s own guarantee, not an insurance policy. Claims are assessed by StashInn.{' '}
                <a href="/terms#6-stashguard" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 dark:text-emerald-400 underline underline-offset-2">Read the StashGuard terms</a>
              </p>
            </section>

            <section className={card}>
              <h2 className={h2}>Where you&apos;ll be</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{pub.area}</p>
              <div className="mt-4 h-72 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
                <iframe
                  title={`Map of ${location.name}`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${location.latitude},${location.longitude}&z=15&output=embed`}
                  allowFullScreen
                />
              </div>
              <div className="mt-4 flex gap-3 rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30 px-4 py-3">
                <span className="mt-0.5 text-orange-600 dark:text-orange-400"><Icon d={ICON.lock} /></span>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-bold text-gray-900 dark:text-white">Exact address shared after booking.</span>{' '}
                  Once you book, you&apos;ll find the full address and the partner&apos;s contact details under My bookings.
                </p>
              </div>
            </section>

            <section className={card}>
              <h2 className={h2}>Good to know</h2>
              <ul className="mt-4 space-y-4">
                {[
                  { icon: ICON.qr, title: 'Show your booking at drop-off', text: 'Your booking reference or QR code is checked when you drop off and pick up.' },
                  { icon: ICON.id, title: 'Carry a photo ID', text: 'The partner may ask to see a government photo ID.' },
                  { icon: ICON.ban, title: 'Some items can’t be stored', text: 'No cash, valuables, documents, perishables, or anything dangerous or illegal.' },
                  { icon: ICON.refund, title: 'Cancellation', text: `Cancel at least ${bookingRules.cancellationWindowHours} hours before drop-off for a full refund.` },
                ].map(g => (
                  <li key={g.title} className="flex gap-3">
                    <span className="w-9 h-9 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center"><Icon d={g.icon} className="w-[18px] h-[18px]" /></span>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{g.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{g.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link href="/safety" className="mt-5 inline-block text-sm font-semibold text-orange-700 dark:text-orange-400 hover:underline">Safety and storage rules</Link>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 order-first lg:order-none">
            <BookingSidebar
              location={pub}
              initialSearch={search}
              isGarage={isGarage}
              vehicleType={vehicleType}
              label={label}
              rules={bookingRules}
              pauses={pauses || []}
              gstPercent={gstPercent}
            />
            <a href="#stashguard" className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 hover:border-emerald-300 dark:hover:border-emerald-800">
              <StashGuardStamp size="sm" />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-gray-900 dark:text-white">Protected by StashGuard</span>
                <span className="block text-xs text-gray-600 dark:text-gray-400">{guardBooking ? `Loss and damage cover up to ${guardBooking}` : 'Loss and damage cover'}, free with this booking</span>
              </span>
            </a>
          </aside>
        </div>
      </main>
    </div>
  );
}

/** The StashGuard seal: a shield inside a ringed badge. */
function StashGuardStamp({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'w-10 h-10' : 'w-14 h-14';
  return (
    <span className={`${box} shrink-0 rounded-full bg-emerald-600 ring-4 ring-emerald-100 dark:ring-emerald-900/60 text-white flex items-center justify-center shadow-md shadow-emerald-600/30`} aria-hidden="true">
      <svg className={size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
      </svg>
    </span>
  );
}
