'use client';

import { useState } from 'react';
import { editPoc, deletePoc, createSupportTicket } from './actions';

export default function PocItem({ poc, locations, isApproved, partnerId }: { poc: any, locations: any[], isApproved: boolean, partnerId: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    if (isApproved) {
      setShowSupportModal(true);
      return;
    }
    if (confirm('Are you sure you want to delete this POC?')) {
      await deletePoc(poc.poc_ids ? poc.poc_ids.join(',') : poc.id);
    }
  };

  const handleEditClick = () => {
    if (isApproved) {
      setShowSupportModal(true);
    } else {
      setIsEditing(true);
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.append('partner_id', partnerId);
    formData.append('subject', `Request to Edit/Delete POC: ${poc.name}`);
    await createSupportTicket(formData);
    setIsSubmitting(false);
    setShowSupportModal(false);
    alert('Support ticket raised. Admin will contact you shortly.');
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    if (poc.poc_ids) {
      formData.append('poc_ids', poc.poc_ids.join(','));
    } else {
      formData.append('poc_id', poc.id);
    }
    await editPoc(formData);
    setIsSubmitting(false);
    setIsEditing(false);
  };

  if (isEditing) {
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
        
        {/* Render the background card as well so it doesn't disappear */}
        <div className="bg-white dark:bg-gray-950 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 opacity-50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{poc.name}</h3>
              {poc.is_primary && <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 text-xs px-2 py-0.5 rounded font-medium border border-purple-200 dark:border-purple-800/50">Primary</span>}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{poc.phone} • {poc.email || 'No email provided'}</div>
          </div>
        </div>

        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-backdrop">
          <div className="bg-white dark:bg-gray-950 rounded-3xl max-w-2xl w-full p-8 my-8 shadow-2xl border border-gray-100 dark:border-gray-800 relative animate-modal">
            <button type="button" onClick={() => setIsEditing(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Edit Point of Contact</h3>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input type="text" name="name" defaultValue={poc.name} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input type="tel" name="phone" defaultValue={poc.phone} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input type="email" name="email" defaultValue={poc.email} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Locations *</label>
                  <div className="space-y-2 border border-gray-300 dark:border-gray-700 rounded-lg p-3 max-h-32 overflow-y-auto bg-white dark:bg-gray-900">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input type="checkbox" name="location_id" value="all" defaultChecked={!poc.assignedLocations || poc.assignedLocations.length === 0} className="text-purple-600 focus:ring-purple-500 rounded border-gray-300 dark:border-gray-700 dark:bg-gray-800" />
                      All Locations (HQ)
                    </label>
                    {locations.map(loc => (
                      <label key={loc.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input type="checkbox" name="location_id" value={loc.id} defaultChecked={poc.assignedLocations?.some((al: any) => al.id === loc.id)} className="text-purple-600 focus:ring-purple-500 rounded border-gray-300 dark:border-gray-700 dark:bg-gray-800" />
                        {loc.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Update Documents <span className="text-gray-500 dark:text-gray-400 font-normal">(Optional)</span></h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ID Document (PDF/JPG)
                      {poc.idDocPublic && (
                        <a href={poc.idDocPublic} target="_blank" rel="noopener noreferrer" className="ml-2 text-purple-600 dark:text-purple-400 hover:underline font-normal text-xs">(View Current)</a>
                      )}
                    </label>
                    <input type="file" name="poc_id_document" accept=".pdf,image/jpeg,image/png,image/webp" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 dark:text-gray-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Headshot Photo
                      {poc.photoPublic && (
                        <a href={poc.photoPublic} target="_blank" rel="noopener noreferrer" className="ml-2 text-purple-600 dark:text-purple-400 hover:underline font-normal text-xs">(View Current)</a>
                      )}
                    </label>
                    <input type="file" name="poc_photo" accept="image/jpeg,image/png,image/webp" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 dark:text-gray-300" />
                  </div>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">Note: Updating documents will reset this POC to Pending Verification.</p>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-8">
                <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2.5 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl font-semibold transition-colors border border-gray-200">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-8 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-70 flex items-center">
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{poc.name}</h3>
          {poc.is_primary && <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 text-xs px-2 py-0.5 rounded font-medium border border-purple-200 dark:border-purple-800/50">Primary</span>}
          {poc.is_verified ? (
            <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded font-medium border border-green-200 dark:border-green-800/50">Verified</span>
          ) : (
            <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs px-2 py-0.5 rounded font-medium border border-amber-200 dark:border-amber-800/50">Pending Verification</span>
          )}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{poc.phone} • {poc.email || 'No email provided'}</div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2 flex gap-2 flex-wrap">
          {poc.assignedLocations && poc.assignedLocations.length > 0 ? (
             poc.assignedLocations.map((l: any, i: number) => (
               <span key={i} className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-800">📍 {l.name}</span>
             ))
          ) : (
             <span className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-800">📍 All Locations (HQ)</span>
          )}
        </div>
      </div>
      
      <div className="flex gap-2">
        <button onClick={handleEditClick} className="px-3 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
          Edit
        </button>
        {!poc.is_primary && (
          <button onClick={handleDelete} className="px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
            Delete
          </button>
        )}
      </div>

      {showSupportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-950 rounded-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-800">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Request POC Edit/Delete</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Since your business is approved, modifying Point of Contacts requires Admin verification. Please describe the changes you need.</p>
            <form onSubmit={handleSupportSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea name="description" required rows={4} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-purple-500 outline-none dark:bg-gray-900 dark:text-white" placeholder={`E.g., Please change the phone number for ${poc.name} to...`}></textarea>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowSupportModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-black dark:hover:bg-gray-200 transition-colors font-medium">{isSubmitting ? 'Sending...' : 'Send Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
