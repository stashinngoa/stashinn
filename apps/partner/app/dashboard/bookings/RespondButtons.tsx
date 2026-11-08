'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { acceptBooking, declineBooking } from './actions';
import { DECLINE_REASONS } from './bookingShared';

/** Accept / decline a pending booking. Declining asks for a reason first. */
export default function RespondButtons({ bookingId, summary, size = 'sm' }: { bookingId: string; summary: string; size?: 'sm' | 'lg' }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState<string>(DECLINE_REASONS[0].value);
  const [note, setNote] = useState('');

  const run = (kind: 'accept' | 'decline') => {
    setMsg(null);
    setBusy(kind);
    const fd = new FormData();
    fd.set('booking_id', bookingId);
    if (kind === 'decline') { fd.set('reason', reason); fd.set('note', note); }
    start(async () => {
      try {
        const r = kind === 'accept' ? await acceptBooking(fd) : await declineBooking(fd);
        if (r.success) {
          setDeclining(false);
          setMsg({ ok: true, text: r.message });
          router.refresh();
        } else {
          setMsg({ ok: false, text: r.error || 'Something went wrong.' });
        }
      } catch {
        setMsg({ ok: false, text: 'Something went wrong. Please try again.' });
      } finally {
        setBusy(null);
      }
    });
  };

  if (msg?.ok) return <p role="status" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{msg.text}</p>;

  const lg = size === 'lg';
  const btn = lg ? 'flex-1 py-3 text-sm rounded-xl' : 'px-3 py-1.5 text-xs rounded-lg';
  const needsNote = reason === 'other' && note.trim().length < 5;

  return (
    <div className={lg ? 'space-y-2' : 'flex flex-col items-end gap-1'}>
      <div className={`flex gap-2 ${lg ? '' : 'justify-end'}`}>
        <button type="button" disabled={pending} onClick={() => run('accept')}
          className={`${btn} font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-sm disabled:opacity-50 transition-colors`}>
          {busy === 'accept' ? 'Accepting…' : 'Accept'}
        </button>
        <button type="button" disabled={pending} onClick={() => { setDeclining(true); setMsg(null); }}
          className={`${btn} font-bold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-950/40 dark:hover:text-red-400 dark:hover:border-red-800 disabled:opacity-50 transition-colors`}>
          Decline
        </button>
      </div>
      {msg && !msg.ok && <p role="alert" className={`text-xs font-semibold text-red-600 dark:text-red-400 ${lg ? '' : 'max-w-[16rem] text-right'}`}>{msg.text}</p>}

      {declining && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !pending && setDeclining(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby={`decline-${bookingId}`} onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-2xl text-left">
            <h3 id={`decline-${bookingId}`} className="text-base font-extrabold text-gray-900 dark:text-white">Decline this booking?</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{summary}</p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">The customer is told straight away and gets a full refund if they paid online.</p>

            <fieldset className="mt-4 space-y-2">
              <legend className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Reason</legend>
              {DECLINE_REASONS.map(r => (
                <label key={r.value} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm cursor-pointer transition-colors ${
                  reason === r.value ? 'border-orange-400 bg-orange-50/60 dark:bg-orange-950/30 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'}`}>
                  <input type="radio" name={`reason-${bookingId}`} value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-orange-600" />
                  {r.label}
                </label>
              ))}
            </fieldset>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={300}
              placeholder={reason === 'other' ? 'What’s the reason? (required, only StashInn sees this)' : 'Note for StashInn (optional)'}
              className="mt-3 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" />
            {msg && !msg.ok && <p role="alert" className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{msg.text}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={pending} onClick={() => setDeclining(false)} className="px-4 py-2 text-sm font-bold rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Keep it</button>
              <button type="button" disabled={pending || needsNote} onClick={() => run('decline')}
                className="px-4 py-2 text-sm font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white disabled:opacity-50">
                {busy === 'decline' ? 'Declining…' : 'Decline booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
