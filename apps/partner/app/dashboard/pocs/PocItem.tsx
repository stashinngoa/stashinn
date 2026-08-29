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
      await deletePoc(poc.id);
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
    formData.append('poc_id', poc.id);
    await editPoc(formData);
    setIsSubmitting(false);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form onSubmit={handleEditSubmit} className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" name="name" defaultValue={poc.name} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" name="phone" defaultValue={poc.phone} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" defaultValue={poc.email} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select name="location_id" defaultValue={poc.location_id || ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">All Locations (HQ)</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">{isSubmitting ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-gray-900">{poc.name}</h3>
          {poc.is_primary && <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded font-medium">Primary</span>}
          {poc.is_verified ? (
            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-medium">Verified</span>
          ) : (
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded font-medium">Pending Verification</span>
          )}
        </div>
        <div className="text-sm text-gray-500 mt-1">{poc.phone} • {poc.email || 'No email provided'}</div>
        <div className="text-sm font-medium text-gray-700 mt-2">
          📍 {poc.partner_locations?.name || 'All Locations (HQ)'}
        </div>
      </div>
      
      <div className="flex gap-2">
        <button onClick={handleEditClick} className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100">
          Edit
        </button>
        <button onClick={handleDelete} className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100">
          Delete
        </button>
      </div>

      {showSupportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Request POC Edit/Delete</h3>
            <p className="text-sm text-gray-500 mb-4">Since your business is approved, modifying Point of Contacts requires Admin verification. Please describe the changes you need.</p>
            <form onSubmit={handleSupportSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" required rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none" placeholder={`E.g., Please change the phone number for ${poc.name} to...`}></textarea>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowSupportModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black">{isSubmitting ? 'Sending...' : 'Send Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
