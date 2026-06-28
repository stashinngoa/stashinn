'use client';

import { useState } from 'react';
import { addLocation, updateLocation } from './actions';
import MapWrapper from './MapWrapper';

export default function LocationForm({ initialData, existingPocs = [] }: { initialData?: any, existingPocs?: any[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [lat, setLat] = useState<number>(initialData?.latitude || 0);
  const [lng, setLng] = useState<number>(initialData?.longitude || 0);

  const [pocOption, setPocOption] = useState<'new' | 'existing'>(existingPocs.length > 0 ? 'existing' : 'new');

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError(null);
    
    let res;
    if (initialData?.id) {
      formData.append('id', initialData.id);
      res = await updateLocation(formData);
    } else {
      res = await addLocation(formData);
    }
    
    if (res?.error) {
      setError(res.error);
      setIsSubmitting(false);
    }
  };

  const isEdit = !!initialData;
  const opHours = initialData?.operating_hours || { open: '08:00', close: '22:00' };
  const amenities = initialData?.amenities || [];

  return (
    <form action={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-4xl space-y-8">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">{error}</div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Basic Details</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location Name *</label>
          <input type="text" name="name" defaultValue={initialData?.name} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none" placeholder="e.g. Storage Depot - South Wing" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Bag Capacity *</label>
            <input type="number" name="max_bags" defaultValue={initialData?.max_bags || 20} required min="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="is_active" defaultValue={initialData ? initialData.is_active.toString() : "true"} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none">
              <option value="true">Active (Accepting Bookings)</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Address & Coordinates */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Address & Location</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
          <input type="text" name="address_line1" defaultValue={initialData?.address_line1} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
          <input type="text" name="address_line2" defaultValue={initialData?.address_line2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none" />
        </div>
        
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Pinpoint Location on Map *</label>
          <MapWrapper 
            initialLat={lat} 
            initialLng={lng} 
            onChange={(newLat, newLng) => {
              setLat(newLat);
              setLng(newLng);
            }} 
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
            <input type="text" name="latitude" value={lat || ''} readOnly className="w-full px-4 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg outline-none cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
            <input type="text" name="longitude" value={lng || ''} readOnly className="w-full px-4 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg outline-none cursor-not-allowed" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
            <input type="text" name="city" defaultValue={initialData?.city} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
            <input type="text" name="state" defaultValue={initialData?.state} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
            <input type="text" name="pincode" defaultValue={initialData?.pincode} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none" />
          </div>
        </div>
      </div>

      {/* Point of Contact (Only required for new locations) */}
      {!isEdit && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2 text-purple-700">Point of Contact (Mandatory)</h3>
          
          {existingPocs.length > 0 && (
            <div className="flex space-x-4 mb-4">
              <label className="flex items-center space-x-2">
                <input type="radio" name="poc_option" value="existing" checked={pocOption === 'existing'} onChange={() => setPocOption('existing')} className="text-purple-600 focus:ring-purple-500" />
                <span className="text-sm font-medium text-gray-700">Select Existing POC</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="radio" name="poc_option" value="new" checked={pocOption === 'new'} onChange={() => setPocOption('new')} className="text-purple-600 focus:ring-purple-500" />
                <span className="text-sm font-medium text-gray-700">Add New POC</span>
              </label>
            </div>
          )}

          {pocOption === 'existing' && existingPocs.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Staff Member *</label>
              <select name="existing_poc_id" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none">
                <option value="">-- Choose POC --</option>
                {existingPocs.map(poc => (
                  <option key={poc.id} value={poc.id}>{poc.name} ({poc.phone})</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">This staff member will be assigned to manage this location.</p>
            </div>
          )}

          {pocOption === 'new' && (
            <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">POC Name *</label>
                <input type="text" name="poc_name" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none bg-white" placeholder="Staff Name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">POC Phone *</label>
                  <input type="tel" name="poc_phone" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none bg-white" placeholder="+91" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">POC Email</label>
                  <input type="email" name="poc_email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none bg-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Document (PDF/JPG) *</label>
                  <input type="file" name="poc_id_document" accept=".pdf,image/jpeg,image/png,image/webp" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none bg-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Headshot Photo *</label>
                  <input type="file" name="poc_photo" accept="image/jpeg,image/png,image/webp" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none bg-white text-sm" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pricing & Hours */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Pricing & Hours</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price per Hour (₹)</label>
            <input type="number" name="price_per_hour" value={initialData?.price_per_hour || 50} readOnly className="w-full px-4 py-2 bg-gray-50 text-gray-500 font-semibold border border-gray-200 rounded-lg cursor-not-allowed outline-none" />
            <p className="text-xs text-gray-400 mt-1">Managed by StashInn Admin.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price per Day (₹)</label>
            <input type="number" name="price_per_day" value={initialData?.price_per_day || 200} readOnly className="w-full px-4 py-2 bg-gray-50 text-gray-500 font-semibold border border-gray-200 rounded-lg cursor-not-allowed outline-none" />
            <p className="text-xs text-gray-400 mt-1">Managed by StashInn Admin.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opening Time *</label>
            <input type="time" name="open_time" defaultValue={opHours.open} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Closing Time *</label>
            <input type="time" name="close_time" defaultValue={opHours.close} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none" />
          </div>
        </div>
      </div>

      {/* Amenities & Photos */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Amenities & Photos</h3>
        <div className="flex flex-wrap gap-4 mb-4">
          {['CCTV', '24/7 Security', 'AC Storage', 'Locker Available'].map(amenity => (
            <label key={amenity} className="flex items-center space-x-2 text-sm text-gray-700 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
              <input type="checkbox" name="amenities" value={amenity} defaultChecked={amenities.includes(amenity)} className="text-purple-600 focus:ring-purple-500" />
              <span>{amenity}</span>
            </label>
          ))}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location Photos (JPG/PNG)</label>
          <input type="file" name="photos" multiple accept="image/jpeg,image/png,image/webp" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none bg-white" />
          <p className="text-xs text-gray-500 mt-1">Upload multiple photos showing the storefront and storage area. First photo will be the primary image.</p>
        </div>
      </div>

      <div className="pt-6 flex justify-end gap-4">
        <a href="/dashboard/locations" className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</a>
        <button type="submit" disabled={isSubmitting} className="px-8 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-70">
          {isSubmitting ? 'Saving...' : isEdit ? 'Update Location' : 'Add Location'}
        </button>
      </div>
    </form>
  );
}
