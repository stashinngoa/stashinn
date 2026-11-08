// Money between a partner and StashInn, in both directions.
//
// Pay at drop-off (payments.method = 'pay_at_location'): at check-in the partner records who took
// the money (payments.collected_via). Paid to the partner (cash / their UPI): the partner owes
// StashInn its commission + the GST. Paid on the StashInn QR: StashInn has the money and owes the
// partner their share once finance confirms it arrived (status pending -> paid). It becomes due once
// the booking is complete (picked up). payments.status tracks that settlement:
//   pending -> pending_validation (proof uploaded) -> paid (finance approved).
// Requested, confirmed, cancelled and no-show bookings never had cash collected, so nothing is due.
//
// Paid online (razorpay): StashInn holds the money and owes the partner their share
// (partner_transactions rows without a proof, transfer_status pending) once the booking is
// complete, or for an online-paid no-show. Approved claim awards (damage_reports) are owed too.

import { platformDue } from '@stashinn/lib/services/bookingAvailability';
import { partnerHoldsMoney, qrAwaitingConfirmation, stashinnHoldsMoney } from '@stashinn/lib/services/dropoffPayment';

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const r2 = (n: number) => Math.round(n * 100) / 100;

export type DueRow = {
  paymentId: string;
  bookingId: string;
  customer: string;
  items: string;
  location: string;
  pickedUp: string | null;
  collected: number;
  commission: number;
  gst: number;
  owed: number;
  submittedAt?: string | null;
};

export type ProofBatch = {
  key: string;
  proofPath: string;
  proofUrl: string | null;
  reference: string;
  submittedAt: string;
  status: 'pending' | 'completed' | 'failed' | 'processing';
  bookings: { id: string; owed: number }[];
  total: number;
};

const BOOKING = 'id, partner_id, status, cancellation_code, booking_type, num_bags, vehicle_make, vehicle_model, vehicle_type, vehicle_license_plate, start_time, end_time, actual_checkin, actual_checkout, total_amount, commission_amount, gst_amount, partner_amount, customer:users!bookings_customer_id_fkey(full_name), partner_locations(name)';

