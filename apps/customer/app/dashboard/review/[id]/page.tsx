import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import ReviewForm from './ReviewForm';
import { RATING_WORDS, isGoodTag } from './reviewShared';

const IST = 'Asia/Kolkata';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const card = 'rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm dark:shadow-none';
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST });
const STAR = 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z';

function Stars({ n, size = 'w-5 h-5' }: { n: number; size?: string }) {
  return (
    <span className="inline-flex" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => <svg key={i} className={`${size} ${i <= n ? 'text-amber-400' : 'text-gray-300 dark:text-gray-700'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d={STAR} /></svg>)}
    </span>
  );
}

function items(b: any) {
  if (b.booking_type === 'garage') return [b.vehicle_make, b.vehicle_model].filter(Boolean).join(' ') || 'Vehicle';
  const n = Number(b.num_bags) || 1;
  return `${n} bag${n === 1 ? '' : 's'}`;
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, cancellation_code, booking_type, num_bags, vehicle_make, vehicle_model, start_time, end_time, actual_checkin, actual_checkout, partner_locations(name, city, photos)')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();
  if (!booking) notFound();
  const b = booking as any;
  const loc = one(b.partner_locations) as any;
  const place = loc?.name || 'your StashInn location';
  const ref = b.id.split('-')[0].toUpperCase();

  const { data: review } = await supabase.from('reviews').select('*').eq('booking_id', b.id).maybeSingle();

  const summary = (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {loc?.photos?.[0] ? <img src={loc.photos[0]} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">{review ? 'Your review of' : 'Rate your stay at'}</p>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white leading-tight truncate">{place}</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{[loc?.city, items(b), `#${ref}`].filter(Boolean).join(' · ')}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{when(b.actual_checkin || b.start_time)} → {when(b.actual_checkout || b.end_time)}</p>
      </div>
    </div>
  );

  let body: React.ReactNode;
  if (review) {
    const tags: string[] = review.tags || [];
    body = (
      <>
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 px-4 py-3">
          <span className="h-9 w-9 shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </span>
          <div>
            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Thanks for your review</p>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">It helps {place} improve, and helps other travellers choose.</p>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex items-center gap-3">
            <Stars n={review.rating} size="w-6 h-6" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">{RATING_WORDS[review.rating]}</span>
            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: IST })}</span>
          </div>
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map(t => (
                <span key={t} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${isGoodTag(t) ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' : 'border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300'}`}>{t}</span>
              ))}
            </div>
          )}
          {review.comment && <p className="mt-3 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">“{review.comment}”</p>}
        </div>
        {review.rating <= 2 && (
          <p className="mt-5 text-sm text-gray-600 dark:text-gray-400">Sorry it wasn’t great. If something was damaged or missing, <Link href="/dashboard/disputes" className="font-bold text-orange-700 dark:text-orange-400 hover:underline">report a problem</Link> and our team will look into it.</p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/dashboard?filter=past" className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">My bookings</Link>
          <Link href="/search" className="rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2.5 text-sm font-bold text-white">Book storage again</Link>
        </div>
      </>
    );
  } else if (b.status === 'checked_out') {
    body = <ReviewForm bookingId={b.id} placeName={place} />;
  } else {
    const cancelled = b.status === 'cancelled';
    body = (
      <div className="text-center py-4">
        <span className="mx-auto h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </span>
        <h2 className="mt-4 text-lg font-extrabold text-gray-900 dark:text-white">{cancelled ? 'Nothing to review' : 'Not ready for a review yet'}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {cancelled ? 'This booking was cancelled, so there’s no stay to rate.' : 'You can rate this location once you’ve picked up your items.'}
        </p>
        <Link href="/dashboard" className="mt-5 inline-block rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Back to my bookings</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/dashboard?filter=past" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-orange-700 dark:hover:text-orange-400">← My bookings</Link>
      <div className={`${card} mt-4 overflow-hidden`}>
        <div className="p-5 sm:p-7 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/30">{summary}</div>
        <div className="p-5 sm:p-7">{body}</div>
      </div>
    </div>
  );
}
