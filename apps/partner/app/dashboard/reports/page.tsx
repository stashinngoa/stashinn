import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import Icon, { type IconName } from '../../../components/Icon';
import DateRangeFilter from './DateRangeFilter';
import TrendChart from './TrendChart';
import { loadReport, parseRange, type Summary } from './reportData';

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const pct = (n: number | null) => (n == null ? '—' : `${Math.round(n * 100)}%`);
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function duration(mins: number | null) {
  if (mins == null) return '—';
  if (mins < 60) return `${Math.max(1, Math.round(mins))} min`;
  if (mins < 48 * 60) return `${+(mins / 60).toFixed(1)} h`;
  return `${Math.round(mins / 1440)} days`;
}

/** "+12%" vs the previous period, coloured by whether the change is good. */
function Delta({ now, before, better = 'up', money }: { now: number | null; before: number | null; better?: 'up' | 'down'; money?: boolean }) {
  if (now == null || before == null) return null;
  if (before === 0) return now > 0 ? <span className="text-xs text-gray-500 dark:text-gray-400">new this period</span> : null;
  const change = (now - before) / Math.abs(before);
  if (Math.abs(change) < 0.005) return <span className="text-xs text-gray-500 dark:text-gray-400">same as before</span>;
  const good = better === 'up' ? change > 0 : change < 0;
  return (
    <span className={`text-xs font-semibold ${good ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {change > 0 ? '▲' : '▼'} {Math.abs(Math.round(change * 100))}%<span className="font-normal text-gray-500 dark:text-gray-400"> vs {money ? inr(before) : before.toLocaleString('en-IN')}</span>
    </span>
  );
}

function Tile({ icon, label, value, children }: { icon: IconName; label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className={`${card} p-4 md:p-5 min-w-0`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <span className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"><Icon name={icon} className="w-4 h-4" /></span>
      </div>
      <p className="mt-1.5 text-2xl md:text-3xl font-black text-gray-900 dark:text-white tabular-nums truncate">{value}</p>
      <div className="mt-0.5 min-h-[1rem] truncate">{children}</div>
    </div>
  );
}

/** Labelled horizontal bars (one hue; the label and number carry the meaning). */
function Bars({ rows, total }: { rows: { label: string; value: number; note?: string; muted?: boolean }[]; total: number }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map(r => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-gray-700 dark:text-gray-300 truncate">{r.label}</span>
            <span className="shrink-0 tabular-nums font-bold text-gray-900 dark:text-white">{r.value.toLocaleString('en-IN')}<span className="ml-1.5 font-normal text-xs text-gray-500 dark:text-gray-400">{total ? `${Math.round((r.value / total) * 100)}%` : ''}</span></span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div className={`h-full rounded-full ${r.muted ? 'bg-gray-400 dark:bg-gray-500' : 'bg-orange-500 dark:bg-orange-400'}`} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          {r.note && r.value > 0 && <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{r.note}</p>}
        </li>
      ))}
    </ul>
  );
}

function outcomeRows(s: Summary) {
  return [
    { label: 'Completed', value: s.completed },
    { label: 'Upcoming or stored now', value: s.active },
    { label: 'Waiting for your answer', value: s.pending, muted: true },
    { label: 'Cancelled by the customer', value: s.cancelledByCustomer, muted: true },
    { label: 'Declined by you', value: s.declined, muted: true },
    { label: 'Not answered in time', value: s.noResponse, muted: true, note: 'Cancelled automatically. Turn on SMS or WhatsApp alerts in Business profile to answer faster.' },
    { label: 'No-show', value: s.noShow, muted: true, note: 'Nothing was dropped off. Online-paid no-shows still pay out (see Settlements).' },
    { label: 'Cancelled by StashInn', value: s.cancelledByStashInn, muted: true },
  ].filter(r => r.value > 0 || ['Completed', 'Upcoming or stored now'].includes(r.label));
}

export default async function PartnerReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');

  const range = parseRange(sp);
  const location = UUID.test(sp.location || '') ? sp.location! : '';
  const r = await loadReport(supabase, partner.id, range, location);
  const s = r.summary;
  const p = r.previous;
  const exportQs = new URLSearchParams({ from: range.from, to: range.to, ...(location ? { location } : {}) }).toString();
  const busiestDay = r.weekdays.indexOf(Math.max(...r.weekdays));
  const hourRows = r.hours.map((v, h) => ({ h, v })).filter(x => x.h >= 6 && x.h <= 23);
  const hourLabel = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? 'am' : 'pm'}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {range.label} · {range.preset === 'custom' ? '' : `${new Date(`${range.from}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })} – ${new Date(`${range.to}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })} · `}
            by drop-off date, India time
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/export-reports?${exportQs}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Icon name="external" className="w-4 h-4" /> Export CSV
          </a>
          <Link href={`/dashboard/earnings`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Icon name="wallet" className="w-4 h-4" /> Payouts
          </Link>
        </div>
      </div>

      <DateRangeFilter preset={range.preset} from={range.from} to={range.to} locations={r.locations} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Tile icon="wallet" label="You earned" value={inr(s.earned)}>
          <Delta now={s.earned} before={p.earned} money />
          {s.upcoming > 0 && <span className="block text-xs text-gray-500 dark:text-gray-400">+{inr(s.upcoming)} from upcoming</span>}
        </Tile>
        <Tile icon="ticket" label="Booking requests" value={s.requests.toLocaleString('en-IN')}>
          <Delta now={s.requests} before={p.requests} />
        </Tile>
        <Tile icon="check" label="Accepted" value={pct(s.acceptRate)}>
          <span className="text-xs text-gray-500 dark:text-gray-400">{s.responseMins != null ? `Typical answer in ${duration(s.responseMins)}` : 'No requests answered'}</span>
        </Tile>
        <Tile icon="star" label="Rating" value={r.rating != null ? `★ ${r.rating.toFixed(1)}` : '—'}>
          <span className="text-xs text-gray-500 dark:text-gray-400">{r.reviews ? `${r.reviews} review${r.reviews === 1 ? '' : 's'} this period` : 'No reviews this period'}</span>
        </Tile>
      </div>

      <div className={`${card} grid grid-cols-2 md:grid-cols-5 divide-gray-100 dark:divide-gray-800 md:divide-x`}>
        {[
          { label: 'Completed', value: s.completed.toLocaleString('en-IN'), sub: <Delta now={s.completed} before={p.completed} /> },
          { label: 'Average booking', value: s.avgValue != null ? inr(s.avgValue) : '—', sub: <span className="text-xs text-gray-500 dark:text-gray-400">what the customer paid</span> },
          { label: 'Average stay', value: s.avgStayHours != null ? duration(s.avgStayHours * 60) : '—', sub: <span className="text-xs text-gray-500 dark:text-gray-400">drop-off to pick-up</span> },
          { label: 'Stored', value: [s.bags ? `${s.bags} bag${s.bags === 1 ? '' : 's'}` : '', s.vehicles ? `${s.vehicles} vehicle${s.vehicles === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ') || '—', sub: <span className="text-xs text-gray-500 dark:text-gray-400">in completed bookings</span> },
          { label: 'Customers', value: r.customers.toLocaleString('en-IN'), sub: <span className="text-xs text-gray-500 dark:text-gray-400">{r.returning ? `${r.returning} booked more than once` : 'all first-time'}</span> },
        ].map((x, i) => (
          <div key={x.label} className={`px-4 py-3 min-w-0 ${i < 4 ? 'border-b md:border-b-0 border-gray-100 dark:border-gray-800' : 'col-span-2 md:col-span-1'} ${i % 2 === 0 && i < 4 ? 'border-r md:border-r-0 border-gray-100 dark:border-gray-800' : ''}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{x.label}</p>
            <p className="text-lg font-black text-gray-900 dark:text-white tabular-nums truncate">{x.value}</p>
            <div className="truncate">{x.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TrendChart title={`Earnings per ${r.weekly ? 'week' : 'day'}`} total={inr(s.earned)} format="currency"
          points={r.buckets.map(b => ({ label: b.label, value: Math.round(b.earned) }))} emptyText="No completed bookings in this period." />
        <TrendChart title={`Booking requests per ${r.weekly ? 'week' : 'day'}`} total={s.requests.toLocaleString('en-IN')}
          points={r.buckets.map(b => ({ label: b.label, value: b.bookings }))} emptyText="No bookings in this period." />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className={`${card} p-5`}>
          <h2 className="font-extrabold text-gray-900 dark:text-white">What happened to requests</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-4">{s.requests ? `${pct(s.lostRate)} didn’t go ahead (previous period: ${pct(p.lostRate)}).` : 'No requests in this period.'}</p>
          {s.requests > 0 && <Bars rows={outcomeRows(s)} total={s.requests} />}
        </section>

        <section className={`${card} p-5`}>
          <h2 className="font-extrabold text-gray-900 dark:text-white">Busiest days</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-4">{Math.max(...r.weekdays) > 0 ? `Most drop-offs on ${['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'][busiestDay]}.` : 'No drop-offs in this period.'}</p>
          {Math.max(...r.weekdays) > 0 && <Bars rows={r.weekdays.map((v, i) => ({ label: WEEKDAYS[i]!, value: v, muted: i !== busiestDay }))} total={r.weekdays.reduce((a, b) => a + b, 0)} />}
        </section>

        <section className={`${card} p-5`}>
          <h2 className="font-extrabold text-gray-900 dark:text-white">Drop-off times</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-4">When customers plan to arrive. Useful for staffing.</p>
          {Math.max(...r.hours) > 0 ? (
            <div className="flex items-end gap-[3px] h-36" role="img" aria-label={`Drop-offs by hour: ${hourRows.filter(x => x.v).map(x => `${hourLabel(x.h)} ${x.v}`).join(', ')}`}>
              {hourRows.map(x => {
                const m = Math.max(...hourRows.map(y => y.v), 1);
                return (
                  <div key={x.h} className="flex-1 h-full flex flex-col justify-end items-center gap-1" title={`${hourLabel(x.h)}: ${x.v}`}>
                    <div className={`w-full rounded-t ${x.v === m ? 'bg-orange-500 dark:bg-orange-400' : 'bg-gray-300 dark:bg-gray-600'}`} style={{ height: x.v ? `max(2px, ${(x.v / m) * 85}%)` : 0 }} />
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 h-3">{x.h % 3 === 0 ? hourLabel(x.h).replace(' ', '') : ''}</span>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-gray-400 dark:text-gray-500">No drop-offs in this period.</p>}
        </section>
      </div>

      {r.byLocation.length > 0 && (
        <section className={`${card} overflow-hidden`}>
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-extrabold text-gray-900 dark:text-white">By location</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-950/40 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-2.5 text-left">Location</th>
                  <th className="px-3 py-2.5 text-right">Requests</th>
                  <th className="px-3 py-2.5 text-right">Completed</th>
                  <th className="px-3 py-2.5 text-right">Accepted</th>
                  <th className="px-3 py-2.5 text-right">Didn’t go ahead</th>
                  <th className="px-3 py-2.5 text-right">Rating</th>
                  <th className="px-5 py-2.5 text-right">You earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {r.byLocation.map(l => (
                  <tr key={l.id}>
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/locations/${l.id}`} className="inline-flex items-center gap-2 font-bold text-gray-900 dark:text-white hover:text-orange-700 dark:hover:text-orange-400">
                        <Icon name={l.type === 'garage' ? 'car' : 'bag'} className="w-4 h-4 text-gray-400" />{l.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{l.requests}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{l.completed}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{pct(l.acceptRate)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{pct(l.lostRate)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{l.rating != null ? `★ ${l.rating.toFixed(1)}` : '—'}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-bold text-gray-900 dark:text-white">{inr(l.earned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Earnings are your share of completed bookings, after StashInn’s commission and GST. Compared with the previous {Math.round((Date.parse(range.to) - Date.parse(range.from)) / 864e5) + 1} days ({r.previousLabel}).
        For payouts and cash dues, see <Link href="/dashboard/settlements" className="font-bold text-orange-700 dark:text-orange-400 hover:underline">Settlements</Link>.
      </p>
    </div>
  );
}