export async function loadSettlements(supabase: any, partnerId: string, itemsLabel: (b: any) => string) {
  const [{ data: cash }, { data: ledger }, { data: claims }] = await Promise.all([
    // * so this works before the collected_via columns exist (older rows count as collected by the partner)
    supabase.from('payments').select(`*, bookings!inner(${BOOKING})`)
      .eq('method', 'pay_at_location').eq('bookings.partner_id', partnerId).order('created_at', { ascending: false }).limit(2000),
    supabase.from('partner_transactions').select('id, booking_id, amount, commission, transfer_status, transfer_proof, notes, created_at, bookings(id, status, cancellation_code, end_time, actual_checkout, commission_amount, gst_amount, payments(*))')
      .eq('partner_id', partnerId).order('created_at', { ascending: false }).limit(3000),
    // * so this works before the partner-award columns exist
    supabase.from('damage_reports').select('*').eq('partner_id', partnerId).eq('status', 'resolved_compensated'),
  ]);

  const row = (p: any): DueRow => {
    const b = one(p.bookings) as any;
    return {
      paymentId: p.id,
      bookingId: b.id,
      customer: (one(b.customer) as any)?.full_name || 'Customer',
      items: itemsLabel(b),
      location: (one(b.partner_locations) as any)?.name || '',
      pickedUp: b.actual_checkout || (b.status === 'checked_out' ? b.end_time : null),
      collected: Number(b.total_amount) || 0,
      commission: Number(b.commission_amount) || 0,
      gst: Number(b.gst_amount) || 0,
      owed: platformDue(b),
      submittedAt: p.status === 'pending_validation' ? p.updated_at : null,
    };
  };
  const allDropoff = (cash || []) as any[];
  const cashRows = allDropoff.filter(p => partnerHoldsMoney(p));
  const qrPending = allDropoff.filter(p => qrAwaitingConfirmation(p) && ['checked_in', 'checked_out'].includes((one(p.bookings) as any)?.status));
  const status = (p: any) => (one(p.bookings) as any)?.status as string;
  const due = cashRows.filter(p => p.status === 'pending' && status(p) === 'checked_out').map(row)
    .sort((a, b) => String(a.pickedUp).localeCompare(String(b.pickedUp)));
  const verifying = cashRows.filter(p => p.status === 'pending_validation').map(row);
  const notYet = cashRows.filter(p => p.status === 'pending' && status(p) === 'checked_in').map(row);
  const settled = cashRows.filter(p => p.status === 'paid' && status(p) === 'checked_out');

  // StashInn → partner: online shares of completed bookings (and online-paid no-shows)
  let onlineOwed = 0;
  let onlineCount = 0;
  let onlineUpcoming = 0;
  for (const t of (ledger || []) as any[]) {
    if (t.transfer_proof || t.transfer_status !== 'pending') continue;
    const b = one(t.bookings) as any;
    const pay = one(b?.payments) as any;
    if (!b || !stashinnHoldsMoney(pay)) continue;
    const payable = b.status === 'checked_out' || (b.status === 'cancelled' && b.cancellation_code === 'no_show');
    if (payable) { onlineOwed += Number(t.amount) || 0; onlineCount += 1; }
    else if (['confirmed', 'checked_in'].includes(b.status)) onlineUpcoming += Number(t.amount) || 0;
  }
  const awards = ((claims || []) as any[]).filter(c => Number(c.partner_award) > 0 && !c.partner_award_paid_at);
  const awardsOwed = awards.reduce((s, c) => s + Number(c.partner_award), 0);

  // Proofs the partner sent, grouped by upload (one transfer can cover several bookings)
  const batches = new Map<string, ProofBatch>();
  for (const t of (ledger || []) as any[]) {
    if (!t.transfer_proof) continue;
    const b = one(t.bookings) as any;
    const owed = b ? platformDue(b) : Number(t.commission) || 0;
    const existing = batches.get(t.transfer_proof);
    const ref = /Txn ID: ([^.\s]+)/.exec(t.notes || '')?.[1] || '';
    if (existing) {
      existing.bookings.push({ id: t.booking_id, owed });
      existing.total = r2(existing.total + owed);
      if (t.transfer_status === 'failed') existing.status = 'failed';
      else if (t.transfer_status === 'pending' && existing.status === 'completed') existing.status = 'pending';
    } else {
      batches.set(t.transfer_proof, { key: t.transfer_proof, proofPath: t.transfer_proof, proofUrl: null, reference: ref, submittedAt: t.created_at, status: t.transfer_status, bookings: [{ id: t.booking_id, owed }], total: r2(owed) });
    }
  }

  const sum = (rows: DueRow[]) => r2(rows.reduce((s, r) => s + r.owed, 0));
  return {
    due, verifying, notYet,
    dueTotal: sum(due),
    verifyingTotal: sum(verifying),
    notYetTotal: sum(notYet),
    settledTotal: r2(settled.reduce((s, p) => s + platformDue(one(p.bookings) as any), 0)),
    settledCount: settled.length,
    onlineOwed: r2(onlineOwed),
    onlineCount,
    onlineUpcoming: r2(onlineUpcoming),
    awardsOwed: r2(awardsOwed),
    awardsCount: awards.length,
    batches: [...batches.values()].slice(0, 30),
    qrPending: qrPending.map(p => ({ ...row(p), share: Number((one(p.bookings) as any)?.partner_amount) || 0, reference: p.qr_reference || '' })),
    ignored: cashRows.filter(p => p.status === 'pending' && !['checked_out', 'checked_in'].includes(status(p))).length,
  };
}
export type Settlements = Awaited<ReturnType<typeof loadSettlements>>;
