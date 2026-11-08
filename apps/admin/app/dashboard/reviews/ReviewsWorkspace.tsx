'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { removeReview } from './actions';
import { GOOD_TAGS, RATING_WORDS, REMOVAL_REASONS } from './reviewShared';

export type AdminReview = {
  id: string;
  rating: number;
  comment: string;
  tags: string[];
  createdAt: string;
  bookingId: string;
  customer: { id: string; name: string; email: string };
  partner: { id: string; name: string };
  location: { id: string; name: string; city: string };
  flags: string[];
};

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';
const STAR = 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z';
const PAGE = 30;
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const ref = (id: string) => id.split('-')[0]!.toUpperCase();

const TABS = [
  { key: 'all', label: 'All', match: (_: AdminReview) => true },
  { key: 'attention', label: 'Needs a look', match: (r: AdminReview) => r.flags.length > 0 },
  { key: 'low', label: '1–2 stars', match: (r: AdminReview) => r.rating <= 2 },
  { key: 'comments', label: 'With comments', match: (r: AdminReview) => !!r.comment },
] as const;
type TabKey = (typeof TABS)[number]['key'];

function Stars({ n, size = 'w-4 h-4' }: { n: number; size?: string }) {
  return (
    <span className="inline-flex" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => <svg key={i} className={`${size} ${i <= Math.round(n) ? 'text-amber-400' : 'text-gray-200 dark:text-gray-700'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d={STAR} /></svg>)}
    </span>
  );
}

function RemoveDialog({ review, onClose }: { review: AdminReview; onClose: () => void }) {
  const router = useRouter();
  const [reason, setReason] = useState<string>(review.flags.some(f => f === 'Phone number' || f === 'Email address') ? 'personal_info' : review.flags.includes('Strong language') ? 'abusive' : '');
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set('review_id', review.id);
    fd.set('reason', reason);
    fd.set('note', note);
    if (notify) fd.set('notify', 'on');
    setMsg(null);
    start(async () => {
      const r = await removeReview(fd);
      if (r.ok) { setMsg({ ok: true, text: r.message }); router.refresh(); setTimeout(onClose, 1200); }
      else setMsg({ ok: false, text: r.error });
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !pending && onClose()}>
      <form role="dialog" aria-modal="true" aria-label="Remove review" onClick={e => e.stopPropagation()} onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-2xl space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Remove this review?</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{review.rating}★ by {review.customer.name} for {review.location.name}. It disappears for everyone and the partner’s rating is recalculated. A copy is kept in the audit log.</p>
        </div>
        <fieldset className="space-y-1.5">
          <legend className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Reason</legend>
          {REMOVAL_REASONS.map(r => (
            <label key={r.value} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm cursor-pointer ${reason === r.value ? 'border-orange-400 bg-orange-50/60 dark:bg-orange-950/30 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'}`}>
              <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-orange-600" />
              {r.label}
            </label>
          ))}
        </fieldset>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500}
          placeholder={reason === 'other' ? 'Why? (required; included in the customer’s message)' : 'Internal note (optional)'}
          className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" />
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} className="w-4 h-4 accent-orange-600" />
          Tell the customer why (they can review again)
        </label>
        {msg && <p role="status" className={`text-sm font-semibold ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{msg.text}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={pending} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Keep it</button>
          <button type="submit" disabled={pending || !reason || (reason === 'other' && note.trim().length < 5) || !!msg?.ok}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold disabled:opacity-50">{pending ? 'Removing…' : 'Remove review'}</button>
        </div>
      </form>
    </div>
  );
}

export default function ReviewsWorkspace({ reviews, canEdit, loadError }: { reviews: AdminReview[]; canEdit: boolean; loadError: string | null }) {
  const [tab, setTab] = useState<TabKey>('all');
  const [stars, setStars] = useState(0);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'newest' | 'lowest'>('newest');
  const [limit, setLimit] = useState(PAGE);
  const [removing, setRemoving] = useState<AdminReview | null>(null);

  const avg = (rs: AdminReview[]) => (rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : 0);
  const last30 = reviews.filter(r => Date.now() - Date.parse(r.createdAt) < 30 * 864e5);
  const prev30 = reviews.filter(r => { const age = Date.now() - Date.parse(r.createdAt); return age >= 30 * 864e5 && age < 60 * 864e5; });
  const counts = Object.fromEntries(TABS.map(t => [t.key, reviews.filter(t.match).length])) as Record<TabKey, number>;

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = TABS.find(t => t.key === tab)!.match;
    const list = reviews.filter(r => match(r) && (!stars || r.rating === stars)
      && (!needle || [r.comment, r.customer.name, r.customer.email, r.partner.name, r.location.name, r.location.city, ref(r.bookingId), ...r.tags].some(v => v.toLowerCase().includes(needle))));
    return sort === 'lowest' ? [...list].sort((a, b) => a.rating - b.rating || b.createdAt.localeCompare(a.createdAt)) : list;
  }, [reviews, tab, stars, q, sort]);

  // Locations with at least 3 reviews, lowest average first
  const weakest = useMemo(() => {
    const by = new Map<string, { name: string; partner: string; partnerId: string; ratings: number[] }>();
    reviews.forEach(r => {
      const cur = by.get(r.location.id) || { name: r.location.name, partner: r.partner.name, partnerId: r.partner.id, ratings: [] };
      cur.ratings.push(r.rating);
      by.set(r.location.id, cur);
    });
    return [...by.entries()].filter(([, v]) => v.ratings.length >= 3)
      .map(([id, v]) => ({ id, ...v, avg: v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length }))
      .sort((a, b) => a.avg - b.avg).slice(0, 5);
  }, [reviews]);

  const stats = [
    { label: 'Average rating', value: reviews.length ? `${avg(reviews).toFixed(2)}★` : '—', sub: `${reviews.length} review${reviews.length === 1 ? '' : 's'} in total` },
    { label: 'Last 30 days', value: String(last30.length), sub: last30.length ? `average ${avg(last30).toFixed(1)}★${prev30.length ? ` (was ${avg(prev30).toFixed(1)}★)` : ''}` : 'no new reviews' },
    { label: 'Needs a look', value: String(counts.attention), sub: 'contact details, links, strong words or 1★', alert: counts.attention > 0, tab: 'attention' as TabKey },
    { label: '1–2 stars', value: String(counts.low), sub: reviews.length ? `${Math.round((counts.low / reviews.length) * 100)}% of all reviews` : '—', tab: 'low' as TabKey },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Reviews</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">What customers say about each location. Check flagged reviews and remove ones that break the guidelines.</p>
      </div>
      {loadError && <p className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">{loadError}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => {
          const body = (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className={`mt-1.5 text-2xl md:text-3xl font-black tabular-nums ${s.alert ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.sub}</p>
            </>
          );
          return s.tab
            ? <button key={s.label} type="button" onClick={() => { setTab(s.tab!); setLimit(PAGE); }} className={`${card} p-4 md:p-5 text-left hover:border-orange-300 dark:hover:border-orange-700/60`}>{body}</button>
            : <div key={s.label} className={`${card} p-4 md:p-5`}>{body}</div>;
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        <section className={`${card} overflow-hidden`}>
          <div className="border-b border-gray-200 dark:border-gray-800">
            <nav className="flex gap-1 overflow-x-auto px-3 pt-2" aria-label="Review filter">
              {TABS.map(t => (
                <button key={t.key} type="button" onClick={() => { setTab(t.key); setLimit(PAGE); }} aria-current={tab === t.key ? 'page' : undefined}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold border-b-2 -mb-px ${tab === t.key ? 'border-orange-500 text-orange-700 dark:text-orange-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                  {t.label}
                  <span className={`min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-[11px] tabular-nums ${t.key === 'attention' && counts.attention ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>{counts[t.key]}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <input value={q} onChange={e => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Search comment, customer, partner, location or booking #" aria-label="Search reviews"
              className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" />
            <div className="flex gap-1" role="group" aria-label="Stars">
              {[5, 4, 3, 2, 1].map(n => (
                <button key={n} type="button" aria-pressed={stars === n} onClick={() => { setStars(stars === n ? 0 : n); setLimit(PAGE); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${stars === n ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>{n}★</button>
              ))}
            </div>
            <select value={sort} onChange={e => setSort(e.target.value as 'newest' | 'lowest')} aria-label="Sort"
              className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-white">
              <option value="newest">Newest first</option>
              <option value="lowest">Lowest rating first</option>
            </select>
          </div>

          {visible.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{reviews.length ? 'No reviews match' : 'No reviews yet'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{reviews.length ? 'Try another filter or search.' : 'Customers are asked to review 2 hours after pick-up.'}</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {visible.slice(0, limit).map(r => (
                <li key={r.id} className={`px-5 py-4 ${r.flags.length ? 'bg-orange-50/30 dark:bg-orange-950/10' : ''}`}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars n={r.rating} />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{RATING_WORDS[r.rating]}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      for <Link href={`/dashboard/partners/${r.partner.id}`} className="font-semibold text-gray-900 dark:text-white hover:text-orange-700 dark:hover:text-orange-400">{r.location.name}</Link>
                      <span className="text-gray-500 dark:text-gray-400"> · {r.partner.name}{r.location.city ? `, ${r.location.city}` : ''}</span>
                    </span>
                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{fmt(r.createdAt)}</span>
                  </div>
                  {r.flags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {r.flags.map(f => <span key={f} className="rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">{f}</span>)}
                    </div>
                  )}
                  {r.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.tags.map(t => (
                        <span key={t} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${GOOD_TAGS.has(t) ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' : 'border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300'}`}>{t}</span>
                      ))}
                    </div>
                  )}
                  {r.comment
                    ? <p className="mt-2 whitespace-pre-line text-sm text-gray-800 dark:text-gray-200">“{r.comment}”</p>
                    : <p className="mt-2 text-xs italic text-gray-400 dark:text-gray-500">No comment</p>}
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <Link href={`/dashboard/customers/${r.customer.id}`} className="font-semibold text-gray-700 dark:text-gray-300 hover:text-orange-700 dark:hover:text-orange-400">{r.customer.name}</Link>
                    {r.customer.email && <span className="truncate">{r.customer.email}</span>}
                    <Link href={`/dashboard/bookings?q=${ref(r.bookingId)}`} className="font-mono font-semibold text-orange-700 dark:text-orange-400 hover:underline">#{ref(r.bookingId)}</Link>
                    {canEdit && (
                      <button type="button" onClick={() => setRemoving(r)} data-edit
                        className="ml-auto rounded-lg px-2.5 py-1 font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40">Remove…</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {visible.length > limit && (
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-center">
              <button type="button" onClick={() => setLimit(l => l + PAGE)} className="text-sm font-bold text-orange-700 dark:text-orange-400 hover:underline">Show more ({visible.length - limit} left)</button>
            </div>
          )}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <section className={`${card} p-5`}>
            <h2 className="text-sm font-extrabold text-gray-900 dark:text-white mb-3">Rating spread</h2>
            <ul className="space-y-1.5">
              {[5, 4, 3, 2, 1].map(n => {
                const c = reviews.filter(r => r.rating === n).length;
                return (
                  <li key={n}>
                    <button type="button" onClick={() => { setStars(stars === n ? 0 : n); setLimit(PAGE); }} className={`w-full flex items-center gap-2 text-xs rounded-md px-1 -mx-1 ${stars === n ? 'bg-orange-50 dark:bg-orange-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}>
                      <span className="w-6 text-left tabular-nums font-bold text-gray-700 dark:text-gray-300">{n}★</span>
                      <span className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${reviews.length ? (c / reviews.length) * 100 : 0}%` }} /></span>
                      <span className="w-8 text-right tabular-nums text-gray-500 dark:text-gray-400">{c}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className={`${card} p-5`}>
            <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">Lowest-rated locations</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">With at least 3 reviews.</p>
            {weakest.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">Not enough reviews yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {weakest.map(l => (
                  <li key={l.id} className="flex items-center gap-2">
                    <Link href={`/dashboard/partners/${l.partnerId}`} className="min-w-0 flex-1 hover:text-orange-700 dark:hover:text-orange-400">
                      <span className="block text-sm font-bold text-gray-900 dark:text-white truncate">{l.name}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{l.partner} · {l.ratings.length} reviews</span>
                    </Link>
                    <span className={`text-sm font-black tabular-nums ${l.avg < 3 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{l.avg.toFixed(1)}★</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {removing && <RemoveDialog review={removing} onClose={() => setRemoving(null)} />}
    </div>
  );
}
