'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import type { Amenity } from '@stashinn/lib/services/amenities';

const SORTS = [
  { value: 'distance', label: 'Closest' },
  { value: 'price_asc', label: 'Lowest price' },
  { value: 'price_desc', label: 'Highest price' },
  { value: 'rating', label: 'Top rated' },
];
const RATINGS = [
  { value: '', label: 'Any' },
  { value: '3.0', label: '3+' },
  { value: '4.0', label: '4+' },
  { value: '4.5', label: '4.5+' },
];
const DEFAULT_DISTANCE = '50';

/** Results heading, sort, the filters panel and chips for the filters in use. */
export default function FiltersBar({ searchParams, amenityCatalog, total, view, onView }: {
  searchParams: Record<string, string | undefined>;
  amenityCatalog: Amenity[];
  total: number;
  view: 'list' | 'map';
  onView: (v: 'list' | 'map') => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const mode = searchParams.mode === 'garage' ? 'garage' : 'luggage';
  const applied = {
    sort: searchParams.sort || 'distance',
    maxPrice: searchParams.max_price || '',
    minRating: searchParams.min_rating || '',
    maxDistance: searchParams.max_distance || DEFAULT_DISTANCE,
    amenities: searchParams.amenities ? searchParams.amenities.split(',') : [],
  };
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(applied);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset the draft to what's applied each time the panel opens
  useEffect(() => { if (open) setDraft(applied); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const amenityOptions = amenityCatalog
    .filter(a => a.is_active && a.applies_to.includes(mode))
    // Built-in parking amenities filter on their own column, the rest on the amenities list
    .map(a => ({ value: mode === 'garage' && a.column ? a.column : a.label, label: a.label }));
  const amenityLabel = (v: string) => amenityOptions.find(o => o.value === v)?.label ?? v;

  const push = (next: typeof applied) => {
    const p = new URLSearchParams(Object.entries(searchParams).filter(([k, v]) => v && !['sort', 'max_price', 'min_rating', 'max_distance', 'amenities', 'page'].includes(k)) as [string, string][]);
    if (next.sort !== 'distance') p.set('sort', next.sort);
    if (next.maxPrice) p.set('max_price', next.maxPrice);
    if (next.minRating) p.set('min_rating', next.minRating);
    if (next.maxDistance !== DEFAULT_DISTANCE) p.set('max_distance', next.maxDistance);
    if (next.amenities.length) p.set('amenities', next.amenities.join(','));
    setOpen(false);
    startTransition(() => router.push(`/search?${p.toString()}`));
  };

  // One-tap filters: 4★ and above, plus the amenities that apply to this kind of storage
  const quick: { key: string; label: React.ReactNode; on: boolean; toggle: () => typeof applied }[] = [
    {
      key: 'rating',
      label: <><span className="text-amber-500">★</span> 4 &amp; above</>,
      on: applied.minRating === '4.0',
      toggle: () => ({ ...applied, minRating: applied.minRating === '4.0' ? '' : '4.0' }),
    },
    ...amenityOptions.map(o => ({
      key: `a-${o.value}`,
      label: o.label,
      on: applied.amenities.includes(o.value),
      toggle: () => ({ ...applied, amenities: applied.amenities.includes(o.value) ? applied.amenities.filter(a => a !== o.value) : [...applied.amenities, o.value] }),
    })),
  ];
  const inQuick = (value: string) => amenityOptions.some(o => o.value === value);

  // Chips for filters set in the panel that the quick pills don't already show
  const chips: { key: string; label: string; clear: () => typeof applied }[] = [
    ...(applied.maxDistance !== DEFAULT_DISTANCE ? [{ key: 'distance', label: `Within ${applied.maxDistance} km`, clear: () => ({ ...applied, maxDistance: DEFAULT_DISTANCE }) }] : []),
    ...(applied.maxPrice ? [{ key: 'price', label: `Up to ₹${applied.maxPrice}/hr`, clear: () => ({ ...applied, maxPrice: '' }) }] : []),
    ...(applied.minRating && applied.minRating !== '4.0' ? [{ key: 'rating', label: `${applied.minRating}+ stars`, clear: () => ({ ...applied, minRating: '' }) }] : []),
    ...applied.amenities.filter(a => !inQuick(a)).map(a => ({ key: `a-${a}`, label: amenityLabel(a), clear: () => ({ ...applied, amenities: applied.amenities.filter(x => x !== a) }) })),
  ];
  const activeCount = (applied.maxDistance !== DEFAULT_DISTANCE ? 1 : 0) + (applied.maxPrice ? 1 : 0) + (applied.minRating ? 1 : 0) + applied.amenities.length;

  const where = searchParams.q || 'this area';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[12rem]">
          <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
            {total} {mode === 'garage' ? 'parking' : 'storage'} spot{total === 1 ? '' : 's'} near {where}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Prices are per hour{mode === 'luggage' ? ', per bag' : ''}.</p>
        </div>

        {/* List / map switch on small screens */}
        <div className="lg:hidden inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
          {(['list', 'map'] as const).map(v => (
            <button key={v} type="button" onClick={() => onView(v)} aria-pressed={view === v} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${view === v ? 'bg-white dark:bg-gray-950 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              {v === 'list' ? 'List' : 'Map'}
            </button>
          ))}
        </div>

        <label className="relative">
          <span className="sr-only">Sort by</span>
          <select
            value={applied.sort}
            onChange={e => push({ ...applied, sort: e.target.value })}
            className="appearance-none rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 pl-3 pr-8 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-orange-400 cursor-pointer"
          >
            {SORTS.map(s => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </label>

        <div ref={panelRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${activeCount || open
              ? 'border-orange-300 dark:border-orange-600/60 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300'
              : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 12h12M10 20h4" /></svg>
            Filters
            {activeCount > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-orange-600 text-white text-[11px] font-bold flex items-center justify-center">{activeCount}</span>}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl">
              <div className="max-h-[65vh] overflow-y-auto p-5 space-y-6">
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Distance</h3>
                    <span className="text-xs font-bold text-orange-700 dark:text-orange-400">Within {draft.maxDistance} km</span>
                  </div>
                  <input type="range" min={1} max={50} value={draft.maxDistance} onChange={e => setDraft(d => ({ ...d, maxDistance: e.target.value }))} className="w-full accent-orange-600 cursor-pointer" aria-label="Maximum distance in km" />
                  <div className="flex justify-between text-[11px] text-gray-400 mt-1"><span>1 km</span><span>50 km</span></div>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Price per hour</h3>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">₹</span>
                    <input type="number" min={1} inputMode="numeric" value={draft.maxPrice} onChange={e => setDraft(d => ({ ...d, maxPrice: e.target.value }))} placeholder="Any price" aria-label="Maximum price per hour" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 pl-7 pr-16 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">maximum</span>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Rating</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {RATINGS.map(r => (
                      <Choice key={r.value} on={draft.minRating === r.value} onClick={() => setDraft(d => ({ ...d, minRating: r.value }))}>
                        {r.value && <span className="text-amber-500">★</span>} {r.label}
                      </Choice>
                    ))}
                  </div>
                </section>

                {amenityOptions.length > 0 && (
                  <section>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {amenityOptions.map(o => {
                        const on = draft.amenities.includes(o.value);
                        return (
                          <Choice key={o.value} on={on} onClick={() => setDraft(d => ({ ...d, amenities: on ? d.amenities.filter(a => a !== o.value) : [...d.amenities, o.value] }))}>
                            {on && '✓ '}{o.label}
                          </Choice>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-gray-200 dark:border-gray-800 px-5 py-3">
                <button type="button" onClick={() => setDraft({ ...applied, maxPrice: '', minRating: '', maxDistance: DEFAULT_DISTANCE, amenities: [] })} className="text-sm font-semibold text-gray-600 dark:text-gray-400 underline-offset-2 hover:underline">
                  Clear all
                </button>
                <button type="button" onClick={() => push(draft)} disabled={isPending} className="rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-70">
                  {isPending ? 'Updating…' : 'Show results'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div role="group" aria-label="Quick filters" className="-mx-4 sm:mx-0 px-4 sm:px-0 flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible [scrollbar-width:none]">
        {quick.map(q => (
          <button
            key={q.key}
            type="button"
            aria-pressed={q.on}
            disabled={isPending}
            onClick={() => push(q.toggle())}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${q.on
              ? 'border-orange-600 bg-orange-600 text-white shadow-sm shadow-orange-600/20'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-orange-300 dark:hover:border-orange-600/60 hover:text-orange-700 dark:hover:text-orange-400'}`}
          >
            {q.on && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            {q.label}
          </button>
        ))}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map(c => (
            <button key={c.key} type="button" onClick={() => push(c.clear())} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-3 pr-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-orange-300 dark:hover:border-orange-600/60">
              {c.label}
              <span aria-label={`Remove ${c.label}`} className="w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px]">✕</span>
            </button>
          ))}
          <button type="button" onClick={() => push({ ...applied, maxPrice: '', minRating: '', maxDistance: DEFAULT_DISTANCE, amenities: [] })} className="text-xs font-semibold text-orange-700 dark:text-orange-400 hover:underline">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${on
        ? 'border-orange-400 dark:border-orange-500/70 bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300'
        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}`}
    >
      {children}
    </button>
  );
}
