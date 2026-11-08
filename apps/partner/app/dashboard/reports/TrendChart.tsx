'use client';

import { useState } from 'react';

type Point = { label: string; value: number };

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};

/** One series of vertical bars with a recessive grid and a hover/focus tooltip. */
export default function TrendChart({ title, total, points, format = 'number', emptyText = 'Nothing in this period.', tickEvery }: {
  title: string;
  total: string;
  points: Point[];
  format?: 'number' | 'currency';
  emptyText?: string;
  tickEvery?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const fmt = (v: number) => (format === 'currency' ? `₹${Math.round(v).toLocaleString('en-IN')}` : v.toLocaleString('en-IN'));
  const max = niceMax(Math.max(0, ...points.map(p => p.value)));
  const empty = points.every(p => p.value === 0);
  const every = tickEvery ?? Math.max(1, Math.ceil(points.length / 7));
  const a = active != null ? points[active] : null;

  return (
    <figure className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none p-5">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-extrabold text-gray-900 dark:text-white">{title}</span>
        <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{total}</span>
      </figcaption>
      <p className="h-5 mt-0.5 text-xs text-gray-500 dark:text-gray-400 tabular-nums" aria-live="polite">
        {a ? <><span className="font-semibold text-gray-700 dark:text-gray-200">{a.label}</span> · {fmt(a.value)}</> : ' '}
      </p>

      {empty ? (
        <div className="mt-3 h-44 flex items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-sm text-gray-400 dark:text-gray-500">{emptyText}</div>
      ) : (
        <div className="mt-3 flex gap-2">
          {/* y axis: 0, half, max */}
          <div className="relative h-44 w-12 shrink-0 text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
            {[max, max / 2, 0].map((v, i) => (
              <span key={i} className="absolute right-0 -translate-y-1/2" style={{ top: `${(i / 2) * 100}%` }}>{format === 'currency' ? `₹${v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : v}` : +v.toFixed(1)}</span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative h-44" onMouseLeave={() => setActive(null)}>
              {[0, 0.5, 1].map(f => <div key={f} className={`absolute inset-x-0 border-t ${f === 1 ? 'border-gray-300 dark:border-gray-700' : 'border-dashed border-gray-100 dark:border-gray-800'}`} style={{ top: `${f * 100}%` }} />)}
              <div className="absolute inset-0 flex items-end" style={{ gap: points.length > 40 ? 1 : 2 }}>
                {points.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    aria-label={`${p.label}: ${fmt(p.value)}`}
                    className="group relative h-full flex-1 min-w-0 flex items-end outline-none"
                  >
                    <span
                      className={`block w-full max-w-[28px] mx-auto rounded-t ${active === i ? 'bg-orange-700 dark:bg-orange-300' : 'bg-orange-500 dark:bg-orange-400'} group-focus-visible:ring-2 group-focus-visible:ring-orange-500/50`}
                      style={{ height: p.value > 0 ? `max(2px, ${(p.value / max) * 100}%)` : 0 }}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-1.5 flex text-[10px] text-gray-400 dark:text-gray-500">
              {points.map((p, i) => (
                <span key={i} className="flex-1 min-w-0 text-center truncate">{i % every === 0 ? p.label.replace(/^Week of /, '').replace(/^\w{3}, /, '') : ''}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </figure>
  );
}
