import { getPartners, updatePartnerStatus } from './actions';
import PartnerFilter from './PartnerFilter';
import Link from 'next/link';

export default async function PartnersPage(props: { searchParams: Promise<{ status?: string }> }) {
  const searchParams = await props.searchParams;
  const statusFilter = searchParams?.status || 'all';
  const { partners, error } = await getPartners(statusFilter);

  const statusTabs = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'suspended', label: 'Suspended' },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700/50',
      approved: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400 border-green-200 dark:border-green-700/50',
      rejected: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400 border-red-200 dark:border-red-700/50',
      suspended: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-700/50',
    };
    return styles[status] || 'bg-gray-100 dark:bg-gray-700/40 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-600/50';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Partner Management</h1>
        <p className="text-gray-500 mt-1">Review KYC documents and manage partner applications.</p>
      </div>

      {/* Status Filter Tabs */}
      <PartnerFilter tabs={statusTabs} currentFilter={statusFilter} />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800/50 text-sm">{error}</div>
      )}

      {/* Partners Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Business Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">GSTIN</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">PAN</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Commission</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50 bg-white dark:bg-transparent">
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-600 text-sm">
                    No partners found for this filter.
                  </td>
                </tr>
              ) : (
                partners.map((partner: any) => (
                  <tr key={partner.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-200 dark:border-indigo-700/30">
                          {partner.business_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-200 block">{partner.business_name}</span>
                          <span className="text-xs text-gray-500">{partner.business_type || 'General'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300 block">{(partner.users as any)?.full_name || '—'}</span>
                      <span className="text-xs text-gray-500">{(partner.users as any)?.email}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">{partner.gstin || '—'}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">{partner.pan || '—'}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-700 dark:text-gray-300">{partner.commission_rate}%</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStatusBadge(partner.status)}`}>
                        {partner.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/dashboard/partners/${partner.id}`} className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        Manage Partner
                      </Link>
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
