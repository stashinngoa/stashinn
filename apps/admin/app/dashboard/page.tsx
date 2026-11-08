import Link from 'next/link';
import { getAdminAnalytics } from './actions';
import DateRangeFilter from './DateRangeFilter';
import TrendChart from './TrendChart';
import { DashboardTransitionProvider, PendingArea } from './DashboardTransition';
import { statusOf } from './bookingStatus';
import { ICONS, Icon, RecentBookings, SectionHeader, card, inr, timeAgo } from './overviews/ui';
import { getAdminContext } from '../../lib/adminAccess';
import OpsOverview from './overviews/OpsOverview';
import FinanceOverview from './overviews/FinanceOverview';
import SupportOverview from './overviews/SupportOverview';

export const revalidate = 60; // Cache for 60 seconds to improve dashboard performance

type Params = { searchParams: Promise<{ [key: string]: string | undefined }> };

// Each staff role gets an overview focused on its own work (see lib/permissions.ts)
export default async function AdminDashboard(props: Params) {
  const { role } = await getAdminContext();
  if (role === 'ops') return <OpsOverview />;
  if (role === 'finance') return <FinanceOverview searchParams={props.searchParams} />;
  if (role === 'support') return <SupportOverview />;
  return <SuperadminOverview {...props} />;
}

