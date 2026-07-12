import { getPartnerReports } from './actions';
import DateRangeFilter from './DateRangeFilter';
import TrendChart from './TrendChart';

export const revalidate = 60; // Cache for performance

export default async function PartnerReportsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await searchParams;
  const reports = await getPartnerReports(params.startDate, params.endDate);

  const kpiCards = [
    { label: 'Your Earnings', value: `₹${reports.totalPartnerEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: '₹', color: 'text-green-600', bgColor: 'bg-green-50' },
    { label: 'Gross Volume', value: `₹${reports.totalGrossVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: '💰', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'Total Bookings', value: reports.totalBookings.toString(), icon: '📦', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Reports</h1>
          <p className="text-gray-500 mt-1">Analyze your bookings and revenue over time.</p>
        </div>
        <div className="flex items-center gap-4">
          <DateRangeFilter />
          <a 
            href={`/api/export-reports?startDate=${params.startDate || ''}&endDate=${params.endDate || ''}`}
            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Export CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{card.label}</span>
              <span className={`text-xl w-10 h-10 flex items-center justify-center rounded-xl ${card.bgColor} ${card.color}`}>{card.icon}</span>
            </div>
            <span className={`text-3xl font-black ${card.color}`}>{card.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart 
          title="Daily Earnings (₹)" 
          data={reports.dailyTrends} 
          dataKey="earnings" 
          format="currency" 
        />
        <TrendChart 
          title="Daily Booking Volume" 
          data={reports.dailyTrends} 
          dataKey="bookings" 
          format="number" 
        />
      </div>
    </div>
  );
}
