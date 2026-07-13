import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import EarningsTrendChart from './EarningsTrendChart';

export default async function EarningsPage(props: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const startDate = searchParams?.startDate || '';
  const endDate = searchParams?.endDate || '';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: partner } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!partner) redirect('/onboarding');

  // Fetch transactions joined with bookings and payments
  let query = supabase
    .from('partner_transactions')
    .select(`
      *,
      bookings (
        start_time,
        end_time,
        payments (
          method,
          status
        )
      )
    `)
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data: transactions, error } = await query;

  if (error) {
    console.error('Error fetching transactions:', error);
  }

  // Calculate Aggregates
  let totalRevenue = 0;
  let totalCommissionPaid = 0;
  let pendingOnlinePayouts = 0;
  let pendingCashOwedToPlatform = 0;

  const txs = transactions || [];

  txs.forEach((tx) => {
    totalRevenue += Number(tx.amount); // Partner's net earnings
    totalCommissionPaid += Number(tx.commission);

    // Using the payment method to determine who holds the cash
    const payment = tx.bookings?.payments?.[0];
    
    if (tx.transfer_status === 'pending') {
      if (payment?.method === 'razorpay') {
        // Platform has the money, owes the partner their cut
        pendingOnlinePayouts += Number(tx.amount);
      } else if (payment?.method === 'pay_at_location') {
        // Partner has the cash, owes the platform the commission
        pendingCashOwedToPlatform += Number(tx.commission);
      }
    }
  });

  // Compare with previous month
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const prevMonthDate = new Date();
  prevMonthDate.setMonth(now.getMonth() - 1);
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  let currentMonthEarnings = 0;
  let prevMonthEarnings = 0;

  txs.forEach(tx => {
    const txDate = new Date(tx.created_at);
    const txMonthStr = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
    if (txMonthStr === currentMonthStr) {
      currentMonthEarnings += Number(tx.amount);
    } else if (txMonthStr === prevMonthStr) {
      prevMonthEarnings += Number(tx.amount);
    }
  });

  const diff = currentMonthEarnings - prevMonthEarnings;
  const percentChange = prevMonthEarnings > 0 ? (diff / prevMonthEarnings) * 100 : 0;

  // Group transactions for the trend chart
  const dailyMap = new Map<string, number>();
  txs.forEach(tx => {
    const dateStr = new Date(tx.created_at).toISOString().split('T')[0]!;
    dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + Number(tx.amount));
  });

  const chartData = Array.from(dailyMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-10); // Display the latest 10 days for cleaner chart sizing

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Earnings & Payouts</h1>
          <p className="text-gray-500 mt-2">Track your revenue, commissions, and settlement status.</p>
        </div>
        <div className="flex items-center">
          <a
            href={`/api/export-earnings?startDate=${startDate}&endDate=${endDate}`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Export CSV
          </a>
        </div>
      </div>

      {/* Date Filters Form */}
      <form method="GET" action="/dashboard/earnings" className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
          <input 
            type="date" 
            name="startDate" 
            defaultValue={startDate} 
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-500" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
          <input 
            type="date" 
            name="endDate" 
            defaultValue={endDate} 
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-500" 
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
            Apply Filters
          </button>
        </div>
      </form>

      {/* Earnings Trend Chart */}
      <EarningsTrendChart data={chartData} />

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <span className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Net Earnings</span>
          <div className="text-3xl font-black text-gray-900">₹{totalRevenue.toFixed(2)}</div>
          {prevMonthEarnings > 0 ? (
            <div className={`text-xs font-bold mt-2 ${percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {percentChange >= 0 ? '▲ +' : '▼ '}{percentChange.toFixed(1)}% vs last month (₹{prevMonthEarnings.toFixed(2)})
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-2">Total revenue after commission</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <span className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Platform Fees</span>
          <div className="text-3xl font-black text-gray-400">₹{totalCommissionPaid.toFixed(2)}</div>
          <p className="text-xs text-gray-400 mt-2">Total commission deducted</p>
        </div>

        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
          <span className="block text-sm font-bold text-blue-700 uppercase tracking-wider mb-2">Pending Payouts (Online)</span>
          <div className="text-3xl font-black text-blue-900">₹{pendingOnlinePayouts.toFixed(2)}</div>
          <p className="text-xs text-blue-600 mt-2">To be transferred to your bank</p>
        </div>

        <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100">
          <span className="block text-sm font-bold text-yellow-800 uppercase tracking-wider mb-2">Cash Due to Platform</span>
          <div className="text-3xl font-black text-yellow-900">₹{pendingCashOwedToPlatform.toFixed(2)}</div>
          <p className="text-xs text-yellow-700 mt-2">Unsettled cash commissions</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Transaction History</h2>
        </div>
        
        {txs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No transactions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Booking ID</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4">Gross Amount</th>
                  <th className="px-6 py-4">Commission</th>
                  <th className="px-6 py-4">Your Cut</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {txs.map((tx) => {
                  const payment = tx.bookings?.payments?.[0];
                  const gross = Number(tx.amount) + Number(tx.commission);
                  
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                        {tx.booking_id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        {payment?.method === 'razorpay' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                            Cash at Location
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono">₹{gross.toFixed(2)}</td>
                      <td className="px-6 py-4 font-mono text-red-600">-₹{Number(tx.commission).toFixed(2)}</td>
                      <td className="px-6 py-4 font-mono font-bold text-gray-900">₹{Number(tx.amount).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        {tx.transfer_status === 'completed' ? (
                          <span className="text-green-600 font-bold text-xs flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                            Settled
                          </span>
                        ) : (
                          <span className="text-yellow-600 font-bold text-xs">
                            {payment?.method === 'razorpay' ? 'Pending Payout' : 'Owe Commission'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
