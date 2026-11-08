'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { adminCancelBooking, adminUpdateBooking, previewBookingChange, type ChangePreview } from './bookingActions';
import { isOpen } from './disputeShared';
import type { DisputeCase } from './DisputesWorkspace';

const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
/** ISO → "YYYY-MM-DDTHH:mm" in India time, for datetime-local inputs. */
const toInput = (iso: string) => new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 16);

const label = 'block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5';
const field = 'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 disabled:opacity-60 disabled:cursor-not-allowed';
const shell = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5';

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <section className={shell}>
      <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Booking changes</h3>
      <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{children}</p>
    </section>
  );
}

/**
 * Lets support change or cancel the booking at the customer's request. Only offered while a
 * dispute the customer raised is open; the server checks the same.
 */
export default function BookingChangePanel({ c, canEdit }: { c: DisputeCase; canEdit: boolean }) {
  const b = c.booking;
  const [tab, setTab] = useState<'change' | 'cancel'>(c.category === 'Location closed or refused my booking' ? 'cancel' : 'change');

  if (!canEdit || !b) return null;
  if (c.source !== 'customer') return <Muted>Booking changes are only for concerns the customer raised. For a partner claim, contact the customer first.</Muted>;
  if (!isOpen(c.status)) return <Muted>This dispute is closed. Choose “Start review” below to reopen it if the customer needs the booking changed.</Muted>;
  if (!['pending', 'confirmed', 'checked_in'].includes(b.status)) return <Muted>This booking is {b.status.replace(/_/g, ' ')}, so it can’t be changed. Use a refund decision below if needed.</Muted>;

  const checkedIn = b.status === 'checked_in';
  return (
    <section data-edit className={`${shell} space-y-4`}>
      <div>
        <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Booking changes</h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Only at the customer’s request. The customer and partner are told what changed.</p>
      </div>
      <div className="flex rounded-xl bg-gray-100 dark:bg-gray-950 p-1 text-xs font-bold">
        {(['change', 'cancel'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 transition-colors ${tab === t
              ? `bg-white dark:bg-gray-800 shadow-sm ${t === 'cancel' ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}`
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}>
            {t === 'change' ? (checkedIn ? 'Change pick-up' : 'Change booking') : 'Cancel booking'}
          </button>
        ))}
      </div>
      {tab === 'change' ? <ChangeForm c={c} /> : <CancelForm c={c} />}
    </section>
  );
}

