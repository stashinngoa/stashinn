import { createClient } from '@stashinn/lib/supabase/server';
import DiffViewer from './DiffViewer';
import SystemHealthMonitor from './SystemHealthMonitor';

export default async function AuditLogsPage(props: { searchParams: Promise<{ entity?: string }> }) {
  const searchParams = await props.searchParams;
  const entityFilter = searchParams?.entity || 'all';
  const supabase = await createClient();

  let query = supabase
    .from('audit_logs')
    .select('*, users!audit_logs_user_id_fkey(email)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (entityFilter !== 'all') {
    query = query.eq('entity_type', entityFilter);
  }

  const { data: logs } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white">System Audit Logs & Health</h1>
        <p className="text-gray-500 mt-1">Immutable trail of critical system events and real-time infrastructure matrix.</p>
      </div>

      <SystemHealthMonitor />

      <div className="flex gap-2">
        {['all', 'partner', 'booking', 'user', 'system_config'].map(entity => (
          <a
            key={entity}
            href={`/dashboard/audit?entity=${entity}`}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${
              entityFilter === entity
                ? 'bg-red-900/30 text-red-400 border-red-700/50'
                : 'bg-gray-900 text-gray-400 border-gray-700 hover:bg-gray-800 hover:text-gray-200'
            }`}
          >
            {entity.toUpperCase()}
          </a>
        ))}
      </div>

      <div className="space-y-4">
        {!logs || logs.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500 text-sm">
            No audit logs found.
          </div>
        ) : (
          logs.map((log: any) => (
            <div key={log.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs font-mono rounded border border-gray-700">
                    {log.action}
                  </span>
                  <span className="text-sm font-medium text-gray-400">
                    Entity: <span className="text-gray-200">{log.entity_type}</span> ({log.entity_id || 'System'})
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
    </div>
  );
}
