import { createClient } from '@stashinn/lib/supabase/server';
import DisputeResolutionForm from './DisputeResolutionForm';

export default async function DisputesPage(props: { searchParams: Promise<{ status?: string }> }) {
  const searchParams = await props.searchParams;
  const statusFilter = searchParams?.status || 'all';
  const supabase = await createClient();

  let query = supabase
    .from('damage_reports')
    .select(`
      *,
      bookings ( id, total_amount ),
      partners ( business_name, user_id, users(email) ),
      users!damage_reports_customer_id_fkey ( full_name, email )
    `)
    .order('created_at', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data: disputes } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Dispute Arbitration</h1>
        <p className="text-gray-500 mt-1">Review partner-submitted incident reports and adjudicate refunds.</p>
      </div>

      <div className="flex gap-2 pb-4 border-b border-gray-800">
        {['all', 'submitted', 'under_review', 'resolved_refund', 'resolved_no_action', 'escalated'].map(status => (
          <a
            key={status}
            href={`/dashboard/disputes?status=${status}`}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${
              statusFilter === status
                ? 'bg-red-900/30 text-red-400 border-red-700/50'
                : 'bg-gray-900 text-gray-400 border-gray-700 hover:bg-gray-800 hover:text-gray-200'
            }`}
          >
            {status.replace(/_/g, ' ').toUpperCase()}
          </a>
        ))}
      </div>

      <div className="space-y-6">
        {!disputes || disputes.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500 text-sm">
            No disputes found matching this filter.
          </div>
        ) : (
          disputes.map((dispute: any) => (
            <div key={dispute.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 bg-gray-950 border-b border-gray-800 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-sm font-bold text-gray-200">
                      Booking: <span className="font-mono text-red-400">{dispute.booking_id.split('-')[0]}</span>
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      dispute.status === 'submitted' ? 'bg-blue-900/30 text-blue-400 border-blue-700/50' :
                      dispute.status === 'under_review' ? 'bg-amber-900/30 text-amber-400 border-amber-700/50' :
                      dispute.status.startsWith('resolved') ? 'bg-green-900/30 text-green-400 border-green-700/50' :
                      'bg-gray-800 text-gray-300 border-gray-600'
                    }`}>
                      {dispute.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Filed on {new Date(dispute.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Booking Value: <strong className="text-white">₹{dispute.bookings?.total_amount}</strong></p>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Left Col - Details */}
                <div className="xl:col-span-2 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-950 p-4 rounded-lg border border-gray-800">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Claimant (Partner)</p>
                      <p className="text-sm font-medium text-gray-200">{dispute.partners?.business_name}</p>
                      <p className="text-xs text-gray-500">{dispute.partners?.users?.email}</p>
                    </div>
                    <div className="bg-gray-950 p-4 rounded-lg border border-gray-800">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Defendant (Customer)</p>
                      <p className="text-sm font-medium text-gray-200">{dispute.users?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{dispute.users?.email}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-gray-400 mb-2">Partner's Incident Report:</h4>
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-sm text-gray-300 leading-relaxed">
                      {dispute.description}
                    </div>
                  </div>

                  {dispute.photos && dispute.photos.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 mb-2">Evidence ({dispute.photos.length})</h4>
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {dispute.photos.map((url: string, idx: number) => (
                          <a key={idx} href={url} target="_blank" rel="noreferrer" className="block shrink-0">
                            <img src={url} alt="Evidence" className="w-32 h-32 object-cover rounded-lg border border-gray-700 hover:border-red-500 transition-colors" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Col - Arbitration Form */}
                <div className="xl:col-span-1">
                  <div className="bg-gray-950 p-5 rounded-lg border border-gray-800">
                    <h4 className="text-sm font-bold text-white mb-4">Adjudication Panel</h4>
                    <DisputeResolutionForm dispute={dispute} />
                  </div>
                </div>

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
