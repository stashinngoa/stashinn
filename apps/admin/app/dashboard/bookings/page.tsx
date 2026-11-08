import { createClient } from '@stashinn/lib/supabase/server';
import DateRangeFilter from '../DateRangeFilter';
import { DashboardTransitionProvider, PendingArea, TransitionLink } from '../DashboardTransition';
import { BOOKING_STATUSES, statusOf } from '../bookingStatus';
import BookingSearch from './BookingSearch';

const PAGE_SIZE = 25;

type SearchParams = { type?: string; status?: string; q?: string; page?: string; startDate?: string; endDate?: string };

const TYPES = [
  { label: 'All types', value: 'all' },
  { label: 'Luggage', value: 'luggage' },
  { label: 'Vehicle', value: 'vehicle' },
];

const IST = 'Asia/Kolkata';
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST });
const inr = (n: number, decimals = 0) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

const duration = (start: string, end: string) => {
  const hrs = (new Date(end).getTime() - new Date(start).getTime()) / 3600000;
  if (hrs <= 0) return null;
  if (hrs < 24) return `${Math.round(hrs * 10) / 10}h`;
  const days = Math.floor(hrs / 24);
  const rem = Math.round(hrs - days * 24);
  return rem ? `${days}d ${rem}h` : `${days}d`;
};

const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

// Strip characters that would break PostgREST's or()/ilike filter syntax
const cleanSearch = (q: string) => q.replace(/[,()*%\\]/g, ' ').trim();

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';

