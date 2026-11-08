import { getAdminAnalytics } from '../actions';
import DateRangeFilter from '../DateRangeFilter';
import TrendChart from '../TrendChart';
import { DashboardTransitionProvider, PendingArea } from '../DashboardTransition';
import { getFinancePayouts } from './queries';
import { Icon, ListPanel, ListRow, OverviewHeader, StatCard, inr } from './ui';

type Params = Promise<{ [key: string]: string | undefined }>;

/** Finance: money in (revenue, commission), money out (refunds, partner payouts). */
export default async function FinanceOverview({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const [a, payouts] = await Promise.all([getAdminAnalytics(params.startDate, params.endDate), getFinancePayouts()]);

  const takeRate = a.totalBeforeGst > 0 ? (a.totalCommission / a.totalBeforeGst) * 100 : 0;
  const rangeLabel = params.startDate || params.endDate ? `${params.startDate || 'start'} → ${params.endDate || 'today'}` : 'All time';

  return (
    <DashboardTransitionProvider>
      <div className="max-w-7xl mx-auto space-y-6">
        <OverviewHeader subtitle={<>Finance · revenue, refunds and partner payouts · <span className="font-semibold text-gray-700 dark:text-gray-300">{rangeLabel}</span></>}>
          <DateRangeFilter />
          <a
            href={`/api/export-analytics?startDate=${params.startDate || ''}&endDate=${params.endDate || ''}`}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-800 text-xs font-bold rounded-xl transition-colors"
          >
            <Icon name="download" className="w-4 h-4" />
            Export
          </a>
        </OverviewHeader>

        <PendingArea>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Gross revenue" value={inr(a.totalRevenue)} sub="Completed bookings in period" icon="cash" />
            <StatCard label="Commission" value={inr(a.totalCommission)} sub={`${takeRate.toFixed(1)}% take rate`} icon="bolt" />
            <StatCard label="Refunded" value={inr(a.totalRefunded)} sub={a.anomalies.length ? `${a.anomalies.length} unusual refund day${a.anomalies.length === 1 ? '' : 's'}` : 'No unusual refunds'} icon="refund" tone={a.anomalies.length ? 'red' : 'orange'} />
            <StatCard label="Owed to partners" value={inr(payouts.totalOwed)} sub={`${payouts.pendingTransfers} pending transfer${payouts.pendingTransfers === 1 ? '' : 's'} · ${payouts.partnersOwed} partner${payouts.partnersOwed === 1 ? '' : 's'}`} icon="store" tone={payouts.failedTransfers ? 'red' : 'amber'} href="/dashboard/settlements" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <TrendChart title="Revenue" data={a.dailyTrends} dataKey="revenue" format="currency" variant="area" />
            </div>
            <ListPanel title="Partners owed the most" href="/dashboard/settlements" linkLabel="Settlements" empty="No pending payouts.">
              {payouts.topPartners.map(p => (
                <ListRow
                  key={p.id}
                  href={`/dashboard/partners/${p.id}`}
                  title={p.name}
                  detail={`${p.count} pending transfer${p.count === 1 ? '' : 's'}`}
                  badge={<span className="shrink-0 text-sm font-black text-gray-900 dark:text-white tabular-nums">{inr(p.amount)}</span>}
                />
              ))}
            </ListPanel>
          </div>

          {(payouts.failedTransfers > 0 || a.anomalies.length > 0) && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-2 text-red-700 dark:text-red-400 text-sm font-bold border-b border-red-200 dark:border-red-900/50">
                <Icon name="alert" className="w-4 h-4" />
                Needs a look
              </div>
              <ul className="divide-y divide-red-200/70 dark:divide-red-900/40 text-xs text-red-700 dark:text-red-300">
                {payouts.failedTransfers > 0 && (
                  <li className="px-5 py-2.5">{payouts.failedTransfers} partner transfer{payouts.failedTransfers === 1 ? '' : 's'} failed and need retrying.</li>
                )}
                {a.anomalies.map((an, i) => (
                  <li key={i} className="px-5 py-2.5 flex items-center justify-between gap-4">
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
