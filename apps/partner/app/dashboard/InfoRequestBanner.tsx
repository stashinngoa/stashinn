'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { infoRequestAreas } from '@stashinn/lib/constants';
import { markInfoRequestDone } from './infoRequestActions';

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

/** Shown on every dashboard page while the StashInn team has asked this partner to fix something. */
export default function InfoRequestBanner({ note, items, requestedAt, respondedAt }: { note: string | null; items: string[] | null; requestedAt: string; respondedAt: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const areas = infoRequestAreas(items);

  if (respondedAt) {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm text-emerald-800 dark:text-emerald-300">
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
        <p><span className="font-bold">Thanks, we&apos;ll take another look.</span> You marked the requested changes as done on {fmt(respondedAt)}. Our team will review them shortly.</p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-amber-900 dark:text-amber-200">The StashInn team needs a few changes (requested {fmt(requestedAt)})</p>
          {note && <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90 whitespace-pre-line">{note}</p>}

          {areas.length > 0 && (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {areas.map(a => (
                <li key={a.key} className="flex items-center justify-between gap-3 rounded-xl bg-white/70 dark:bg-gray-900/40 border border-amber-200 dark:border-amber-800/50 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-amber-900 dark:text-amber-100">{a.label}</span>
                    <span className="block text-xs text-amber-800/80 dark:text-amber-200/70">{a.hint}</span>
                  </span>
                  {a.fixHref ? (
                    <Link href={a.fixHref} className="shrink-0 px-2.5 py-1 text-xs font-bold rounded-lg border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40">
                      Open {a.fixLabel}
                    </Link>
                  ) : a.fixLabel ? (
                    <span className="shrink-0 text-[11px] text-right text-amber-800/80 dark:text-amber-200/70 max-w-[9rem]">{a.fixLabel}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(async () => {
                const res = await markInfoRequestDone();
                setError(res.error);
              })}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-60"
            >
              {isPending ? 'Sending…' : "I've made the changes"}
            </button>
            {error && <span className="text-xs font-bold text-red-600 dark:text-red-400">{error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
