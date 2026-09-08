'use client';

import { useState } from 'react';
import { addPoc } from './actions';

export default function PocForm({ partnerId, locations }: { partnerId: string, locations: any[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    formData.append('partner_id', partnerId);
    
    const res = await addPoc(formData);
    if (res?.error) {
      setError(res.error);
    } else {
      (e.target as HTMLFormElement).reset(); // Reset form on success
      setIsOpen(false);
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes backdropFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-modal {
          animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-backdrop {
          animation: backdropFadeIn 0.2s ease-out forwards;
        }
      `}</style>
      
      <button 
        onClick={() => setIsOpen(true)}
        className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors shadow-sm flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
        Add New Contact
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-backdrop">
          <div className="bg-white dark:bg-gray-950 rounded-3xl max-w-2xl w-full p-8 my-8 shadow-2xl border border-gray-100 dark:border-gray-800 relative animate-modal">
            <button type="button" onClick={() => setIsOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Add New Contact</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Add a new staff member to manage your locations.</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-xl border border-amber-200/50 dark:border-amber-800/50">
                <strong>Note:</strong> Newly added contacts require Admin verification before they are fully active.
              </p>
              
              {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-xl">{error}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                  <input type="text" name="name" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-purple-500 outline-none dark:bg-gray-900 dark:text-white" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number *</label>
                  <input type="tel" name="phone" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-purple-500 outline-none dark:bg-gray-900 dark:text-white" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                  <input type="email" name="email" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-purple-500 outline-none dark:bg-gray-900 dark:text-white" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Locations</label>
                  <div className="space-y-2 border border-gray-300 dark:border-gray-700 rounded-lg p-3 max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input type="checkbox" name="location_id" value="all" defaultChecked className="text-purple-600 focus:ring-purple-500 rounded border-gray-300 dark:border-gray-700 dark:bg-gray-800" />
                      All Locations (HQ)
                    </label>
                    {locations.map(loc => (
                      <label key={loc.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input type="checkbox" name="location_id" value={loc.id} className="text-purple-600 focus:ring-purple-500 rounded border-gray-300 dark:border-gray-700 dark:bg-gray-800" />
                        {loc.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" name="is_primary" value="true" className="text-purple-600 rounded border-gray-300 dark:border-gray-700 dark:bg-gray-800" />
                <span>Set as Primary Contact</span>
              </label>
              
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">KYC Documents *</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID Document (PDF/JPG)</label>
                    <input type="file" name="poc_id_document" required accept=".pdf,image/jpeg,image/png,image/webp" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 dark:text-gray-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Headshot Photo</label>
                    <input type="file" name="poc_photo" required accept="image/jpeg,image/png,image/webp" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 dark:text-gray-300" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800 mt-8">
                <button type="button" onClick={() => setIsOpen(false)} className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-semibold transition-colors border border-gray-200 dark:border-gray-700">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-8 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-70 flex items-center">
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Adding...
                    </>
                  ) : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