function ChangeForm({ c }: { c: DisputeCase }) {
  const b = c.booking!;
  const garage = b.type === 'garage';
  const checkedIn = b.status === 'checked_in';
  const [start, setStart] = useState(toInput(b.start));
  const [end, setEnd] = useState(toInput(b.end));
  const [bags, setBags] = useState(String(b.bags || 1));
  const [make, setMake] = useState(b.make);
  const [model, setModel] = useState(b.model);
  const [plate, setPlate] = useState(b.plate);
  const [pricing, setPricing] = useState<'keep' | 'reprice'>('keep');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<ChangePreview | { ok: false; error: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start_] = useTransition();
  const seq = useRef(0);

  const form = () => {
    const fd = new FormData();
    fd.set('dispute_id', c.id);
    fd.set('start', start);
    fd.set('end', end);
    fd.set('bags', bags);
    if (garage) { fd.set('vehicle_make', make); fd.set('vehicle_model', model); fd.set('vehicle_plate', plate); }
    fd.set('pricing', pricing);
    fd.set('note', note);
    return fd;
  };

  const dirty = start !== toInput(b.start) || end !== toInput(b.end) || (!garage && Number(bags) !== (b.bags || 1))
    || (garage && (make !== b.make || model !== b.model || plate !== b.plate));

  // Live price and availability while editing
  useEffect(() => {
    if (!dirty && pricing === 'keep') { setPreview(null); return; }
    const id = ++seq.current;
    setChecking(true);
    const t = setTimeout(async () => {
      const r = await previewBookingChange(form());
      if (id === seq.current) { setPreview(r); setChecking(false); }
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, bags, make, model, plate, pricing]);

  const okPreview = preview && preview.ok ? preview : null;
  const blocked = !!preview && (!preview.ok || !!preview.blocker);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (okPreview?.refund && !window.confirm(`Save the change and refund ${rupees(okPreview.refund)} to the customer through Razorpay?`)) return;
    setMsg(null);
    start_(async () => {
      const r = await adminUpdateBooking(form());
      setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-1 gap-3">
        <div>
          <label htmlFor="bc-start" className={label}>Drop-off</label>
          <input id="bc-start" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} disabled={checkedIn} className={field} />
          {checkedIn && <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Already checked in.</p>}
        </div>
        <div>
          <label htmlFor="bc-end" className={label}>Pick-up</label>
          <input id="bc-end" type="datetime-local" value={end} min={start} onChange={e => setEnd(e.target.value)} className={field} />
        </div>
      </div>

      {garage ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="bc-make" className={label}>Make</label>
            <input id="bc-make" value={make} onChange={e => setMake(e.target.value)} disabled={checkedIn} className={field} />
          </div>
          <div>
            <label htmlFor="bc-model" className={label}>Model</label>
            <input id="bc-model" value={model} onChange={e => setModel(e.target.value)} disabled={checkedIn} className={field} />
          </div>
          <div className="col-span-2">
            <label htmlFor="bc-plate" className={label}>Number plate</label>
            <input id="bc-plate" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} disabled={checkedIn} className={`${field} font-mono`} />
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="bc-bags" className={label}>Bags</label>
          <input id="bc-bags" type="number" min={1} max={50} value={bags} onChange={e => setBags(e.target.value)} disabled={checkedIn} className={`${field} w-28`} />
        </div>
      )}

      <fieldset>
        <legend className={label}>Price</legend>
        <div className="grid grid-cols-2 gap-2">
          {([['keep', 'Keep original', rupees(b.total)], ['reprice', 'Recalculate', okPreview ? rupees(okPreview.newPrice) : 'for new details']] as const).map(([v, t, sub]) => (
            <button key={v} type="button" onClick={() => setPricing(v)} aria-pressed={pricing === v}
              className={`text-left rounded-lg border px-3 py-2 transition-colors ${pricing === v ? 'border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-950/30' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
              <span className="block text-xs font-bold text-gray-900 dark:text-white">{t}</span>
              <span className="block text-[11px] text-gray-500 dark:text-gray-400">{v === 'reprice' && !okPreview ? 'at today’s rate' : sub}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {(checking || preview) && (
        <div className={`rounded-lg px-3 py-2.5 text-xs leading-relaxed border ${checking
          ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 text-gray-500 dark:text-gray-400'
          : blocked
            ? 'border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
            : 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'}`}>
          {checking ? 'Checking space and price…'
            : preview && !preview.ok ? preview.error
            : okPreview!.blocker ? okPreview!.blocker
            : <>
                ✓ Space is free · {okPreview!.hours} h · {okPreview!.newTotal === okPreview!.oldTotal ? `price stays ${rupees(okPreview!.oldTotal)}` : `price ${rupees(okPreview!.oldTotal)} → ${rupees(okPreview!.newTotal)}`}
                {okPreview!.refund > 0 && <> · <strong>{rupees(okPreview!.refund)} refunded</strong> via Razorpay</>}
                {!okPreview!.paidOnline && okPreview!.newTotal !== okPreview!.oldTotal && <> · customer pays the new amount at the location</>}
              </>}
        </div>
      )}

      <div>
        <label htmlFor="bc-note" className={label}>What the customer asked for <span className="text-red-500">*</span></label>
        <textarea id="bc-note" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Customer’s flight moved to Friday; asked to shift the booking." className={field} />
      </div>

      {msg && <p role="status" className={`text-sm font-semibold ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{msg.ok ? '✓ ' : ''}{msg.text}</p>}

      <button type="submit" disabled={pending || checking || blocked || (!dirty && pricing === 'keep') || note.trim().length < 10}
        className="w-full rounded-xl bg-orange-600 hover:bg-orange-500 py-2.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed">
        {pending ? 'Saving…' : 'Save booking change'}
      </button>
    </form>
  );
}

function CancelForm({ c }: { c: DisputeCase }) {
  const b = c.booking!;
  const p = c.payment;
  const online = !!p && p.method === 'razorpay' && (p.status === 'paid' || p.status === 'partially_refunded');
  const max = online ? Math.round((p!.amount - p!.refunded) * 100) / 100 : 0;
  const [refund, setRefund] = useState<'full' | 'none' | 'custom'>('full');
  const [amount, setAmount] = useState('');
  const [close, setClose] = useState(true);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (b.status === 'checked_in') {
    return <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">The items are already checked in, so the booking can’t be cancelled. Use “Change pick-up” to end it earlier, or ask the partner to check the customer out.</p>;
  }

  const refundValue = !online ? 0 : refund === 'full' ? max : refund === 'none' ? 0 : Number(amount) || 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(`Cancel booking #${c.bookingId.split('-')[0]!.toUpperCase()}${refundValue > 0 ? ` and refund ${rupees(refundValue)} through Razorpay` : ''}? This can’t be undone.`)) return;
    const fd = new FormData();
    fd.set('dispute_id', c.id);
    fd.set('refund', refund);
    fd.set('refund_amount', amount);
    fd.set('close_dispute', close ? 'on' : 'off');
    fd.set('note', note);
    setMsg(null);
    start(async () => {
      const r = await adminCancelBooking(fd);
      setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3.5">
      {online ? (
        <fieldset>
          <legend className={label}>Refund · paid {rupees(p!.amount)} online</legend>
          <div className="grid grid-cols-3 gap-2">
            {([['full', `Full ${rupees(max)}`], ['custom', 'Part'], ['none', 'None']] as const).map(([v, t]) => (
              <button key={v} type="button" onClick={() => setRefund(v)} aria-pressed={refund === v}
                className={`rounded-lg border px-2 py-2 text-xs font-bold transition-colors ${refund === v ? 'border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-950/30 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                {t}
              </button>
            ))}
          </div>
          {refund === 'custom' && (
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">₹</span>
              <input type="number" min={0} max={max} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`up to ${max}`} className={`${field} pl-7`} />
            </div>
          )}
        </fieldset>
      ) : (
        <p className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">
          {p ? `Pay at location (${rupees(p.amount)}), not paid yet, so there’s nothing to refund.` : 'No payment was taken, so there’s nothing to refund.'}
        </p>
      )}

      <div>
        <label htmlFor="bc-cnote" className={label}>Reason <span className="text-red-500">*</span></label>
        <textarea id="bc-cnote" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Location was closed when the customer arrived; cancelled with a full refund." className={field} />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
        <input type="checkbox" checked={close} onChange={e => setClose(e.target.checked)} className="w-4 h-4 rounded accent-orange-600" />
        Also close this dispute with this reason
      </label>

      {msg && <p role="status" className={`text-sm font-semibold ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{msg.ok ? '✓ ' : ''}{msg.text}</p>}

      <button type="submit" disabled={pending || note.trim().length < 10 || (refund === 'custom' && online && !(Number(amount) > 0))}
        className="w-full rounded-xl bg-red-600 hover:bg-red-500 py-2.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed">
        {pending ? 'Cancelling…' : refundValue > 0 ? `Cancel booking & refund ${rupees(refundValue)}` : 'Cancel booking'}
      </button>
    </form>
  );
}
