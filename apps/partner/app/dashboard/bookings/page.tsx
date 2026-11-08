import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { loadJobConfig, partnerResponseSchedule } from '@stashinn/lib/jobs';
import Icon from '../../../components/Icon';
import BookingFilters from './BookingFilters';
import RespondButtons from './RespondButtons';
import { TABS, TONE, dayKey, durationLabel, fmtTime, inr, itemsLabel, ref, statusOf, whenLabel } from './bookingShared';
import { LIST_FIELDS, PAGE_SIZE, applyFilters, applyTab, matchingCustomerIds, parseFilters, partnerShare } from './bookingQuery';

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

const EMPTY: Record<string, { title: string; text: string }> = {
  active: { title: 'No active bookings', text: 'New requests, upcoming drop-offs and stored items show up here.' },
  pending: { title: 'You’re all caught up', text: 'No booking requests are waiting for your answer.' },
  confirmed: { title: 'No upcoming drop-offs', text: 'Bookings you accept show up here until the customer drops off.' },
  checked_in: { title: 'Nothing stored right now', text: 'Items you check in show up here until they’re picked up.' },
  checked_out: { title: 'No completed bookings yet', text: 'Bookings move here once the customer picks up.' },
  cancelled: { title: 'No cancelled bookings', text: 'Declined, cancelled and no-show bookings show up here.' },
  all: { title: 'No bookings yet', text: 'Once customers book your locations, every booking shows up here.' },
};

