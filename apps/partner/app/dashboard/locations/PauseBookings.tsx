'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '../../../components/Icon';
import { createPause, endPause, getPauseConflicts } from './pauseActions';
import { PAUSE_REASONS, activePause, pauseReasonLabel } from './pauseReasons';

type Pause = { id: string; starts_at: string; ends_at: string; reason: string; details: string | null };

const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
// <input type="datetime-local"> wants local time without a zone
const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const input = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm';
const label = 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5';

export default function PauseBookings({ locationId, pauses }: { locationId: string; pauses: Pause[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [reason, setReason] = useState<string>('maintenance');
  const [details, setDetails] = useState('');
  const [conflicts, setConflicts] = useState<{ id: string; status: string; start_time: string; end_time: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const current = activePause(pauses);
  const upcoming = pauses.filter(p => p !== current);

  const openForm = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    const later = new Date(now.getTime() + 24 * 3_600_000);
    setStartsAt(toLocalInput(now));
    setEndsAt(toLocalInput(later));
    setReason('maintenance');
    setDetails('');
    setError(null);
    setOpen(true);
  };

  // Show which existing bookings fall inside the planned pause
  useEffect(() => {
    if (!open || !startsAt || !endsAt) return;
    const s = new Date(startsAt), e = new Date(endsAt);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) { setConflicts([]); return; }
    let cancelled = false;
    getPauseConflicts(locationId, s.toISOString(), e.toISOString()).then(res => { if (!cancelled) setConflicts(res.bookings); });
    return () => { cancelled = true; };
  }, [open, startsAt, endsAt, locationId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createPause({
        locationId,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        reason,
        details,
      });
      if (res.error) setError(res.error);
      else { setOpen(false); router.refresh(); }
    });
  };

  const stop = (pause: Pause) => {
    const started = new Date(pause.starts_at) <= new Date();
    if (!confirm(started ? 'Resume bookings now?' : 'Cancel this planned pause?')) return;
    startTransition(async () => {
      const res = await endPause(pause.id);
      if (res.error) alert(res.error);
      else router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm dark:shadow-none">
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="font-extrabold text-gray-900 dark:text-white">Booking pauses</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Stop new bookings for maintenance or a closure. StashInn is notified with your reason.</p>
        </div>
        {!open && (
          <button type="button" onClick={openForm} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <Icon name="clock" className="w-4 h-4" /> Pause bookings
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {current && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 p-3.5">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-amber-900 dark:text-amber-200">Bookings paused until {fmt(current.ends_at)}</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">{pauseReasonLabel(current.reason)}{current.details ? ` · ${current.details}` : ''}</p>
            </div>
            <button type="button" disabled={isPending} onClick={() => stop(current)} className="shrink-0 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold disabled:opacity-60">
              Resume now
            </button>
          </div>
        )}

        {upcoming.length > 0 && (
          <ul className="space-y-2">
            {upcoming.map(p => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 px-3.5 py-2.5">
                <Icon name="calendar" className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(p.starts_at)} → {fmt(p.ends_at)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{pauseReasonLabel(p.reason)}{p.details ? ` · ${p.details}` : ''}</p>
                </div>
                <button type="button" disabled={isPending} onClick={() => stop(p)} className="shrink-0 text-xs font-bold text-red-600 dark:text-red-400 hover:underline disabled:opacity-60">Cancel</button>
              </li>
            ))}
          </ul>
        )}

        {!current && upcoming.length === 0 && !open && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No pauses planned. Customers can book during your opening hours.</p>
        )}

        {open && (
          <form onSubmit={submit} className="space-y-4 rounded-xl border border-orange-200 dark:border-orange-800/50 bg-orange-50/40 dark:bg-orange-950/20 p-4">
            {error && <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label} htmlFor="pause-from">From</label>
                <input id="pause-from" type="datetime-local" required value={startsAt} onChange={e => setStartsAt(e.target.value)} className={input} />
              </div>
              <div>
                <label className={label} htmlFor="pause-to">Until</label>
                <input id="pause-to" type="datetime-local" required value={endsAt} min={startsAt} onChange={e => setEndsAt(e.target.value)} className={input} />
              </div>
            </div>
            <div>
              <label className={label} htmlFor="pause-reason">Reason</label>
              <select id="pause-reason" value={reason} onChange={e => setReason(e.target.value)} className={input}>
                {PAUSE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="pause-details">Details for StashInn {reason === 'other' ? '*' : '(optional)'}</label>
              <textarea id="pause-details" rows={2} value={details} onChange={e => setDetails(e.target.value)} required={reason === 'other'} placeholder="E.g. Painting the storage room" className={`${input} resize-none`} />
            </div>

            {conflicts.length > 0 && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-900 dark:text-amber-200">
                <p className="font-bold">{conflicts.length} existing booking{conflicts.length === 1 ? ' overlaps' : 's overlap'} this pause</p>
                <p className="mt-0.5">A pause only stops new bookings. Please honour these, or contact the customers and StashInn support.</p>
                <ul className="mt-2 space-y-0.5 text-xs">
                  {conflicts.slice(0, 5).map(b => (
                    <li key={b.id}><span className="font-mono">#{b.id.split('-')[0]!.toUpperCase()}</span> · {fmt(b.start_time)} → {fmt(b.end_time)} · {b.status.replace('_', ' ')}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
              <button type="submit" disabled={isPending} className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold disabled:opacity-60">
                {isPending ? 'Saving…' : 'Pause bookings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
