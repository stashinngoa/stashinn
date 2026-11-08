'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { submitSettlementProof } from './actions';
import type { DueRow } from './settlementData';

const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : '—');
const input = 'w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20';

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={() => { navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => null); }}
      className="shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

/** Pick the completed bookings you're settling, pay the total, then upload one proof. */
export default function UploadProofForm({ rows, upiId, bankDetails }: { rows: DueRow[]; upiId: string; bankDetails: string }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(rows.map(r => r.paymentId));
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const total = useMemo(() => Math.round(rows.filter(r => picked.includes(r.paymentId)).reduce((s, r) => s + r.owed, 0) * 100) / 100, [rows, picked]);
  const all = picked.length === rows.length;
  const toggle = (id: string) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setMsg({ ok: false, text: 'Attach a screenshot or receipt of the transfer.' });
    const fd = new FormData();
    fd.set('payment_ids', picked.join(','));
    fd.set('reference', reference);
    fd.set('amount', total.toFixed(2));
    fd.set('proof', file);
    setMsg(null);
    start(async () => {
      try {
        const r = await submitSettlementProof(fd);
        if (r.ok) { setReference(''); setFile(null); setMsg({ ok: true, text: r.message }); router.refresh(); }
        else setMsg({ ok: false, text: r.error });
      } catch {
        setMsg({ ok: false, text: 'Something went wrong. Please try again.' });
      }
    });
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-950/40 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <tr>
              <th className="pl-5 pr-2 py-2.5 w-8">
                <input type="checkbox" aria-label="Select all" checked={all} onChange={() => setPicked(all ? [] : rows.map(r => r.paymentId))} className="accent-orange-600" />
              </th>
              <th className="px-2 py-2.5 text-left">Booking</th>
              <th className="px-2 py-2.5 text-left">Picked up</th>
              <th className="px-2 py-2.5 text-right">You collected</th>
              <th className="px-2 py-2.5 text-right">Commission</th>
              <th className="px-2 py-2.5 text-right">GST</th>
              <th className="pl-2 pr-5 py-2.5 text-right">You owe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map(r => (
              <tr key={r.paymentId} onClick={() => toggle(r.paymentId)} className={`cursor-pointer ${picked.includes(r.paymentId) ? '' : 'opacity-60'} hover:bg-gray-50 dark:hover:bg-gray-800/40`}>
                <td className="pl-5 pr-2 py-3" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" aria-label={`Include booking #${r.bookingId.slice(0, 8).toUpperCase()}`} checked={picked.includes(r.paymentId)} onChange={() => toggle(r.paymentId)} className="accent-orange-600" />
                </td>
                <td className="px-2 py-3 min-w-[10rem]">
                  <Link href={`/dashboard/bookings/${r.bookingId}`} onClick={e => e.stopPropagation()} className="font-mono text-xs font-bold text-orange-700 dark:text-orange-400 hover:underline">#{r.bookingId.slice(0, 8).toUpperCase()}</Link>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.customer} · {r.items}</p>
                </td>
                <td className="px-2 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{day(r.pickedUp)}</td>
                <td className="px-2 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{rupees(r.collected)}</td>
                <td className="px-2 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{rupees(r.commission)}</td>
                <td className="px-2 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{rupees(r.gst)}</td>
                <td className="pl-2 pr-5 py-3 text-right tabular-nums font-bold text-gray-900 dark:text-white">{rupees(r.owed)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 dark:border-gray-800">
              <td colSpan={6} className="pl-5 pr-2 py-3 text-right text-sm font-bold text-gray-700 dark:text-gray-300">{picked.length} of {rows.length} selected · total to pay</td>
              <td className="pl-2 pr-5 py-3 text-right text-base font-black tabular-nums text-gray-900 dark:text-white">{rupees(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <form onSubmit={submit} className="border-t border-gray-100 dark:border-gray-800 p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">1. Pay {rupees(total)} to StashInn</p>
          {upiId || bankDetails ? (
            <div className="mt-2 space-y-2">
              {upiId && (
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 px-3 py-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">UPI</span>
                  <span className="font-mono text-sm font-bold text-gray-900 dark:text-white truncate flex-1">{upiId}</span>
                  <Copy text={upiId} />
                </div>
              )}
              {bankDetails && (
                <div className="flex items-start gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 px-3 py-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 pt-0.5">Bank</span>
                  <span className="text-sm text-gray-900 dark:text-white whitespace-pre-line flex-1">{bankDetails}</span>
                  <Copy text={bankDetails} />
                </div>
              )}
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Pay the exact total in one transfer. Add your business name in the payment note if you can.</p>
            </div>
          ) : (
            <p className="mt-2 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
              StashInn’s payment details aren’t set up yet. Email <a href="mailto:support@stashinn.in?subject=Settlement%20payment%20details" className="font-bold underline">support@stashinn.in</a> for the UPI ID or bank account before paying.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">2. Upload the proof</p>
          <div>
            <label htmlFor="st-ref" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">UPI / bank reference (UTR)</label>
            <input id="st-ref" value={reference} onChange={e => setReference(e.target.value.toUpperCase().replace(/\s/g, ''))} maxLength={35} placeholder="e.g. 412345678901" className={`${input} font-mono`} />
          </div>
          <div>
            <label htmlFor="st-proof" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Screenshot or receipt</label>
            <input id="st-proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 dark:file:bg-orange-900/30 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-orange-700 dark:file:text-orange-300" />
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">JPG, PNG, WebP or PDF, up to 5 MB.</p>
          </div>
          {msg && (
            <p role={msg.ok ? 'status' : 'alert'} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${msg.ok
              ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
              : 'border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'}`}>{msg.text}</p>
          )}
          <button type="submit" disabled={pending || !picked.length || reference.length < 6 || !file}
            className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm disabled:opacity-50">
            {pending ? 'Sending…' : `Send proof for ${rupees(total)}`}
          </button>
        </div>
      </form>
    </div>
  );
}
