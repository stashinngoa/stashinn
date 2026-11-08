import { getStaff } from './actions';
import { ADMIN_ROLES } from './roles';
import StaffManager from './StaffManager';

export default async function StaffPage() {
  const { staff, error, currentUserId, canManage } = await getStaff();
  const countFor = (role: string) => staff.filter((s: any) => (s.admin_role ?? 'superadmin') === role).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Staff &amp; Roles</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Who can access the admin portal, and what each person is allowed to do.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-800/50 text-sm">{error}</div>
      )}

      {!canManage && (
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-sm text-amber-800 dark:text-amber-300">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          View only. Only superadmins can add staff or change roles.
        </div>
      )}

      {/* Role overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ADMIN_ROLES.map(r => (
          <div key={r.value} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                <span className={`w-2 h-2 rounded-full ${r.dot}`} />
                {r.label}
              </span>
              <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{countFor(r.value)}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{r.summary}</p>
          </div>
        ))}
      </div>

      <StaffManager staff={staff as any} currentUserId={currentUserId} canManage={canManage} />
    </div>
  );
}
