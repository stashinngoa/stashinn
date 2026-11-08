'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useDashboardNavigation } from './DashboardTransition';

const PRESETS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

const toDateStr = (d: Date) => d.toISOString().split('T')[0]!;

function Spinner() {
  return <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />;
}

// Keeps the button width stable while the spinner replaces the label
function Label({ text, loading }: { text: string; loading: boolean }) {
  return (
    <span className="relative inline-flex items-center justify-center">
      <span className={loading ? 'invisible' : ''}>{text}</span>
      {loading && <span className="absolute inset-0 flex items-center justify-center"><Spinner /></span>}
    </span>
  );
}

export default function DateRangeFilter() {
  const { isPending, navigate } = useDashboardNavigation();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const [showCustom, setShowCustom] = useState(false);
  // Preset the user just clicked, highlighted immediately while the new data loads
  const [clicked, setClicked] = useState<string | null>(null);
  useEffect(() => { if (!isPending) setClicked(null); }, [isPending]);

  const today = toDateStr(new Date());
  const presetRange = (days: number) => {
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { start: toDateStr(from), end: today };
  };

  const urlPreset = !startDate && !endDate
    ? 'all'
    : PRESETS.find(p => {
        const r = presetRange(p.days);
        return r.start === startDate && r.end === endDate;
      })?.label ?? 'custom';

  const activePreset = clicked ?? urlPreset;

  const go = (key: string, start?: string, end?: string) => {
    setClicked(key);
    // Keep the page's other filters (type, status, search…) but restart pagination
    const qs = new URLSearchParams(searchParams.toString());
    qs.delete('page');
    if (start) qs.set('startDate', start); else qs.delete('startDate');
    if (end) qs.set('endDate', end); else qs.delete('endDate');
    const s = qs.toString();
    navigate(s ? `${pathname}?${s}` : pathname);
  };

  const segment = (active: boolean) =>
    `px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
      active
        ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm'
        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
    }`;

  return (
    <div className="relative flex items-center gap-2">
      <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
        {PRESETS.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => { const r = presetRange(p.days); go(p.label, r.start, r.end); }}
            className={segment(activePreset === p.label)}
          >
            <Label text={p.label} loading={isPending && clicked === p.label} />
          </button>
        ))}
        <button type="button" onClick={() => go('all')} className={segment(activePreset === 'all')}>
          <Label text="All" loading={isPending && clicked === 'all'} />
        </button>
        <button
          type="button"
          onClick={() => setShowCustom(v => !v)}
          className={`${segment(activePreset === 'custom' || showCustom)} flex items-center gap-1`}
          aria-expanded={showCustom}
        >
          {isPending && clicked === 'custom' ? <Spinner /> : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
          {activePreset === 'custom' ? `${startDate || '…'} → ${endDate || '…'}` : 'Custom'}
        </button>
      </div>

      {showCustom && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            go('custom', String(fd.get('startDate') || ''), String(fd.get('endDate') || ''));
            setShowCustom(false);
          }}
          className="absolute right-0 top-full mt-2 z-30 w-72 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl space-y-3"
        >
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Custom range</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">From</span>
              <input
                type="date"
                name="startDate"
                defaultValue={startDate}
                max={today}
                className="w-full bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 text-xs rounded-lg px-2 py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">To</span>
              <input
                type="date"
                name="endDate"
                defaultValue={endDate}
                max={today}
                className="w-full bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200 text-xs rounded-lg px-2 py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCustom(false)}
              className="px-3 py-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold rounded-lg shadow-sm"
            >
              Apply
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
