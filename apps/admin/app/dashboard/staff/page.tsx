import { getStaff, promoteToAdmin, demoteStaff, inviteStaff, updateStaffRole } from './actions';
import RoleSelect from './RoleSelect';

export default async function StaffPage() {
  const { staff, error } = await getStaff();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Staff Management</h1>
          <p className="text-gray-500 mt-1">Manage admin access, granular roles, and platform operators.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 text-red-400 p-4 rounded-lg border border-red-800/50 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Promote Existing User */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-2">Promote Existing User</h2>
          <p className="text-sm text-gray-500 mb-4">Grant admin privileges to an existing customer or partner.</p>
          <form action={promoteToAdmin} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Email Address</label>
              <input 
                type="email" 
                name="email" 
                required
                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-md text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Admin Role</label>
              <select 
                name="admin_role" 
                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-md text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="support">Support (Read-only + Disputes)</option>
                <option value="ops">Operations (Manage Partners & Locations)</option>
                <option value="finance">Finance (Manage Transactions & Payments)</option>
                <option value="superadmin">Superadmin (Full Access)</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
              Promote to Admin
            </button>
          </form>
        </div>

        {/* Invite New Staff */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-2">Invite New Staff</h2>
          <p className="text-sm text-gray-500 mb-4">Send an email invitation to create a new staff account from scratch.</p>
          <form action={inviteStaff} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Email Address</label>
              <input 
                type="email" 
                name="email" 
                required
                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-md text-sm text-white focus:outline-none focus:border-purple-500"
                placeholder="newstaff@stashinn.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Admin Role</label>
              <select 
                name="admin_role" 
                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-md text-sm text-white focus:outline-none focus:border-purple-500"
              >
                <option value="support">Support (Read-only + Disputes)</option>
                <option value="ops">Operations (Manage Partners & Locations)</option>
                <option value="finance">Finance (Manage Transactions & Payments)</option>
                <option value="superadmin">Superadmin (Full Access)</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
              Send Invite
            </button>
          </form>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-950">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Admin Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {!staff || staff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-600 text-sm">No admin staff found.</td>
                </tr>
              ) : (
                staff.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-700/30">
                          {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-gray-200 block">{user.full_name || '—'}</span>
                          <span className="text-xs text-gray-500">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <form action={updateStaffRole} className="flex items-center gap-2">
                        <RoleSelect userId={user.id} initialRole={user.admin_role || 'superadmin'} />
                      </form>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <form action={demoteStaff}>
                        <input type="hidden" name="user_id" value={user.id} />
                        <button
                          type="submit"
                          className="text-xs font-bold text-gray-500 hover:text-red-400 transition-colors"
                        >
                          Revoke Access
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
