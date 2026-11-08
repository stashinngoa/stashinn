import Link from 'next/link';
import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import WelcomeModal from './WelcomeModal';
import Icon, { type IconName } from '../../components/Icon';

const IST = 'Asia/Kolkata';
const dayKey = (d: Date | string) => new Date(d).toLocaleDateString('en-CA', { timeZone: IST });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST });
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: IST });
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';

const BOOKING_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Needs response', cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60' },
  confirmed: { label: 'Confirmed', cls: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/60' },
  checked_in: { label: 'Stored', cls: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' },
};
const LOCATION_STATUS: Record<string, { label: string; dot: string }> = {
  approved: { label: 'Live', dot: 'bg-emerald-500' },
  pending: { label: 'Under review', dot: 'bg-amber-500' },
  update_required: { label: 'Changes requested', dot: 'bg-sky-500' },
  suspended: { label: 'Suspended', dot: 'bg-orange-600' },
  rejected: { label: 'Not approved', dot: 'bg-red-500' },
};

const what = (b: any) =>
  b.booking_type === 'garage'
    ? [b.vehicle_make, b.vehicle_model].filter(Boolean).join(' ') + (b.vehicle_license_plate ? ` · ${b.vehicle_license_plate}` : '') || 'Vehicle'
    : `${b.num_bags} bag${b.num_bags === 1 ? '' : 's'}`;

function BookingRow({ b, time, kind }: { b: any; time: string; kind?: 'in' | 'out' }) {
  const st = BOOKING_STATUS[b.status];
  return (
    <Link href={`/dashboard/bookings/${b.id}`} className="group flex items-center gap-3 px-5 py-3 hover:bg-orange-50/50 dark:hover:bg-gray-800/40 transition-colors">
      <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${
        kind === 'out' ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
      }`}>
        <Icon name={kind === 'out' ? 'arrowIn' : kind === 'in' ? 'arrowOut' : b.booking_type === 'garage' ? 'car' : 'bag'} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-orange-700 dark:group-hover:text-orange-400">{b.customer?.full_name || 'Customer'}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{what(b)} · {b.partner_locations?.name}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{time}</p>
        {st && <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${st.cls}`}>{st.label}</span>}
      </div>
    </Link>
  );
}

