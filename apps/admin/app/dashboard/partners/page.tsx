import { getPartners, updatePartnerStatus } from './actions';
import PartnerFilter from './PartnerFilter';
import KycDocsViewer from './KycDocsViewer';

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
      pending: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50',
      approved: 'bg-green-900/40 text-green-400 border-green-700/50',
      rejected: 'bg-red-900/40 text-red-400 border-red-700/50',
      suspended: 'bg-orange-900/40 text-orange-400 border-orange-700/50',
    };
    return styles[status] || 'bg-gray-700/40 text-gray-400 border-gray-600/50';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Partner Management</h1>
        <p className="text-gray-500 mt-1">Review KYC documents and manage partner applications.</p>
      </div>

      {/* Status Filter Tabs */}
      <PartnerFilter tabs={statusTabs} currentFilter={statusFilter} />

      {error && (
        <div className="bg-red-900/30 text-red-400 p-4 rounded-lg border border-red-800/50 text-sm">{error}</div>
      )}

      {/* Partners Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Business Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">GSTIN</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">PAN</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Commission</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Documents</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-600 text-sm">
                    No partners found for this filter.
                  </td>
                </tr>
              ) : (
                partners.map((partner: any) => (
                  <tr key={partner.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-indigo-900/50 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-700/30">
                          {partner.business_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-gray-200 block">{partner.business_name}</span>
                          <span className="text-xs text-gray-500">{partner.business_type || 'General'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-300 block">{(partner.users as any)?.full_name || '—'}</span>
                      <span className="text-xs text-gray-500">{(partner.users as any)?.email}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-400">{partner.gstin || '—'}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-400">{partner.pan || '—'}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-300">{partner.commission_rate}%</td>
                    <td className="px-6 py-4">
                      <KycDocsViewer partnerId={partner.id} />
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStatusBadge(partner.status)}`}>
                        {partner.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {partner.status === 'pending' && (
                          <>
                            <form action={updatePartnerStatus} className="inline">
                              <input type="hidden" name="partner_id" value={partner.id} />
                              <input type="hidden" name="new_status" value="approved" />
                              <button type="submit" className="px-3 py-1.5 text-xs font-bold rounded-lg border border-green-700/50 text-green-400 hover:bg-green-900/30 transition-colors">
                                Approve
                              </button>
                            </form>
                            <form action={updatePartnerStatus} className="inline">
                              <input type="hidden" name="partner_id" value={partner.id} />
                              <input type="hidden" name="new_status" value="rejected" />
                              <button type="submit" className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-700/50 text-red-400 hover:bg-red-900/30 transition-colors">
                                Reject
                              </button>
                            </form>
                          </>
                        )}
                        {partner.status === 'approved' && (
                          <form action={updatePartnerStatus} className="inline">
                            <input type="hidden" name="partner_id" value={partner.id} />
                            <input type="hidden" name="new_status" value="suspended" />
                            <button type="submit" className="px-3 py-1.5 text-xs font-bold rounded-lg border border-orange-700/50 text-orange-400 hover:bg-orange-900/30 transition-colors">
                              Suspend
                            </button>
                          </form>
                        )}
                        {partner.status === 'suspended' && (
                          <form action={updatePartnerStatus} className="inline">
                            <input type="hidden" name="partner_id" value={partner.id} />
                            <input type="hidden" name="new_status" value="approved" />
                            <button type="submit" className="px-3 py-1.5 text-xs font-bold rounded-lg border border-green-700/50 text-green-400 hover:bg-green-900/30 transition-colors">
                              Re-Approve
                            </button>
                          </form>
                        )}
                        {partner.status === 'rejected' && (
                          <form action={updatePartnerStatus} className="inline">
                            <input type="hidden" name="partner_id" value={partner.id} />
                            <input type="hidden" name="new_status" value="approved" />
                            <button type="submit" className="px-3 py-1.5 text-xs font-bold rounded-lg border border-green-700/50 text-green-400 hover:bg-green-900/30 transition-colors">
                              Approve
                            </button>
                          </form>
                        )}
                      </div>
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
