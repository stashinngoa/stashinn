'use client';

import { useState, useTransition } from 'react';
import { resolveQrPayment } from './qrActions';

export type QrItem = { paymentId: string; bookingId: string; partner: string; location: string; amount: number; share: number; collectedAt: string | null; reference: string };

const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Row({ item, canEdit }: { item: QrItem; canEdit: boolean }) {
  const [reference, setReference] = useState(item.reference);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const decide = (decision: 'received' | 'not_received') => {
    if (decision === 'not_received' && !window.confirm(`Treat this as paid to ${item.partner}? They will owe StashInn its commission + GST.`)) return;
    const fd = new FormData();
    fd.set('payment_id', item.paymentId);
    fd.set('decision', decision);
    fd.set('reference', reference);
    setMsg(null);
    start(async () => {
      const r = await resolveQrPayment(fd);
      setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
    });
  };

  return (
    <li className="p-5 flex flex-col lg:flex-row lg:items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          {money(item.amount)} <span className="font-normal text-gray-500 dark:text-gray-400">· booking</span> <span className="font-mono">#{item.bookingId.slice(0, 8).toUpperCase()}</span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {item.partner}{item.location ? ` · ${item.location}` : ''} · paid {item.collectedAt ? new Date(item.collectedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : 'at drop-off'} · partner’s share {money(item.share)}
          {item.reference ? <> · ref <span className="font-mono">{item.reference}</span></> : null}
        </p>
      </div>
      {msg?.ok ? (
        <p role="status" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{msg.text}</p>
      ) : canEdit ? (
        <div className="flex flex-wrap items-center gap-2" data-edit>
          <input value={reference} onChange={e => setReference(e.target.value.toUpperCase())} placeholder="UPI reference (optional)" aria-label="UPI reference"
            className="w-44 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-2.5 py-1.5 font-mono text-xs text-gray-900 dark:text-white outline-none focus:border-orange-400" />
          <button type="button" disabled={pending} onClick={() => decide('received')} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50">Received</button>
          <button type="button" disabled={pending} onClick={() => decide('not_received')} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-red-400 hover:text-red-700 dark:hover:text-red-400 text-xs font-bold disabled:opacity-50">Not received</button>
          {msg && !msg.ok && <p role="alert" className="w-full text-xs font-semibold text-red-600 dark:text-red-400">{msg.text}</p>}
        </div>
      ) : null}
    </li>
  );
}

/** StashInn-QR payments partners recorded at drop-off, for finance to match against the QR account. */
export default function QrConfirmations({ items, canEdit = true }: { items: QrItem[]; canEdit?: boolean }) {
  return (
    <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
        <h2 className="font-extrabold text-gray-900 dark:text-white">StashInn QR payments to confirm <span className="text-gray-400 tabular-nums">({items.length})</span></h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Partners say these customers paid on the StashInn QR at drop-off. Check each one arrived in the QR account. “Not received” makes the partner owe StashInn’s share instead.</p>
      </div>
      {items.length === 0
        ? <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Nothing to confirm.</p>
        : <ul className="divide-y divide-gray-100 dark:divide-gray-800">{items.map(i => <Row key={i.paymentId} item={i} canEdit={canEdit} />)}</ul>}
    </section>
  );
}