export default async function DashboardOverview({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const showWelcomeModal = params?.onboarded === 'true';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: partner } = await supabase.from('partners').select('*').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');

  const nowIso = new Date().toISOString();
  const [{ data: bookings }, { data: locations }, { data: pocs }, { data: transactions }, { data: pauses }] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, status, booking_type, num_bags, vehicle_make, vehicle_model, vehicle_license_plate, start_time, end_time, customer:users!bookings_customer_id_fkey(full_name), partner_locations(name)')
      .eq('partner_id', partner.id)
      .in('status', ['pending', 'confirmed', 'checked_in'])
      .order('start_time', { ascending: true }),
    supabase.from('partner_locations').select('id, name, location_type, admin_status, is_active, status_reason').eq('partner_id', partner.id).order('created_at'),
    supabase.from('partner_pocs').select('phone, is_verified').eq('partner_id', partner.id),
    supabase.from('partner_transactions').select('amount, bookings(payments(method))').eq('partner_id', partner.id).eq('transfer_status', 'pending'),
    supabase.from('location_pauses').select('location_id').eq('partner_id', partner.id).is('cancelled_at', null).lte('starts_at', nowIso).gt('ends_at', nowIso),
  ]);
  const pausedIds = new Set((pauses || []).map(p => p.location_id));

  const today = dayKey(new Date());
  const open = bookings || [];
  const needsResponse = open.filter(b => b.status === 'pending');
  const arrivalsToday = open.filter(b => b.status === 'confirmed' && dayKey(b.start_time) === today);
  const pickupsToday = open.filter(b => b.status === 'checked_in' && dayKey(b.end_time) === today);
  const storedNow = open.filter(b => b.status === 'checked_in');
  const upcoming = open.filter(b => b.status === 'confirmed' && dayKey(b.start_time) > today).slice(0, 6);
  const todayTimeline = [
    ...arrivalsToday.map(b => ({ b, at: b.start_time, kind: 'in' as const })),
    ...pickupsToday.map(b => ({ b, at: b.end_time, kind: 'out' as const })),
  ].sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime());

  let pendingPayouts = 0;
  (transactions || []).forEach((tx: any) => {
    const payments = tx.bookings?.payments;
    const method = Array.isArray(payments) ? payments[0]?.method : payments?.method;
    if (method === 'razorpay') pendingPayouts += Number(tx.amount);
  });

  const locs = locations || [];
  const people = new Map<string, boolean>();
  (pocs || []).forEach(p => people.set(p.phone, (people.get(p.phone) ?? true) && p.is_verified));
  const contactsVerified = [...people.values()].filter(Boolean).length;
  const locationsLive = locs.filter(l => l.admin_status === 'approved').length;
  const changesRequested = locs.filter(l => l.admin_status === 'update_required').length;

  const greeting = (() => {
    const h = Number(new Date().toLocaleString('en-IN', { hour: 'numeric', hour12: false, timeZone: IST }));
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();

  const stats: { label: string; value: string; sub: string; icon: IconName; href: string; tone: string }[] = [
    { label: 'Drop-offs today', value: String(arrivalsToday.length), sub: `${upcoming.length ? `${upcoming.length} more coming up` : 'None coming up'}`, icon: 'arrowOut', href: '/dashboard/schedule', tone: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30' },
    { label: 'Pick-ups today', value: String(pickupsToday.length), sub: `${storedNow.length} stored right now`, icon: 'arrowIn', href: '/dashboard/schedule', tone: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30' },
    { label: 'Pending payouts', value: inr(pendingPayouts), sub: 'Online payments to be settled', icon: 'wallet', href: '/dashboard/settlements', tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' },
    { label: 'Rating', value: partner.total_reviews > 0 ? `★ ${Number(partner.avg_rating).toFixed(1)}` : '—', sub: partner.total_reviews > 0 ? `${partner.total_reviews} reviews` : 'No reviews yet', icon: 'star', href: '/dashboard/reviews', tone: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30' },
  ];

  const reviewSteps = [
    { label: 'Application submitted', detail: new Date(partner.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: IST }), done: true },
    { label: 'Contact verified', detail: people.size ? `${contactsVerified} of ${people.size}` : 'No contact added', done: people.size > 0 && contactsVerified === people.size },
    { label: 'Locations approved', detail: locs.length ? `${locationsLive} of ${locs.length}${changesRequested ? ` · ${changesRequested} need changes` : ''}` : 'No locations', done: locs.length > 0 && locationsLive === locs.length, href: changesRequested ? '/dashboard/locations' : undefined },
    { label: 'Sign agreement', detail: 'We\'ll send you the form', done: !!partner.signed_registration_doc_url },
    { label: 'Go live', detail: 'Customers can book you', done: partner.status === 'approved' },
  ];
  const currentStep = reviewSteps.findIndex(s => !s.done);

  return (
    <div className="space-y-6">
      {showWelcomeModal && <WelcomeModal />}

      {/* Heading (the e2e test waits for the "Overview" heading) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">{greeting} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: IST })}</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mt-0.5">Overview</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/schedule" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Icon name="calendar" className="w-4 h-4" /> Schedule
          </Link>
          <Link href="/dashboard/bookings" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm transition-colors">
            <Icon name="ticket" className="w-4 h-4" /> All bookings
          </Link>
        </div>
      </div>

      {/* Account state */}
      {partner.status === 'pending' && (
        <section className={`${card} p-5 md:p-6`}>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Your application is under review</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Customers can book you once these steps are done. We&apos;ll notify you at each step.</p>
            </div>
          </div>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {reviewSteps.map((s, i) => {
              const current = i === currentStep;
              const body = (
                <>
                  <span className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-black ${
                    s.done ? 'bg-emerald-500 text-white' : current ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {s.done ? <Icon name="check" className="w-4 h-4" /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-bold ${s.done ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{s.label}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{s.detail}</span>
                  </span>
                </>
              );
              const cls = `flex items-start gap-3 rounded-xl border p-3 ${current ? 'border-orange-300 dark:border-orange-700/60 bg-orange-50/60 dark:bg-orange-950/30' : 'border-gray-200 dark:border-gray-800'}`;
              return <li key={s.label}>{s.href ? <Link href={s.href} className={`${cls} hover:border-orange-400`}>{body}</Link> : <div className={cls}>{body}</div>}</li>;
            })}
          </ol>
        </section>
      )}
      {(partner.status === 'suspended' || partner.status === 'rejected') && (
        <section className="rounded-2xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 p-5 flex gap-3">
          <Icon name="alert" className="w-6 h-6 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <h2 className="font-bold text-red-900 dark:text-red-200">{partner.status === 'suspended' ? 'Your account is suspended' : 'Your application was not approved'}</h2>
            <p className="text-sm text-red-800 dark:text-red-300 mt-0.5">
              {partner.status === 'suspended' ? 'Your locations aren\'t taking new bookings. ' : ''}Please contact <a href="mailto:support@stashinn.in" className="font-bold underline">support@stashinn.in</a> for details.
            </p>
          </div>
        </section>
      )}

      {/* Key numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Link key={s.label} href={s.href} className={`${card} group p-4 md:p-5 hover:border-orange-300 dark:hover:border-orange-700/60 transition-colors`}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{s.label}</p>
              <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${s.tone}`}><Icon name={s.icon} className="w-4 h-4" /></span>
            </div>
            <p className="mt-2 text-2xl md:text-3xl font-black text-gray-900 dark:text-white tabular-nums">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{s.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          {needsResponse.length > 0 && (
            <section className={`${card} overflow-hidden border-amber-300 dark:border-amber-700/60`}>
              <div className="px-5 py-3.5 flex items-center justify-between bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50">
                <h2 className="font-extrabold text-amber-900 dark:text-amber-200">Needs your response <span className="ml-1 tabular-nums">({needsResponse.length})</span></h2>
                <Link href="/dashboard/bookings" className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline">Review all →</Link>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {needsResponse.slice(0, 5).map(b => <BookingRow key={b.id} b={b} time={`${fmtDay(b.start_time)}, ${fmtTime(b.start_time)}`} />)}
              </div>
            </section>
          )}

          <section className={`${card} overflow-hidden`}>
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-extrabold text-gray-900 dark:text-white">Today</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">{arrivalsToday.length} drop-off{arrivalsToday.length === 1 ? '' : 's'} · {pickupsToday.length} pick-up{pickupsToday.length === 1 ? '' : 's'}</span>
            </div>
            {todayTimeline.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Nothing scheduled for today</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">New bookings will show up here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {todayTimeline.map(({ b, at, kind }) => <BookingRow key={`${b.id}-${kind}`} b={b} time={fmtTime(at)} kind={kind} />)}
              </div>
            )}
          </section>

          <section className={`${card} overflow-hidden`}>
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-extrabold text-gray-900 dark:text-white">Coming up</h2>
              <Link href="/dashboard/bookings" className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline">All bookings →</Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No upcoming bookings.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {upcoming.map(b => <BookingRow key={b.id} b={b} time={`${fmtDay(b.start_time)}, ${fmtTime(b.start_time)}`} />)}
              </div>
            )}
          </section>
        </div>

        {/* Side column */}
        <aside className="space-y-6">
          <section className={`${card} overflow-hidden`}>
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-extrabold text-gray-900 dark:text-white">Your locations</h2>
              <Link href="/dashboard/locations" className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline">Manage →</Link>
            </div>
            {locs.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No locations yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {locs.map(l => {
                  const st = LOCATION_STATUS[l.admin_status] ?? LOCATION_STATUS.pending!;
                  return (
                    <li key={l.id}>
                      <Link href={`/dashboard/locations/${l.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-orange-50/50 dark:hover:bg-gray-800/40 transition-colors">
                        <span className="h-9 w-9 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center">
                          <Icon name={l.location_type === 'garage' ? 'car' : 'bag'} className="w-4 h-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-gray-900 dark:text-white truncate">{l.name}</span>
                          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}{pausedIds.has(l.id) ? ' · bookings paused' : ''}
                          </span>
                        </span>
                        <Icon name="chevron" className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={`${card} p-5`}>
            <h2 className="font-extrabold text-gray-900 dark:text-white">Need help?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Questions about bookings, payouts or your listing? Our partner team usually replies within a working day.</p>
            <a href="mailto:support@stashinn.in" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-orange-600 dark:text-orange-400 hover:underline">
              <Icon name="mail" className="w-4 h-4" /> support@stashinn.in
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}
