import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { checkAvailability, parseIndiaTime, vehicleLabel } from '@stashinn/lib/services/bookingAvailability';
import { loadLegal } from '@stashinn/lib/services/legal';
import ThemeToggle from '../../components/ThemeToggle';
import CheckoutClientForm from './CheckoutClientForm';
import { publicLocation } from '../../lib/locationPrivacy';

type Params = { location_id?: string; in?: string; out?: string; bags?: string; price?: string; mode?: string; vehicleType?: string };

/**
 * "Sun, 8 Nov" and "11:00 am" from the URL's local time ("2026-11-08T11:00"). Read as written
 * (via UTC) so the server's own time zone can't shift it.
 */
const fmtWhen = (local?: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local || '');
  if (!m) return { day: '—', time: '' };
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!));
  return {
    day: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }),
    time: d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }),
  };
};

export default async function CheckoutPage({ searchParams }: { searchParams: Params | Promise<Params> }) {
  const resolvedParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userProfile = null;
  if (user) {
    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
    userProfile = profile;
  }

  if (!resolvedParams.location_id) redirect('/search');

  const { data: location } = await supabase
    .from('partner_locations')
    .select('*, partners(id, business_name)')
    .eq('id', resolvedParams.location_id)
    .single();
  if (!location) redirect('/search');

  // Price, capacity and pauses are checked on the server; the URL never sets the price
  const mode = resolvedParams.mode === 'garage' ? 'garage' : 'luggage';
  const bags = Math.max(1, parseInt(resolvedParams.bags || '1') || 1);
  const service = createServiceClient();
  const [check, legal] = await Promise.all([
    checkAvailability(service, {
      locationId: location.id,
      mode,
      vehicleType: resolvedParams.vehicleType,
      bags,
      start: parseIndiaTime(resolvedParams.in),
      end: parseIndiaTime(resolvedParams.out),
    }),
    loadLegal(service),
  ]);

  const pub = publicLocation(location);
  const dropOff = fmtWhen(resolvedParams.in);
  const pickUp = fmtWhen(resolvedParams.out);
  const what = mode === 'garage' ? `1 × ${vehicleLabel(check.ok ? check.vehicleType : resolvedParams.vehicleType)}` : `${bags} bag${bags === 1 ? '' : 's'}`;
  const guardLimit = Number(String(legal.details.stashguard_max_booking || '').replace(/[^\d.]/g, ''));

  // Back to the location with the same times and bags
  const back = new URLSearchParams(Object.entries({ in: resolvedParams.in, out: resolvedParams.out, bags: resolvedParams.bags, vehicleType: resolvedParams.vehicleType, mode: resolvedParams.mode }).filter(([, v]) => v) as [string, string][]);
  const locationHref = `/locations/${location.id}${back.toString() ? `?${back.toString()}` : ''}`;

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
        <Link href={locationHref} className="ml-2 sm:ml-4 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>
        <div className="ml-auto"><ThemeToggle /></div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Review and confirm</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Check your booking, add your details and choose how to pay.</p>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6 lg:gap-8 items-start">
          {/* Booking summary: first on phones, on the right on larger screens */}
          <aside className="lg:sticky lg:top-24 lg:order-2 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
            <div className="flex gap-4 p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                {location.photos?.[0] && <img src={location.photos[0]} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">{mode === 'garage' ? 'Vehicle parking' : 'Luggage storage'}</p>
                <h2 className="mt-0.5 font-extrabold text-gray-900 dark:text-white leading-snug line-clamp-2">{location.name}</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{pub.area}</p>
              </div>
            </div>

            <dl className="grid grid-cols-2 border-b border-gray-100 dark:border-gray-800">
              {[{ label: 'Drop-off', ...dropOff }, { label: 'Pick-up', ...pickUp }].map((w, i) => (
                <div key={w.label} className={`p-5 ${i === 0 ? 'border-r border-gray-100 dark:border-gray-800' : ''}`}>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{w.label}</dt>
                  <dd className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{w.day}</dd>
                  <dd className="text-sm text-gray-600 dark:text-gray-300">{w.time}</dd>
                </div>
              ))}
            </dl>

            <div className="p-5 space-y-2 text-sm">
              <div className="flex justify-between gap-3 text-gray-600 dark:text-gray-400">
                <span>{mode === 'garage' ? 'Vehicle' : 'Bags'}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{what}</span>
              </div>
              {check.ok && (
                <>
                  <div className="flex justify-between gap-3 text-gray-600 dark:text-gray-400">
                    <span>₹{check.quote.pricePerHourIncGst} × {mode === 'garage' ? '' : `${bags} bag${bags === 1 ? '' : 's'} × `}{check.quote.hours} hour{check.quote.hours === 1 ? '' : 's'}</span>
                    <span className="tabular-nums">₹{check.quote.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-3 pt-3 mt-1 border-t border-gray-100 dark:border-gray-800 text-lg font-black text-gray-900 dark:text-white">
                    <span>Total</span>
                    <span className="tabular-nums">₹{check.quote.total.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="mx-5 mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
              <span className="w-9 h-9 shrink-0 rounded-full bg-emerald-600 text-white flex items-center justify-center" aria-hidden="true">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /></svg>
              </span>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                <span className="block text-sm font-bold text-gray-900 dark:text-white">Protected by StashGuard</span>
                {guardLimit > 0 ? `Loss and damage cover up to ₹${guardLimit.toLocaleString('en-IN')}, free with this booking.` : 'Loss and damage cover, free with this booking.'}
              </p>
            </div>
          </aside>

          <div className="lg:order-1 min-w-0">
            {!check.ok ? (
              <div className="rounded-3xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-6">
                <p className="font-bold text-red-800 dark:text-red-300">This booking isn&apos;t available</p>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300/90">{check.reason}</p>
                <Link href={locationHref} className="mt-4 inline-flex rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2.5 text-sm font-bold text-white">Choose different times</Link>
              </div>
            ) : (
              <CheckoutClientForm
                location={pub}
                resolvedParams={resolvedParams}
                quotedTotal={check.quote.total}
                vehicleType={check.vehicleType}
                razorpayKey={process.env.RAZORPAY_KEY_ID || ''}
                userProfile={userProfile}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
