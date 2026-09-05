'use client';

import { useState } from 'react';
import { updateProfile } from './actions';

export default function ProfileEditForm({ initialData }: { initialData: any }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setMessage(null);
    
    // Client side regex validation for PAN (Indian format)
    const pan = formData.get('pan') as string;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (pan && !panRegex.test(pan)) {
      setMessage({ type: 'error', text: 'Invalid PAN format. Must be like ABCDE1234F' });
      setIsSubmitting(false);
      return;
    }

    const res = await updateProfile(formData);
    if (res?.error) {
      setMessage({ type: 'error', text: res.error });
    } else {
      setMessage({ type: 'success', text: 'Business profile updated successfully!' });
    }
    setIsSubmitting(false);
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      {initialData.status === 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start space-x-3 mb-6">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-bold text-yellow-800">Application Pending Review</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Your business application is currently being reviewed. You can update your onboarding details below if you made a mistake, but you cannot accept bookings or add new locations until you are approved.
            </p>
          </div>
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
          <input type="text" name="business_name" defaultValue={initialData.business_name} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
          <select name="business_type" defaultValue={initialData.business_type || 'Hostel'} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
            <option value="Hostel">Hostel</option>
            <option value="Hotel">Hotel</option>
            <option value="Cafe">Cafe / Restaurant</option>
            <option value="Retail">Retail Shop</option>
            <option value="Other">Other</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <input type="text" readOnly value={initialData.status.toUpperCase()} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 font-semibold cursor-not-allowed" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
          <input type="text" name="gstin" defaultValue={initialData.gstin || ''} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none uppercase" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number *</label>
          <input type="text" name="pan" defaultValue={initialData.pan || ''} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none uppercase" />
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 flex justify-end">
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="px-8 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-70"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
