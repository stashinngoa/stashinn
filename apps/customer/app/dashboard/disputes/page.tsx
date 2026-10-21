import { createClient } from '@stashinn/lib/supabase/server';
import ReportForm from './ReportForm';

export default async function CustomerDisputesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch past reports
  const { data: reports } = await supabase
    .from('damage_reports')
    .select('*, bookings(id, start_time, end_time), partners(business_name)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch eligible bookings (any booking that is not cancelled)
  const { data: eligibleBookings } = await supabase
    .from('bookings')
    .select('id, start_time, end_time, status, partner_locations(name)')
    .eq('customer_id', user.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Help & Disputes</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Submit complaints or dispute a transaction. Our team will arbitrate the matter.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Col - Submit Form */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-200">
            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Raise a Dispute</h2>
            </div>
            <div className="p-6">
              {!eligibleBookings || eligibleBookings.length === 0 ? (
                <div className="text-sm text-yellow-800 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800/50">
                  No eligible bookings found to report against.
                </div>
              ) : (
                <ReportForm eligibleBookings={eligibleBookings} />
              )}
            </div>
          </div>
        </div>

        {/* Right Col - Past Reports */}
        <div className="xl:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-200">
            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your Tickets</h2>
            </div>
            <div className="p-0">
              {!reports || reports.length === 0 ? (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                  You haven't submitted any disputes yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {reports.map((report: any) => (
                    <div key={report.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex justify-between items-start mb-4 gap-4">
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                            Booking: <span className="font-mono text-purple-600 dark:text-purple-400">#{report.booking_id.split('-')[0].toUpperCase()}</span>
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Partner: {report.partners?.business_name || 'Unknown'} | Submitted: {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase whitespace-nowrap ${
                            report.status === 'submitted' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800' :
                            report.status === 'under_review' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
                            report.status === 'resolved_refund' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' :
                            'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                          }`}>
                            {report.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-200 dark:border-gray-800/50">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{report.description}</p>
                        
                        {report.photos && report.photos.length > 0 && (
                          <div className="mt-4 flex gap-2 flex-wrap">
                            {report.photos.map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer" className="block w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                <img src={url} alt="Evidence" className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
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
