import { createClient } from '@stashinn/lib/supabase/server';
import ReportForm from './ReportForm';

export default async function DamageReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: partner } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!partner) return null;

  // Fetch past reports
  const { data: reports } = await supabase
    .from('damage_reports')
    .select('*, bookings(id, start_time, end_time), users(full_name, email)')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false });

  // Fetch recent bookings (eligible for damage report)
  // E.g., checked_out bookings from the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: eligibleBookings } = await supabase
    .from('bookings')
    .select('id, start_time, end_time, users(full_name)')
    .eq('partner_id', partner.id)
    .eq('status', 'checked_out')
    .gte('actual_checkout', sevenDaysAgo.toISOString())
    .order('actual_checkout', { ascending: false });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Incident & Damage Reports</h1>
        <p className="text-gray-400 mt-1">Submit claims for damaged property or unpaid fees within 7 days of checkout.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Col - Submit Form */}
        <div className="xl:col-span-1">
          <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-xl">
            <div className="bg-gray-900/50 px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">File a New Report</h2>
            </div>
            <div className="p-6">
              {!eligibleBookings || eligibleBookings.length === 0 ? (
                <div className="text-sm text-amber-400 bg-amber-400/10 p-4 rounded-lg border border-amber-400/20">
                  No eligible bookings found. Only bookings that checked out in the last 7 days can be reported.
                </div>
              ) : (
                <ReportForm eligibleBookings={eligibleBookings} />
              )}
            </div>
          </div>
        </div>

        {/* Right Col - Past Reports */}
        <div className="xl:col-span-2">
          <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-xl">
            <div className="bg-gray-900/50 px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">Your Submissions</h2>
            </div>
            <div className="p-0">
              {!reports || reports.length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-sm">
                  You haven't submitted any damage reports yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {reports.map((report: any) => (
                    <div key={report.id} className="p-6 hover:bg-gray-750 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            Booking: <span className="font-mono text-blue-400">{report.booking_id.split('-')[0]}</span>
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">
                            Customer: {report.users?.full_name || 'Unknown'} | Submitted: {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            report.status === 'submitted' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            report.status === 'under_review' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            report.status === 'resolved_refund' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            'bg-gray-700 text-gray-300 border border-gray-600'
                          }`}>
                            {report.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                        <p className="text-sm text-gray-300">{report.description}</p>
                      </div>
                      
                      {report.photos && report.photos.length > 0 && (
                        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                          {report.photos.map((photo: string, idx: number) => (
                            <a key={idx} href={photo} target="_blank" rel="noreferrer" className="block shrink-0">
                              <img src={photo} alt="Evidence" className="w-20 h-20 object-cover rounded-md border border-gray-600 opacity-80 hover:opacity-100 transition-opacity" />
                            </a>
                          ))}
                        </div>
                      )}

                      {report.admin_notes && (
                        <div className="mt-4 bg-red-900/20 border border-red-500/30 p-4 rounded-lg">
                          <p className="text-xs font-bold text-red-400 uppercase mb-1">Admin Response</p>
                          <p className="text-sm text-gray-200">{report.admin_notes}</p>
                          {report.refund_amount > 0 && (
                            <p className="text-sm font-bold text-green-400 mt-2">Refund Awarded: ₹{report.refund_amount}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
