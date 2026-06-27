'use client';

import { useState } from 'react';
import { addPoc } from './actions';

export default function PocForm({ partnerId, locations }: { partnerId: string, locations: any[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError(null);
    formData.append('partner_id', partnerId);
    
    const res = await addPoc(formData);
    if (res?.error) {
      setError(res.error);
    }
    setIsSubmitting(false);
  };

  return (
    <form action={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Contact</h3>
      
      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <input type="text" name="name" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
          <input type="tel" name="phone" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input type="email" name="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Location</label>
          <select name="location_id" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none">
            <option value="">All Locations (HQ Staff)</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
        
        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input type="checkbox" name="is_primary" value="true" className="text-purple-600 rounded" />
          <span>Set as Primary Contact</span>
        </label>

        <button type="submit" disabled={isSubmitting} className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-70 mt-2">
          {isSubmitting ? 'Adding...' : 'Add Contact'}
        </button>
      </div>
    </form>
  );
}
