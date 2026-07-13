'use client';

import { useState } from 'react';
import { verifyPoc, deletePoc, editPoc } from './actions';

export default function PocManagementClient({ initialPocs, locations, partnerId }: { initialPocs: any[], locations: any[], partnerId: string }) {
  const [editingPoc, setEditingPoc] = useState<any | null>(null);

  const handleVerify = async (pocId: string) => {
    await verifyPoc(pocId, partnerId);
  };

  const handleDelete = async (pocId: string) => {
    if (confirm('Are you sure you want to permanently delete this POC?')) {
      await deletePoc(pocId, partnerId);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {initialPocs.map((poc) => (
          <div key={poc.id} className="bg-gray-900 p-6 rounded-2xl border border-gray-800 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-gray-100">{poc.name}</h3>
                {poc.is_primary && <span className="bg-purple-900/50 text-purple-300 text-xs px-2 py-0.5 rounded font-medium border border-purple-700/50">Primary</span>}
                {poc.is_verified ? (
                  <span className="bg-green-900/40 text-green-400 text-xs px-2 py-0.5 rounded font-medium border border-green-700/50">Verified</span>
                ) : (
                  <span className="bg-amber-900/40 text-amber-400 text-xs px-2 py-0.5 rounded font-medium border border-amber-700/50">Pending Verification</span>
                )}
              </div>
              <div className="text-sm text-gray-400">{poc.phone} • {poc.email || 'No email provided'}</div>
              <div className="text-sm font-medium text-gray-300 mt-2">
                📍 {poc.partner_locations?.name || 'All Locations (HQ)'}
              </div>
            </div>
            
            <div className="flex gap-2">
              {!poc.is_verified && (
                <button onClick={() => handleVerify(poc.id)} className="px-3 py-1.5 bg-green-900/40 text-green-400 border border-green-700/50 hover:bg-green-800/50 rounded-lg text-xs font-bold transition-colors">
                  Verify
                </button>
              )}
              <button onClick={() => setEditingPoc(poc)} className="px-3 py-1.5 bg-blue-900/40 text-blue-400 border border-blue-700/50 hover:bg-blue-800/50 rounded-lg text-xs font-bold transition-colors">
                Edit
              </button>
              <button onClick={() => handleDelete(poc.id)} className="px-3 py-1.5 bg-red-900/40 text-red-400 border border-red-700/50 hover:bg-red-800/50 rounded-lg text-xs font-bold transition-colors">
                Delete
              </button>
            </div>
          </div>
        ))}

        {initialPocs.length === 0 && (
          <div className="bg-gray-900 p-12 text-center rounded-2xl border border-dashed border-gray-700">
            <p className="text-gray-500">No POCs added by this partner yet.</p>
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
        {editingPoc ? (
          <form action={async (formData) => {
            await editPoc(formData);
            setEditingPoc(null);
          }} className="bg-gray-900 p-6 rounded-2xl border border-gray-800 sticky top-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-100">Edit Contact</h3>
              <button type="button" onClick={() => setEditingPoc(null)} className="text-gray-500 hover:text-gray-300 text-sm">Cancel</button>
            </div>
            
            <input type="hidden" name="poc_id" value={editingPoc.id} />
            <input type="hidden" name="partner_id" value={partnerId} />

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                <input type="text" name="name" defaultValue={editingPoc.name} required className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-purple-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Phone Number</label>
                <input type="tel" name="phone" defaultValue={editingPoc.phone} required className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-purple-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                <input type="email" name="email" defaultValue={editingPoc.email || ''} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-purple-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Assigned Location</label>
                <select name="location_id" defaultValue={editingPoc.location_id || ''} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-purple-500 outline-none">
                  <option value="">All Locations (HQ Staff)</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
                {!editingPoc.is_verified && (
                  <p className="text-xs text-amber-500 mt-1">Note: Verifying will activate this assignment.</p>
                )}
              </div>
              
              <label className="flex items-center space-x-2 text-sm text-gray-400">
                <input type="checkbox" name="is_primary" defaultChecked={editingPoc.is_primary} value="true" className="text-purple-600 rounded bg-gray-800 border-gray-700" />
                <span>Set as Primary Contact</span>
              </label>

              <button type="submit" className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-sm mt-2">
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-2xl p-6 text-center h-full flex flex-col justify-center min-h-[300px]">
            <p className="text-gray-500 text-sm">Select a POC to edit their details or assign them to a specific location.</p>
          </div>
        )}
      </div>
    </div>
  );
}
