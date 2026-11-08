'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

/** Search box + sort for the customer list; keeps the other filters in the URL. */
export default function CustomerSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [pending, start] = useTransition();

  const go = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    next.delete('page');
    const s = next.toString();
    start(() => router.push(s ? `/dashboard/customers?${s}` : '/dashboard/customers'));
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
      <form onSubmit={e => { e.preventDefault(); go({ q: q.trim() }); }} className="relative flex-1 sm:max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Name, email or phone, then Enter"
          className="w-full pl-9 pr-16 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" />
        {params.get('q') && (
          <button type="button" onClick={() => { setQ(''); go({ q: '' }); }} className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white">Clear</button>
        )}
      </form>
      <select value={params.get('sort') || 'newest'} onChange={e => go({ sort: e.target.value === 'newest' ? '' : e.target.value })}
        aria-label="Sort customers"
        className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-white">
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="name">Name A–Z</option>
      </select>
      {pending && <span className="text-xs text-gray-400">Loading…</span>}
    </div>
  );
}
