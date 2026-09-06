'use client';

import { useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { updateLocationStatus, updatePocStatus, updatePartnerStatus, updateLocationCommission, updateLocationPricing } from '../actions';

function SubmitButton({ defaultText, loadingText, className }: { defaultText: string, loadingText: string, className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? loadingText : defaultText}
    </button>
  );
}

export default function ClientPartnerDetails({ partner, locations, pocs, kycDocs }: { partner: any; locations: any[]; pocs: any[]; kycDocs: any[] }) {
  const [activeTab, setActiveTab] = useState('locations');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<{type: 'location' | 'poc', data: any} | null>(null);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700/50',
      approved: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400 border-green-200 dark:border-green-700/50',
      rejected: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400 border-red-200 dark:border-red-700/50',
      suspended: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-700/50',
    };
    return styles[status] || 'bg-gray-100 dark:bg-gray-700/40 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-600/50';
  };

  const [isPending, startTransition] = useTransition();

  const handleLocationToggle = (id: string, currentStatus: boolean) => {
    setLoadingId(id);
    startTransition(async () => {
      const res = await updateLocationStatus(id, partner.id, !currentStatus);
      if (res?.error) {
        alert(res.error);
      }
      setLoadingId(null);
    });
  };

  const handlePocToggle = (id: string, currentStatus: boolean) => {
    setLoadingId(id);
    startTransition(async () => {
      await updatePocStatus(id, partner.id, !currentStatus);
      setLoadingId(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm dark:shadow-none flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="flex gap-4 items-center">
          <div className="h-16 w-16 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-2xl border border-indigo-200 dark:border-indigo-700/30">
            {partner.business_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              {partner.business_name}
              <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStatusBadge(partner.status)}`}>
                {partner.status}
              </span>
            </h1>
            <p className="text-gray-500 mt-1">Owner: {(partner.users as any)?.full_name || '—'} | {(partner.users as any)?.email}</p>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">GSTIN: <span className="font-mono">{partner.gstin || '—'}</span></span>
              <span className="text-gray-600 dark:text-gray-400">PAN: <span className="font-mono">{partner.pan || '—'}</span></span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {partner.status === 'pending' && (
            <>
              <form action={async (formData) => {
                const res = await updatePartnerStatus(formData);
                if (res?.error) alert(res.error);
              }}>
                <input type="hidden" name="partner_id" value={partner.id} />
                <input type="hidden" name="new_status" value="approved" />
                <SubmitButton defaultText="Approve Partner" loadingText="Approving..." className="px-4 py-2 text-sm font-bold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed" />
              </form>
              <form action={async (formData) => {
                const res = await updatePartnerStatus(formData);
                if (res?.error) alert(res.error);
              }}>
                <input type="hidden" name="partner_id" value={partner.id} />
                <input type="hidden" name="new_status" value="rejected" />
                <SubmitButton defaultText="Reject" loadingText="Working..." className="px-4 py-2 text-sm font-bold rounded-lg border border-red-200 dark:border-red-700/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-70 disabled:cursor-not-allowed" />
              </form>
            </>
          )}
          {partner.status === 'approved' && (
            <form action={async (formData) => {
              const res = await updatePartnerStatus(formData);
              if (res?.error) alert(res.error);
            }}>
              <input type="hidden" name="partner_id" value={partner.id} />
              <input type="hidden" name="new_status" value="suspended" />
              <SubmitButton defaultText="Suspend Partner" loadingText="Working..." className="px-4 py-2 text-sm font-bold rounded-lg border border-orange-200 dark:border-orange-700/50 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors disabled:opacity-70 disabled:cursor-not-allowed" />
            </form>
          )}
        </div>
      </div>


      {/* KYC Docs */}
      {kycDocs.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">KYC Documents</h2>
          <div className="flex flex-wrap gap-4">
            {kycDocs.map((doc, idx) => (
              <a key={idx} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="text-sm text-blue-600 dark:text-blue-400">{doc.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Tabs Control */}
      <div className="border-b border-gray-200 dark:border-gray-800 flex gap-6">
        <button 
          onClick={() => setActiveTab('locations')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'locations' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Locations ({locations.length})
        </button>
        <button 
          onClick={() => setActiveTab('pocs')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'pocs' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Points of Contact ({pocs.length})
        </button>
      </div>

      {/* Tabs Content */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
        
        {/* Locations Tab */}
        {activeTab === 'locations' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">City</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Commission</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50">
                {locations.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-gray-500">No locations added yet.</td></tr>
                )}
                {locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-gray-200">{loc.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{loc.address_line1}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{loc.city}, {loc.state}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${loc.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {loc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 font-bold">
                      {loc.commission_rate ?? partner.commission_rate ?? 15.00}%
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedEntity({ type: 'location', data: loc })}
                          className="px-3 py-1.5 text-xs font-bold rounded border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={() => handleLocationToggle(loc.id, loc.is_active)}
                          disabled={loadingId === loc.id}
                          className={`px-3 py-1.5 text-xs font-bold rounded border ${loc.is_active ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-700/50 dark:text-red-400 dark:hover:bg-red-900/30' : 'border-green-200 text-green-600 hover:bg-green-50 dark:border-green-700/50 dark:text-green-400 dark:hover:bg-green-900/30'} transition-colors`}
                        >
                          {loadingId === loc.id ? 'Wait...' : (loc.is_active ? 'Reject' : 'Approve')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* POCs Tab */}
        {activeTab === 'pocs' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">POC Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Verification</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50">
                {pocs.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-gray-500">No POCs added yet.</td></tr>
                )}
                {pocs.map((poc) => (
                  <tr key={poc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {poc.signed_photo_url ? (
                          <div className="h-10 w-10 relative rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                            <img src={poc.signed_photo_url} alt="POC" className="object-cover w-full h-full" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500">
                            {poc.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-200 block">{poc.name}</span>
                          {poc.signed_id_doc_url && (
                            <a href={poc.signed_id_doc_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center mt-1">
                              View ID Doc
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <div>{poc.phone}</div>
                      {poc.email && <div className="text-xs text-gray-500">{poc.email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${poc.is_verified ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {poc.is_verified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedEntity({ type: 'poc', data: poc })}
                          className="px-3 py-1.5 text-xs font-bold rounded border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={() => handlePocToggle(poc.id, poc.is_verified)}
                          disabled={loadingId === poc.id}
                          className={`px-3 py-1.5 text-xs font-bold rounded border ${poc.is_verified ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-700/50 dark:text-red-400 dark:hover:bg-red-900/30' : 'border-green-200 text-green-600 hover:bg-green-50 dark:border-green-700/50 dark:text-green-400 dark:hover:bg-green-900/30'} transition-colors`}
                        >
                          {loadingId === poc.id ? 'Wait...' : (poc.is_verified ? 'Reject' : 'Verify')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Details Modal */}
      {selectedEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedEntity.type === 'location' ? 'Location Details' : 'Point of Contact Details'}
              </h2>
              <button onClick={() => setSelectedEntity(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {selectedEntity.type === 'location' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                      <p className="font-bold text-gray-900 dark:text-white">{selectedEntity.data.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                      <p className="font-bold text-gray-900 dark:text-white capitalize">{selectedEntity.data.location_type}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {selectedEntity.data.address_line1} {selectedEntity.data.address_line2 ? `, ${selectedEntity.data.address_line2}` : ''}<br/>
                        {selectedEntity.data.city}, {selectedEntity.data.state} {selectedEntity.data.pincode}<br/>
                        {selectedEntity.data.country}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Coordinates</p>
                      <p className="font-bold text-gray-900 dark:text-white">{selectedEntity.data.latitude}, {selectedEntity.data.longitude}</p>
                    </div>
                    {selectedEntity.data.location_type === 'luggage' && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Max Bags Capacity</p>
                        <p className="font-bold text-gray-900 dark:text-white">{selectedEntity.data.max_bags}</p>
                      </div>
                    )}
                    {selectedEntity.data.location_type === 'garage' && selectedEntity.data.vehicle_pricing && (
                      <>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Bikes Capacity</p>
                          <p className="font-bold text-gray-900 dark:text-white">
                            {Array.isArray(selectedEntity.data.vehicle_pricing) ? selectedEntity.data.vehicle_pricing[0]?.bike_capacity : selectedEntity.data.vehicle_pricing.bike_capacity} slots
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Cars Capacity</p>
                          <p className="font-bold text-gray-900 dark:text-white">
                            {Array.isArray(selectedEntity.data.vehicle_pricing) ? selectedEntity.data.vehicle_pricing[0]?.sedan_capacity : selectedEntity.data.vehicle_pricing.sedan_capacity} slots
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Amenities */}
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Amenities</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedEntity.data.amenities && selectedEntity.data.amenities.length > 0 ? (
                        selectedEntity.data.amenities.map((amenity: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 capitalize border border-gray-200 dark:border-gray-700">
                            {amenity.replace(/_/g, ' ')}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm italic text-gray-400">None provided</span>
                      )}
                      {/* Boolean amenities for garage */}
                      {selectedEntity.data.has_cctv && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          CCTV Monitored
                        </span>
                      )}
                      {selectedEntity.data.has_security_guard && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          Security Guard
                        </span>
                      )}
                      {selectedEntity.data.has_ev_charging && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                          EV Charging
                        </span>
                      )}
                      {selectedEntity.data.has_lockable_gate && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          Lockable Gate
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mini Map */}
                  <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 h-48 bg-gray-100">
                    <iframe 
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      style={{ border: 0 }} 
                      src={`https://maps.google.com/maps?q=${selectedEntity.data.latitude},${selectedEntity.data.longitude}&z=15&output=embed`} 
                      allowFullScreen
                    ></iframe>
                  </div>

                  {/* Commission Rate Config for this Location */}
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Location Commission Rate</h3>
                    <p className="text-xs text-gray-500 mb-3">Set a specific platform commission percentage for this location.</p>
                    <form 
                      action={async (formData) => {
                        const res = await updateLocationCommission(selectedEntity.data.id, partner.id, formData);
                        if (res?.error) alert(res.error);
                        else alert('Location commission rate updated successfully!');
                      }} 
                      className="flex items-center gap-3"
                    >
                      <div className="relative">
                        <input 
                          type="number" 
                          name="commission_rate" 
                          defaultValue={selectedEntity.data.commission_rate ?? partner.commission_rate ?? 15.00}
                          step="0.01"
                          min="0"
                          max="100"
                          className="w-24 pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                      </div>
                      <SubmitButton defaultText="Save Rate" loadingText="Saving..." className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed" />
                    </form>
                  </div>

                  {/* Pricing Config */}
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Hourly Rates</h3>
                    <p className="text-xs text-gray-500 mb-3">Override the hourly pricing configuration for this location.</p>
                    <form 
                      action={async (formData) => {
                        const res = await updateLocationPricing(selectedEntity.data.id, partner.id, selectedEntity.data.location_type, formData);
                        if (res?.error) alert(res.error);
                        else alert('Location pricing updated successfully!');
                      }} 
                      className="flex flex-col sm:flex-row gap-4"
                    >
                      {selectedEntity.data.location_type === 'luggage' && (
                        <div className="relative flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Bag Rate / Hr</label>
                          <span className="absolute left-3 top-[28px] text-gray-500 text-sm">₹</span>
                          <input 
                            type="number" 
                            name="price_per_hour" 
                            defaultValue={selectedEntity.data.price_per_hour}
                            step="0.01"
                            min="0"
                            className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                          />
                        </div>
                      )}
                      {selectedEntity.data.location_type === 'garage' && (
                        <>
                          <div className="relative flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Bike Rate / Hr</label>
                            <span className="absolute left-3 top-[28px] text-gray-500 text-sm">₹</span>
                            <input 
                              type="number" 
                              name="bike_rate_hr" 
                              defaultValue={Array.isArray(selectedEntity.data.vehicle_pricing) ? selectedEntity.data.vehicle_pricing[0]?.bike_rate_hr : selectedEntity.data.vehicle_pricing?.bike_rate_hr}
                              step="0.01"
                              min="0"
                              className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            />
                          </div>
                          <div className="relative flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Car Rate / Hr</label>
                            <span className="absolute left-3 top-[28px] text-gray-500 text-sm">₹</span>
                            <input 
                              type="number" 
                              name="sedan_rate_hr" 
                              defaultValue={Array.isArray(selectedEntity.data.vehicle_pricing) ? selectedEntity.data.vehicle_pricing[0]?.sedan_rate_hr : selectedEntity.data.vehicle_pricing?.sedan_rate_hr}
                              step="0.01"
                              min="0"
                              className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            />
                          </div>
                        </>
                      )}
                      <div className="flex items-end">
                        <SubmitButton defaultText="Save Pricing" loadingText="Saving..." className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed" />
                      </div>
                    </form>
                  </div>

                  {/* Associated POCs */}
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Associated Points of Contact</p>
                    <div className="space-y-3">
                      {pocs.filter(p => p.location_id === selectedEntity.data.id).length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No POC assigned to this location yet.</p>
                      ) : (
                        pocs.filter(p => p.location_id === selectedEntity.data.id).map(poc => (
                          <div key={poc.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                              {poc.signed_photo_url ? (
                                <img src={poc.signed_photo_url} alt="POC" className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-500">
                                  {poc.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white text-sm">{poc.name}</p>
                                <p className="text-xs text-gray-500">{poc.phone}</p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${poc.is_verified ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                              {poc.is_verified ? 'Verified' : 'Pending'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {selectedEntity.data.photos && selectedEntity.data.photos.length > 0 && (
                    <div className="mt-6">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Location Photos</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {selectedEntity.data.photos.map((photo: string, idx: number) => (
                          <div key={idx} className="relative h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            {/* In real-world, might need signed URLs for photos too, but they are public according to onboarding */}
                            <img src={photo} alt={`Location ${idx}`} className="object-cover w-full h-full" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-6">
                    {selectedEntity.data.signed_photo_url ? (
                      <div className="h-20 w-20 relative rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                        <img src={selectedEntity.data.signed_photo_url} alt="POC" className="object-cover w-full h-full" />
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700 text-gray-500 text-2xl">
                        {selectedEntity.data.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedEntity.data.name}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full mt-1 ${selectedEntity.data.is_verified ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {selectedEntity.data.is_verified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="font-bold text-gray-900 dark:text-white">{selectedEntity.data.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-bold text-gray-900 dark:text-white">{selectedEntity.data.email || '—'}</p>
                    </div>
                  </div>
                  
                  {selectedEntity.data.signed_id_doc_url && (
                    <div className="mt-6">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">ID Document</p>
                      <a href={selectedEntity.data.signed_id_doc_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-blue-600 dark:text-blue-400 font-medium">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Full ID Document
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
