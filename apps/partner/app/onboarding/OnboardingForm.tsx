'use client';

import { useState } from 'react';
import { submitOnboarding } from './actions';

export default function OnboardingForm({ defaultEmail, userId }: { defaultEmail: string, userId: string }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <form action={async (formData) => {
      setIsSubmitting(true);
      setError(null);
      formData.append('user_id', userId);
      const res = await submitOnboarding(formData);
      if (res?.error) {
        setError(res.error);
        setIsSubmitting(false);
      }
    }}>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-purple-600 rounded transition-all duration-300" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
          
          {[1, 2, 3].map((num) => (
            <div key={num} className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 font-semibold text-sm transition-colors duration-300 ${step >= num ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
              {num}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs font-medium text-gray-500">
          <span>Business Info</span>
          <span>Location details</span>
          <span>Verification</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Business Info */}
      <div className={`space-y-5 animate-in fade-in slide-in-from-right-4 duration-500 ${step === 1 ? 'block' : 'hidden'}`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
          <input type="text" name="business_name" required={step === 1} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-shadow" placeholder="e.g. Royal Storage Solutions" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
            <select name="business_type" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none">
              <option value="Hostel">Hostel</option>
              <option value="Hotel">Hotel</option>
              <option value="Cafe">Cafe / Restaurant</option>
              <option value="Retail">Retail Shop</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
            <input type="text" name="gst_number" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Optional" />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number *</label>
          <input type="text" name="pan_number" required={step === 1} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Business PAN" />
        </div>
      </div>

      {/* Step 2: Address */}
      <div className={`space-y-5 animate-in fade-in slide-in-from-right-4 duration-500 ${step === 2 ? 'block' : 'hidden'}`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
          <input type="text" name="address_line1" required={step === 2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Building, Street" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
          <input type="text" name="address_line2" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Locality, Landmark" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
            <input type="text" name="city" required={step === 2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
            <input type="text" name="state" required={step === 2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
          <input type="text" name="postal_code" required={step === 2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
        </div>
      </div>

      {/* Step 3: Contact & Documents */}
      <div className={`space-y-5 animate-in fade-in slide-in-from-right-4 duration-500 ${step === 3 ? 'block' : 'hidden'}`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact Email *</label>
          <input type="email" name="contact_email" required={step === 3} defaultValue={defaultEmail} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Primary Phone Number *</label>
          <input type="tel" name="contact_phone" required={step === 3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="+91" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business KYC Document (PDF/JPG) *</label>
          <input type="file" name="kyc_document" accept=".pdf,image/jpeg,image/png,image/webp" required={step === 3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white" />
          <p className="text-xs text-gray-500 mt-1">Upload your GST Certificate or official Business Registration (Max 10MB).</p>
        </div>
        
        <div className="pt-4 border-t border-gray-100">
           <label className="flex items-center space-x-3 text-sm text-gray-700">
             <input type="checkbox" required={step === 3} className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" />
             <span>I agree to the StashInn Partner Terms of Service and Privacy Policy.</span>
           </label>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between pt-6 border-t border-gray-100">
        <button 
          type="button" 
          onClick={prevStep}
          disabled={step === 1 || isSubmitting}
          className={`px-6 py-2.5 border rounded-lg font-medium transition-colors ${step === 1 ? 'opacity-0 cursor-default' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          Back
        </button>
        
        {step < 3 ? (
          <button 
            type="button" 
            onClick={nextStep}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-sm"
          >
            Continue
          </button>
        ) : (
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="px-8 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-md disabled:opacity-70 flex items-center"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Submitting...
              </span>
            ) : "Submit Application"}
          </button>
        )}
      </div>
    </form>
  );
}
