import Link from 'next/link';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { getAdminContext } from '../../../lib/adminAccess';
import { accessFor } from '../../../lib/permissions';
import { getCustomers } from './actions';
import CustomerSearch from './CustomerSearch';
import BlockButton from './BlockButton';

const PAGE_SIZE = 25;
type SearchParams = { q?: string; status?: string; sort?: string; page?: string };

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';
const th = 'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap';
const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const date = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const ago = (iso: string) => {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 0) return `in ${-days} day${days === -1 ? '' : 's'}`;
  if (days === 0) return 'today';
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return date(iso);
};

export default async function CustomersPage(props: { searchParams: Promise<SearchParams> }) {
  const params = await props.searchParams;
  const { role } = await getAdminContext();
  const canEdit = role ? accessFor(role, '/dashboard/customers') === 'full' : false;
  const status = params.status === 'active' || params.status === 'blocked' ? params.status : 'all';
  const page = Math.max(1, Number(params.page) || 1);

  const db = createServiceClient();
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [list, { count: all }, { count: blockedCount }, { count: newCount }, { data: recentBookings }] = await Promise.all([
    getCustomers({ q: params.q, status, sort: params.sort, page }),
    db.from('users').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
    db.from('users').select('id', { count: 'exact', head: true }).eq('role', 'customer').eq('is_blocked', true),
    db.from('users').select('id', { count: 'exact', head: true }).eq('role', 'customer').gte('created_at', monthAgo),
    db.from('bookings').select('customer_id').gte('created_at', monthAgo).limit(10000),
  ]);
  const bookedRecently = new Set((recentBookings || []).map((b: any) => b.customer_id)).size;
  const total = list.total;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (changes: Partial<SearchParams>) => {
    const qs = new URLSearchParams();
    Object.entries({ ...params, page: undefined, ...changes }).forEach(([k, v]) => { if (v && v !== 'all') qs.set(k, String(v)); });
    const s = qs.toString();
    return s ? `/dashboard/customers?${s}` : '/dashboard/customers';
  };

  const stats = [
    { label: 'Customers', value: all || 0, sub: 'Registered accounts', tone: 'text-gray-900 dark:text-white', link: href({ status: 'all' }) },
    { label: 'New this month', value: newCount || 0, sub: 'Joined in the last 30 days', tone: 'text-orange-600 dark:text-orange-400' },
    { label: 'Booked this month', value: bookedRecently, sub: 'Made a booking in 30 days', tone: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Blocked', value: blockedCount || 0, sub: 'Can’t sign in or book', tone: 'text-red-600 dark:text-red-400', link: href({ status: 'blocked' }) },
  ];
  const tabs = [
    { value: 'all', label: 'All', count: all || 0 },
    { value: 'active', label: 'Active', count: (all || 0) - (blockedCount || 0) },
    { value: 'blocked', label: 'Blocked', count: blockedCount || 0 },
  ];
  const exportQs = new URLSearchParams(Object.entries({ q: params.q, status: status === 'all' ? '' : status, sort: params.sort }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Everyone who has booked or signed up. Open a customer to see their bookings, disputes and reviews.</p>
        </div>
        <a href={`/api/export-customers${exportQs ? `?${exportQs}` : ''}`}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export CSV
        </a>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => {
          const body = (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className={`text-2xl font-black tabular-nums mt-1 ${s.tone}`}>{s.value.toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{s.sub}</p>
            </>
          );
          return s.link
            ? <Link key={s.label} href={s.link} className={`${card} p-4 block hover:border-orange-300 dark:hover:border-orange-700/60 transition-colors`}>{body}</Link>
            : <div key={s.label} className={`${card} p-4`}>{body}</div>;
        })}
      </div>

      <section className={`${card} overflow-hidden`}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map(t => (
              <Link key={t.value} href={href({ status: t.value })}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition-colors ${status === t.value
                  ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/60'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                {t.label} <span className="tabular-nums opacity-70">{t.count}</span>
              </Link>
            ))}
          </div>
          <CustomerSearch />
        </div>

        {list.error && <p className="px-4 py-3 text-sm text-red-600 dark:text-red-400">{list.error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-950/60">
              <tr>
                <th className={th}>Customer</th>
                <th className={th}>Phone</th>
                <th className={th}>Bookings</th>
                <th className={`${th} text-right`}>Spent</th>
                <th className={th}>Last booking</th>
                <th className={th}>Joined</th>
                <th className={th}>Status</th>
                <th className={th}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {list.customers.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-14 text-center text-sm text-gray-500 dark:text-gray-400">
                  {params.q ? `No customers match “${params.q}”.` : status === 'blocked' ? 'No blocked customers.' : 'No customers yet.'}
                </td></tr>
              ) : list.customers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/customers/${c.id}`} className="flex items-center gap-3 group min-w-0">
                      <span className="w-9 h-9 shrink-0 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 flex items-center justify-center text-sm font-black">
                        {(c.full_name || c.email || '?').charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 truncate">{c.full_name || 'No name'}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{c.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300 tabular-nums">{c.phone || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-bold text-gray-900 dark:text-white tabular-nums">{c.bookings}</span>
                    {c.bookings > 0 && <span className="ml-1.5 text-xs text-gray-500 dark:text-gray-400">{c.completed} done{c.upcoming ? ` · ${c.upcoming} upcoming` : ''}</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right font-semibold tabular-nums text-gray-900 dark:text-white">{c.spend ? rupees(c.spend) : <span className="text-gray-400 font-normal">—</span>}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">{c.lastBooking ? ago(c.lastBooking) : <span className="text-gray-400">Never</span>}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">{date(c.created_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${c.is_blocked
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700/50'
                      : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/50'}`}>
                      {c.is_blocked ? 'Blocked' : 'Active'}
                    </span>
                    {c.openDisputes > 0 && (
                      <Link href="/dashboard/disputes" className="ml-1.5 inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/50">
                        {c.openDisputes} dispute{c.openDisputes === 1 ? '' : 's'}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="inline-flex items-center gap-2">
                      {canEdit && <BlockButton userId={c.id} name={c.full_name || c.email} blocked={c.is_blocked} upcoming={c.upcoming} />}
                      <Link href={`/dashboard/customers/${c.id}`} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700">View</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{total ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}` : 'No results'}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={href({ page: String(page - 1) })} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 font-bold hover:bg-gray-50 dark:hover:bg-gray-800">← Previous</Link>}
            {page < pages && <Link href={href({ page: String(page + 1) })} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 font-bold hover:bg-gray-50 dark:hover:bg-gray-800">Next →</Link>}
          </div>
        </div>
      </section>
    </div>
  );
}
