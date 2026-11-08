'use client';

import { useState, useTransition } from 'react';
import { setCustomerBlocked } from './actions';

/** Block / unblock with a confirmation step (and a required reason when blocking). */
export default function BlockButton({ userId, name, blocked, upcoming = 0, size = 'sm' }: {
  userId: string;
  name: string;
  blocked: boolean;
  upcoming?: number;
  size?: 'sm' | 'md';
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    setMsg(null);
    start(async () => {
      const r = await setCustomerBlocked(userId, !blocked, reason);
      if (r.ok) { setOpen(false); setReason(''); }
      setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
    });
  };

  const pad = size === 'md' ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs';
  return (
    <span className="relative inline-block text-left" data-edit>
      <button type="button" onClick={() => { setOpen(o => !o); setMsg(null); }}
        className={`${pad} font-bold rounded-lg border transition-colors ${blocked
          ? 'border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
          : 'border-red-300 dark:border-red-700/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'}`}>
        {blocked ? 'Unblock' : 'Block'}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
        <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-2xl text-left whitespace-normal">
          <p className="text-sm font-bold text-gray-900 dark:text-white">{blocked ? `Unblock ${name}?` : `Block ${name}?`}</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {blocked
              ? 'They can sign in and book again.'
              : 'They’ll be signed out of the customer app and can’t sign in or book. Existing bookings are not cancelled.'}
          </p>
          {!blocked && upcoming > 0 && (
            <p className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300">
              {upcoming} upcoming booking{upcoming === 1 ? '' : 's'} will stay as they are. Cancel them from Disputes if needed.
            </p>
          )}
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
            placeholder={blocked ? 'Note (optional)' : 'Reason (required, kept in the audit log)'}
            className="mt-3 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" />
          {msg && !msg.ok && <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{msg.text}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs font-bold rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
            <button type="button" disabled={pending || (!blocked && reason.trim().length < 5)} onClick={submit}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg text-white disabled:opacity-50 ${blocked ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}>
              {pending ? 'Saving…' : blocked ? 'Unblock' : 'Block customer'}
            </button>
          </div>
        </div>
        </div>
      )}
      {msg?.ok && <span role="status" className="sr-only">{msg.text}</span>}
    </span>
  );
}
