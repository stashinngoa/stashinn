// Partner performance report: everything is computed from the partner's own bookings
// (read with their session, so RLS scopes it) for drop-offs in a date range, India time.

import { partnerShare } from '../bookings/bookingQuery';

export const IST = 'Asia/Kolkata';
const DAY = 864e5;
const dayKey = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: IST });
const istMidnight = (key: string) => Date.parse(`${key}T00:00:00+05:30`);
const addDays = (key: string, n: number) => dayKey(istMidnight(key) + n * DAY + 12 * 3600e3);

export const PRESETS = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'year', label: 'This year' },
] as const;

export type Range = { from: string; to: string; preset: string; label: string };

/** Inclusive India-time date range from the URL (defaults to the last 30 days). */
export function parseRange(sp: Record<string, string | undefined>, now = Date.now()): Range {
  const today = dayKey(now);
  const valid = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null);
  const from = valid(sp.from);
  const to = valid(sp.to);
  if (from && to) {
    const [a, b] = from <= to ? [from, to] : [to, from];
    // At most two years, so a report stays quick
    const start = istMidnight(b) - istMidnight(a) > 731 * DAY ? addDays(b, -730) : a;
    return { from: start, to: b, preset: 'custom', label: `${fmtDay(start)} – ${fmtDay(b)}` };
  }
  const preset = PRESETS.find(p => p.key === sp.range)?.key ?? '30d';
  const [y, m] = today.split('-').map(Number) as [number, number];
  const monthStart = `${today.slice(0, 7)}-01`;
  const range = (() => {
    switch (preset) {
      case '7d': return { from: addDays(today, -6), to: today };
      case 'month': return { from: monthStart, to: today };
      case 'last_month': {
        const lm = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
        return { from: `${lm}-01`, to: addDays(monthStart, -1) };
      }
      case '90d': return { from: addDays(today, -89), to: today };
      case 'year': return { from: `${y}-01-01`, to: today };
      default: return { from: addDays(today, -29), to: today };
    }
  })();
  return { ...range, preset, label: PRESETS.find(p => p.key === preset)!.label };
}

