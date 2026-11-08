'use client';

import { useState, useTransition } from 'react';
import { markAwardPaid, resolveDispute } from './actions';
import { DISPUTE_STATUS, MAX_PARTNER_AWARD, type DisputeStatus } from './disputeShared';
import type { DisputeCase } from './DisputesWorkspace';

const OPTIONS: Record<'customer' | 'partner', { value: DisputeStatus; title: string; desc: string }[]> = {
  customer: [
    { value: 'under_review', title: 'Start review', desc: 'Tell both sides you’re on it' },
    { value: 'escalated', title: 'Escalate', desc: 'Senior or legal review' },
    { value: 'resolved_refund', title: 'Refund customer', desc: 'Close with money back' },
    { value: 'resolved_no_action', title: 'Close, no refund', desc: 'Close without paying out' },
  ],
  // A partner's claim: the customer isn't involved in the decision or told about it
  partner: [
    { value: 'under_review', title: 'Start review', desc: 'Tell the partner you’re on it' },
    { value: 'escalated', title: 'Escalate', desc: 'Senior or legal review' },
    { value: 'resolved_compensated', title: 'Pay the partner', desc: 'Approve the claim' },
    { value: 'resolved_no_action', title: 'Close, no payment', desc: 'Decline the claim' },
  ],
};

