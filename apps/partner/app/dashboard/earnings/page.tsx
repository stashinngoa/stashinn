import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { loadLegal } from '@stashinn/lib/services/legal';
import Icon from '../../../components/Icon';
import TrendChart from '../reports/TrendChart';
import { itemsLabel } from '../bookings/bookingShared';
import { loadEarnings, monthLabel, shiftMonth, thisMonth } from './earningsData';
import MonthSelect from './MonthSelect';

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';
const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const whole = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
const TONE: Record<string, string> = {
  green: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
  amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
  sky: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/60',
  gray: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
};

function Delta({ now, before }: { now: number; before: number }) {
  if (!before) return <span className="text-xs text-gray-500 dark:text-gray-400">{now ? 'nothing the month before' : ' '}</span>;
  const change = (now - before) / before;
  return (
    <span className={`text-xs font-semibold ${change >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {change >= 0 ? '▲' : '▼'} {Math.abs(Math.round(change * 100))}%<span className="font-normal text-gray-500 dark:text-gray-400"> vs {whole(before)} last month</span>
    </span>
  );
}

export default async function EarningsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const { data: partner } = await supabase.from('partners').select('id, created_at').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');

  const current = thisMonth();
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month || '') && sp.month! <= current ? sp.month! : current;
  const [e, legal] = await Promise.all([loadEarnings(supabase, partner.id, month, itemsLabel), loadLegal(createServiceClient())]);
  const firstMonth = new Date(partner.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);
  const months = Array.from({ length: 24 }, (_, i) => shiftMonth(current, -i)).filter(m => m >= firstMonth);
  const href = (m: string) => (m === current ? '/dashboard/earnings' : `/dashboard/earnings?month=${m}`);
  const payout = (legal.details.payout_schedule || '').trim();
  const isCurrent = month === current;

  const waterfall = [
    { label: 'Customers paid', value: e.customersPaid, sign: '' },
    { label: 'GST (collected for the government)', value: -e.gst, sign: '−' },
    { label: 'StashInn commission', value: -e.commission, sign: '−' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Earnings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">What you earned each month, and how it reaches you. Bookings count in the month their storage ended.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={href(shiftMonth(month, -1))} aria-label="Previous month" className={`h-10 w-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 ${shiftMonth(month, -1) < firstMonth ? 'pointer-events-none opacity-40' : ''}`}>
            <Icon name="chevron" className="w-4 h-4 rotate-180" />
          </Link>
          <MonthSelect value={month} current={current} options={months.map(m => ({ value: m, label: monthLabel(m) }))} />
          <Link href={href(shiftMonth(month, 1))} aria-label="Next month" className={`h-10 w-10 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 ${isCurrent ? 'pointer-events-none opacity-40' : ''}`}>
            <Icon name="chevron" className="w-4 h-4" />
          </Link>
          <a href={`/api/export-earnings?month=${month}`} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <Icon name="external" className="w-4 h-4" /> CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className={`${card} p-4 md:p-5`}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">You earned · {monthLabel(month, true)}</p>
          <p className="mt-1.5 text-2xl md:text-3xl font-black text-gray-900 dark:text-white tabular-nums">{rupees(e.earned)}</p>
          <Delta now={e.earned} before={e.previousEarned} />
        </div>
        <div className={`${card} p-4 md:p-5`}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Already with you</p>
          <p className="mt-1.5 text-2xl md:text-3xl font-black text-gray-900 dark:text-white tabular-nums">{rupees(e.withYou)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Collected at drop-off ({e.withYouCount})</p>
        </div>
        <div className={`${card} p-4 md:p-5`}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Paid out by StashInn</p>
          <p className="mt-1.5 text-2xl md:text-3xl font-black text-gray-900 dark:text-white tabular-nums">{rupees(e.paidOut)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">of {rupees(e.fromStashInn)} StashInn holds</p>
        </div>
        <div className={`${card} p-4 md:p-5 ${e.toBePaid + e.qrPending > 0 ? 'border-emerald-300 dark:border-emerald-700/60' : ''}`}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Still to be paid to you</p>
          <p className="mt-1.5 text-2xl md:text-3xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">{rupees(e.toBePaid)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{e.qrPending ? `+${rupees(e.qrPending)} once QR payments are confirmed` : payout ? `Paid ${payout.split(',')[0]}` : 'Paid monthly to your bank'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <section className={`${card} p-5`}>
          <h2 className="font-extrabold text-gray-900 dark:text-white">{monthLabel(month)} statement</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-4">{e.lines.length} booking{e.lines.length === 1 ? '' : 's'}{e.noShows ? `, including ${e.noShows} online-paid no-show${e.noShows === 1 ? '' : 's'}` : ''}.</p>
          <dl className="text-sm divide-y divide-gray-100 dark:divide-gray-800">
            {waterfall.map(w => (
              <div key={w.label} className="flex justify-between gap-3 py-2">
                <dt className="text-gray-600 dark:text-gray-300">{w.label}</dt>
                <dd className="tabular-nums text-gray-900 dark:text-white">{w.sign}{rupees(Math.abs(w.value))}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="font-extrabold text-gray-900 dark:text-white">You earned</dt>
              <dd className="font-black tabular-nums text-gray-900 dark:text-white">{rupees(e.earned)}</dd>
            </div>
          </dl>
          <dl className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-950/50 border border-gray-100 dark:border-gray-800 p-3 text-sm space-y-1.5">
            <div className="flex justify-between gap-3"><dt className="text-gray-600 dark:text-gray-300">Collected by you</dt><dd className="tabular-nums text-gray-900 dark:text-white">{rupees(e.withYou)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-600 dark:text-gray-300">Paid out by StashInn</dt><dd className="tabular-nums text-gray-900 dark:text-white">{rupees(e.paidOut)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-600 dark:text-gray-300">Still to be paid to you</dt><dd className="tabular-nums font-bold text-emerald-700 dark:text-emerald-400">{rupees(e.toBePaid + e.qrPending)}</dd></div>
            {e.owe > 0 && (
              <div className="flex justify-between gap-3 pt-1.5 border-t border-gray-200 dark:border-gray-800">
                <dt className="text-gray-600 dark:text-gray-300">You owe StashInn <span className="text-xs">(commission + GST)</span></dt>
                <dd className="tabular-nums font-bold text-amber-700 dark:text-amber-400">{rupees(e.owe)}</dd>
              </div>
            )}
          </dl>
          {e.owe > 0 && <Link href="/dashboard/settlements" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-orange-700 dark:text-orange-400 hover:underline">Settle in Settlements →</Link>}
        </section>

        <div className="xl:col-span-2 space-y-4">
          <TrendChart title={`Earned per day · ${monthLabel(month)}`} total={whole(e.earned)} format="currency" points={e.daily} tickEvery={5} emptyText="No completed bookings this month yet." />
          <TrendChart title="Last 6 months" total={whole(e.trend.reduce((s, t) => s + t.value, 0))} format="currency" points={e.trend} tickEvery={1} emptyText="No earnings in the last 6 months." />
        </div>
      </div>

      <section className={`${card} overflow-hidden`}>
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-extrabold text-gray-900 dark:text-white">Bookings in {monthLabel(month)}</h2>
          <Link href="/dashboard/reports" className="text-xs font-bold text-orange-700 dark:text-orange-400 hover:underline">Performance reports →</Link>
        </div>
        {e.lines.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <span className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center"><Icon name="wallet" className="w-6 h-6" /></span>
            <p className="text-sm font-bold text-gray-900 dark:text-white">No earnings {isCurrent ? 'yet this month' : 'this month'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bookings appear here once they’re completed (picked up).</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-950/40 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-2.5 text-left">Booking</th>
                  <th className="px-3 py-2.5 text-left">Ended</th>
                  <th className="px-3 py-2.5 text-right">Customer paid</th>
                  <th className="px-3 py-2.5 text-right">GST</th>
                  <th className="px-3 py-2.5 text-right">Commission</th>
                  <th className="px-3 py-2.5 text-right">You earned</th>
                  <th className="px-3 py-2.5 text-left">Paid</th>
                  <th className="px-5 py-2.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {e.lines.map(l => (
                  <tr key={l.bookingId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-5 py-3 min-w-[11rem]">
                      <Link href={`/dashboard/bookings/${l.bookingId}`} className="font-mono text-xs font-bold text-orange-700 dark:text-orange-400 hover:underline">#{l.bookingId.slice(0, 8).toUpperCase()}</Link>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{l.customer} · {l.items}{l.noShow ? ' · no-show' : ''}</p>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{day(l.endedAt)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{rupees(l.paid)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-500 dark:text-gray-400">{l.gst ? `−${rupees(l.gst)}` : '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-500 dark:text-gray-400">−{rupees(l.commission)}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-bold text-gray-900 dark:text-white">{rupees(l.earned)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{l.how}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block whitespace-nowrap px-2 py-0.5 rounded-full border text-[11px] font-bold ${TONE[l.status.tone]}`}>{l.status.label}</span>
                      {l.owe > 0 && <span className="block mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">You owe {rupees(l.owe)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
