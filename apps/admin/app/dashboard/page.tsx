import { getAdminAnalytics } from './actions';
import DateRangeFilter from './DateRangeFilter';
import TrendChart from './TrendChart';

export const revalidate = 60; // Cache for 60 seconds to improve dashboard performance

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await searchParams;
  const analytics = await getAdminAnalytics(params.startDate, params.endDate);

  const kpiCards = [
    { label: 'Total Revenue', value: `₹${analytics.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: '₹', color: 'from-green-500 to-emerald-600', bgColor: 'bg-green-500/10', textColor: 'text-green-400', href: '/dashboard/bookings' },
    { label: 'Platform Commission', value: `₹${analytics.totalCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: '%', color: 'from-orange-500 to-red-500', bgColor: 'bg-orange-500/10', textColor: 'text-orange-400', href: '/dashboard/settlements' },
    { label: 'Total Bookings', value: analytics.totalBookings.toString(), icon: '#', color: 'from-blue-500 to-indigo-600', bgColor: 'bg-blue-500/10', textColor: 'text-blue-400', href: '/dashboard/bookings' },
    { label: 'Active Bookings', value: analytics.activeBookings.toString(), icon: '⚡', color: 'from-yellow-500 to-amber-500', bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-400', href: '/dashboard/bookings' },
    { label: 'Registered Customers', value: analytics.totalCustomers.toString(), icon: '👤', color: 'from-purple-500 to-pink-500', bgColor: 'bg-purple-500/10', textColor: 'text-purple-400', href: '/dashboard/customers' },
    { label: 'Total Partners', value: analytics.totalPartners.toString(), icon: '🏪', color: 'from-teal-500 to-cyan-500', bgColor: 'bg-teal-500/10', textColor: 'text-teal-400', href: '/dashboard/partners' },
    { label: 'Pending Approvals', value: analytics.pendingPartners.toString(), icon: '⏳', color: 'from-red-500 to-rose-500', bgColor: 'bg-red-500/10', textColor: 'text-red-400', href: '/dashboard/partners' },
    { label: 'Storage Locations', value: analytics.totalLocations.toString(), icon: '📍', color: 'from-indigo-500 to-violet-500', bgColor: 'bg-indigo-500/10', textColor: 'text-indigo-400', href: '/dashboard/partners' },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50',
      confirmed: 'bg-blue-900/40 text-blue-400 border-blue-700/50',
      checked_in: 'bg-green-900/40 text-green-400 border-green-700/50',
      checked_out: 'bg-gray-700/40 text-gray-400 border-gray-600/50',
      cancelled: 'bg-red-900/40 text-red-400 border-red-700/50',
      disputed: 'bg-orange-900/40 text-orange-400 border-orange-700/50',
    };
    return styles[status] || 'bg-gray-700/40 text-gray-400 border-gray-600/50';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1">Platform-wide metrics and recent activity.</p>
        </div>
        <div className="flex items-center gap-4">
          <DateRangeFilter />
          <a 
            href={`/api/export-analytics?startDate=${params.startDate || ''}&endDate=${params.endDate || ''}`}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Export
          </a>
        </div>
      </div>

      {/* Anomaly Alerts */}
      {analytics.anomalies && analytics.anomalies.length > 0 && (
        <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            System Anomaly Alerts ({analytics.anomalies.length})
          </div>
          <div className="divide-y divide-red-900/20 text-xs text-red-300">
            {analytics.anomalies.map((a: any, idx: number) => (
              <div key={idx} className="py-2 flex justify-between">
                <span>{a.reason}</span>
                <span className="font-mono">{a.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <a href={card.href} key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors block group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider group-hover:text-gray-300 transition-colors">{card.label}</span>
              <span className={`text-lg ${card.bgColor} ${card.textColor} w-8 h-8 flex items-center justify-center rounded-lg`}>{card.icon}</span>
            </div>
            <span className={`text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r ${card.color}`}>{card.value}</span>
          </a>
        ))}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart 
          title="Revenue Trends (₹)" 
          data={analytics.dailyTrends} 
          dataKey="revenue" 
          format="currency" 
        />
        <TrendChart 
          title="Booking Volume Trends" 
          data={analytics.dailyTrends} 
          dataKey="bookings" 
          format="number" 
        />
      </div>

      {/* Two-Column: Recent Bookings + Pending Partners */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Bookings (2/3 width) */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Recent Bookings</h3>
            <a href="/dashboard/bookings" className="text-xs text-red-400 hover:text-red-300 font-semibold">View All →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bags</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {analytics.recentBookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-600 text-sm">No bookings yet.</td>
                  </tr>
                ) : (
                  analytics.recentBookings.map((booking: any) => (
                    <tr key={booking.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-3">
                        <span className="text-sm font-medium text-gray-300">{(booking.users as any)?.full_name || (booking.users as any)?.email || '—'}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-sm text-gray-400">{(booking.partner_locations as any)?.name || '—'}</span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-400">{booking.num_bags}</td>
                      <td className="px-6 py-3 text-sm font-mono text-gray-300">₹{Number(booking.total_amount).toFixed(2)}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStatusBadge(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Partner Approvals (1/3 width) */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Pending Approvals</h3>
            <a href="/dashboard/partners" className="text-xs text-red-400 hover:text-red-300 font-semibold">Manage →</a>
          </div>
          <div className="divide-y divide-gray-800/50">
            {analytics.pendingPartnersList.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-600 text-sm">No pending partners.</div>
            ) : (
              analytics.pendingPartnersList.map((partner: any) => (
                <div key={partner.id} className="px-6 py-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-200">{partner.business_name}</p>
                      <p className="text-xs text-gray-500">{(partner.users as any)?.email}</p>
                    </div>
                    <span className="inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border bg-yellow-900/40 text-yellow-400 border-yellow-700/50">
                      Pending
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
