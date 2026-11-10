'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { processProofBatch, recordPayout, type SettleResult } from './actions';
import type { PartnerSum, ProofBatch } from './settlementsData';

const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : '—');
const dateTime = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const input = 'rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20';

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<SettleResult>) => {
    setMsg(null);
    start(async () => {
      try {
        const r = await fn();
        setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
        if (r.ok) router.refresh();
      } catch {
        setMsg({ ok: false, text: 'Something went wrong. Please try again.' });
      }
    });
  };
  return { pending, msg, run };
}

export function ProofCard({ batch, canEdit }: { batch: ProofBatch; canEdit: boolean }) {
  const { pending, msg, run } = useRun();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const matches = batch.declared == null || Math.abs(batch.declared - batch.total) < 0.01;
  const decide = (decision: 'approve' | 'reject') => {
    const fd = new FormData();
    fd.set('path', batch.path);
    fd.set('decision', decision);
    fd.set('reason', reason);
    run(() => processProofBatch(fd));
  };

  return (
    <li className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-0">
      <div className="p-5 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <Link href={`/dashboard/partners/${batch.partner.id}`} className="text-sm font-extrabold text-gray-900 dark:text-white hover:text-orange-700 dark:hover:text-orange-400">{batch.partner.name}</Link>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sent {dateTime(batch.submittedAt)}{batch.reference ? <> · ref <span className="font-mono">{batch.reference}</span></> : null}</p>
          </div>
          <p className="text-xl font-black tabular-nums text-gray-900 dark:text-white">{money(batch.total)}</p>
        </div>
        <p className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${matches ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'}`}>
          {batch.declared == null ? 'No amount stated: check the proof shows ' + money(batch.total) + '.'
            : matches ? `Partner says they paid ${money(batch.declared)}, which matches what’s owed. Check the proof shows the same.`
            : `Partner says ${money(batch.declared)}, but ${money(batch.total)} is owed for these bookings.`}
        </p>
        <table className="w-full text-xs">
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {batch.bookings.map(b => (
              <tr key={b.id}>
                <td className="py-1.5 font-mono font-bold text-gray-700 dark:text-gray-300">#{b.id.slice(0, 8).toUpperCase()}</td>
                <td className="py-1.5 text-gray-500 dark:text-gray-400">{b.location}</td>
                <td className="py-1.5 text-gray-500 dark:text-gray-400">picked up {day(b.pickedUp)}</td>
                <td className="py-1.5 text-right tabular-nums text-gray-900 dark:text-white">{money(b.owed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {msg?.ok ? (
          <p role="status" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{msg.text}</p>
        ) : canEdit ? (
          <div className="space-y-2" data-edit>
            {rejecting && (
              <input value={reason} onChange={e => setReason(e.target.value)} maxLength={300} placeholder="Why? e.g. amount on the screenshot is ₹100, not ₹130" className={`${input} w-full`} />
            )}
            <div className="flex flex-wrap gap-2">
              {!rejecting && <button type="button" disabled={pending} onClick={() => decide('approve')} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50">{pending ? 'Saving…' : 'Approve, money received'}</button>}
              {rejecting
                ? <>
                    <button type="button" disabled={pending || reason.trim().length < 5} onClick={() => decide('reject')} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold disabled:opacity-50">{pending ? 'Saving…' : 'Reject proof'}</button>
                    <button type="button" onClick={() => setRejecting(false)} className="px-3 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                  </>
                : <button type="button" disabled={pending} onClick={() => setRejecting(true)} className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:border-red-400 hover:text-red-700 dark:hover:text-red-400">Reject…</button>}
            </div>
            {msg && !msg.ok && <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">{msg.text}</p>}
          </div>
        ) : null}
      </div>
      <div className="border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/40 p-4 flex items-center justify-center min-h-[180px]">
        {!batch.proofUrl ? <span className="text-xs italic text-gray-500">Proof file not found</span>
          : batch.isPdf ? <a href={batch.proofUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-orange-700 dark:text-orange-400 hover:underline">Open PDF receipt</a>
          : <a href={batch.proofUrl} target="_blank" rel="noreferrer" title="Open full size">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={batch.proofUrl} alt={`Transfer proof from ${batch.partner.name}`} className="max-h-64 rounded-lg border border-gray-200 dark:border-gray-700 cursor-zoom-in" />
            </a>}
      </div>
    </li>
  );
}

export function PayoutRow({ row, canEdit }: { row: PartnerSum; canEdit: boolean }) {
  const { pending, msg, run } = useRun();
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState('');
  return (
    <li className="px-5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <Link href={`/dashboard/partners/${row.partnerId}`} className="text-sm font-bold text-gray-900 dark:text-white hover:text-orange-700 dark:hover:text-orange-400">{row.name}</Link>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.count} booking{row.count === 1 ? '' : 's'} · oldest {day(row.oldest)}</p>
        </div>
        <span className="text-sm font-black tabular-nums text-gray-900 dark:text-white">{money(row.total)}</span>
        {canEdit && !msg?.ok && !open && <button type="button" data-edit onClick={() => setOpen(true)} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Record payout…</button>}
      </div>
      {open && !msg?.ok && (
        <div className="mt-2 flex flex-wrap items-center gap-2" data-edit>
          <input value={reference} onChange={e => setReference(e.target.value.toUpperCase())} placeholder="Bank / UPI reference (UTR)" className={`${input} font-mono flex-1 min-w-[12rem]`} />
          <button type="button" disabled={pending || reference.trim().length < 4}
            onClick={() => { const fd = new FormData(); fd.set('partner_id', row.partnerId); fd.set('reference', reference); fd.set('amount', row.total.toFixed(2)); run(() => recordPayout(fd)); }}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50">{pending ? 'Saving…' : `Paid ${money(row.total)}`}</button>
          <button type="button" onClick={() => setOpen(false)} className="px-2 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white">Cancel</button>
        </div>
      )}
      {msg && <p role="status" className={`mt-1 text-xs font-semibold ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{msg.text}</p>}
    </li>
  );
}
