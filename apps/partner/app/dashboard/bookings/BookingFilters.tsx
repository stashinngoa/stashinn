'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

const field = 'rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20';

/** Search, location and date filters; they live in the URL so the list and CSV export agree. */
export default function BookingFilters({ locations }: { locations: { id: string; name: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [pending, start] = useTransition();

  const go = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    next.delete('page');
    const s = next.toString();
    start(() => router.push(s ? `/dashboard/bookings?${s}` : '/dashboard/bookings'));
  };
  const active = ['q', 'location', 'date'].some(k => params.get(k));

  return (
    <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
      <form onSubmit={e => { e.preventDefault(); go({ q: q.trim() }); }} className="relative flex-1 lg:max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input value={q} onChange={e => setQ(e.target.value)} aria-label="Search bookings"
          placeholder="Customer, booking # or number plate"
          className={`${field} w-full pl-9`} />
      </form>
      <div className="flex gap-2">
        {locations.length > 1 && (
          <select value={params.get('location') || ''} onChange={e => go({ location: e.target.value })} aria-label="Location" className={`${field} min-w-0 flex-1 lg:flex-none lg:max-w-[14rem]`}>
            <option value="">All locations</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
        <input type="date" value={params.get('date') || ''} onChange={e => go({ date: e.target.value })} aria-label="On date" title="Bookings stored on this day" className={`${field} min-w-0`} />
        {active && (
          <button type="button" onClick={() => { setQ(''); go({ q: '', location: '', date: '' }); }}
            className="shrink-0 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            Clear
          </button>
        )}
      </div>
      {pending && <span className="text-xs text-gray-400">Loading…</span>}
    </div>
  );
}
