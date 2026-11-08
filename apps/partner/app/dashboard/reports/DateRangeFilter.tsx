'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { PRESETS } from './reportData';

const field = 'rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20';

/** Period presets, a custom range and a location filter, all kept in the URL. */
export default function DateRangeFilter({ preset, from, to, locations }: { preset: string; from: string; to: string; locations: { id: string; name: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [custom, setCustom] = useState(preset === 'custom');
  const [a, setA] = useState(from);
  const [b, setB] = useState(to);

  const go = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    const s = next.toString();
    start(() => router.push(s ? `/dashboard/reports?${s}` : '/dashboard/reports'));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-1" role="group" aria-label="Period">
          {PRESETS.map(p => (
            <button key={p.key} type="button" aria-pressed={!custom && preset === p.key}
              onClick={() => { setCustom(false); go({ range: p.key === '30d' ? null : p.key, from: null, to: null }); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!custom && preset === p.key ? 'bg-orange-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              {p.label}
            </button>
          ))}
          <button type="button" aria-pressed={custom} onClick={() => setCustom(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${custom ? 'bg-orange-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            Custom
          </button>
        </div>
        {locations.length > 1 && (
          <select value={params.get('location') || ''} onChange={e => go({ location: e.target.value || null })} aria-label="Location" className={field}>
            <option value="">All locations</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
        {pending && <span className="text-xs text-gray-400">Loading…</span>}
      </div>
      {custom && (
        <form onSubmit={e => { e.preventDefault(); if (a && b) go({ range: null, from: a, to: b }); }} className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-bold text-gray-600 dark:text-gray-300">From<input type="date" value={a} max={b || undefined} onChange={e => setA(e.target.value)} required className={`${field} mt-1 block`} /></label>
          <label className="text-xs font-bold text-gray-600 dark:text-gray-300">To<input type="date" value={b} min={a || undefined} onChange={e => setB(e.target.value)} required className={`${field} mt-1 block`} /></label>
          <button type="submit" className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-200">Apply</button>
        </form>
      )}
    </div>
  );
}
