// A partner's monthly earnings statement. Same rules as the monthly statement email
// (partner_monthly_statements): a booking belongs to the month its storage ended (India time),
// and only completed bookings, plus no-shows that were paid online, earn anything.
//
// Where the money is (payments.collected_via, see services/dropoffPayment):
//   with the partner  pay at drop-off, paid to the partner: they already have the full price and
//                     owe StashInn its commission + GST (settled from Settlements)
//   with StashInn     paid online, or a confirmed StashInn-QR payment: StashInn pays the partner
//                     their share (the booking's partner_transactions row, completed once paid out)

import { partnerHoldsMoney, qrAwaitingConfirmation, stashinnHoldsMoney, collectionLabel } from '@stashinn/lib/services/dropoffPayment';
import { platformDue } from '@stashinn/lib/services/bookingAvailability';
import { partnerShare } from '../bookings/bookingQuery';

const IST = 'Asia/Kolkata';
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const r2 = (n: number) => Math.round(n * 100) / 100;
const monthStart = (m: string) => Date.parse(`${m}-01T00:00:00+05:30`);
export const shiftMonth = (m: string, by: number) => {
  const [y, mo] = m.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, mo - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
export const thisMonth = () => new Date().toLocaleDateString('en-CA', { timeZone: IST }).slice(0, 7);
export const monthLabel = (m: string, short = false) =>
  new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 15)).toLocaleDateString('en-IN', { month: short ? 'short' : 'long', year: 'numeric', timeZone: 'UTC' });

export type Line = {
  bookingId: string;
  endedAt: string;
  customer: string;
  items: string;
  location: string;
  noShow: boolean;
  paid: number;
  gst: number;
  commission: number;
  earned: number;
  how: string;
  holder: 'partner' | 'stashinn' | 'qr_pending';
  status: { label: string; tone: 'green' | 'amber' | 'sky' | 'gray' };
  owe: number;
};

const FIELDS = 'id, status, cancellation_code, booking_type, num_bags, vehicle_make, vehicle_model, vehicle_type, vehicle_license_plate, start_time, end_time, actual_checkout, total_amount, base_amount, gst_amount, commission_amount, partner_amount, customer:users!bookings_customer_id_fkey(full_name), partner_locations(name), payments(*), partner_transactions(amount, transfer_status, transfer_proof)';

async function fetchEnded(supabase: any, partnerId: string, from: number, to: number) {
  const out: any[] = [];
  for (let page = 0; page < 20; page++) {
    const { data, error } = await supabase.from('bookings').select(FIELDS).eq('partner_id', partnerId)
      .in('status', ['checked_out', 'cancelled'])
      .gte('end_time', new Date(from).toISOString()).lt('end_time', new Date(to).toISOString())
      .order('end_time', { ascending: false }).range(page * 1000, page * 1000 + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

function toLine(b: any, itemsLabel: (b: any) => string): Line | null {
  const pay = one(b.payments) as any;
  const noShow = b.status === 'cancelled' && b.cancellation_code === 'no_show';
  if (b.status === 'cancelled' && !(noShow && stashinnHoldsMoney(pay))) return null; // nothing earned
  const earned = partnerShare(b);
  const ledger = (b.partner_transactions || []).find((t: any) => !t.transfer_proof);
  const holder: Line['holder'] = qrAwaitingConfirmation(pay) ? 'qr_pending' : partnerHoldsMoney(pay) ? 'partner' : 'stashinn';
  const owe = holder === 'partner' && pay?.status !== 'paid' ? platformDue(b) : 0;
  const status: Line['status'] =
    holder === 'qr_pending' ? { label: 'QR payment being confirmed', tone: 'sky' }
    : holder === 'stashinn' ? (ledger?.transfer_status === 'completed' ? { label: 'Paid out', tone: 'green' } : { label: 'To be paid to you', tone: 'amber' })
    : pay?.status === 'paid' ? { label: 'Collected · StashInn’s share settled', tone: 'green' }
    : pay?.status === 'pending_validation' ? { label: 'Collected · settlement being verified', tone: 'sky' }
    : { label: 'Collected · StashInn’s share due', tone: 'amber' };
  return {
    bookingId: b.id,
    endedAt: b.actual_checkout || b.end_time,
    customer: (one(b.customer) as any)?.full_name || 'Customer',
    items: itemsLabel(b),
    location: (one(b.partner_locations) as any)?.name || '',
    noShow,
    paid: Number(b.total_amount) || 0,
    gst: Number(b.gst_amount) || 0,
    commission: Number(b.commission_amount) || 0,
    earned,
    how: pay?.method === 'razorpay' ? 'Online' : collectionLabel(pay?.collected_via) || 'At drop-off',
    holder,
    status,
    owe,
  };
}

const total = (lines: Line[], k: 'paid' | 'gst' | 'commission' | 'earned' | 'owe') => r2(lines.reduce((s, l) => s + l[k], 0));

export async function loadEarnings(supabase: any, partnerId: string, month: string, itemsLabel: (b: any) => string) {
  // The month, plus the five before it for the trend
  const from = monthStart(shiftMonth(month, -5));
  const to = monthStart(shiftMonth(month, 1));
  const rows = await fetchEnded(supabase, partnerId, from, to);
  const monthOf = (b: any) => new Date(b.end_time).toLocaleDateString('en-CA', { timeZone: IST }).slice(0, 7);

  const all = rows.map(b => ({ m: monthOf(b), line: toLine(b, itemsLabel) })).filter(x => x.line) as { m: string; line: Line }[];
  const lines = all.filter(x => x.m === month).map(x => x.line);
  const prev = all.filter(x => x.m === shiftMonth(month, -1)).map(x => x.line);

  const withYou = lines.filter(l => l.holder === 'partner');
  const fromStashInn = lines.filter(l => l.holder === 'stashinn');
  const paidOut = fromStashInn.filter(l => l.status.label === 'Paid out');

  // Day by day within the month
  const days = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const daily = Array.from({ length: days }, (_, i) => {
    const key = `${month}-${String(i + 1).padStart(2, '0')}`;
    const d = new Date(`${key}T12:00:00+05:30`);
    return {
      label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: IST }),
      value: r2(lines.filter(l => new Date(l.endedAt).toLocaleDateString('en-CA', { timeZone: IST }) === key).reduce((s, l) => s + l.earned, 0)),
    };
  });
  const trend = Array.from({ length: 6 }, (_, i) => {
    const m = shiftMonth(month, i - 5);
    return { label: monthLabel(m, true), value: r2(all.filter(x => x.m === m).reduce((s, x) => s + x.line.earned, 0)) };
  });

  return {
    lines: lines.sort((a, b) => b.endedAt.localeCompare(a.endedAt)),
    customersPaid: total(lines, 'paid'),
    gst: total(lines, 'gst'),
    commission: total(lines, 'commission'),
    earned: total(lines, 'earned'),
    previousEarned: total(prev, 'earned'),
    withYou: total(withYou, 'earned'),
    withYouCount: withYou.length,
    owe: total(lines, 'owe'),
    fromStashInn: total(fromStashInn, 'earned'),
    paidOut: total(paidOut, 'earned'),
    toBePaid: r2(total(fromStashInn, 'earned') - total(paidOut, 'earned')),
    qrPending: total(lines.filter(l => l.holder === 'qr_pending'), 'earned'),
    noShows: lines.filter(l => l.noShow).length,
    daily,
    trend,
  };
}
export type Earnings = Awaited<ReturnType<typeof loadEarnings>>;