export const fmtDay = (key: string) => new Date(`${key}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: IST });

const FIELDS = 'id, status, cancellation_code, booking_type, num_bags, start_time, end_time, created_at, confirmed_at, actual_checkin, actual_checkout, total_amount, base_amount, commission_amount, partner_amount, customer_id, location_id';

/** Every booking in the window (PostgREST returns at most 1,000 rows per request). */
async function fetchAll(supabase: any, partnerId: string, fromMs: number, toMs: number, location: string) {
  const out: any[] = [];
  for (let page = 0; page < 50; page++) {
    let q = supabase.from('bookings').select(FIELDS).eq('partner_id', partnerId)
      .gte('start_time', new Date(fromMs).toISOString()).lt('start_time', new Date(toMs).toISOString())
      .order('start_time', { ascending: true }).range(page * 1000, page * 1000 + 999);
    if (location) q = q.eq('location_id', location);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
};

function summarise(rows: any[]) {
  const done = rows.filter(b => b.status === 'checked_out');
  const active = rows.filter(b => ['confirmed', 'checked_in'].includes(b.status));
  const cancelled = rows.filter(b => b.status === 'cancelled');
  const byCode = (c: string) => cancelled.filter(b => b.cancellation_code === c).length;
  const declined = byCode('partner');
  const noResponse = byCode('partner_no_response');
  const noShow = byCode('no_show');
  const answered = rows.filter(b => b.confirmed_at || b.cancellation_code === 'partner');
  const accepted = rows.filter(b => b.confirmed_at).length;
  return {
    requests: rows.length,
    completed: done.length,
    active: active.length,
    pending: rows.filter(b => b.status === 'pending').length,
    cancelledByCustomer: byCode('customer'),
    cancelledByStashInn: byCode('admin') + cancelled.filter(b => !b.cancellation_code).length,
    declined,
    noResponse,
    noShow,
    earned: done.reduce((s, b) => s + partnerShare(b), 0),
    upcoming: active.reduce((s, b) => s + partnerShare(b), 0),
    customerPaid: done.reduce((s, b) => s + Number(b.total_amount || 0), 0),
    avgValue: done.length ? done.reduce((s, b) => s + Number(b.total_amount || 0), 0) / done.length : null,
    // Of the requests you (or the clock) answered, how many you accepted
    acceptRate: answered.length + noResponse ? accepted / (answered.length + noResponse) : null,
    responseMins: median(rows.filter(b => b.confirmed_at).map(b => (Date.parse(b.confirmed_at) - Date.parse(b.created_at)) / 60000).filter(m => m >= 0)),
    avgStayHours: done.length ? done.reduce((s, b) => s + (Date.parse(b.actual_checkout || b.end_time) - Date.parse(b.actual_checkin || b.start_time)) / 3600e3, 0) / done.length : null,
    bags: done.filter(b => b.booking_type !== 'garage').reduce((s, b) => s + (Number(b.num_bags) || 0), 0),
    vehicles: done.filter(b => b.booking_type === 'garage').length,
    lostRate: rows.length ? (declined + noResponse + noShow + byCode('customer')) / rows.length : null,
  };
}
export type Summary = ReturnType<typeof summarise>;

export type Bucket = { key: string; label: string; from: string; bookings: number; completed: number; cancelled: number; earned: number; customerPaid: number };

export async function loadReport(supabase: any, partnerId: string, range: Range, location: string) {
  const fromMs = istMidnight(range.from);
  const toMs = istMidnight(range.to) + DAY;
  const span = toMs - fromMs;
  const prevFrom = fromMs - span;

  const [rows, prevRows, { data: reviews }, { data: locations }] = await Promise.all([
    fetchAll(supabase, partnerId, fromMs, toMs, location),
    fetchAll(supabase, partnerId, prevFrom, fromMs, location),
    (() => {
      let q = supabase.from('reviews').select('rating, location_id, created_at').eq('partner_id', partnerId)
        .gte('created_at', new Date(fromMs).toISOString()).lt('created_at', new Date(toMs).toISOString()).limit(5000);
      if (location) q = q.eq('location_id', location);
      return q;
    })(),
    supabase.from('partner_locations').select('id, name, location_type').eq('partner_id', partnerId).order('created_at'),
  ]);

  // Daily buckets up to ~2 months, then weekly (Monday) buckets
  const days = Math.round(span / DAY);
  const weekly = days > 62;
  const buckets: Bucket[] = [];
  const index = new Map<string, Bucket>();
  for (let k = range.from; k <= range.to; k = addDays(k, 1)) {
    const d = new Date(`${k}T12:00:00+05:30`);
    const bucketKey = weekly ? addDays(k, -((d.getUTCDay() + 6) % 7)) : k;
    if (!index.has(bucketKey)) {
      const b: Bucket = {
        key: bucketKey,
        from: k,
        label: weekly ? `Week of ${new Date(`${bucketKey}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: IST })}` : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: IST }),
        bookings: 0, completed: 0, cancelled: 0, earned: 0, customerPaid: 0,
      };
      index.set(bucketKey, b);
      buckets.push(b);
    }
    index.set(k, index.get(bucketKey)!);
  }
  const weekdays = Array.from({ length: 7 }, () => 0);
  const hours = Array.from({ length: 24 }, () => 0);
  const customers = new Map<string, number>();
  for (const b of rows) {
    const k = dayKey(Date.parse(b.start_time));
    const bucket = index.get(k);
    if (bucket) {
      bucket.bookings += 1;
      if (b.status === 'checked_out') { bucket.completed += 1; bucket.earned += partnerShare(b); bucket.customerPaid += Number(b.total_amount || 0); }
      if (b.status === 'cancelled') bucket.cancelled += 1;
    }
    if (b.status !== 'cancelled' || b.cancellation_code === 'no_show') {
      const d = new Date(`${k}T12:00:00+05:30`);
      weekdays[(d.getUTCDay() + 6) % 7]! += 1;
      hours[Number(new Date(b.start_time).toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: IST })) % 24]! += 1;
    }
    customers.set(b.customer_id, (customers.get(b.customer_id) || 0) + 1);
  }

  const locs = (locations || []) as { id: string; name: string; location_type: string }[];
  const byLocation = locs
    .filter(l => !location || l.id === location)
    .map(l => {
      const lr = rows.filter(b => b.location_id === l.id);
      const s = summarise(lr);
      const rv = (reviews || []).filter((r: any) => r.location_id === l.id);
      return { id: l.id, name: l.name, type: l.location_type, ...s, rating: rv.length ? rv.reduce((a: number, r: any) => a + Number(r.rating), 0) / rv.length : null, reviews: rv.length };
    })
    .sort((a, b) => b.earned - a.earned || b.requests - a.requests);

  const rv = (reviews || []) as { rating: number }[];
  return {
    summary: summarise(rows),
    previous: summarise(prevRows),
    previousLabel: `${fmtDay(dayKey(prevFrom))} – ${fmtDay(dayKey(fromMs - 1))}`,
    buckets,
    weekly,
    weekdays,
    hours,
    byLocation,
    locations: locs,
    rating: rv.length ? rv.reduce((a, r) => a + Number(r.rating), 0) / rv.length : null,
    reviews: rv.length,
    customers: customers.size,
    returning: [...customers.values()].filter(n => n > 1).length,
  };
}
export type Report = Awaited<ReturnType<typeof loadReport>>;
