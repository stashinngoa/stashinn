import Link from 'next/link';
import { createClient } from '@stashinn/lib/supabase/server';
import { DashboardTransitionProvider, PendingArea, TransitionLink } from '../DashboardTransition';
import BookingSearch from '../bookings/BookingSearch';
import PartnerRow from './PartnerRow';
import { PARTNER_STATUSES, type PartnerStatus } from './partnerStatus';

const PAGE_SIZE = 25;

type SearchParams = { status?: string; q?: string; page?: string };

const STATUS_ORDER = Object.keys(PARTNER_STATUSES) as PartnerStatus[];

const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return mins < 1 ? 'just now' : `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

// Strip characters that would break PostgREST's or()/ilike filter syntax
const cleanSearch = (q: string) => q.replace(/[,()*%\\]/g, ' ').trim();

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';

export default async function PartnersPage(props: { searchParams: Promise<SearchParams> }) {
  const params = await props.searchParams;
  const statusFilter = STATUS_ORDER.includes(params.status as PartnerStatus) ? (params.status as PartnerStatus) : 'all';
  const q = cleanSearch(params.q || '');
  const page = Math.max(1, Number(params.page) || 1);
  const supabase = await createClient();

  // Search matches business name, GSTIN, PAN, or the owner's name/email
  let searchFilter: string | null = null;
  if (q) {
    const { data: owners } = await supabase.from('users').select('id').or(`full_name.ilike.%${q}%,email.ilike.%${q}%`).limit(200);
    const parts = [`business_name.ilike.%${q}%`, `gstin.ilike.%${q}%`, `pan.ilike.%${q}%`];
    if (owners?.length) parts.push(`user_id.in.(${owners.map(o => o.id).join(',')})`);
    searchFilter = parts.join(',');
  }

  let listQuery = supabase
    .from('partners')
    .select(`
      id, business_name, business_type, gstin, pan, status, avg_rating, total_reviews, created_at,
      users!partners_user_id_fkey(email, full_name, phone),
      partner_locations(location_type, admin_status, is_active)
    `, { count: 'exact' });
  if (statusFilter !== 'all') listQuery = listQuery.eq('status', statusFilter);
  if (searchFilter) listQuery = listQuery.or(searchFilter);
  // Oldest pending first, so the review queue is worked in order; newest first otherwise
  listQuery = listQuery
    .order('created_at', { ascending: statusFilter === 'pending' })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  let countQuery = supabase.from('partners').select('status');
  if (searchFilter) countQuery = countQuery.or(searchFilter);

  const [{ data: partners, count, error }, { data: statusRows }] = await Promise.all([listQuery, countQuery]);

  const statusCounts: Record<string, number> = {};
  (statusRows || []).forEach((p: any) => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });
  const allCount = statusRows?.length || 0;
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hrefWith = (changes: Partial<SearchParams>) => {
    const qs = new URLSearchParams();
    const merged: SearchParams = { ...params, page: undefined, ...changes };
    Object.entries(merged).forEach(([k, v]) => { if (v && v !== 'all') qs.set(k, String(v)); });
    const s = qs.toString();
    return s ? `/dashboard/partners?${s}` : '/dashboard/partners';
  };

  const stats = [
    { label: 'Partners', value: allCount, sub: q ? 'Matching your search' : 'All applications', tone: 'text-gray-900 dark:text-white' },
    { label: 'Awaiting review', value: statusCounts.pending || 0, sub: 'Need KYC & location checks', tone: 'text-amber-600 dark:text-amber-400', href: hrefWith({ status: 'pending' }) },
    { label: 'Live', value: statusCounts.approved || 0, sub: 'Approved and taking bookings', tone: 'text-emerald-600 dark:text-emerald-400', href: hrefWith({ status: 'approved' }) },
    { label: 'Suspended', value: statusCounts.suspended || 0, sub: `${statusCounts.rejected || 0} rejected`, tone: 'text-orange-600 dark:text-orange-400', href: hrefWith({ status: 'suspended' }) },
  ];

  const statusTabs = [
    { value: 'all', label: 'All', count: allCount, dot: 'bg-orange-500' },
    ...STATUS_ORDER.map(s => ({ value: s, label: PARTNER_STATUSES[s].label, count: statusCounts[s] || 0, dot: PARTNER_STATUSES[s].dot })),
  ];

  return (
    <DashboardTransitionProvider>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Partners</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review applications and open a partner to manage their KYC, locations and status.</p>
        </div>

        <PendingArea>
          {/* Status summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(s => {
              const body = (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className={`text-2xl font-black tabular-nums mt-1 ${s.tone}`}>{s.value.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{s.sub}</p>
                </>
              );
              return s.href ? (
                <TransitionLink key={s.label} href={s.href} className={`${card} p-4 block hover:border-orange-300 dark:hover:border-orange-700/60 transition-colors`}>{body}</TransitionLink>
              ) : (
                <div key={s.label} className={`${card} p-4`}>{body}</div>
              );
            })}
          </div>

          <div className={`${card} overflow-hidden`}>
            {/* Filters */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
                {statusTabs.map(t => {
                  const active = statusFilter === t.value;
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
                      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                      {t.label}
                      <span className={`tabular-nums ${active ? 'text-orange-600/70 dark:text-orange-300/70' : 'text-gray-400 dark:text-gray-500'}`}>{t.count}</span>
                    </TransitionLink>
                  );
                })}
              </div>
              <BookingSearch placeholder="Search name, owner, GSTIN, PAN…" />
            </div>

            {/* List */}
            {error ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-bold text-red-600 dark:text-red-400">Couldn&apos;t load partners</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">{error.message}</p>
              </div>
            ) : !partners || partners.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-bold text-gray-900 dark:text-white">No partners found</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {q || statusFilter !== 'all' ? 'Try another status or clear the search.' : 'New partner applications will show up here.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-950/50">
                      <th className="px-5 py-2.5">Partner</th>
                      <th className="px-5 py-2.5">Owner</th>
                      <th className="px-5 py-2.5">Spaces</th>
                      <th className="px-5 py-2.5">Tax IDs</th>
                      <th className="px-5 py-2.5">Status</th>
                      <th className="px-5 py-2.5 text-right">Applied</th>
                      <th className="w-10" aria-hidden="true" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {partners.map((p: any) => {
                      const status = PARTNER_STATUSES[p.status as PartnerStatus];
                      const locations: any[] = p.partner_locations || [];
                      const verified = locations.filter(l => l.admin_status === 'approved').length;
                      const hasLuggage = locations.some(l => l.location_type !== 'garage');
                      const hasGarage = locations.some(l => l.location_type === 'garage');
                      const isIndividual = p.business_type === 'Individual';
                      const href = `/dashboard/partners/${p.id}`;
                      return (
                        <PartnerRow key={p.id} href={href}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3 min-w-[200px]">
                              <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-sm shadow-sm">
                                {p.business_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <Link href={href} className="block font-bold text-gray-900 dark:text-gray-100 truncate max-w-[220px] group-hover:text-orange-700 dark:group-hover:text-orange-400 focus:outline-none focus-visible:underline">
                                  {p.business_name}
                                </Link>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {isIndividual ? 'Individual' : `Business · ${p.business_type || 'General'}`}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <p className="text-gray-900 dark:text-gray-100 truncate max-w-[180px]">{p.users?.full_name || '—'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{p.users?.email}</p>
                          </td>
                          <td className="px-5 py-3">
                            {locations.length === 0 ? (
                              <span className="text-xs text-gray-400 dark:text-gray-500">No locations</span>
                            ) : (
                              <>
                                <div className="flex gap-1.5">
                                  {hasLuggage && <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60">Luggage</span>}
                                  {hasGarage && <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60">Vehicle</span>}
                                </div>
                                <p className={`text-[11px] mt-1 ${verified < locations.length ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {verified}/{locations.length} location{locations.length === 1 ? '' : 's'} verified
                                </p>
                              </>
                            )}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-gray-600 dark:text-gray-400">
                            <p><span className="text-gray-400 dark:text-gray-500 font-sans font-semibold">PAN </span>{p.pan || '—'}</p>
                            {p.gstin && <p className="mt-0.5"><span className="text-gray-400 dark:text-gray-500 font-sans font-semibold">GST </span>{p.gstin}</p>}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full border whitespace-nowrap ${status?.badge ?? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status?.dot ?? 'bg-gray-400'}`} />
                              {status?.label ?? p.status}
                            </span>
                            {p.status === 'approved' && p.total_reviews > 0 && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">★ {Number(p.avg_rating).toFixed(1)} · {p.total_reviews} review{p.total_reviews === 1 ? '' : 's'}</p>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right whitespace-nowrap text-xs text-gray-500 dark:text-gray-400" title={new Date(p.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}>
                            {timeAgo(p.created_at)}
                          </td>
                          <td className="pr-4 text-gray-300 dark:text-gray-600 group-hover:text-orange-500 transition-colors">
                            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                          </td>
                        </PartnerRow>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {((page - 1) * PAGE_SIZE + 1).toLocaleString('en-IN')}–{Math.min(page * PAGE_SIZE, total).toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}
                </span>
                <div className="flex gap-2">
                  {page > 1 && (
                    <TransitionLink href={hrefWith({ page: String(page - 1) })} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 font-bold hover:bg-gray-50 dark:hover:bg-gray-800">Previous</TransitionLink>
                  )}
                  {page < totalPages && (
                    <TransitionLink href={hrefWith({ page: String(page + 1) })} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 font-bold hover:bg-gray-50 dark:hover:bg-gray-800">Next</TransitionLink>
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
