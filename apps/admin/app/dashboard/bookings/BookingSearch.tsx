'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useDashboardNavigation } from '../DashboardTransition';

export default function BookingSearch({ placeholder = 'Search customer, location, plate…' }: { placeholder?: string }) {
  const { navigate, isPending } = useDashboardNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get('q') || '';

  const submit = (q: string) => {
    const qs = new URLSearchParams(searchParams.toString());
    qs.delete('page');
    if (q.trim()) qs.set('q', q.trim()); else qs.delete('q');
    const s = qs.toString();
    navigate(s ? `${pathname}?${s}` : pathname);
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(String(new FormData(e.currentTarget).get('q') || '')); }}
      className="relative w-full sm:w-72"
      role="search"
    >
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
      </svg>
      <input
        key={current}
        name="q"
        defaultValue={current}
        placeholder={placeholder}
        className="w-full pl-9 pr-16 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
      />
      {current ? (
        <button
          type="button"
          onClick={() => submit('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          Clear
        </button>
      ) : (
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-400 dark:text-gray-500">{isPending ? '…' : 'Enter'}</kbd>
      )}
    </form>
  );
}
