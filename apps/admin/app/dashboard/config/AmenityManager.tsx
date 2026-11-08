'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import type { Amenity, AmenityScope } from '@stashinn/lib/services/amenities';
import { addAmenity, setAmenityActive } from './actions';

const SCOPES: { value: AmenityScope; label: string }[] = [
  { value: 'luggage', label: 'Luggage' },
  { value: 'garage', label: 'Parking' },
];
const scopeLabel = (a: Amenity) => SCOPES.filter(s => a.applies_to.includes(s.value)).map(s => s.label).join(' & ');

export default function AmenityManager({ amenities, canEdit }: { amenities: Amenity[]; canEdit: boolean }) {
  const [label, setLabel] = useState('');
  const [scopes, setScopes] = useState<AmenityScope[]>(['luggage']);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleScope = (scope: AmenityScope) =>
    setScopes(prev => (prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await addAmenity(label, scopes);
      if (res.error) {
        setMessage({ ok: false, text: res.error });
      } else {
        setMessage({ ok: true, text: `"${label.trim()}" added. Partners can select it now. Give it points in Scoring System.` });
        setLabel('');
      }
    });
  };

  const toggleActive = (a: Amenity) =>
    startTransition(async () => {
      const res = await setAmenityActive(a.key, !a.is_active);
      setMessage(res.error ? { ok: false, text: res.error } : null);
    });

  return (
    <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Amenities</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">What partners can offer at a location. Active amenities appear in the partner form, customer search filters and scoring.</p>
        </div>
        <Link href="/dashboard/scoring" className="shrink-0 text-sm font-bold text-orange-600 dark:text-orange-400 hover:underline">Set points →</Link>
      </div>

      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {amenities.map(a => (
          <li key={a.key} className="flex items-center gap-3 px-5 py-2.5">
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-semibold truncate ${a.is_active ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>{a.label}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">{scopeLabel(a)}{a.is_active ? '' : ' · Inactive'}</span>
            </span>
            {canEdit && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => toggleActive(a)}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
              >
                {a.is_active ? 'Deactivate' : 'Reactivate'}
              </button>
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <form onSubmit={submit} className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 min-w-0">
              <label htmlFor="amenity-label" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">New amenity</label>
              <input
                id="amenity-label"
                required
                maxLength={40}
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Wheelchair access"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <fieldset className="flex items-center gap-4 sm:pb-2.5">
              <legend className="sr-only">Applies to</legend>
              {SCOPES.map(s => (
                <label key={s.value} className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={scopes.includes(s.value)} onChange={() => toggleScope(s.value)} className="h-4 w-4 rounded text-orange-600 border-gray-300 dark:border-gray-600 focus:ring-orange-500" />
                  {s.label}
                </label>
              ))}
            </fieldset>
            <button type="submit" disabled={isPending || !scopes.length} className="shrink-0 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold disabled:opacity-60">
              {isPending ? 'Saving…' : 'Add amenity'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">The name can&apos;t be changed later because it&apos;s saved on each location. Deactivating hides an amenity from new selections; locations that already have it keep it.</p>
          {message && <p role="status" className={`text-sm font-semibold ${message.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{message.text}</p>}
        </form>
      )}
    </section>
  );
}
