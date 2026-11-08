import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { processSettlement } from './actions';
import DownloadPDFWrapper from './DownloadPDFWrapper';
import QrConfirmations, { type QrItem } from './QrConfirmations';
import { platformDue } from '@stashinn/lib/services/bookingAvailability';

export default async function AdminSettlementsPage() {
  const supabase = await createClient();

  // Fetch pending validation payments
  const { data: pendingPayments } = await supabase
    .from('payments')
    .select('*, bookings!inner(id, partner_id, commission_amount, gst_amount, partner_transactions(*))')
    .eq('status', 'pending_validation')
    .order('updated_at', { ascending: false });

  // Filter transactions logically
  const service = createServiceClient();
  const validationItems = await Promise.all((pendingPayments || []).map(async (p: any) => {
    // The proof the partner submitted (the booking's own ledger row has no proof)
    const tx = p.bookings?.partner_transactions?.find((t: any) => t.transfer_status === 'pending' && t.transfer_proof);
    if (!tx) return null;
    const { data } = await service.storage.from('settlement_proofs').createSignedUrl(tx.transfer_proof, 3600);
    return { payment: p, transaction: tx, proofUrl: data?.signedUrl ?? null };
  })).then(items => items.filter(Boolean) as any[]);

  // Pay-at-drop-off payments a partner recorded as paid on the StashInn QR (* so this loads before the columns exist)
  const { data: dropoff } = await service.from('payments')
    .select('*, bookings!inner(id, status, total_amount, partner_amount, partners(business_name), partner_locations(name))')
    .eq('method', 'pay_at_location').eq('status', 'pending').limit(1000);
  const qrItems: QrItem[] = (dropoff || [])
    .filter((p: any) => p.collected_via === 'stashinn_qr')
    .map((p: any) => {
      const b = Array.isArray(p.bookings) ? p.bookings[0] : p.bookings;
      return {
        paymentId: p.id,
        bookingId: b.id,
        partner: (Array.isArray(b.partners) ? b.partners[0] : b.partners)?.business_name || 'Partner',
        location: (Array.isArray(b.partner_locations) ? b.partner_locations[0] : b.partner_locations)?.name || '',
        amount: Number(p.collected_amount ?? b.total_amount) || 0,
        share: Number(b.partner_amount) || 0,
        collectedAt: p.collected_at,
        reference: p.qr_reference || '',
      };
    })
    .sort((a, b) => String(a.collectedAt).localeCompare(String(b.collectedAt)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Settlement Verification</h1>
        <p className="text-gray-500 mt-1">Confirm StashInn-QR payments partners recorded at drop-off, and verify partners’ transfers of commission and GST on pay-at-drop-off bookings they collected.</p>
      </div>

      <QrConfirmations items={qrItems} />

      <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Partner transfer proofs <span className="text-gray-400 tabular-nums">({validationItems.length})</span></h2>
      <div className="space-y-4">
        {validationItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center text-gray-500 text-sm">
            No pending verifications.
          </div>
        ) : (
          validationItems.map((item: any) => (
            <div key={item.payment.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col md:flex-row">
              <div className="p-6 md:w-1/2 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">Booking ID: {item.payment.bookings.id.split('-')[0]}</h3>
                <div className="space-y-1 mb-6 text-sm">
                  <p className="text-gray-600 dark:text-gray-400">Total Paid at Hotel: <span className="text-gray-900 dark:text-white font-mono">₹{item.payment.amount}</span></p>
                  <p className="text-gray-600 dark:text-gray-400">Amount Owed: <span className="text-red-600 dark:text-red-400 font-mono font-bold">₹{platformDue(item.payment.bookings).toFixed(2)}</span></p>
                  <p className="text-gray-500 text-xs">Commission ₹{Number(item.payment.bookings.commission_amount).toFixed(2)}{item.payment.bookings.gst_amount != null ? ` + GST ₹${Number(item.payment.bookings.gst_amount).toFixed(2)}` : ''}</p>
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
                    className="flex-1 py-2 px-4 bg-gray-50 dark:bg-gray-800 hover:bg-red-600/80 text-gray-700 dark:text-gray-300 hover:text-white border border-gray-300 dark:border-gray-700 hover:border-red-500 text-sm font-bold rounded-lg transition-colors"
                  >
                    Reject (Fake Proof)
                  </button>
                </form>
              </div>

              <div className="p-6 md:w-1/2 flex items-center justify-center bg-gray-50 dark:bg-gray-950 relative">
                <div className="w-full h-full min-h-[200px] flex items-center justify-center">
                  {item.proofUrl ? (
                    item.transaction.transfer_proof.endsWith('.pdf') ? (
                      <a href={item.proofUrl} target="_blank" rel="noreferrer" className="text-red-600 dark:text-red-400 hover:underline flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        View PDF Receipt
                      </a>
                    ) : (
                      <a href={item.proofUrl} target="_blank" rel="noreferrer">
                        <img 
                          src={item.proofUrl} 
                          alt="Transfer Proof" 
                          className="max-h-[300px] rounded border border-gray-300 dark:border-gray-700 cursor-zoom-in"
                        />
                      </a>
                    )
                  ) : (
                    <span className="text-gray-600 text-sm italic">No proof URL attached.</span>
                  )}
                  {item.transaction && (
                    <div className="absolute top-4 right-4 bg-white dark:bg-gray-900/80 p-2 rounded-lg backdrop-blur">
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