export default async function AdminBookingsPage(props: { searchParams: Promise<SearchParams> }) {
  const params = await props.searchParams;
  const typeFilter = params.type === 'luggage' || params.type === 'vehicle' ? params.type : 'all';
  const statusFilter = BOOKING_STATUSES.includes(params.status as any) ? params.status! : 'all';
  const q = cleanSearch(params.q || '');
  const page = Math.max(1, Number(params.page) || 1);
  const supabase = await createClient();

  // Shared filters: date range on created_at (same as the dashboard) and booking type
  const applyBase = (query: any) => {
    if (params.startDate) query = query.gte('created_at', params.startDate);
    if (params.endDate) query = query.lte('created_at', `${params.endDate}T23:59:59.999`);
    if (typeFilter === 'luggage') query = query.eq('booking_type', 'luggage');
    if (typeFilter === 'vehicle') query = query.eq('booking_type', 'garage');
    return query;
  };

  // Search matches customer name/email, location name/city or number plate
  let searchFilter: string | null = null;
  if (q) {
    const [{ data: users }, { data: locations }] = await Promise.all([
      supabase.from('users').select('id').or(`full_name.ilike.%${q}%,email.ilike.%${q}%`).limit(200),
      supabase.from('partner_locations').select('id').or(`name.ilike.%${q}%,city.ilike.%${q}%`).limit(200),
    ]);
    const parts = [`vehicle_license_plate.ilike.%${q}%`];
    if (users?.length) parts.push(`customer_id.in.(${users.map(u => u.id).join(',')})`);
    if (locations?.length) parts.push(`location_id.in.(${locations.map(l => l.id).join(',')})`);
    searchFilter = parts.join(',');
  }

  let listQuery = applyBase(
    supabase
      .from('bookings')
      .select(`
        id, status, num_bags, total_amount, commission_amount,
        start_time, end_time, actual_checkin, actual_checkout, created_at, cancellation_reason, cancelled_by,
        booking_type, vehicle_make, vehicle_model, vehicle_license_plate,
        users!bookings_customer_id_fkey(full_name, email),
        partners(business_name),
        partner_locations(name, city)
      `, { count: 'exact' })
  );
  if (statusFilter !== 'all') listQuery = listQuery.eq('status', statusFilter);
  if (searchFilter) listQuery = listQuery.or(searchFilter);
  listQuery = listQuery.order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  let summaryQuery = applyBase(supabase.from('bookings').select('status, total_amount, base_amount, commission_amount'));
  if (searchFilter) summaryQuery = summaryQuery.or(searchFilter);

  const [{ data: bookings, count, error }, { data: summaryRows }] = await Promise.all([listQuery, summaryQuery]);

  // Period summary (ignores the status tab so the tab counts stay visible)
  const statusCounts: Record<string, number> = {};
  let revenue = 0;
  let commission = 0;
  let beforeGst = 0;
  (summaryRows || []).forEach((b: any) => {
    statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    if (b.status === 'checked_out') {
      revenue += Number(b.total_amount);
      commission += Number(b.commission_amount);
      beforeGst += Number(b.base_amount);
    }
  });
  const periodTotal = summaryRows?.length || 0;
  const activeNow = (statusCounts.confirmed || 0) + (statusCounts.checked_in || 0);
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hrefWith = (changes: Partial<SearchParams>) => {
    const qs = new URLSearchParams();
    const merged: SearchParams = { ...params, page: undefined, ...changes };
    Object.entries(merged).forEach(([k, v]) => { if (v && v !== 'all') qs.set(k, String(v)); });
    const s = qs.toString();
    return s ? `/dashboard/bookings?${s}` : '/dashboard/bookings';
  };

  const rangeLabel = params.startDate || params.endDate
    ? `${params.startDate || 'start'} → ${params.endDate || 'today'}`
    : 'All time';

  const stats = [
    { label: 'Bookings', value: periodTotal.toLocaleString('en-IN'), sub: rangeLabel },
    { label: 'Active now', value: activeNow.toLocaleString('en-IN'), sub: 'Confirmed or checked in' },
    { label: 'Revenue', value: inr(revenue), sub: 'Completed bookings, incl. GST' },
    { label: 'Commission', value: inr(commission), sub: beforeGst > 0 ? `${((commission / beforeGst) * 100).toFixed(1)}% take rate` : 'Platform earnings' },
  ];

  const statusTabs = [{ value: 'all', label: 'All', count: periodTotal }, ...BOOKING_STATUSES.map(s => ({ value: s, label: statusOf(s).label, count: statusCounts[s] || 0 }))];

  return (
    <DashboardTransitionProvider>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">All Bookings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Every booking made on StashInn and where it stands right now.</p>
          </div>
          <DateRangeFilter />
        </div>

        <PendingArea>
          {/* Period stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(s => (
              <div key={s.label} className={`${card} p-4`}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums mt-1">{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className={`${card} overflow-hidden`}>
            {/* Filters */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl w-fit">
                  {TYPES.map(t => (
                    <TransitionLink
                      key={t.value}
                      href={hrefWith({ type: t.value })}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                        typeFilter === t.value
                          ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {t.label}
                    </TransitionLink>
                  ))}
                </div>
                <BookingSearch />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
                {statusTabs.map(t => {
                  const active = statusFilter === t.value;
                  const dot = t.value === 'all' ? 'bg-orange-500' : statusOf(t.value).dot;
                  return (
                    <TransitionLink
                      key={t.value}
                      href={hrefWith({ status: t.value })}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-colors ${
                        active
                          ? 'bg-orange-50 dark:bg-orange-950/50 border-orange-300 dark:border-orange-700/60 text-orange-700 dark:text-orange-300'
                          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                      {t.label}
                      <span className={`tabular-nums ${active ? 'text-orange-600/70 dark:text-orange-300/70' : 'text-gray-400 dark:text-gray-500'}`}>{t.count}</span>
                    </TransitionLink>
                  );
                })}
              </div>
            </div>

            {/* Ledger */}
            {error ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-bold text-red-600 dark:text-red-400">Couldn&apos;t load bookings</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">{error.message}</p>
              </div>
            ) : !bookings || bookings.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-bold text-gray-900 dark:text-white">No bookings found</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Try a wider date range or clear the filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-950/50">
                      <th className="px-5 py-2.5">Booking</th>
                      <th className="px-5 py-2.5">Customer</th>
                      <th className="px-5 py-2.5">Location</th>
                      <th className="px-5 py-2.5">Item</th>
                      <th className="px-5 py-2.5">Schedule</th>
                      <th className="px-5 py-2.5 text-right">Amount</th>
                      <th className="px-5 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {bookings.map((b: any) => {
                      const s = statusOf(b.status);
                      const isVehicle = b.booking_type === 'garage';
                      const overdue = b.status === 'checked_in' && new Date(b.end_time).getTime() < Date.now();
                      const dur = duration(b.start_time, b.end_time);
                      return (
                        <tr key={b.id} className="align-top hover:bg-orange-50/40 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="px-5 py-3 whitespace-nowrap">
                            <p className="font-mono text-xs font-bold text-gray-900 dark:text-gray-100">#{b.id.split('-')[0].toUpperCase()}</p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5" title={fmtDateTime(b.created_at)}>Booked {timeAgo(b.created_at)}</p>
                          </td>
                          <td className="px-5 py-3">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[180px]">{b.users?.full_name || '—'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{b.users?.email}</p>
                          </td>
                          <td className="px-5 py-3">
                            <p className="text-gray-900 dark:text-gray-100 truncate max-w-[180px]">{b.partner_locations?.name || '—'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                              {[b.partners?.business_name, b.partner_locations?.city].filter(Boolean).join(' · ')}
                            </p>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {isVehicle ? (
                              <div>
                                <p className="font-medium text-brand-teal dark:text-teal-300">{[b.vehicle_make, b.vehicle_model].filter(Boolean).join(' ') || 'Vehicle'}</p>
                                {b.vehicle_license_plate && (
                                  <span className="inline-block mt-0.5 font-mono text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{b.vehicle_license_plate}</span>
                                )}
                              </div>
                            ) : (
                              <p className="font-medium text-gray-700 dark:text-gray-300">{b.num_bags} bag{b.num_bags === 1 ? '' : 's'}</p>
                            )}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <p className="text-gray-900 dark:text-gray-100">
                              {fmtDateTime(b.start_time)} <span className="text-gray-400 dark:text-gray-500">→</span> {fmtDateTime(b.end_time)}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                              {dur && <span className="font-semibold">{dur}</span>}
                              {b.actual_checkin && <span> · In {fmtTime(b.actual_checkin)}</span>}
                              {b.actual_checkout && <span> · Out {fmtTime(b.actual_checkout)}</span>}
                            </p>
                          </td>
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            <p className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">{inr(Number(b.total_amount), 2)}</p>
                            <p className="text-[11px] text-orange-600 dark:text-orange-400 tabular-nums">+{inr(Number(b.commission_amount), 2)} fee</p>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full border whitespace-nowrap ${s.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                              {s.label}
                            </span>
                            {overdue && (
                              <span className="block mt-1 text-[11px] font-bold text-red-600 dark:text-red-400">Overdue pickup</span>
                            )}
                            {b.status === 'cancelled' && (b.cancelled_by || b.cancellation_reason) && (
                              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 max-w-[160px] truncate" title={b.cancellation_reason || undefined}>
                                {b.cancelled_by ? `By ${b.cancelled_by}` : ''}{b.cancelled_by && b.cancellation_reason ? ': ' : ''}{b.cancellation_reason}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {total > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 text-xs">
                <p className="text-gray-500 dark:text-gray-400">
                  Showing <span className="font-bold text-gray-900 dark:text-white">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</span> of{' '}
                  <span className="font-bold text-gray-900 dark:text-white">{total.toLocaleString('en-IN')}</span>
                </p>
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <TransitionLink href={hrefWith({ page: String(page - 1) })} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                      ← Prev
                    </TransitionLink>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800/50 font-bold text-gray-300 dark:text-gray-600">← Prev</span>
                  )}
                  <span className="text-gray-500 dark:text-gray-400 tabular-nums">Page {page} of {totalPages}</span>
                  {page < totalPages ? (
                    <TransitionLink href={hrefWith({ page: String(page + 1) })} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                      Next →
                    </TransitionLink>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800/50 font-bold text-gray-300 dark:text-gray-600">Next →</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </PendingArea>
      </div>
    </DashboardTransitionProvider>
  );
}
