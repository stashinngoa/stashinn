import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import Icon from '../../../components/Icon';

const IST = 'Asia/Kolkata';
const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STAR = 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z';
// Matches the customer app's review form (apps/customer/app/dashboard/review/[id]/reviewShared.ts)
const GOOD = new Set(['Easy to find', 'Friendly staff', 'Quick drop-off', 'Quick pick-up', 'Felt secure', 'Clean space', 'Good value', 'Flexible with timing']);
const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/** "Priya S." — partners see the customer's first name and initial only. */
const shortName = (full?: string | null) => {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Customer';
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.` : parts[0]!;
};

function Stars({ n, size = 'w-4 h-4' }: { n: number; size?: string }) {
  return (
    <span className="inline-flex" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => <svg key={i} className={`${size} ${i <= Math.round(n) ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d={STAR} /></svg>)}
    </span>
  );
}

export default async function PartnerReviewsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');

  const location = UUID.test(sp.location || '') ? sp.location! : '';
  const stars = /^[1-5]$/.test(sp.stars || '') ? Number(sp.stars) : 0;

  const [{ data: rows }, { data: locations }] = await Promise.all([
    // * so tags show once migration 20261110000006 is applied, and nothing breaks before
    supabase.from('reviews').select('*, bookings(id, booking_type, num_bags, end_time), users(full_name)').eq('partner_id', partner.id).order('created_at', { ascending: false }).limit(1000),
    supabase.from('partner_locations').select('id, name, location_type').eq('partner_id', partner.id).order('created_at'),
  ]);
  const all = (rows || []) as any[];
  const scoped = location ? all.filter(r => r.location_id === location) : all;
  const list = stars ? scoped.filter(r => r.rating === stars) : scoped;

  const avg = (rs: any[]) => (rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : 0);
  const recent = scoped.filter(r => Date.now() - Date.parse(r.created_at) < 90 * 864e5);
  const dist = [5, 4, 3, 2, 1].map(n => ({ n, count: scoped.filter(r => r.rating === n).length }));
  const tagCounts = new Map<string, number>();
  scoped.forEach(r => (r.tags || []).forEach((t: string) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1)));
  const topGood = [...tagCounts].filter(([t]) => GOOD.has(t)).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topBad = [...tagCounts].filter(([t]) => !GOOD.has(t)).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const byLocation = (locations || []).map(l => {
    const rs = all.filter(r => r.location_id === l.id);
    return { ...l, count: rs.length, avg: avg(rs) };
  });
  const link = (changes: Record<string, string | number | null>) => {
    const p = new URLSearchParams();
    const merged = { location: location || null, stars: stars || null, ...changes };
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
    const s = p.toString();
    return s ? `/dashboard/reviews?${s}` : '/dashboard/reviews';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Reviews</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">What customers said after picking up. Customers are asked for a review 2 hours after pick-up.</p>
        </div>
        {(locations?.length || 0) > 1 && (
          <nav className="flex flex-wrap gap-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-1" aria-label="Location">
            {[{ id: '', name: 'All locations' }, ...(locations || [])].map(l => (
              <Link key={l.id || 'all'} href={link({ location: l.id || null })} aria-current={l.id === location ? 'page' : undefined}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${l.id === location ? 'bg-orange-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{l.name}</Link>
            ))}
          </nav>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className={`${card} p-5 flex items-center gap-5`}>
          <div className="text-center">
            <p className="text-5xl font-black text-gray-900 dark:text-white tabular-nums">{scoped.length ? avg(scoped).toFixed(1) : '—'}</p>
            <Stars n={avg(scoped)} />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-0.5">
            <p><span className="font-bold text-gray-900 dark:text-white">{scoped.length}</span> review{scoped.length === 1 ? '' : 's'}</p>
            <p>{recent.length ? <>Last 90 days: <span className="font-bold text-gray-900 dark:text-white">{avg(recent).toFixed(1)}★</span> from {recent.length}</> : 'None in the last 90 days'}</p>
          </div>
        </section>

        <section className={`${card} p-5`}>
          <h2 className="text-sm font-extrabold text-gray-900 dark:text-white mb-2.5">Ratings</h2>
          <ul className="space-y-1.5">
            {dist.map(d => (
              <li key={d.n}>
                <Link href={link({ stars: stars === d.n ? null : d.n })} className={`flex items-center gap-2 text-xs rounded-md px-1 -mx-1 ${stars === d.n ? 'bg-orange-50 dark:bg-orange-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}>
                  <span className="w-6 tabular-nums font-bold text-gray-700 dark:text-gray-300">{d.n}★</span>
                  <span className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${scoped.length ? (d.count / scoped.length) * 100 : 0}%` }} /></span>
                  <span className="w-8 text-right tabular-nums text-gray-500 dark:text-gray-400">{d.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${card} p-5`}>
          <h2 className="text-sm font-extrabold text-gray-900 dark:text-white mb-2.5">Most mentioned</h2>
          {topGood.length + topBad.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">Customers can tag what stood out (like “Easy to find” or “Long wait”). Tags show up here.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {topGood.map(([t, n]) => <span key={t} className="rounded-full border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">{t} · {n}</span>)}
              {topBad.map(([t, n]) => <span key={t} className="rounded-full border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 text-xs font-semibold text-red-800 dark:text-red-300">{t} · {n}</span>)}
            </div>
          )}
        </section>
      </div>

      {byLocation.length > 1 && !location && (
        <section className={`${card} overflow-hidden`}>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {byLocation.map(l => (
              <li key={l.id}>
                <Link href={link({ location: l.id })} className="flex items-center gap-3 px-5 py-3 hover:bg-orange-50/40 dark:hover:bg-gray-800/40">
                  <Icon name={l.location_type === 'garage' ? 'car' : 'bag'} className="w-4 h-4 text-gray-400" />
                  <span className="flex-1 min-w-0 text-sm font-bold text-gray-900 dark:text-white truncate">{l.name}</span>
                  {l.count ? <><Stars n={l.avg} /><span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">{l.avg.toFixed(1)}</span></> : null}
                  <span className="w-24 text-right text-xs text-gray-500 dark:text-gray-400">{l.count} review{l.count === 1 ? '' : 's'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`${card} overflow-hidden`}>
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <h2 className="font-extrabold text-gray-900 dark:text-white">{stars ? `${stars}-star reviews` : 'All reviews'} <span className="text-gray-400 tabular-nums">({list.length})</span></h2>
          {stars ? <Link href={link({ stars: null })} className="text-xs font-bold text-orange-700 dark:text-orange-400 hover:underline">Show all</Link> : null}
        </div>
        {list.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center"><Icon name="star" className="w-6 h-6" /></span>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{all.length ? 'No reviews match' : 'No reviews yet'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{all.length ? 'Try another location or rating.' : 'After each pick-up, StashInn asks the customer to rate their stay.'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {list.map(r => {
              const b = one(r.bookings) as any;
              const locName = (locations || []).find(l => l.id === r.location_id)?.name;
              return (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars n={r.rating} />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{WORDS[r.rating]}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">· {shortName((one(r.users) as any)?.full_name)}</span>
                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: IST })}</span>
                  </div>
                  {(r.tags || []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(r.tags as string[]).map(t => (
                        <span key={t} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${GOOD.has(t) ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' : 'border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300'}`}>{t}</span>
                      ))}
                    </div>
                  )}
                  {r.comment && <p className="mt-2 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">“{r.comment}”</p>}
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {b && <Link href={`/dashboard/bookings/${b.id}`} className="font-mono font-semibold text-orange-700 dark:text-orange-400 hover:underline">#{String(b.id).split('-')[0]!.toUpperCase()}</Link>}
                    {locName && (locations?.length || 0) > 1 ? ` · ${locName}` : ''}
                    
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
