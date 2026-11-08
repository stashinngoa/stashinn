'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export default function MonthSelect({ value, current, options }: { value: string; current: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select value={value} aria-label="Month" disabled={pending}
      onChange={e => { const m = e.target.value; start(() => router.push(m === current ? '/dashboard/earnings' : `/dashboard/earnings?month=${m}`)); }}
      className="h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm font-bold text-gray-900 dark:text-white disabled:opacity-60">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
