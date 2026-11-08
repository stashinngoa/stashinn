/**
 * Cancelling a booking and refunding it, shared by the customer, partner and admin apps and
 * by the scheduled jobs, so every path refunds and records the same way.
 *
 * Order: the booking is cancelled first, guarded on its current status (so a partner
 * accepting at the same moment wins cleanly), then any online payment is refunded. A refund
 * Razorpay refuses is queued for the refund-retry job instead of being lost.
 *
 * Always pass a service-role client.
 */

export type Db = { from: (table: string) => any; rpc?: (...args: any[]) => any };
export type CancellationCode = 'customer' | 'partner' | 'admin' | 'partner_no_response' | 'no_show';
export type CancelledBy = 'customer' | 'partner' | 'admin' | 'system';

export const REFUND_RETRY_JOB = 'payments.refund_retry';

const round2 = (n: number) => Math.round(n * 100) / 100;
export const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export type LivePayment = {
  id: string;
  amount: number | string;
  status: string;
  method: string;
  razorpay_payment_id: string | null;
  refund_amount: number | string | null;
  refund_reason: string | null;
} | null;

/** The booking's current payment: paid, part-refunded, or still due at the location. */
export async function livePayment(db: Db, bookingId: string): Promise<LivePayment> {
  const { data } = await db
    .from('payments')
    .select('id, amount, status, method, razorpay_payment_id, refund_amount, refund_reason')
    .eq('booking_id', bookingId)
    .in('status', ['paid', 'partially_refunded', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export const isPaidOnline = (p: LivePayment) =>
  !!p && p.method === 'razorpay' && !!p.razorpay_payment_id && (p.status === 'paid' || p.status === 'partially_refunded');

/** What can still go back to the customer from an online payment. */
export const refundableAmount = (p: LivePayment) =>
  isPaidOnline(p) ? round2((Number(p!.amount) || 0) - (Number(p!.refund_amount) || 0)) : 0;

const razorpayAuth = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  return keyId && secret ? `Basic ${Buffer.from(`${keyId}:${secret}`).toString('base64')}` : null;
};

/** Captured Razorpay payments created between two times (newest first, up to `max`). */
export async function razorpayListPayments(from: Date, to: Date, max = 300): Promise<{ items: any[] } | { error: string }> {
  const auth = razorpayAuth();
  if (!auth) return { error: 'Razorpay keys are not configured on the server.' };
  const items: any[] = [];
  try {
    for (let skip = 0; skip < max; skip += 100) {
      const qs = new URLSearchParams({ from: String(Math.floor(from.getTime() / 1000)), to: String(Math.floor(to.getTime() / 1000)), count: '100', skip: String(skip) });
      const res = await fetch(`https://api.razorpay.com/v1/payments?${qs}`, { headers: { Authorization: auth } });
      const body: any = await res.json().catch(() => ({}));
      if (!res.ok) return { error: body?.error?.description || `Razorpay returned ${res.status}.` };
      items.push(...(body.items || []));
      if ((body.items || []).length < 100) break;
    }
    return { items };
  } catch {
    return { error: 'Couldn’t reach Razorpay.' };
  }
}

/** Refunds `amount` rupees of a Razorpay payment directly (no booking needed). */
export const razorpayRefundPayment = (paymentId: string, amount: number, note: string) => razorpayRefund(paymentId, amount, note);

async function razorpayRefund(paymentId: string, amount: number, note: string): Promise<{ id: string } | { error: string }> {
  const auth = razorpayAuth();
  if (!auth) return { error: 'Razorpay keys are not configured on the server.' };
  try {
    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(amount * 100), notes: { reason: note.slice(0, 250) } }),
    });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body?.error?.description || `Razorpay returned ${res.status}.` };
    return { id: body.id };
  } catch {
    return { error: 'Couldn’t reach Razorpay.' };
  }
}

/**
 * Refunds part of an online payment through Razorpay and records it on the payment.
 * `kind: 'none'` when the booking wasn't paid online, so there's nothing to send back.
 */
