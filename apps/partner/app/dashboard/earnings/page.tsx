import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function EarningsPage() {
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
  const { data: transactions, error } = await supabase
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Earnings & Payouts</h1>
        <p className="text-gray-500 mt-2">Track your revenue, commissions, and settlement status.</p>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <span className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Net Earnings</span>
          <div className="text-3xl font-black text-gray-900">₹{totalRevenue.toFixed(2)}</div>
          <p className="text-xs text-gray-400 mt-2">Total revenue after 15% platform fee</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <span className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Platform Fees</span>
          <div className="text-3xl font-black text-gray-400">₹{totalCommissionPaid.toFixed(2)}</div>
          <p className="text-xs text-gray-400 mt-2">Total commission deducted</p>
        </div>

        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
          <span className="block text-sm font-bold text-purple-700 uppercase tracking-wider mb-2">Pending Payouts (Online)</span>
          <div className="text-3xl font-black text-purple-900">₹{pendingOnlinePayouts.toFixed(2)}</div>
          <p className="text-xs text-purple-600 mt-2">To be transferred to your bank</p>
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
                  <th className="px-6 py-4">Commission (-15%)</th>
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
