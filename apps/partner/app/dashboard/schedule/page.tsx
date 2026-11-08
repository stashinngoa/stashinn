import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import Icon from '../../../components/Icon';
import CalendarView, { type CalBooking, type CalDay } from './CalendarView';
import { dayKey, inr, itemsLabel, ref, statusOf } from '../bookings/bookingShared';
import { partnerShare } from '../bookings/bookingQuery';

const DAY = 864e5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const istMidnight = (key: string) => new Date(`${key}T00:00:00+05:30`).getTime();
const keyOf = (ms: number) => dayKey(new Date(ms));
const PAUSE_REASON: Record<string, string> = { maintenance: 'Maintenance', renovation: 'Renovation', holiday: 'Holiday', staff: 'Staff unavailable', other: 'Closed' };

/** Most items stored at once during [from, to), from intervals of [start, end, amount]. */
function peak(intervals: [number, number, number][], from: number, to: number) {
  const events: [number, number][] = [];
  let level = 0;
  for (const [s, e, n] of intervals) {
    if (s >= to || e <= from) continue;
    if (s <= from) level += n; else events.push([s, n]);
    if (e < to) events.push([e, -n]);
  }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let max = level;
  for (const [, d] of events) { level += d; max = Math.max(max, level); }
  return max;
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');

  const now = Date.now();
  const todayKey = keyOf(now);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month || '') ? sp.month! : todayKey.slice(0, 7);
  const location = UUID.test(sp.location || '') ? sp.location! : '';
  const [y, m] = month.split('-').map(Number) as [number, number];
  const monthStartKey = `${month}-01`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;

  // Monday-first grid covering the whole month
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const gridStart = istMidnight(monthStartKey) - lead * DAY;
  const weeks = Math.ceil((lead + daysInMonth) / 7);
  const gridEnd = gridStart + weeks * 7 * DAY;

  const [{ data: locations }, { data: rows }, { data: pauses }] = await Promise.all([
    supabase.from('partner_locations').select('id, name, location_type, max_bags, vehicle_pricing(bike_capacity, sedan_capacity, suv_capacity)').eq('partner_id', partner.id).order('created_at'),
    (() => {
      let q = supabase.from('bookings')
        .select('id, status, booking_type, num_bags, vehicle_type, vehicle_make, vehicle_model, vehicle_license_plate, start_time, end_time, actual_checkin, actual_checkout, total_amount, base_amount, commission_amount, partner_amount, location_id, customer:users!bookings_customer_id_fkey(full_name), payments(method)')
        .eq('partner_id', partner.id)
        .in('status', ['pending', 'confirmed', 'checked_in', 'checked_out'])
        .lt('start_time', new Date(gridEnd).toISOString())
        // Items still stored past their end time are still on the shelf
        .or(`end_time.gt.${new Date(gridStart).toISOString()},status.eq.checked_in`)
        .order('start_time', { ascending: true })
        .limit(2000);
      if (location) q = q.eq('location_id', location);
      return q;
    })(),
    (() => {
      let q = supabase.from('location_pauses').select('location_id, starts_at, ends_at, cancelled_at, reason')
        .eq('partner_id', partner.id).lt('starts_at', new Date(gridEnd).toISOString()).gt('ends_at', new Date(gridStart).toISOString());
      if (location) q = q.eq('location_id', location);
      return q;
    })(),
  ]);

  const locs = (locations || []) as any[];
  const shown = location ? locs.filter(l => l.id === location) : locs;
  const locName = new Map(locs.map(l => [l.id, l.name as string]));
  const bagCapacity = shown.filter(l => l.location_type !== 'garage').reduce((s, l) => s + (Number(l.max_bags) || 0), 0);
  const vehicleCap = shown.filter(l => l.location_type === 'garage').reduce((s, l) => {
    const vp = one(l.vehicle_pricing) as any;
    return s + (Number(vp?.bike_capacity) || 0) + (Number(vp?.sedan_capacity) || 0) + (Number(vp?.suv_capacity) || 0);
  }, 0);

  // When things actually happen: real check-in/out times once known; overdue items stay until now
  const bookings: CalBooking[] = [];
  const bagSpans: [number, number, number][] = [];
  const carSpans: [number, number, number][] = [];
  const onShelfUntil = new Map<string, number>();
  for (const b of (rows || []) as any[]) {
    const garage = b.booking_type === 'garage';
    const inAt = b.actual_checkin ? Date.parse(b.actual_checkin) : Date.parse(b.start_time);
    const plannedOut = Date.parse(b.end_time);
    const overdue = b.status === 'checked_in' && plannedOut < now;
    const outAt = b.actual_checkout ? Date.parse(b.actual_checkout) : overdue ? Math.max(now, plannedOut) : plannedOut;
    (garage ? carSpans : bagSpans).push([inAt, outAt, garage ? 1 : Number(b.num_bags) || 1]);
    onShelfUntil.set(b.id, outAt);
    const payment = one(b.payments) as any;
    const st = statusOf(b, new Date(now));
    bookings.push({
      id: b.id,
      ref: ref(b.id),
      customer: (one(b.customer) as any)?.full_name || 'Customer',
      items: itemsLabel(b),
      garage,
      quantity: garage ? 1 : Number(b.num_bags) || 1,
      location: locName.get(b.location_id) || '',
      status: b.status,
      statusLabel: st.label,
      tone: st.tone,
      inAt,
      outAt: b.actual_checkout ? outAt : plannedOut,
      droppedOff: !!b.actual_checkin,
      pickedUp: !!b.actual_checkout,
      overdue,
      collect: (payment?.method === 'pay_at_location' || payment?.method === 'upi') && ['pending', 'confirmed'].includes(b.status) ? inr(b.total_amount) : null,
    });
  }

  const days: CalDay[] = [];
  for (let t = gridStart; t < gridEnd; t += DAY) {
    const key = keyOf(t + 12 * 3600e3); // noon avoids any edge at midnight
    const end = t + DAY;
    const dayPauses = (pauses || []).filter((p: any) => {
      const s = Date.parse(p.starts_at);
      const e = p.cancelled_at ? Math.min(Date.parse(p.ends_at), Date.parse(p.cancelled_at)) : Date.parse(p.ends_at);
      return e > s && s < end && e > t;
    });
    // A day counts as closed when every location shown is paused at some point that day
    const pausedLocations = new Set(dayPauses.map((p: any) => p.location_id));
    days.push({
      key,
      inMonth: key.slice(0, 7) === month,
      dropoffs: bookings.filter(b => keyOf(b.inAt) === key).map(b => b.id),
      pickups: bookings.filter(b => keyOf(b.outAt) === key).map(b => b.id),
      // Here when the day starts and not dropped off or picked up that day (overdue items stay until today)
      stored: bookings.filter(b => b.inAt < t && (onShelfUntil.get(b.id) ?? b.outAt) > t && keyOf(b.outAt) !== key).map(b => b.id),
      peakBags: peak(bagSpans, t, end),
      peakVehicles: peak(carSpans, t, end),
      pending: bookings.filter(b => b.status === 'pending' && keyOf(b.inAt) === key).length,
      closed: [...new Set(dayPauses.map((p: any) => `${locName.get(p.location_id) || 'Location'}: ${PAUSE_REASON[p.reason] || 'Closed'}`))],
      allClosed: shown.length > 0 && shown.every(l => pausedLocations.has(l.id)),
    });
  }

  // This month at a glance
  const monthStart = istMidnight(monthStartKey);
  const monthEnd = istMidnight(`${nextMonth}-01`);
  const inMonth = (ms: number) => ms >= monthStart && ms < monthEnd;
  const monthRows = ((rows || []) as any[]).filter(b => inMonth(Date.parse(b.start_time)));
  const monthDays = days.filter(d => d.inMonth);
  const busiest = monthDays.reduce<CalDay | null>((best, d) => (!best || d.peakBags + d.peakVehicles > best.peakBags + best.peakVehicles ? d : best), null);
  const fmtShort = (key: string) => new Date(`${key}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  const stats = [
    { label: 'Drop-offs', value: String(bookings.filter(b => inMonth(b.inAt)).length), sub: `${monthRows.filter(b => b.status === 'pending').length} waiting for your answer` },
    { label: 'Pick-ups', value: String(bookings.filter(b => inMonth(b.outAt)).length), sub: `${bookings.filter(b => b.overdue).length} overdue right now` },
    { label: 'Busiest day', value: busiest && busiest.peakBags + busiest.peakVehicles > 0 ? fmtShort(busiest.key) : '—',
      sub: busiest && busiest.peakBags + busiest.peakVehicles > 0
        ? [busiest.peakBags ? `${busiest.peakBags}${bagCapacity ? ` of ${bagCapacity}` : ''} bags` : '', busiest.peakVehicles ? `${busiest.peakVehicles}${vehicleCap ? ` of ${vehicleCap}` : ''} vehicles` : ''].filter(Boolean).join(' · ')
        : 'No bookings this month' },
    { label: 'Earnings', value: inr(monthRows.reduce((s, b) => s + partnerShare(b), 0)), sub: 'From drop-offs this month' },
  ];

  const qs = (changes: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { month: month === todayKey.slice(0, 7) ? null : month, location: location || null, ...changes };
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v); });
    const s = p.toString();
    return s ? `/dashboard/schedule?${s}` : '/dashboard/schedule';
  };
  const monthLabel = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const initialDay = /^\d{4}-\d{2}-\d{2}$/.test(sp.day || '') && sp.day!.startsWith(month) ? sp.day!
    : todayKey.startsWith(month) ? todayKey
    : monthDays.find(d => d.dropoffs.length || d.pickups.length)?.key || monthStartKey;

  return (
    <div className="flex flex-col gap-4 lg:flex-1 lg:min-h-0">
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Schedule</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 lg:hidden">Drop-offs, pick-ups and how full your space is, day by day (India time).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {locs.length > 1 && (
            <nav className="flex flex-wrap gap-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-1" aria-label="Location">
              {[{ id: '', name: 'All locations' }, ...locs].map(l => (
                <Link key={l.id || 'all'} href={qs({ location: l.id || null })} aria-current={l.id === location ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${l.id === location ? 'bg-orange-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                  {l.name}
                </Link>
              ))}
            </nav>
          )}
          <Link href="/dashboard/bookings" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Icon name="ticket" className="w-4 h-4" /> All bookings
          </Link>
        </div>
      </div>

      <div className={`${card} shrink-0 grid grid-cols-2 lg:grid-cols-4 divide-gray-100 dark:divide-gray-800 lg:divide-x`}>
        {stats.map((s, i) => (
          <div key={s.label} className={`px-4 py-2.5 min-w-0 ${i < 2 ? 'border-b lg:border-b-0 border-gray-100 dark:border-gray-800' : ''} ${i % 2 === 0 ? 'border-r lg:border-r-0 border-gray-100 dark:border-gray-800' : ''}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">{s.label} · {monthLabel.split(' ')[0]}</p>
            <p className="flex items-baseline gap-2 min-w-0">
              <span className="text-lg font-black text-gray-900 dark:text-white tabular-nums shrink-0">{s.value}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.sub}</span>
            </p>
          </div>
        ))}
      </div>

      <CalendarView
        key={`${month}-${location}`}
        days={days}
        bookings={bookings}
        todayKey={todayKey}
        initialDay={initialDay}
        monthLabel={monthLabel}
        prevHref={qs({ month: prevMonth })}
        nextHref={qs({ month: nextMonth })}
        todayHref={qs({ month: null })}
        isCurrentMonth={todayKey.startsWith(month)}
        bagCapacity={bagCapacity}
        vehicleCapacity={vehicleCap}
        multiLocation={!location && locs.length > 1}
        truncated={(rows?.length || 0) >= 2000}
      />
    </div>
  );
}
