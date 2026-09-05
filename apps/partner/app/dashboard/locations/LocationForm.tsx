'use client';

import { useState, useRef } from 'react';
import { addLocation, updateLocation } from './actions';
import MapWrapper from './MapWrapper';

export default function LocationForm({ initialData, existingPocs = [] }: { initialData?: any, existingPocs?: any[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [lat, setLat] = useState<number>(initialData?.latitude || 0);
  const [lng, setLng] = useState<number>(initialData?.longitude || 0);
  const [locationType, setLocationType] = useState<'luggage' | 'garage'>(initialData?.location_type || 'luggage');
  const [existingPhotos, setExistingPhotos] = useState<string[]>(initialData?.photos || []);

  const verifiedPocs = existingPocs.filter(poc => poc.is_verified);
  const currentLocationPoc = initialData?.id ? existingPocs.find(poc => poc.location_id === initialData.id) : null;
  const isEdit = !!initialData;

  const getDefaultPocOption = () => {
    if (isEdit) return 'keep'; // Don't touch POC by default when editing
    if (existingPocs.length > 0) return 'existing';
    return 'new';
  };
  const [pocOption, setPocOption] = useState<'new' | 'existing' | 'keep'>(getDefaultPocOption());
  const [duplicatePocWarning, setDuplicatePocWarning] = useState<string | null>(null);
  const pocNameRef = useRef('');
  const pocPhoneRef = useRef('');
  const pocEmailRef = useRef('');

  const checkDuplicatePoc = (name: string | null, phone: string | null, email: string | null) => {
    if (name !== null) pocNameRef.current = name.trim().toLowerCase();
    if (phone !== null) pocPhoneRef.current = phone.trim();
    if (email !== null) pocEmailRef.current = email.trim().toLowerCase();

    const currentName = pocNameRef.current;
    const currentPhone = pocPhoneRef.current;
    const currentEmail = pocEmailRef.current;

    // Need at least name AND phone filled to check
    if (!currentName || !currentPhone) {
      setDuplicatePocWarning(null);
      return;
    }

    const matchingPocs = existingPocs.filter(poc => {
      const nameMatch = poc.name.toLowerCase() === currentName;
      const phoneMatch = poc.phone === currentPhone;
      // If email provided on both sides, check that too
      const emailMatch = currentEmail && poc.email
        ? poc.email.toLowerCase() === currentEmail
        : true; // skip email check if either side is empty
      return nameMatch && phoneMatch && emailMatch;
    });

    if (matchingPocs.length > 0) {
      const match = matchingPocs[0];
      const locationName = match.partner_locations?.name || 'another location';
      setDuplicatePocWarning(
        `A POC with these details ("${match.name}", ${match.phone}) already exists at "${locationName}". You can still proceed — just make sure this person will be available at the new location during business hours.`
      );
    } else {
      setDuplicatePocWarning(null);
    }
  };

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
        
        <div className="flex space-x-6 mb-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="radio" name="location_type" value="luggage" checked={locationType === 'luggage'} onChange={() => setLocationType('luggage')} className="text-purple-600 focus:ring-purple-500 w-4 h-4" />
            <span className="text-sm font-semibold text-gray-700">Luggage Storage</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="radio" name="location_type" value="garage" checked={locationType === 'garage'} onChange={() => setLocationType('garage')} className="text-purple-600 focus:ring-purple-500 w-4 h-4" />
            <span className="text-sm font-semibold text-gray-700">Vehicle Parking</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location Name *</label>
          <input type="text" name="name" defaultValue={initialData?.name} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none" placeholder="e.g. Storage Depot - South Wing" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {locationType === 'luggage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Bag Capacity *</label>
              <input type="number" name="max_bags" defaultValue={initialData?.max_bags || 20} required min="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none" />
            </div>
          )}
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

      {/* Point of Contact */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 text-purple-700">
          {isEdit ? 'Point of Contact' : 'Point of Contact (Mandatory)'}
        </h3>
        
        {/* Always submit the poc_option value */}
        <input type="hidden" name="poc_option" value={pocOption} />

        {/* Show currently assigned POC on edit */}
        {isEdit && currentLocationPoc && (
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm shrink-0">
              {currentLocationPoc.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{currentLocationPoc.name}</p>
              <p className="text-xs text-gray-500">{currentLocationPoc.phone}{currentLocationPoc.email ? ` · ${currentLocationPoc.email}` : ''}</p>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${currentLocationPoc.is_verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {currentLocationPoc.is_verified ? '✓ Verified' : '⏳ Pending'}
            </span>
          </div>
        )}

        {isEdit && !currentLocationPoc && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <strong>No POC assigned</strong> to this location. Please assign one below.
          </div>
        )}

        {/* Toggle options */}
        {isEdit ? (
          <div className="flex flex-wrap gap-4">
            {currentLocationPoc && (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="poc_option_radio" value="keep" checked={pocOption === 'keep'} onChange={() => { setPocOption('keep'); setDuplicatePocWarning(null); }} className="text-purple-600 focus:ring-purple-500" />
                <span className="text-sm font-medium text-gray-700">Keep Current POC</span>
              </label>
            )}
            {existingPocs.length > 0 && (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="poc_option_radio" value="existing" checked={pocOption === 'existing'} onChange={() => { setPocOption('existing'); setDuplicatePocWarning(null); }} className="text-purple-600 focus:ring-purple-500" />
                <span className="text-sm font-medium text-gray-700">Change to Another POC</span>
              </label>
            )}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="radio" name="poc_option_radio" value="new" checked={pocOption === 'new'} onChange={() => setPocOption('new')} className="text-purple-600 focus:ring-purple-500" />
              <span className="text-sm font-medium text-gray-700">Add New POC</span>
            </label>
          </div>
        ) : (
          existingPocs.length > 0 && (
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="poc_option_radio" value="existing" checked={pocOption === 'existing'} onChange={() => { setPocOption('existing'); setDuplicatePocWarning(null); }} className="text-purple-600 focus:ring-purple-500" />
                <span className="text-sm font-medium text-gray-700">Select Existing POC</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="poc_option_radio" value="new" checked={pocOption === 'new'} onChange={() => setPocOption('new')} className="text-purple-600 focus:ring-purple-500" />
                <span className="text-sm font-medium text-gray-700">Add New POC</span>
              </label>
            </div>
          )
        )}

        {pocOption === 'existing' && existingPocs.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Staff Member *</label>
            <select name="existing_poc_id" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none">
              <option value="">-- Choose POC --</option>
              {existingPocs.map(poc => (
                <option key={poc.id} value={poc.id}>
                  {poc.name} ({poc.phone}){poc.is_verified ? '' : ' — ⏳ Pending Verification'}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              This staff member will be assigned to manage this location.
              {existingPocs.some(p => !p.is_verified) && (
                <span className="text-amber-600 ml-1">POCs pending verification will keep the location inactive until approved.</span>
              )}
            </p>
          </div>
        )}

        {pocOption === 'new' && (
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-4">
            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
              <strong>Important:</strong> New POCs require Admin verification. This location will automatically be saved as <strong>Inactive</strong> until the POC is verified.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">POC Name *</label>
              <input type="text" name="poc_name" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none bg-white" placeholder="Staff Name" onChange={(e) => checkDuplicatePoc(e.target.value, null, null)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">POC Phone *</label>
                <input type="tel" name="poc_phone" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none bg-white" placeholder="+91" onChange={(e) => checkDuplicatePoc(null, e.target.value, null)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">POC Email</label>
                <input type="email" name="poc_email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none bg-white" onChange={(e) => checkDuplicatePoc(null, null, e.target.value)} />
              </div>
            </div>
            {duplicatePocWarning && (
              <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
                <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-semibold">Duplicate POC detected</p>
                  <p className="mt-0.5">{duplicatePocWarning}</p>
                </div>
              </div>
            )}
            {!isEdit && (
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
            )}
          </div>
        )}
      </div>

      {/* Pricing & Hours */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">{locationType === 'luggage' ? 'Pricing & Hours' : 'Vehicle Capacities & Hours'}</h3>
        
        {locationType === 'luggage' && (
          <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100">
            <strong>Note:</strong> Pricing for luggage is automatically managed and calculated by StashInn Administrators based on your region.
          </div>
        )}

        {locationType === 'garage' && (
          <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100 mb-4">
              <strong>Note:</strong> Pricing rates for vehicles are calculated by StashInn Administrators based on market standards.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bike Slots</label>
                <input type="number" name="bike_capacity" defaultValue={initialData?.vehicle_pricing?.[0]?.bike_capacity || 0} min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sedan Slots</label>
                <input type="number" name="sedan_capacity" defaultValue={initialData?.vehicle_pricing?.[0]?.sedan_capacity || 0} min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SUV Slots</label>
                <input type="number" name="suv_capacity" defaultValue={initialData?.vehicle_pricing?.[0]?.suv_capacity || 0} min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
            </div>
          </div>
        )}
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
        <h3 className="text-lg font-semibold border-b pb-2">Amenities & Security & Photos</h3>
        
        {locationType === 'luggage' && (
          <div className="flex flex-wrap gap-4 mb-4">
            {['CCTV', '24/7 Security', 'AC Storage', 'Locker Available'].map(amenity => (
              <label key={amenity} className="flex items-center space-x-2 text-sm text-gray-700 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                <input type="checkbox" name="amenities" value={amenity} defaultChecked={amenities.includes(amenity)} className="text-purple-600 focus:ring-purple-500" />
                <span>{amenity}</span>
              </label>
            ))}
          </div>
        )}

        {locationType === 'garage' && (
          <div className="flex flex-wrap gap-4 mb-4 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
            <label className="flex items-center space-x-2 text-sm text-gray-800 font-medium">
              <input type="checkbox" name="has_cctv" defaultChecked={initialData?.has_cctv} className="text-purple-600 focus:ring-purple-500 w-4 h-4 rounded border-gray-300" />
              <span>CCTV Monitoring</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-gray-800 font-medium">
              <input type="checkbox" name="has_security_guard" defaultChecked={initialData?.has_security_guard} className="text-purple-600 focus:ring-purple-500 w-4 h-4 rounded border-gray-300" />
              <span>Security Guard</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-gray-800 font-medium">
              <input type="checkbox" name="has_ev_charging" defaultChecked={initialData?.has_ev_charging} className="text-purple-600 focus:ring-purple-500 w-4 h-4 rounded border-gray-300" />
              <span>EV Charging</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-gray-800 font-medium">
              <input type="checkbox" name="has_lockable_gate" defaultChecked={initialData?.has_lockable_gate} className="text-purple-600 focus:ring-purple-500 w-4 h-4 rounded border-gray-300" />
              <span>Lockable Gate</span>
            </label>
          </div>
        )}
        
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location Photos (JPG/PNG)</label>
            
            {existingPhotos.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-4 mt-2">
                {existingPhotos.map((photoUrl, idx) => (
                  <div key={idx} className="relative w-28 h-28 rounded-lg overflow-hidden border border-gray-200 group">
                    <img src={photoUrl} alt="Location" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setExistingPhotos(prev => prev.filter(p => p !== photoUrl))}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-700"
                      title="Remove image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    <input type="hidden" name="existing_photos" value={photoUrl} />
                  </div>
                ))}
              </div>
            )}
            
            <input type="file" name="photos" multiple accept="image/jpeg,image/png,image/webp" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 outline-none bg-white" />
            <p className="text-xs text-gray-500 mt-1">Upload new photos to add to or replace your existing ones.</p>
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
