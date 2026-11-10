// Admin view of money between StashInn and partners. Server-only (service role, after the page's access check).
//
//   proofs   partners' transfers of StashInn's share on pay-at-drop-off bookings they collected
//            (partner_transactions rows with a transfer_proof; one upload can cover several bookings)
//   dues     completed pay-at-drop-off bookings the partner collected and hasn't settled yet
//   payouts  partners' shares StashInn holds (online, or confirmed StashInn-QR) on completed bookings,
//            still to be paid out (the booking's partner_transactions row without a proof, pending)

import { platformDue } from '@stashinn/lib/services/bookingAvailability';
import { stashinnHoldsMoney } from '@stashinn/lib/services/dropoffPayment';

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const r2 = (n: number) => Math.round(n * 100) / 100;
export const ref = (id: string) => id.split('-')[0]!.toUpperCase();

export type ProofBatch = {
  path: string;
  partner: { id: string; name: string };
  reference: string;
  declared: number | null;
  submittedAt: string;
  bookings: { id: string; location: string; pickedUp: string | null; owed: number }[];
  total: number;
  proofUrl: string | null;
  isPdf: boolean;
};
export type PartnerSum = { partnerId: string; name: string; count: number; total: number; oldest: string | null };

export async function loadAdminSettlements(db: any) {
  const [{ data: proofRows }, { data: cash }, { data: ledger }, { data: awards }] = await Promise.all([
    db.from('partner_transactions')
      .select('id, partner_id, booking_id, notes, created_at, transfer_proof, partners(id, business_name), bookings(id, commission_amount, gst_amount, actual_checkout, end_time, partner_locations(name))')
      .not('transfer_proof', 'is', null).eq('transfer_status', 'pending').order('created_at').limit(1000),
    db.from('payments').select('*, bookings!inner(id, partner_id, status, actual_checkout, end_time, commission_amount, gst_amount, partners(business_name))')
      .eq('method', 'pay_at_location').eq('status', 'pending').eq('bookings.status', 'checked_out').limit(3000),
    db.from('partner_transactions')
      .select('id, partner_id, amount, created_at, partners(business_name), bookings(id, status, cancellation_code, actual_checkout, end_time, payments(*))')
      .is('transfer_proof', null).eq('transfer_status', 'pending').limit(5000),
    db.from('damage_reports').select('*, partners(business_name)').eq('status', 'resolved_compensated'),
  ]);

  // Proofs, one card per upload
  const batches = new Map<string, ProofBatch>();
  for (const t of (proofRows || []) as any[]) {
    const b = one(t.bookings) as any;
    const p = one(t.partners) as any;
    const owed = b ? platformDue(b) : 0;
    const cur: ProofBatch = batches.get(t.transfer_proof) ?? {
      path: t.transfer_proof,
      partner: { id: t.partner_id, name: p?.business_name || 'Partner' },
      reference: /Txn ID: ([^.\s]+)/.exec(t.notes || '')?.[1] || '',
      declared: (() => { const m = /Paid ₹([\d,.]+)/.exec(t.notes || ''); return m ? Number(m[1]!.replace(/,/g, '')) : null; })(),
      submittedAt: t.created_at,
      bookings: [],
      total: 0,
      proofUrl: null,
      isPdf: /\.pdf$/i.test(t.transfer_proof),
    };
    cur.bookings.push({ id: t.booking_id, location: (one(b?.partner_locations) as any)?.name || '', pickedUp: b?.actual_checkout || b?.end_time || null, owed });
    cur.total = r2(cur.total + owed);
    batches.set(t.transfer_proof, cur);
  }

  const group = (items: { partnerId: string; name: string; amount: number; at: string | null }[]) => {
    const m = new Map<string, PartnerSum>();
    for (const i of items) {
      const cur = m.get(i.partnerId) ?? { partnerId: i.partnerId, name: i.name, count: 0, total: 0, oldest: null };
      cur.count += 1;
      cur.total = r2(cur.total + i.amount);
      if (i.at && (!cur.oldest || i.at < cur.oldest)) cur.oldest = i.at;
      m.set(i.partnerId, cur);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  };

  // Cash dues: partner collected (not on the StashInn QR), booking complete, not settled
  const dues = group(((cash || []) as any[]).filter(p => p.collected_via !== 'stashinn_qr').map(p => {
    const b = one(p.bookings) as any;
    return { partnerId: b.partner_id, name: (one(b.partners) as any)?.business_name || 'Partner', amount: platformDue(b), at: b.actual_checkout || b.end_time };
  }));

  // Payouts: StashInn holds the money and the booking is complete (or an online-paid no-show)
  const payouts = group(((ledger || []) as any[]).filter(t => {
    const b = one(t.bookings) as any;
    const done = b?.status === 'checked_out' || (b?.status === 'cancelled' && b?.cancellation_code === 'no_show');
    return done && stashinnHoldsMoney(one(b?.payments) as any);
  }).map(t => {
    const b = one(t.bookings) as any;
    return { partnerId: t.partner_id, name: (one(t.partners) as any)?.business_name || 'Partner', amount: Number(t.amount) || 0, at: b.actual_checkout || b.end_time };
  }));

  const awardRows = ((awards || []) as any[]).filter(a => Number(a.partner_award) > 0 && !a.partner_award_paid_at);
  return {
    batches: [...batches.values()],
    dues,
    payouts,
    awardsOwed: r2(awardRows.reduce((s, a) => s + Number(a.partner_award), 0)),
    awardsCount: awardRows.length,
  };
}

/** The ledger rows a payout to this partner covers (same rule as above). */
export async function payableRows(db: any, partnerId: string) {
  const { data } = await db.from('partner_transactions')
    .select('id, amount, bookings(status, cancellation_code, payments(*))')
    .eq('partner_id', partnerId).is('transfer_proof', null).eq('transfer_status', 'pending').limit(5000);
  return ((data || []) as any[]).filter(t => {
    const b = one(t.bookings) as any;
    const done = b?.status === 'checked_out' || (b?.status === 'cancelled' && b?.cancellation_code === 'no_show');
    return done && stashinnHoldsMoney(one(b?.payments) as any);
  }) as { id: string; amount: number }[];
}
