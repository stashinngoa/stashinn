import { createClient } from '@stashinn/lib/supabase/server';
import UploadProofForm from './UploadProofForm';
import DownloadPDFWrapper from './DownloadPDFWrapper';

export default async function SettlementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: partner } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!partner) return null;

  // Fetch all pay-at-hotel bookings for this partner where payment is pending or pending_validation
  const { data: pendingPayments } = await supabase
    .from('payments')
    .select('*, bookings!inner(id, start_time, end_time, commission_amount, total_amount, users(full_name))')
    .eq('method', 'pay_at_location')
    .in('status', ['pending', 'pending_validation'])
    .eq('bookings.partner_id', partner.id)
    .order('created_at', { ascending: false });

  // Fetch past settlements
  const { data: pastTransactions } = await supabase
    .from('partner_transactions')
    .select('*, bookings(id)')
    .eq('partner_id', partner.id)
    .not('transfer_proof', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">Platform Settlements</h1>
        <p className="text-gray-500 mt-1">Upload transfer proofs for commission owed on Pay-at-Hotel bookings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Pending Settlements */}
        <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800">Pending Dues</h2>
            <p className="text-xs text-gray-500">Bookings where you collected cash and owe the platform commission.</p>
          </div>
          <div className="p-0">
            {!pendingPayments || pendingPayments.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-500">
                You have no pending dues. All caught up!
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingPayments.map((payment: any) => (
                  <div key={payment.id} className="p-6">
                    <div className="flex justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-sm text-gray-900">
                          Booking ID: {payment.bookings.id.split('-')[0]}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Customer: {payment.bookings.users?.full_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">Owed: ₹{payment.bookings.commission_amount}</p>
                        <p className="text-xs text-gray-500">Total Booking: ₹{payment.bookings.total_amount}</p>
                      </div>
                    </div>

                    {payment.status === 'pending_validation' ? (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm text-amber-700 flex items-center justify-between">
                        <span className="font-medium">Proof uploaded. Awaiting Admin Verification.</span>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-3">Upload UPI/Bank Transfer Screenshot:</p>
                        <UploadProofForm paymentId={payment.id} partnerId={partner.id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800">Settlement History</h2>
          </div>
          <div className="p-0">
             {!pastTransactions || pastTransactions.length === 0 ? (
               <div className="p-12 text-center text-sm text-gray-500">No past transactions.</div>
             ) : (
               <div className="divide-y divide-gray-100">
                 {pastTransactions.map((tx: any) => (
                   <div key={tx.id} className="p-4 flex items-center justify-between">
                     <div>
                       <p className="text-sm font-medium text-gray-900">
                         For Booking {tx.bookings?.id.split('-')[0]}
                       </p>
                       <p className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</p>
                     </div>
                     <div className="flex items-center gap-3">
                       <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                         tx.transfer_status === 'completed' ? 'bg-green-100 text-green-700' :
                         'bg-gray-100 text-gray-600'
                       }`}>
                         {tx.transfer_status.toUpperCase()}
                       </span>
                       <a href={tx.transfer_proof} target="_blank" rel="noreferrer" className="text-purple-600 hover:text-purple-800 text-xs font-medium underline">
                         View Proof
                       </a>
                       <DownloadPDFWrapper transaction={tx} />
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
