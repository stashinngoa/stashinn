'use client';

import { useMemo, useState } from 'react';

export type PublicReview = { id: string; rating: number; comment: string; tags: string[]; name: string; when: string; stay: string; at: number };

const STAR = 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z';
// Matches the review form's praise tags (app/dashboard/review/[id]/reviewShared.ts)
const GOOD = new Set(['Easy to find', 'Friendly staff', 'Quick drop-off', 'Quick pick-up', 'Felt secure', 'Clean space', 'Good value', 'Flexible with timing']);
const PAGE = 6;

export function Stars({ n, size = 'w-4 h-4' }: { n: number; size?: string }) {
  return (
    <span className="inline-flex" aria-label={`${n.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => {
        const fill = Math.max(0, Math.min(1, n - (i - 1)));
        return (
          <span key={i} className={`relative inline-block ${size}`}>
            <svg className={`absolute inset-0 ${size} text-gray-200 dark:text-gray-700`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d={STAR} /></svg>
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <svg className={`${size} text-amber-400`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d={STAR} /></svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Reviews of one location: summary, what guests mention, and the reviews with sorting. */
export default function ReviewsSection({ reviews }: { reviews: PublicReview[] }) {
  const [sort, setSort] = useState<'recent' | 'high' | 'low'>('recent');
  const [stars, setStars] = useState(0);
  const [limit, setLimit] = useState(PAGE);

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    reviews.forEach(r => r.tags.forEach(t => m.set(t, (m.get(t) || 0) + 1)));
    return [...m].sort((a, b) => b[1] - a[1] || Number(GOOD.has(b[0])) - Number(GOOD.has(a[0]))).slice(0, 6);
  }, [reviews]);

  const list = useMemo(() => {
    const l = reviews.filter(r => !stars || r.rating === stars);
    // Recent first, but put reviews with something to read ahead of bare star ratings
    if (sort === 'recent') return [...l].sort((a, b) => Number(!!b.comment || b.tags.length > 0) - Number(!!a.comment || a.tags.length > 0) || b.at - a.at);
    return [...l].sort((a, b) => (sort === 'high' ? b.rating - a.rating : a.rating - b.rating) || b.at - a.at);
  }, [reviews, sort, stars]);

  return (
    <>
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)] gap-6 items-center">
        <div className="text-center sm:pr-6 sm:border-r border-gray-100 dark:border-gray-800">
          <p className="text-5xl font-black text-gray-900 dark:text-white tabular-nums">{avg.toFixed(1)}</p>
          <Stars n={avg} size="w-5 h-5" />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{reviews.length} review{reviews.length === 1 ? '' : 's'}</p>
        </div>
        <ul className="space-y-1.5">
          {[5, 4, 3, 2, 1].map(n => {
            const c = reviews.filter(r => r.rating === n).length;
            return (
              <li key={n}>
                <button type="button" onClick={() => { setStars(stars === n ? 0 : n); setLimit(PAGE); }} aria-pressed={stars === n} disabled={!c}
                  className={`w-full flex items-center gap-2 text-xs rounded-md px-1 -mx-1 disabled:cursor-default ${stars === n ? 'bg-orange-50 dark:bg-orange-950/30' : 'enabled:hover:bg-gray-50 dark:enabled:hover:bg-gray-800/50'}`}>
                  <span className="w-6 text-left tabular-nums font-bold text-gray-700 dark:text-gray-300">{n}★</span>
                  <span className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${reviews.length ? (c / reviews.length) * 100 : 0}%` }} /></span>
                  <span className="w-6 text-right tabular-nums text-gray-500 dark:text-gray-400">{c}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {tagCounts.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Guests mention</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tagCounts.map(([t, n]) => (
              <span key={t} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${GOOD.has(t) ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                {t} <span className="opacity-70">· {n}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
        <p className="text-sm font-bold text-gray-900 dark:text-white">{stars ? `${stars}-star reviews (${list.length})` : 'What guests said'}</p>
        <select value={sort} onChange={e => { setSort(e.target.value as typeof sort); setLimit(PAGE); }} aria-label="Sort reviews"
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
          <option value="recent">Most recent</option>
          <option value="high">Highest rated</option>
          <option value="low">Lowest rated</option>
        </select>
      </div>

      <ul className="mt-3 grid grid-cols-1 2xl:grid-cols-2 gap-3">
        {list.slice(0, limit).map(r => (
          <li key={r.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40 p-4">
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 shrink-0 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 flex items-center justify-center text-sm font-black">{r.name.charAt(0)}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{r.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{r.stay} · {r.when}</p>
              </div>
              <span className="ml-auto shrink-0"><Stars n={r.rating} size="w-3.5 h-3.5" /></span>
            </div>
            {r.tags.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1">
                {r.tags.map(t => <span key={t} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${GOOD.has(t) ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>{t}</span>)}
              </div>
            )}
            {r.comment && <p className="mt-2.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-line line-clamp-6">{r.comment}</p>}
          </li>
        ))}
      </ul>
      {list.length > limit && (
        <button type="button" onClick={() => setLimit(l => l + PAGE)}
          className="mt-4 w-full rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          Show more reviews ({list.length - limit} more)
        </button>
      )}
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Only customers who completed a booking here can leave a review.</p>
    </>
  );
}