const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function ResolutionPanel({ c, canEdit }: { c: DisputeCase; canEdit: boolean }) {
  const [status, setStatus] = useState<DisputeStatus>(c.status === 'submitted' ? 'under_review' : (c.status as DisputeStatus));
  const [refund, setRefund] = useState(c.refundAmount ? String(c.refundAmount) : '');
  const claimed = Number((/Amount claimed: ₹([\d,.]+)/.exec(c.details)?.[1] || '').replace(/,/g, '')) || 0;
  const [award, setAward] = useState(c.award ? String(c.award) : '');
  const options = OPTIONS[c.source];
  const awardLocked = !!c.awardPaidAt;
  const [notes, setNotes] = useState(c.adminNotes);
  const [notify, setNotify] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const total = c.booking?.total || 0;
  const online = c.payment?.method === 'razorpay' && (c.payment.status === 'paid' || c.payment.status === 'partially_refunded');
  const unchanged = status === c.status && notes.trim() === c.adminNotes.trim()
    && (status !== 'resolved_refund' || Number(refund) === c.refundAmount)
    && (status !== 'resolved_compensated' || Number(award) === c.award);
  const needsNote = status.startsWith('resolved') || status === 'escalated';

  if (!canEdit) {
    return (
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Decision</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">You have view-only access to disputes.</p>
        {c.adminNotes && <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{c.adminNotes}</p>}
      </section>
    );
  }

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set('id', c.id);
    fd.set('status', status);
    fd.set('admin_notes', notes);
    fd.set('refund_amount', status === 'resolved_refund' ? refund : '0');
    fd.set('partner_award', status === 'resolved_compensated' ? award : '0');
    if (status === 'resolved_compensated' && Number(award) !== c.award
      && !window.confirm(`Approve paying the partner ${rupees(Number(award))}? Finance will be asked to transfer it.`)) return;
    fd.set('notify', notify ? 'on' : 'off');
    if (status === 'resolved_refund' && online && Number(refund) > c.refundAmount
      && !window.confirm(`Refund ${rupees(Number(refund) - (c.status === 'resolved_refund' ? c.refundAmount : 0))} to the customer through Razorpay now? This can’t be undone.`)) return;
    setMsg(null);
    start(async () => {
      const r = await resolveDispute(fd);
      setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
    });
  };

  return (
    <form data-edit onSubmit={submit} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Decision</h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Currently <strong className="text-gray-700 dark:text-gray-300">{DISPUTE_STATUS[c.status as DisputeStatus]?.label || c.status}</strong>.</p>
      </div>

      {awardLocked && (
        <p className="rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50 dark:bg-teal-950/30 px-3 py-2 text-xs text-teal-800 dark:text-teal-300">
          The partner has been paid, so the decision can’t change. You can still update the note.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Decision">
        {options.map(o => {
          const active = status === o.value;
          return (
            <button key={o.value} type="button" role="radio" aria-checked={active} disabled={awardLocked && o.value !== status} onClick={() => setStatus(o.value)}
              className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${active
                ? 'border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-950/30 ring-2 ring-orange-500/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
              <span className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
                <span className={`w-2 h-2 rounded-full ${DISPUTE_STATUS[o.value].dot}`} />{o.title}
              </span>
              <span className="block mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-gray-400">{o.desc}</span>
            </button>
          );
        })}
      </div>

      {status === 'resolved_refund' && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 space-y-2.5">
          <label htmlFor="rp-refund" className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Refund amount</label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">₹</span>
              <input id="rp-refund" type="number" min="0" max={total} step="0.01" value={refund} onChange={e => setRefund(e.target.value)} placeholder="0"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 pl-7 pr-3 py-2 text-sm font-bold tabular-nums text-gray-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
            </div>
            {[0.5, 1].map(f => (
              <button key={f} type="button" onClick={() => setRefund(String(Math.round(total * f * 100) / 100))}
                className="shrink-0 rounded-lg border border-emerald-300 dark:border-emerald-700 px-2.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
                {f === 1 ? 'Full' : 'Half'}
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-snug text-emerald-900/80 dark:text-emerald-200/80">
            Booking total {rupees(total)}.{' '}
            {online
              ? 'Paid online, so the refund goes back through Razorpay automatically.'
              : 'Not paid online, so this only records the amount; pay the customer by hand (UPI / cash).'}
          </p>
        </div>
      )}

      {status === 'resolved_compensated' && (
        <div className="rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/60 dark:bg-teal-950/20 p-3.5 space-y-2.5">
          <label htmlFor="rp-award" className="block text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">Amount to pay the partner</label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">₹</span>
              <input id="rp-award" type="number" min="1" max={MAX_PARTNER_AWARD} step="0.01" value={award} disabled={awardLocked} onChange={e => setAward(e.target.value)} placeholder="0"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 pl-7 pr-3 py-2 text-sm font-bold tabular-nums text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-60" />
            </div>
            {claimed > 0 && !awardLocked && (
              <button type="button" onClick={() => setAward(String(Math.min(claimed, MAX_PARTNER_AWARD)))}
                className="shrink-0 rounded-lg border border-teal-300 dark:border-teal-700 px-2.5 py-2 text-xs font-bold text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/30">
                As claimed
              </button>
            )}
          </div>
          <p className="text-[11px] leading-snug text-teal-900/80 dark:text-teal-200/80">
            {claimed > 0 ? `The partner claimed ${rupees(claimed)}. ` : 'The partner didn’t state an amount. '}
            StashInn pays this by bank transfer; finance records it below once it’s sent. Recover it from the customer separately if needed.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="rp-notes" className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
          {c.source === 'partner' ? 'Note to the partner' : <>Note to customer &amp; partner</>} {needsNote && <span className="text-red-500">*</span>}
        </label>
        <textarea id="rp-notes" rows={4} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder={status === 'under_review' ? 'Optional: what you’re checking' : c.source === 'partner' ? 'Explain the decision. The partner will see this.' : 'Explain the decision. Both sides will see this.'}
          className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
        <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} className="w-4 h-4 rounded accent-orange-600" />
        {c.source === 'partner' ? 'Notify the partner (app and email)' : <>Notify customer and partner (app, email{status === 'under_review' ? '' : ', SMS'})</>}
      </label>

      {msg && (
        <p role="status" className={`text-sm font-semibold ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {msg.ok ? '✓ ' : ''}{msg.text}
        </p>
      )}

      <button type="submit" disabled={pending || unchanged}
        className={`w-full rounded-xl py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${status === 'resolved_refund' ? 'bg-emerald-600 hover:bg-emerald-500' : status === 'resolved_compensated' ? 'bg-teal-600 hover:bg-teal-500' : status === 'escalated' ? 'bg-red-600 hover:bg-red-500' : 'bg-orange-600 hover:bg-orange-500'}`}>
        {pending ? 'Saving…' : status === 'resolved_refund' ? `Refund ${refund ? rupees(Number(refund)) : ''} & close` : status === 'resolved_compensated' ? `Approve ${award ? rupees(Number(award)) : ''} for the partner` : status === 'resolved_no_action' ? 'Close case' : status === 'escalated' ? 'Escalate case' : 'Mark under review'}
      </button>
      {c.resolvedAt && <p className="text-center text-[11px] text-gray-500 dark:text-gray-400">Resolved {new Date(c.resolvedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</p>}
    </form>
  );
}

/** An approved partner claim: what's owed, and finance's record of paying it. */
export function AwardPanel({ c, canPay }: { c: DisputeCase; canPay: boolean }) {
  const [reference, setReference] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const paid = !!c.awardPaidAt;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!window.confirm(`Record that ${rupees(c.award)} has been paid to ${c.partner.name}? The partner will be told.`)) return;
    const fd = new FormData();
    fd.set('id', c.id);
    fd.set('reference', reference);
    setMsg(null);
    start(async () => {
      const r = await markAwardPaid(fd);
      setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
    });
  };

  return (
    <section className={`rounded-2xl border p-5 ${paid ? 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900' : 'border-teal-300 dark:border-teal-700/60 bg-teal-50/50 dark:bg-teal-950/20'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Payment to the partner</h3>
        <span className="text-lg font-black tabular-nums text-gray-900 dark:text-white">{rupees(c.award)}</span>
      </div>
      {paid ? (
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Paid {new Date(c.awardPaidAt!).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
          {c.awardReference ? <> · ref <span className="font-mono">{c.awardReference}</span></> : null}
        </p>
      ) : canPay ? (
        <form onSubmit={submit} className="mt-3 space-y-2">
          <p className="text-xs text-gray-600 dark:text-gray-300">Transfer it to {c.partner.name}’s bank account, then record the reference here.</p>
          <label htmlFor={`ref-${c.id}`} className="sr-only">Bank or UPI reference</label>
          <input id={`ref-${c.id}`} value={reference} onChange={e => setReference(e.target.value)} placeholder="Bank / UPI reference (UTR)" maxLength={80}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm font-mono text-gray-900 dark:text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
          {msg && <p role="status" className={`text-xs font-semibold ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{msg.text}</p>}
          <button type="submit" disabled={pending || reference.trim().length < 4} className="w-full rounded-xl bg-teal-600 hover:bg-teal-500 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {pending ? 'Saving…' : 'Mark as paid'}
          </button>
        </form>
      ) : (
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Waiting for finance to pay it.</p>
      )}
    </section>
  );
}
