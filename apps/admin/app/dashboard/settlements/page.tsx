import { createClient } from '@stashinn/lib/supabase/server';
import { processSettlement } from './actions';
import DownloadPDFWrapper from './DownloadPDFWrapper';

export default async function AdminSettlementsPage() {
  const supabase = await createClient();

  // Fetch pending validation payments
  const { data: pendingPayments } = await supabase
    .from('payments')
    .select('*, bookings!inner(id, partner_id), partner_transactions(*)')
    .eq('status', 'pending_validation')
    .order('updated_at', { ascending: false });

  // Filter transactions logically
  const validationItems = pendingPayments?.map((p: any) => {
    // Find the latest pending transaction for this booking
    const tx = p.partner_transactions?.find((t: any) => t.transfer_status === 'pending');
    return {
      payment: p,
      transaction: tx
    };
  }).filter((item: any) => item.transaction) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Settlement Verification</h1>
        <p className="text-gray-500 mt-1">Verify partner transfer proofs for pay-at-location commissions.</p>
      </div>

      <div className="space-y-4">
        {validationItems.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500 text-sm">
            No pending verifications.
          </div>
        ) : (
          validationItems.map((item: any) => (
            <div key={item.payment.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col md:flex-row">
              <div className="p-6 md:w-1/2 border-b md:border-b-0 md:border-r border-gray-800">
                <h3 className="text-lg font-bold text-gray-200 mb-2">Booking ID: {item.payment.bookings.id.split('-')[0]}</h3>
                <div className="space-y-1 mb-6 text-sm">
                  <p className="text-gray-400">Total Paid at Hotel: <span className="text-white font-mono">₹{item.payment.amount}</span></p>
                  <p className="text-gray-400">Commission Owed: <span className="text-red-400 font-mono font-bold">₹{item.transaction.commission}</span></p>
                  <p className="text-gray-500 text-xs">Submitted on: {new Date(item.transaction.created_at).toLocaleString()}</p>
                </div>

                <form action={processSettlement} className="flex gap-3">
                  <input type="hidden" name="payment_id" value={item.payment.id} />
                  <input type="hidden" name="transaction_id" value={item.transaction.id} />
                  <button
                    type="submit"
                    name="action"
                    value="approve"
                    className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors"
                  >
                    Approve Payment
                  </button>
                  <button
                    type="submit"
                    name="action"
                    value="reject"
                    className="flex-1 py-2 px-4 bg-gray-800 hover:bg-red-600/80 text-gray-300 hover:text-white border border-gray-700 hover:border-red-500 text-sm font-bold rounded-lg transition-colors"
                  >
                    Reject (Fake Proof)
                  </button>
                </form>
              </div>

              <div className="p-6 md:w-1/2 flex items-center justify-center bg-gray-950 relative">
                <div className="w-full h-full min-h-[200px] flex items-center justify-center">
                  {item.transaction.transfer_proof ? (
                    item.transaction.transfer_proof.endsWith('.pdf') ? (
                      <a href={item.transaction.transfer_proof} target="_blank" rel="noreferrer" className="text-red-400 hover:underline flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        View PDF Receipt
                      </a>
                    ) : (
                      <a href={item.transaction.transfer_proof} target="_blank" rel="noreferrer">
                        <img 
                          src={item.transaction.transfer_proof} 
                          alt="Transfer Proof" 
                          className="max-h-[300px] rounded border border-gray-700 cursor-zoom-in"
                        />
                      </a>
                    )
                  ) : (
                    <span className="text-gray-600 text-sm italic">No proof URL attached.</span>
                  )}
                  {item.transaction && (
                    <div className="absolute top-4 right-4 bg-gray-900/80 p-2 rounded-lg backdrop-blur">
                      <DownloadPDFWrapper transaction={{...item.transaction, bookings: item.payment.bookings}} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