export default async function PartnerBookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = parseFilters(await searchParams);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');

  const customerIds = await matchingCustomerIds(supabase, f.q);
  const scoped = (select: string, opts?: { count: 'exact'; head?: boolean }) =>
    applyFilters(supabase.from('bookings').select(select, opts).eq('partner_id', partner.id), f, customerIds);

  const from = (f.page - 1) * PAGE_SIZE;
  const [{ data: rows, count: total, error }, counts, { data: locations }, { data: ops }, jobConfig] = await Promise.all([
    applyTab(scoped(LIST_FIELDS, { count: 'exact' }), f.tab).range(from, from + PAGE_SIZE - 1),
    Promise.all(TABS.map(t => {
      const q = scoped('id', { count: 'exact', head: true });
      return (t.statuses.length ? q.in('status', t.statuses as unknown as string[]) : q).then(r => [t.key, r.count || 0] as const);
    })),
    supabase.from('partner_locations').select('id, name').eq('partner_id', partner.id).order('created_at'),
    // Today at a glance (location filter only)
    (f.location
      ? supabase.from('bookings').select('status, start_time, end_time, num_bags, booking_type').eq('partner_id', partner.id).eq('location_id', f.location)
      : supabase.from('bookings').select('status, start_time, end_time, num_bags, booking_type').eq('partner_id', partner.id)
    ).in('status', ['pending', 'confirmed', 'checked_in']),
    loadJobConfig(createServiceClient()).catch(() => null),
  ]);
  if (error) console.error('[PARTNER_BOOKINGS] list query failed:', error.message);

  const tabCount = Object.fromEntries(counts) as Record<string, number>;
  const now = new Date();
  const today = dayKey(now);
  const open = ops || [];
  const glance = [
    { label: 'Needs response', value: open.filter(b => b.status === 'pending').length, href: '/dashboard/bookings?tab=pending', tone: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30', icon: 'clock' as const },
    { label: 'Drop-offs today', value: open.filter(b => b.status === 'confirmed' && dayKey(b.start_time) === today).length, href: `/dashboard/bookings?tab=confirmed&date=${today}`, tone: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30', icon: 'arrowOut' as const },
    { label: 'Pick-ups today', value: open.filter(b => b.status === 'checked_in' && dayKey(b.end_time) <= today).length, href: '/dashboard/bookings?tab=checked_in', tone: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30', icon: 'arrowIn' as const },
    {
      label: 'Stored now',
      value: open.filter(b => b.status === 'checked_in').length,
      sub: (() => {
        const stored = open.filter(b => b.status === 'checked_in');
        const bags = stored.filter(b => b.booking_type !== 'garage').reduce((s, b) => s + (Number(b.num_bags) || 0), 0);
        const cars = stored.filter(b => b.booking_type === 'garage').length;
        return [bags ? `${bags} bag${bags === 1 ? '' : 's'}` : '', cars ? `${cars} vehicle${cars === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ') || 'Nothing stored';
      })(),
      href: '/dashboard/bookings?tab=checked_in', tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30', icon: 'bag' as const,
    },
  ];

  const link = (changes: Record<string, string | number | null>) => {
    const p = new URLSearchParams();
    const merged: Record<string, string | number | null> = { tab: f.tab === 'active' ? null : f.tab, q: f.q || null, location: f.location || null, date: f.date || null, page: f.page > 1 ? f.page : null, ...changes };
    Object.entries(merged).forEach(([k, v]) => { if (v !== null && v !== '') p.set(k, String(v)); });
    const s = p.toString();
    return s ? `/dashboard/bookings?${s}` : '/dashboard/bookings';
  };
  const exportHref = (() => {
    const p = new URLSearchParams();
    p.set('tab', f.tab);
    if (f.q) p.set('q', f.q);
    if (f.location) p.set('location', f.location);
    if (f.date) p.set('date', f.date);
    return `/api/export-bookings?${p.toString()}`;
  })();

  const list = rows as any[] | null;
  const pages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));
  const multiLocation = (locations?.length || 0) > 1;
  const filtered = !!(f.q || f.location || f.date);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Bookings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Answer requests, check items in and out, and look up past bookings.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/schedule" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Icon name="calendar" className="w-4 h-4" /> Schedule
          </Link>
          <a href={exportHref} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Icon name="external" className="w-4 h-4" /> Export CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {glance.map(g => (
          <Link key={g.label} href={g.href} className={`${card} p-4 hover:border-orange-300 dark:hover:border-orange-700/60 transition-colors`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">{g.label}</p>
              <span className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${g.tone}`}><Icon name={g.icon} className="w-4 h-4" /></span>
            </div>
            <p className={`mt-1.5 text-2xl font-black tabular-nums ${g.label === 'Needs response' && g.value ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>{g.value}</p>
            {'sub' in g && g.sub && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{g.sub}</p>}
          </Link>
        ))}
      </div>

      <section className={`${card} overflow-hidden`}>
        <div className="border-b border-gray-200 dark:border-gray-800">
          <nav className="flex gap-1 overflow-x-auto px-3 pt-2" aria-label="Booking status">
            {TABS.map(t => {
              const on = t.key === f.tab;
              const n = tabCount[t.key] || 0;
              return (
                <Link key={t.key} href={link({ tab: t.key === 'active' ? null : t.key, page: null })} aria-current={on ? 'page' : undefined}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${
                    on ? 'border-orange-500 text-orange-700 dark:text-orange-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                  {t.label}
                  <span className={`min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-[11px] tabular-nums text-center ${
                    t.key === 'pending' && n ? 'bg-amber-500 text-white' : on ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>{n}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <BookingFilters locations={locations || []} />
        </div>

        {error ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-bold text-red-700 dark:text-red-400">Couldn’t load bookings</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Please refresh the page. If it keeps happening, contact support@stashinn.in.</p>
          </div>
        ) : !list?.length ? (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center"><Icon name="ticket" className="w-6 h-6" /></span>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{filtered ? 'No bookings match these filters' : EMPTY[f.tab]!.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{filtered ? 'Try another search, location or date.' : EMPTY[f.tab]!.text}</p>
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-2.5 bg-gray-50 dark:bg-gray-950/40 border-b border-gray-100 dark:border-gray-800 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <span className="col-span-3">Customer</span>
              <span className="col-span-3">Drop-off → pick-up</span>
              <span className="col-span-2">Storing</span>
              <span className="col-span-1 text-right">You earn</span>
              <span className="col-span-3 text-right">Status</span>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {list.map(b => {
                const st = statusOf(b, now);
                const customer = one(b.customer) as any;
                const payment = one(b.payments) as any;
                const loc = one(b.partner_locations) as any;
                const atLocation = payment?.method === 'pay_at_location' || payment?.method === 'upi';
                const deadline = b.status === 'pending' && jobConfig ? partnerResponseSchedule(b, jobConfig.settings).cancel : null;
                const sub =
                  b.status === 'pending' ? (deadline ? `Answer by ${new Date(deadline) > now ? whenLabel(new Date(deadline).toISOString(), now) : 'now'}` : 'Waiting for your answer')
                  : b.status === 'confirmed' ? (new Date(b.start_time) > now ? `Arrives in ${durationLabel(new Date(b.start_time).getTime() - now.getTime())}` : 'Customer is late')
                  : b.status === 'checked_in' ? (new Date(b.end_time) > now ? `Pick-up in ${durationLabel(new Date(b.end_time).getTime() - now.getTime())}` : `${durationLabel(now.getTime() - new Date(b.end_time).getTime())} late`)
                  : b.status === 'checked_out' && b.actual_checkout ? `Picked up ${whenLabel(b.actual_checkout, now)}`
                  : null;
                return (
                  <li key={b.id} className={`relative grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2 px-5 py-4 hover:bg-orange-50/40 dark:hover:bg-gray-800/30 transition-colors ${
                    b.status === 'pending' ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}>
                    <div className="md:col-span-3 flex items-start gap-3 min-w-0">
                      <span className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${b.booking_type === 'garage' ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
                        <Icon name={b.booking_type === 'garage' ? 'car' : 'bag'} className="w-5 h-5" />
                      </span>
                      <div className="min-w-0">
                        <Link href={`/dashboard/bookings/${b.id}`} className="block text-sm font-bold text-gray-900 dark:text-white truncate hover:text-orange-700 dark:hover:text-orange-400 after:absolute after:inset-0">
                          {customer?.full_name || 'Customer'}
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          <span className="font-mono">#{ref(b.id)}</span>{multiLocation && loc?.name ? ` · ${loc.name}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="md:col-span-3 text-sm min-w-0">
                      <p className="text-gray-900 dark:text-white"><span className="text-gray-400 dark:text-gray-500 text-xs mr-1">In</span>{whenLabel(b.start_time, now)}</p>
                      <p className="text-gray-600 dark:text-gray-300"><span className="text-gray-400 dark:text-gray-500 text-xs mr-1">Out</span>{dayKey(b.end_time) === dayKey(b.start_time) ? fmtTime(b.end_time) : whenLabel(b.end_time, now)}
                        <span className="text-xs text-gray-400 dark:text-gray-500"> · {durationLabel(new Date(b.end_time).getTime() - new Date(b.start_time).getTime())}</span></p>
                    </div>
                    <div className="md:col-span-2 text-sm text-gray-700 dark:text-gray-300 min-w-0 truncate">{itemsLabel(b)}</div>
                    <div className="md:col-span-1 md:text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{b.status === 'cancelled' ? '—' : inr(partnerShare(b))}</p>
                      {b.status !== 'cancelled' && (
                        <p className={`text-[11px] ${atLocation && b.status !== 'checked_out' ? 'text-amber-700 dark:text-amber-400 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
                          {atLocation ? (b.status === 'pending' || b.status === 'confirmed' ? `Collect ${inr(b.total_amount)}` : 'Paid at location') : 'Paid online'}
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-3 flex md:flex-col md:items-end items-center justify-between gap-2">
                      <div className="md:text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-bold ${TONE[st.tone]}`}>{st.label}</span>
                        {sub && <p className={`text-[11px] mt-0.5 ${st.tone === 'red' || (b.status === 'pending' && deadline && deadline - now.getTime() < 3600e3) ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>{sub}</p>}
                      </div>
                      {b.status === 'pending' && (
                        <div className="relative z-10">
                          <RespondButtons bookingId={b.id} summary={`${customer?.full_name || 'Customer'} · ${itemsLabel(b)} · ${whenLabel(b.start_time, now)}`} />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {pages > 1 && (
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-sm">
                <p className="text-gray-500 dark:text-gray-400 tabular-nums">{from + 1}–{Math.min(from + PAGE_SIZE, total || 0)} of {total}</p>
                <div className="flex gap-2">
                  {f.page > 1
                    ? <Link href={link({ page: f.page - 1 > 1 ? f.page - 1 : null })} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Previous</Link>
                    : <span className="px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800 font-bold text-gray-300 dark:text-gray-600">Previous</span>}
                  {f.page < pages
                    ? <Link href={link({ page: f.page + 1 })} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Next</Link>
                    : <span className="px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800 font-bold text-gray-300 dark:text-gray-600">Next</span>}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
