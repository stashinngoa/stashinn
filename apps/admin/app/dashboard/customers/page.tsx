import { getCustomers, toggleBlockUser } from './actions';
import CustomerSearch from './CustomerSearch';

export default async function CustomersPage(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const search = searchParams?.q || '';
  const { customers, error } = await getCustomers(search);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Customer Management</h1>
          <p className="text-gray-500 mt-1">View, search, and manage all registered customers.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{customers.length} customer{customers.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Search */}
      <CustomerSearch defaultValue={search} />

      {error && (
        <div className="bg-red-900/30 text-red-400 p-4 rounded-lg border border-red-800/50 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-600 text-sm">
                    {search ? `No customers found matching "${search}"` : 'No customers registered yet.'}
                  </td>
                </tr>
              ) : (
                customers.map((customer: any) => (
                  <tr key={customer.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-purple-900/50 text-purple-400 flex items-center justify-center font-bold text-xs border border-purple-700/30">
                          {(customer.full_name || customer.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-200">{customer.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{customer.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{customer.phone || '—'}</td>
                    <td className="px-6 py-4">
                      {customer.is_blocked ? (
                        <span className="inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border bg-red-900/40 text-red-400 border-red-700/50">Blocked</span>
                      ) : (
                        <span className="inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border bg-green-900/40 text-green-400 border-green-700/50">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(customer.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <form action={toggleBlockUser}>
                        <input type="hidden" name="user_id" value={customer.id} />
                        <input type="hidden" name="is_blocked" value={customer.is_blocked.toString()} />
                        <button
                          type="submit"
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                            customer.is_blocked
                              ? 'border-green-700/50 text-green-400 hover:bg-green-900/30'
                              : 'border-red-700/50 text-red-400 hover:bg-red-900/30'
                          }`}
                        >
                          {customer.is_blocked ? 'Unblock' : 'Block'}
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