export async function refundOnlinePayment(
  db: Db, bookingId: string, amount: number, label: string,
): Promise<{ kind: 'online'; id: string; amount: number } | { kind: 'none' } | { error: string }> {
  const payment = await livePayment(db, bookingId);
  if (!isPaidOnline(payment)) return { kind: 'none' };
  const left = refundableAmount(payment);
  const value = round2(Math.min(amount, left));
  if (value <= 0) return { kind: 'none' };
  if (amount > left + 0.001) return { error: `Only ${rupees(left)} of this online payment can still be refunded.` };

  const r = await razorpayRefund(payment!.razorpay_payment_id!, value, label);
  if ('error' in r) return { error: `Razorpay refund failed: ${r.error}` };
  const total = round2((Number(payment!.refund_amount) || 0) + value);
  await db.from('payments').update({
    status: total >= (Number(payment!.amount) || 0) ? 'refunded' : 'partially_refunded',
    refund_amount: total,
    refund_reason: [payment!.refund_reason, `Razorpay refund ${r.id} (${label})`].filter(Boolean).join(' · '),
    updated_at: new Date().toISOString(),
  }).eq('id', payment!.id);
  return { kind: 'online', id: r.id, amount: value };
}

/** Puts a refund Razorpay refused on the refund-retry job's queue (first retry in 5 minutes). */
export async function queueRefundRetry(db: Db, bookingId: string, amount: number, label: string, error: string) {
  await db.from('job_events').upsert({
    job: REFUND_RETRY_JOB,
    entity_type: 'booking',
    entity_id: bookingId,
    step: `refund:${label}`,
    dry_run: false,
    status: 'failed',
    attempts: 1,
    next_attempt_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    last_error: error.slice(0, 500),
    detail: { amount, label },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'job,entity_id,step,dry_run', ignoreDuplicates: true });
}

export type CancelResult =
  | { ok: true; paidOnline: boolean; refunded: number; refundQueued: number; refundError?: string }
  | { ok: false; reason: 'not_found' | 'changed' | 'db'; error: string };

/**
 * Cancels a booking if it is still in one of `fromStatuses`, then refunds online payments.
 * `refund`: 'full' = everything still refundable, 'none', or an amount in rupees.
 */
export async function cancelBooking(db: Db, bookingId: string, opts: {
  by: CancelledBy;
  code: CancellationCode;
  reason: string;
  refund: 'full' | 'none' | number;
  fromStatuses?: string[];
}): Promise<CancelResult> {
  const from = opts.fromStatuses ?? ['pending', 'confirmed'];
  const { data: booking } = await db.from('bookings').select('id, status').eq('id', bookingId).maybeSingle();
  if (!booking) return { ok: false, reason: 'not_found', error: 'Booking not found.' };
  if (!from.includes(booking.status)) return { ok: false, reason: 'changed', error: `This booking is ${String(booking.status).replace(/_/g, ' ')} now, so it can’t be cancelled.` };

  const { data: updated, error } = await db.from('bookings').update({
    status: 'cancelled',
    cancelled_by: opts.by,
    cancellation_code: opts.code,
    cancellation_reason: opts.reason,
  }).eq('id', bookingId).in('status', from).select('id');
  if (error) return { ok: false, reason: 'db', error: error.message };
  if (!updated?.length) return { ok: false, reason: 'changed', error: 'The booking changed at the same moment. Refresh and check it.' };

  const payment = await livePayment(db, bookingId);
  const online = isPaidOnline(payment);

  // The booking won't happen, so neither does its payout. An online-paid no-show keeps it:
  // the partner held the space and the customer isn't refunded.
  if (!(opts.code === 'no_show' && online)) {
    await db.from('partner_transactions').delete()
      .eq('booking_id', bookingId).eq('transfer_status', 'pending').is('transfer_proof', null);
  }

  const amount = !online ? 0 : opts.refund === 'full' ? refundableAmount(payment) : opts.refund === 'none' ? 0 : round2(opts.refund);
  if (amount <= 0) return { ok: true, paidOnline: online, refunded: 0, refundQueued: 0 };

  const label = `${opts.code} cancellation`;
  const r = await refundOnlinePayment(db, bookingId, amount, label);
  if ('error' in r) {
    await queueRefundRetry(db, bookingId, amount, label, r.error);
    return { ok: true, paidOnline: true, refunded: 0, refundQueued: amount, refundError: r.error };
  }
  return { ok: true, paidOnline: true, refunded: r.kind === 'online' ? r.amount : 0, refundQueued: 0 };
}
