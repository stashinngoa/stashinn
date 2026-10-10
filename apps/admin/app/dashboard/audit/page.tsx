import { createClient } from '@stashinn/lib/supabase/server';
import DiffViewer from './DiffViewer';
import SystemHealthMonitor from './SystemHealthMonitor';
import Link from 'next/link';

export default async function AuditLogsPage(props: {
  searchParams: Promise<{
    entity?: string;
    action?: string;
    userEmail?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const entityFilter = searchParams?.entity || 'all';
  const actionFilter = searchParams?.action || '';
  const userEmailFilter = searchParams?.userEmail || '';
  const startDateFilter = searchParams?.startDate || '';
  const endDateFilter = searchParams?.endDate || '';
  
  const currentPage = parseInt(searchParams?.page || '1');
  const pageSize = 15;
  const offset = (currentPage - 1) * pageSize;

  const supabase = await createClient();

  let query = supabase
    .from('audit_logs')
    .select('*, users!audit_logs_user_id_fkey(email)')
    .order('created_at', { ascending: false });

  if (entityFilter !== 'all') {
    query = query.eq('entity_type', entityFilter);
  }
  if (actionFilter) {
    query = query.ilike('action', `%${actionFilter}%`);
  }
  if (startDateFilter) {
    query = query.gte('created_at', startDateFilter);
  }
  if (endDateFilter) {
    query = query.lte('created_at', endDateFilter);
  }

  const { data: rawLogs, error } = await query;

  // Filter by user email if search parameter is present
  let filteredLogs = rawLogs || [];
  if (userEmailFilter) {
    filteredLogs = filteredLogs.filter((log: any) => 
      (log.users as any)?.email?.toLowerCase().includes(userEmailFilter.toLowerCase())
    );
  }

  const totalLogs = filteredLogs.length;
  const paginatedLogs = filteredLogs.slice(offset, offset + pageSize);
  const totalPages = Math.ceil(totalLogs / pageSize) || 1;

  // Analytics query for auth_audits
  const authQuery = supabase.from('auth_audits').select('method, success');
  if (startDateFilter) authQuery.gte('created_at', startDateFilter);
  if (endDateFilter) authQuery.lte('created_at', endDateFilter);
  
  const { data: audits } = await authQuery;
  
  const authMetrics = { total: 0, email: 0, whatsapp: 0, sms: 0, auto: 0 };
  if (audits) {
    authMetrics.total = audits.length;
    audits.forEach((a: any) => {
      if (a.method === 'email') authMetrics.email++;
      if (a.method === 'whatsapp') authMetrics.whatsapp++;
      if (a.method === 'sms') authMetrics.sms++;
      if (a.method === 'auto') authMetrics.auto++;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">System Audit Logs & Health</h1>
          <p className="text-gray-500 mt-1">Immutable trail of critical system events and real-time infrastructure matrix.</p>
        </div>
        <div className="flex items-center">
          <a
            href={`/api/export-audit?entity=${entityFilter}&action=${actionFilter}&userEmail=${userEmailFilter}&startDate=${startDateFilter}&endDate=${endDateFilter}`}
            className="px-4 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Export CSV
          </a>
        </div>
      </div>

      <SystemHealthMonitor />

      {/* Authentication Metrics */}
      {authMetrics && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Authentication Metrics (Logins)</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-300 dark:border-gray-700/50">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{authMetrics.total}</p>
            </div>
            <div className="bg-green-900/10 p-4 rounded-lg border border-green-800/30">
              <p className="text-green-500 text-xs font-bold uppercase tracking-wider mb-1">WhatsApp</p>
              <p className="text-2xl font-black text-green-400">{authMetrics.whatsapp}</p>
            </div>
            <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-800/30">
              <p className="text-blue-500 text-xs font-bold uppercase tracking-wider mb-1">Email</p>
              <p className="text-2xl font-black text-blue-400">{authMetrics.email}</p>
            </div>
            <div className="bg-purple-900/10 p-4 rounded-lg border border-purple-800/30">
              <p className="text-purple-500 text-xs font-bold uppercase tracking-wider mb-1">SMS</p>
              <p className="text-2xl font-black text-purple-400">{authMetrics.sms}</p>
            </div>
            <div className="bg-orange-900/10 p-4 rounded-lg border border-orange-800/30">
              <p className="text-orange-500 text-xs font-bold uppercase tracking-wider mb-1">Auto (Booking)</p>
              <p className="text-2xl font-black text-orange-400">{authMetrics.auto}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'partner', 'booking', 'user', 'system_config'].map(entity => (
          <Link
            key={entity}
            href={`/dashboard/audit?entity=${entity}&action=${actionFilter}&userEmail=${userEmailFilter}&startDate=${startDateFilter}&endDate=${endDateFilter}`}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${
              entityFilter === entity
                ? 'bg-red-900/30 text-red-400 border-red-700/50'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-800 hover:text-gray-800 dark:text-gray-200'
            }`}
          >
            {entity.toUpperCase()}
          </Link>
        ))}
      </div>

      {/* Search & Filters */}
      <form method="GET" action="/dashboard/audit" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input type="hidden" name="entity" value={entityFilter} />
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">User Email</label>
          <input 
            type="text" 
            name="userEmail" 
            defaultValue={userEmailFilter} 
            placeholder="Search email..." 
            className="w-full px-3 py-2 bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Action Type</label>
          <input 
            type="text" 
            name="action" 
            defaultValue={actionFilter} 
            placeholder="e.g. partner.profile" 
            className="w-full px-3 py-2 bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
          <input 
            type="date" 
            name="startDate" 
            defaultValue={startDateFilter} 
            className="w-full px-3 py-2 bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-red-500" 
          />
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
            <input 
              type="date" 
              name="endDate" 
              defaultValue={endDateFilter} 
              className="w-full px-3 py-2 bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-red-500" 
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-gray-900 dark:text-white text-xs font-bold rounded-lg transition-colors">
            Filter
          </button>
        </div>
      </form>

      {/* Logs List */}
      <div className="space-y-4">
        {paginatedLogs.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center text-gray-500 text-sm">
            No audit logs found matching criteria.
          </div>
        ) : (
          paginatedLogs.map((log: any) => (
            <div key={log.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-mono rounded border border-gray-300 dark:border-gray-700">
                    {log.action}
                  </span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Entity: <span className="text-gray-800 dark:text-gray-200">{log.entity_type}</span> ({log.entity_id || 'System'})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">
                    {new Date(log.created_at).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-medium text-red-400">
                    By: {(log.users as any)?.email || 'System'}
                  </span>
                </div>
              </div>
              <div className="p-0">
                <DiffViewer oldValues={log.old_values} newValues={log.new_values} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination controls */}
      {totalLogs > 0 && (
        <div className="flex justify-between items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <span className="text-xs text-gray-500 font-mono">
            Showing {offset + 1} - {Math.min(offset + pageSize, totalLogs)} of {totalLogs} events
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link 
                href={`/dashboard/audit?entity=${entityFilter}&action=${actionFilter}&userEmail=${userEmailFilter}&startDate=${startDateFilter}&endDate=${endDateFilter}&page=${currentPage - 1}`}
                className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-700 transition-colors"
              >
                Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link 
                href={`/dashboard/audit?entity=${entityFilter}&action=${actionFilter}&userEmail=${userEmailFilter}&startDate=${startDateFilter}&endDate=${endDateFilter}&page=${currentPage + 1}`}
                className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-700 transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