async function SuperadminOverview({ searchParams }: Params) {
  const params = await searchParams;
  const a = await getAdminAnalytics(params.startDate, params.endDate);

  const istHour = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date()));
  const greeting = istHour < 12 ? 'Good morning' : istHour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });
  const rangeLabel = params.startDate || params.endDate
    ? `${params.startDate || 'start'} → ${params.endDate || 'today'}`
    : 'All time';

  const takeRate = a.totalBeforeGst > 0 ? (a.totalCommission / a.totalBeforeGst) * 100 : 0;
  const luggageShare = a.totalRevenue > 0 ? (a.luggageRevenue / a.totalRevenue) * 100 : 0;

  const kpis = [
    { label: 'Active bookings', value: a.activeBookings.toLocaleString('en-IN'), sub: `${a.activeVehicles} vehicle${a.activeVehicles === 1 ? '' : 's'} on site`, icon: 'bolt' as const, href: '/dashboard/bookings' },
    { label: 'Total bookings', value: a.totalBookings.toLocaleString('en-IN'), sub: `${a.luggageBookings} luggage · ${a.garageBookings} vehicle`, icon: 'clipboard' as const, href: '/dashboard/bookings' },
    { label: 'Customers', value: a.totalCustomers.toLocaleString('en-IN'), sub: 'Registered in period', icon: 'users' as const, href: '/dashboard/customers' },
    { label: 'Partners', value: a.totalPartners.toLocaleString('en-IN'), sub: `${a.approvedPartners} approved · ${a.pendingPartners} pending · ${a.liveLocations} of ${a.totalLocations} location${a.totalLocations === 1 ? '' : 's'} live`, icon: 'store' as const, href: '/dashboard/partners' },
  ];

  const attention = [
    a.pendingPartners > 0 && { label: `${a.pendingPartners} partner${a.pendingPartners === 1 ? '' : 's'} awaiting approval`, href: '/dashboard/partners', icon: 'store' as const, tone: 'amber' },
    a.anomalies.length > 0 && { label: `${a.anomalies.length} refund anomal${a.anomalies.length === 1 ? 'y' : 'ies'} flagged`, href: '#anomalies', icon: 'alert' as const, tone: 'red' },
    (a.statusCounts.disputed ?? 0) > 0 && { label: `${a.statusCounts.disputed} disputed booking${a.statusCounts.disputed === 1 ? '' : 's'}`, href: '/dashboard/disputes', icon: 'alert' as const, tone: 'orange' },
  ].filter(Boolean) as { label: string; href: string; icon: keyof typeof ICONS; tone: 'amber' | 'red' | 'orange' }[];

  const toneClass = {
    amber: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 hover:border-amber-300 dark:hover:border-amber-700',
    red: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 hover:border-red-300 dark:hover:border-red-700',
    orange: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/50 text-orange-800 dark:text-orange-300 hover:border-orange-300 dark:hover:border-orange-700',
  };

  const statusEntries = Object.entries(a.statusCounts).sort((x, y) => y[1] - x[1]);
  const auth = a.authMetrics;

  return (
    <DashboardTransitionProvider>
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">{today}</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{greeting} 👋</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Here&apos;s how StashInn is doing · <span className="font-semibold text-gray-700 dark:text-gray-300">{rangeLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter />
          <a
            href={`/api/export-analytics?startDate=${params.startDate || ''}&endDate=${params.endDate || ''}`}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-800 text-xs font-bold rounded-xl transition-colors"
          >
            <Icon name="download" className="w-4 h-4" />
            Export
          </a>
        </div>
      </div>

      <PendingArea>
      {/* Needs attention */}
      {attention.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {attention.map(item => (
            <a key={item.label} href={item.href} className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-colors ${toneClass[item.tone]}`}>
              <Icon name={item.icon} className="w-4 h-4" />
              {item.label}
              <Icon name="arrow" className="w-3.5 h-3.5 opacity-60" />
            </a>
          ))}
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
          <Icon name="check" className="w-4 h-4" />
          All clear — nothing needs your attention
        </div>
      )}

      {/* Revenue hero + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl p-6 text-white bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 shadow-lg shadow-orange-500/20">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" aria-hidden="true" />
          <div className="absolute -right-4 bottom-0 w-24 h-24 rounded-full bg-white/10" aria-hidden="true" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-wider text-white/80">Gross revenue</p>
            <p className="text-4xl font-black tracking-tight mt-1 tabular-nums" title={inr(a.totalRevenue, 2)}>{inr(a.totalRevenue)}</p>
            <p className="text-xs text-white/80 mt-1">From completed bookings</p>

            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="rounded-xl bg-white/15 backdrop-blur-sm px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/75">Commission</p>
                <p className="text-base font-black tabular-nums mt-0.5" title={inr(a.totalCommission, 2)}>{inr(a.totalCommission)}</p>
              </div>
              <div className="rounded-xl bg-white/15 backdrop-blur-sm px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/75">Take rate</p>
                <p className="text-base font-black tabular-nums mt-0.5">{takeRate.toFixed(1)}%</p>
              </div>
              <div className="rounded-xl bg-white/15 backdrop-blur-sm px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/75">Refunded</p>
                <p className="text-base font-black tabular-nums mt-0.5" title={inr(a.totalRefunded, 2)}>{inr(a.totalRefunded)}</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex h-2 rounded-full overflow-hidden bg-white/20">
                <div className="bg-white" style={{ width: `${luggageShare}%` }} />
                <div className="bg-white/50" style={{ width: `${a.totalRevenue > 0 ? 100 - luggageShare : 0}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs font-semibold text-white/90">
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white" />Luggage {inr(a.luggageRevenue)}</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/50" />Vehicle {inr(a.vehicleRevenue)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {kpis.map(k => (
            <Link key={k.label} href={k.href} className={`${card} group p-5 flex flex-col justify-between hover:border-orange-300 dark:hover:border-orange-500/50 hover:shadow-md transition-all`}>
              <div className="flex items-start justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{k.label}</p>
                <span className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Icon name={k.icon} />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{k.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{k.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendChart title="Revenue" data={a.dailyTrends} dataKey="revenue" format="currency" variant="area" />
        <TrendChart title="Booking volume" data={a.dailyTrends} dataKey="bookings" format="number" variant="bar" />
      </div>

      {/* Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RecentBookings bookings={a.recentBookings} className="lg:col-span-2" />

        <div className="space-y-4">
          {/* Status breakdown */}
          <div className={card}>
            <SectionHeader title="Booking status" />
            <div className="p-5">
              {a.totalBookings === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No bookings in this period.</p>
              ) : (
                <>
                  <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 gap-0.5">
                    {statusEntries.map(([status, count]) => (
                      <div key={status} className={statusOf(status).bar} style={{ width: `${(count / a.totalBookings) * 100}%` }} title={`${statusOf(status).label}: ${count}`} />
                    ))}
                  </div>
                  <ul className="mt-4 space-y-2">
                    {statusEntries.map(([status, count]) => (
                      <li key={status} className="flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <span className={`w-2 h-2 rounded-full ${statusOf(status).dot}`} />
                          {statusOf(status).label}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                          {count}
                          <span className="ml-2 text-xs font-medium text-gray-400 dark:text-gray-500">{Math.round((count / a.totalBookings) * 100)}%</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          {/* Pending approvals */}
          <div className={`${card} overflow-hidden`}>
            <SectionHeader title={`Pending approvals${a.pendingPartners ? ` (${a.pendingPartners})` : ''}`} href="/dashboard/partners" linkLabel="Manage" />
            {a.pendingPartnersList.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">No partners waiting.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {a.pendingPartnersList.map((p: any) => (
                  <li key={p.id}>
                    <Link href={`/dashboard/partners/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-orange-50/40 dark:hover:bg-gray-800/40 transition-colors group">
                      <span className="w-9 h-9 shrink-0 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                        <Icon name="store" className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{p.business_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.users?.email} · {timeAgo(p.created_at)}</p>
                      </div>
                      <Icon name="arrow" className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-orange-500 transition-colors" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Sign-in health */}
          <div className={card}>
            <SectionHeader title="Sign-in health" />
            <div className="p-5">
              <div className="flex items-center gap-4">
                <span className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Icon name="shield" />
                </span>
                <div>
                  <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{auth.success_rate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">success across {auth.total.toLocaleString('en-IN')} attempts</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-4">
                {([['Email', auth.email], ['WhatsApp', auth.whatsapp], ['SMS', auth.sms], ['Auto', auth.auto]] as const).map(([label, n]) => (
                  <div key={label} className="rounded-xl bg-gray-50 dark:bg-gray-800/60 px-2 py-2 text-center">
                    <p className="text-sm font-black text-gray-900 dark:text-white tabular-nums">{n}</p>
                    <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Refund anomalies */}
      {a.anomalies.length > 0 && (
        <div id="anomalies" className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2 text-red-700 dark:text-red-400 text-sm font-bold border-b border-red-200 dark:border-red-900/50">
            <Icon name="refund" className="w-4 h-4" />
            Refund anomalies ({a.anomalies.length})
          </div>
          <ul className="divide-y divide-red-200/70 dark:divide-red-900/40">
            {a.anomalies.map((an, i) => (
              <li key={i} className="px-5 py-2.5 flex items-center justify-between gap-4 text-xs text-red-700 dark:text-red-300">
                <span>{an.reason}</span>
                <span className="font-mono shrink-0">{new Date(an.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      </PendingArea>
    </div>
    </DashboardTransitionProvider>
  );
}
