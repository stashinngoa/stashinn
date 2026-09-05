'use client';

import { useState, useRef, useEffect } from 'react';
import { submitOnboarding } from './actions';

// --- UI Components ---
const FloatingInput = ({ label, name, type = "text", value, onChange, required = false, className = "", ...props }: any) => (
  <div className={`relative ${className}`}>
    <input 
      type={type} 
      name={name}
      id={name}
      value={value}
      onChange={onChange}
      className="peer w-full px-4 pt-6 pb-2 border-2 border-gray-100 rounded-xl outline-none focus:border-purple-500 focus:bg-white bg-gray-50 transition-all placeholder-transparent font-medium text-gray-900 shadow-sm"
      placeholder={label}
      {...props}
    />
    <label htmlFor={name} className="absolute left-4 top-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-[14px] peer-placeholder-shown:font-medium peer-placeholder-shown:normal-case peer-placeholder-shown:text-gray-500 peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:text-purple-600 pointer-events-none">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  </div>
);

const FloatingSelect = ({ label, name, value, onChange, options, required = false }: any) => (
  <div className="relative">
    <select 
      name={name}
      id={name}
      value={value}
      onChange={onChange}
      className="peer w-full px-4 pt-6 pb-2 border-2 border-gray-100 rounded-xl outline-none focus:border-purple-500 bg-gray-50 focus:bg-white transition-all font-medium text-gray-900 shadow-sm appearance-none"
    >
      {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </div>
    <label htmlFor={name} className="absolute left-4 top-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider pointer-events-none peer-focus:text-purple-600">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  </div>
);

// --- Main Form ---
export default function OnboardingForm({ defaultEmail, userId }: { defaultEmail: string, userId: string }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Modals
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Step 1: Base State
  const [partnerType, setPartnerType] = useState('individual');
  const [providesLuggage, setProvidesLuggage] = useState(true);
  const [providesGarage, setProvidesGarage] = useState(false);

  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState(defaultEmail);
  const [ownerPhone, setOwnerPhone] = useState('');
  
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Hostel');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // Step 2: Location
  const [luggageAddress1, setLuggageAddress1] = useState('');
  const [luggageAddress2, setLuggageAddress2] = useState('');
  const [luggageCity, setLuggageCity] = useState('');
  const [luggageState, setLuggageState] = useState('');
  const [luggagePostalCode, setLuggagePostalCode] = useState('');
  const [capacityBags, setCapacityBags] = useState('');

  const [isGarageSameAddress, setIsGarageSameAddress] = useState(false);
  const [garageAddress1, setGarageAddress1] = useState('');
  const [garageAddress2, setGarageAddress2] = useState('');
  const [garageCity, setGarageCity] = useState('');
  const [garageState, setGarageState] = useState('');
  const [garagePostalCode, setGaragePostalCode] = useState('');
  const [capacityCars, setCapacityCars] = useState('');
  const [capacityBikes, setCapacityBikes] = useState('');

  // Step 3: POC
  const [isPocSameAsOwner, setIsPocSameAsOwner] = useState(false);
  const [pocName, setPocName] = useState('');
  const [pocPhone, setPocPhone] = useState('');
  const [pocEmail, setPocEmail] = useState('');
  const pocIdRef = useRef<HTMLInputElement>(null);
  const pocPhotoRef = useRef<HTMLInputElement>(null);

  // Step 4: Verification
  const [contactEmail, setContactEmail] = useState(defaultEmail);
  const [contactPhone, setContactPhone] = useState('');
  const kycRef = useRef<HTMLInputElement>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Postal Code Lookup
  useEffect(() => {
    if (luggagePostalCode.length === 6) {
      fetch(`https://api.postalpincode.in/pincode/${luggagePostalCode}`)
        .then(res => res.json())
        .then(data => {
          if (data && data[0] && data[0].Status === 'Success') {
            const po = data[0].PostOffice[0];
            setLuggageState(po.State);
            if (!luggageCity) setLuggageCity(po.District || po.Block);
          }
        }).catch(() => {});
    }
  }, [luggagePostalCode]);

  useEffect(() => {
    if (garagePostalCode.length === 6 && !isGarageSameAddress) {
      fetch(`https://api.postalpincode.in/pincode/${garagePostalCode}`)
        .then(res => res.json())
        .then(data => {
          if (data && data[0] && data[0].Status === 'Success') {
            const po = data[0].PostOffice[0];
            setGarageState(po.State);
            if (!garageCity) setGarageCity(po.District || po.Block);
          }
        }).catch(() => {});
    }
  }, [garagePostalCode, isGarageSameAddress]);

  // Validators
  const isValidPan = (pan: string) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
  const isValidPhone = (phone: string) => /^\d{10}$/.test(phone.replace(/\D/g, ''));
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPin = (pin: string) => /^\d{6}$/.test(pin);

  const validateStep = (currentStep: number): boolean => {
    setValidationError(null);
    
    if (currentStep === 1) {
      if (!providesLuggage && !providesGarage) {
        setValidationError('You must select at least one space type (Luggage or Garage).');
        return false;
      }
      if (partnerType === 'individual') {
        if (!ownerName) return setValidationError('Full Name is required.'), false;
        if (!ownerEmail || !isValidEmail(ownerEmail)) return setValidationError('Valid Owner Email is required.'), false;
        if (!ownerPhone || !isValidPhone(ownerPhone)) return setValidationError('Valid 10-digit Owner Phone is required.'), false;
      } else {
        if (!businessName) return setValidationError('Business Name is required.'), false;
      }
      if (!panNumber || !isValidPan(panNumber)) return setValidationError('Valid format PAN Number is required (e.g. ABCDE1234F).'), false;
    }

    if (currentStep === 2) {
      if (providesLuggage) {
        if (!luggageAddress1) return setValidationError('Luggage Address Line 1 is required.'), false;
        if (!luggageCity) return setValidationError('Luggage City is required.'), false;
        if (!luggageState) return setValidationError('Luggage State is required.'), false;
        if (!luggagePostalCode || !isValidPin(luggagePostalCode)) return setValidationError('Valid 6-digit Luggage Postal Code is required.'), false;
        if (!capacityBags || parseInt(capacityBags) < 1) return setValidationError('Valid Luggage Capacity is required.'), false;
      }
      
      if (providesGarage) {
        if (!isGarageSameAddress) {
          if (!garageAddress1) return setValidationError('Garage Address Line 1 is required.'), false;
          if (!garageCity) return setValidationError('Garage City is required.'), false;
          if (!garageState) return setValidationError('Garage State is required.'), false;
          if (!garagePostalCode || !isValidPin(garagePostalCode)) return setValidationError('Valid 6-digit Garage Postal Code is required.'), false;
        }
        if (!capacityCars || !capacityBikes) return setValidationError('Car and Bike capacities are required.'), false;
      }
    }

    if (currentStep === 3) {
      if (!pocName) return setValidationError('POC Name is required.'), false;
      if (!pocPhone || !isValidPhone(pocPhone)) return setValidationError('Valid 10-digit POC Phone is required.'), false;
      if (pocEmail && !isValidEmail(pocEmail)) return setValidationError('POC Email format is invalid.'), false;
      if (!pocIdRef.current?.files?.length) return setValidationError('POC ID Document is required.'), false;
      if (!pocPhotoRef.current?.files?.length) return setValidationError('POC Photo is required.'), false;
    }

    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      if (step === 3) {
        // Pre-fill contact phone for summary
        if (partnerType === 'individual' && isPocSameAsOwner) {
          setContactPhone(pocPhone);
        } else if (partnerType === 'business') {
          setContactPhone(pocPhone);
        }
      }
      setStep((s) => Math.min(s + 1, 4));
    }
  };
  
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleGarageSameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsGarageSameAddress(e.target.checked);
  };

  return (
    <div className="relative max-w-3xl mx-auto pt-4 sm:pt-8 px-4">
      <form onSubmit={() => setIsSubmitting(true)} action={async (formData) => {
        setValidationError(null);
        if (!kycRef.current?.files?.length) {
          return setValidationError('KYC/ID Proof Document is required to submit.');
        }
        if (!agreedToTerms) {
          return setValidationError('You must agree to the Terms of Service and Privacy Policy.');
        }
        
        setIsSubmitting(true);
        setError(null);
        
        formData.append('user_id', userId);
        formData.append('partner_type', partnerType);
        formData.append('provides_luggage', providesLuggage ? 'true' : 'false');
        formData.append('provides_garage', providesGarage ? 'true' : 'false');
        
        const res = await submitOnboarding(formData);
        if (res?.error) {
          setError(res.error);
          setIsSubmitting(false);
        }
      }}>
        
        {/* Minimal Progress Steps */}
        <div className="mb-10 mt-4">
          <div className="flex items-center justify-between relative px-2 mb-3">
            {['Profile', 'Spaces', 'Contact', 'Review'].map((label, i) => {
              const num = i + 1;
              const isActive = step >= num;
              const isCurrent = step === num;
              return (
                <div key={num} className="relative flex-1 text-center">
                  <span className={`text-[10px] sm:text-[11px] uppercase tracking-wider font-bold whitespace-nowrap transition-colors duration-300 ${isCurrent ? 'text-purple-700' : isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="relative h-1 bg-gray-100 rounded-full mx-2">
            <div className="absolute left-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${(step / 4) * 100}%` }}></div>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-600 rounded-2xl text-sm font-medium flex items-center shadow-sm">
            <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}
        {validationError && (
          <div className="mb-8 p-4 bg-orange-50/80 backdrop-blur-sm border border-orange-200 text-orange-700 rounded-2xl text-sm font-medium flex items-center shadow-sm">
            <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {validationError}
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 sm:p-10 border border-gray-100 overflow-hidden relative min-h-[400px]">
          
          {/* --- STEP 1 --- */}
          <div className={`transition-all duration-500 ease-out ${step === 1 ? 'opacity-100 translate-x-0 relative z-10' : 'opacity-0 -translate-x-full absolute inset-0 pointer-events-none'}`}>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Let's set up your profile</h2>
            
            {/* Reactive Pill Toggle */}
            <div className="flex justify-center mb-10">
              <div className="relative flex p-1 bg-gray-100 rounded-2xl w-full max-w-sm border border-gray-200 shadow-inner">
                <div 
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gray-900 rounded-xl shadow-md transition-all duration-300 ease-out ${partnerType === 'business' ? 'left-[calc(50%+2px)]' : 'left-1'}`}
                />
                <button 
                  type="button"
                  onClick={() => setPartnerType('individual')}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-bold tracking-wide transition-colors duration-300 ${partnerType === 'individual' ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  👤 Individual
                </button>
                <button 
                  type="button"
                  onClick={() => setPartnerType('business')}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-bold tracking-wide transition-colors duration-300 ${partnerType === 'business' ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  🏢 Business
                </button>
              </div>
            </div>

            <div className="mb-10">
              <label className="block text-sm font-bold text-gray-900 mb-4">What spaces are you providing? <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <label className={`cursor-pointer group relative flex flex-col p-4 sm:p-5 border-2 rounded-2xl transition-all duration-300 ${providesLuggage ? 'border-purple-500 bg-purple-50/30 shadow-md shadow-purple-100' : 'border-gray-100 hover:border-gray-200 bg-white shadow-sm'}`}>
                  <input type="checkbox" className="sr-only" checked={providesLuggage} onChange={(e) => setProvidesLuggage(e.target.checked)} />
                  <span className="text-3xl sm:text-4xl mb-2 sm:mb-3 drop-shadow-sm">🧳</span>
                  <span className={`text-sm sm:text-base font-extrabold ${providesLuggage ? 'text-purple-700' : 'text-gray-700'}`}>Luggage Space</span>
                  <span className="text-[10px] sm:text-xs font-medium text-gray-500 mt-1">Store bags and suitcases</span>
                  <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full transition-all duration-300 ${providesLuggage ? 'bg-purple-500 scale-100' : 'bg-gray-100 scale-0'}`}>
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                </label>
                
                <label className={`cursor-pointer group relative flex flex-col p-4 sm:p-5 border-2 rounded-2xl transition-all duration-300 ${providesGarage ? 'border-blue-500 bg-blue-50/30 shadow-md shadow-blue-100' : 'border-gray-100 hover:border-gray-200 bg-white shadow-sm'}`}>
                  <input type="checkbox" className="sr-only" checked={providesGarage} onChange={(e) => setProvidesGarage(e.target.checked)} />
                  <span className="text-3xl sm:text-4xl mb-2 sm:mb-3 drop-shadow-sm">🚗</span>
                  <span className={`text-sm sm:text-base font-extrabold ${providesGarage ? 'text-blue-700' : 'text-gray-700'}`}>Garage Space</span>
                  <span className="text-[10px] sm:text-xs font-medium text-gray-500 mt-1">Store cars and bikes</span>
                  <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full transition-all duration-300 ${providesGarage ? 'bg-blue-500 scale-100' : 'bg-gray-100 scale-0'}`}>
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className={`grid gap-4 transition-all duration-500 overflow-hidden ${partnerType === 'individual' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="min-h-0 space-y-4">
                  <FloatingInput label="Full Name" name="full_name" value={ownerName} onChange={(e: any) => { setOwnerName(e.target.value); if(isPocSameAsOwner) setPocName(e.target.value); }} required />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FloatingInput label="Email Address" type="email" name="owner_email" value={ownerEmail} onChange={(e: any) => setOwnerEmail(e.target.value)} required />
                    <FloatingInput label="Phone Number" type="tel" name="owner_phone" value={ownerPhone} onChange={(e: any) => setOwnerPhone(e.target.value)} required />
                  </div>
                </div>
              </div>

              <div className={`grid gap-4 transition-all duration-500 overflow-hidden ${partnerType === 'business' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="min-h-0 space-y-4">
                  <FloatingInput label="Business Name" name="business_name" value={businessName} onChange={(e: any) => setBusinessName(e.target.value)} required />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FloatingSelect label="Business Type" name="business_type" value={businessType} onChange={(e: any) => setBusinessType(e.target.value)} options={['Hostel', 'Hotel', 'Cafe', 'Retail', 'Other']} />
                    <FloatingInput label="GST Number" name="gst_number" value={gstNumber} onChange={(e: any) => setGstNumber(e.target.value)} />
                  </div>
                </div>
              </div>

              <FloatingInput label="PAN Number" name="pan_number" value={panNumber} onChange={(e: any) => setPanNumber(e.target.value.toUpperCase())} required className="uppercase" />
            </div>
          </div>

          {/* --- STEP 2 --- */}
          <div className={`transition-all duration-500 ease-out ${step === 2 ? 'opacity-100 translate-x-0 relative z-10' : step > 2 ? 'opacity-0 -translate-x-full absolute inset-0 pointer-events-none' : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'}`}>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Where is your space?</h2>
            
            <div className="mb-6 p-4 bg-blue-50/80 border border-blue-100 rounded-2xl flex items-start space-x-3 shadow-sm">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-xs sm:text-sm font-medium text-blue-900 leading-relaxed">
                Have multiple locations? You can add them later from your profile dashboard. The location entered here will be treated as your <span className="font-bold">Primary Location</span> for business operations.
              </p>
            </div>
            
            <div className="space-y-8">
              {providesLuggage && (
                <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <h3 className="text-lg font-black text-purple-900 mb-6 flex items-center"><span className="text-2xl mr-3 drop-shadow-sm">🧳</span> Luggage Location</h3>
                  <div className="space-y-4">
                    <FloatingInput label="Address Line 1" name="luggage_address_line1" value={luggageAddress1} onChange={(e: any) => setLuggageAddress1(e.target.value)} required />
                    <FloatingInput label="Address Line 2 (Optional)" name="luggage_address_line2" value={luggageAddress2} onChange={(e: any) => setLuggageAddress2(e.target.value)} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FloatingInput label="Pin Code" name="luggage_postal_code" value={luggagePostalCode} onChange={(e: any) => setLuggagePostalCode(e.target.value)} required />
                      <FloatingInput label="City" name="luggage_city" value={luggageCity} onChange={(e: any) => setLuggageCity(e.target.value)} required />
                      <FloatingInput label="State" name="luggage_state" value={luggageState} onChange={(e: any) => setLuggageState(e.target.value)} required />
                    </div>
                      <div className="pt-4 border-t border-purple-100 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FloatingInput label="Max Bags Capacity" type="number" name="capacity_bags" min="1" value={capacityBags} onChange={(e: any) => setCapacityBags(e.target.value)} required />
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Location Photos (Optional)</label>
                          <input type="file" multiple accept="image/*" name="luggage_photos" className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer outline-none transition-colors" />
                        </div>
                      </div>
                  </div>
                </div>
              )}

              {providesGarage && (
                <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                    <h3 className="text-lg font-black text-blue-900 flex items-center"><span className="text-2xl mr-3 drop-shadow-sm">🚗</span> Garage Location</h3>
                    {providesLuggage && (
                      <label className="flex items-center space-x-2 cursor-pointer bg-white px-4 py-2 rounded-xl border border-blue-200 shadow-sm hover:bg-blue-50 transition-colors">
                        <input type="checkbox" checked={isGarageSameAddress} onChange={handleGarageSameChange} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                        <span className="text-xs font-bold uppercase tracking-wide text-blue-800">Same as Luggage</span>
                      </label>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {isGarageSameAddress ? (
                      <>
                        <input type="hidden" name="garage_address_line1" value={luggageAddress1} />
                        <input type="hidden" name="garage_address_line2" value={luggageAddress2} />
                        <input type="hidden" name="garage_postal_code" value={luggagePostalCode} />
                        <input type="hidden" name="garage_city" value={luggageCity} />
                        <input type="hidden" name="garage_state" value={luggageState} />
                      </>
                    ) : (
                      <>
                        <FloatingInput label="Address Line 1" name="garage_address_line1" value={garageAddress1} onChange={(e: any) => setGarageAddress1(e.target.value)} required />
                        <FloatingInput label="Address Line 2 (Optional)" name="garage_address_line2" value={garageAddress2} onChange={(e: any) => setGarageAddress2(e.target.value)} />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <FloatingInput label="Pin Code" name="garage_postal_code" value={garagePostalCode} onChange={(e: any) => setGaragePostalCode(e.target.value)} required />
                          <FloatingInput label="City" name="garage_city" value={garageCity} onChange={(e: any) => setGarageCity(e.target.value)} required />
                          <FloatingInput label="State" name="garage_state" value={garageState} onChange={(e: any) => setGarageState(e.target.value)} required />
                        </div>
                      </>
                    )}

                    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2 ${!isGarageSameAddress ? 'pt-4 border-t border-blue-100' : ''}`}>
                      <FloatingInput label="Max Cars" type="number" name="capacity_cars" min="0" value={capacityCars} onChange={(e: any) => setCapacityCars(e.target.value)} required />
                      <FloatingInput label="Max Bikes" type="number" name="capacity_bikes" min="0" value={capacityBikes} onChange={(e: any) => setCapacityBikes(e.target.value)} required />
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Location Photos (Optional)</label>
                        <input type="file" multiple accept="image/*" name="garage_photos" className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer outline-none transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* --- STEP 3 --- */}
          <div className={`transition-all duration-500 ease-out ${step === 3 ? 'opacity-100 translate-x-0 relative z-10' : step > 3 ? 'opacity-0 -translate-x-full absolute inset-0 pointer-events-none' : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'}`}>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Point of Contact</h2>
            <div className="space-y-6">
              {partnerType === 'individual' && (
                <label className="flex items-center space-x-3 cursor-pointer bg-fuchsia-50/50 border border-fuchsia-100 p-4 rounded-2xl hover:bg-fuchsia-50 transition-colors">
                  <input type="checkbox" checked={isPocSameAsOwner} onChange={(e) => {
                    const checked = e.target.checked;
                    setIsPocSameAsOwner(checked);
                    if(checked) { setPocName(ownerName); setPocPhone(ownerPhone); setPocEmail(ownerEmail); }
                    else { setPocName(''); setPocPhone(''); setPocEmail(''); }
                  }} className="w-5 h-5 text-fuchsia-600 rounded border-gray-300 focus:ring-fuchsia-500" />
                  <span className="text-sm font-bold text-fuchsia-900 uppercase tracking-wide">POC is same as Profile</span>
                </label>
              )}

              <FloatingInput label="Contact Name" name="poc_name" value={pocName} onChange={(e: any) => { setPocName(e.target.value); setIsPocSameAsOwner(false); }} required />
              <div className="grid sm:grid-cols-2 gap-4">
                <FloatingInput label="Phone Number" type="tel" name="poc_phone" value={pocPhone} onChange={(e: any) => { setPocPhone(e.target.value); setIsPocSameAsOwner(false); }} required />
                <FloatingInput label="Email Address (Optional)" type="email" name="poc_email" value={pocEmail} onChange={(e: any) => { setPocEmail(e.target.value); setIsPocSameAsOwner(false); }} />
              </div>
              
              <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-5 relative hover:border-purple-300 transition-colors group">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">ID Document (Aadhar/PAN) <span className="text-red-500">*</span></label>
                  <input type="file" ref={pocIdRef} name="poc_id_document" accept=".pdf,image/jpeg,image/png,image/webp" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-wide file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 transition-colors" />
                </div>
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-5 relative hover:border-purple-300 transition-colors group">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Contact Photo (Headshot) <span className="text-red-500">*</span></label>
                  <input type="file" ref={pocPhotoRef} name="poc_photo" accept="image/jpeg,image/png,image/webp" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-wide file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 transition-colors" />
                </div>
              </div>
            </div>
          </div>

          {/* --- STEP 4 (REVIEW) --- */}
          <div className={`transition-all duration-500 ease-out ${step === 4 ? 'opacity-100 translate-x-0 relative z-10' : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'}`}>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Review & Finalize</h2>
            
            <div className="space-y-4 mb-8">
              {/* Receipt Style Summary */}
              <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -mr-16 -mt-16 z-0"></div>
                
                <div className="relative z-10 grid gap-6">
                  <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Partner Profile</p>
                      <h4 className="text-lg font-black text-gray-900">{partnerType === 'individual' ? ownerName : businessName}</h4>
                      <p className="text-sm font-medium text-gray-500">{partnerType === 'individual' ? 'Individual Partner' : businessType}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">PAN Number</p>
                      <p className="font-bold text-gray-900 uppercase">{panNumber}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Spaces Provided</p>
                    <div className="flex flex-wrap gap-2">
                      {providesLuggage && <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 text-xs font-bold"><span className="mr-2">🧳</span> {capacityBags} Bags</span>}
                      {providesGarage && <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold"><span className="mr-2">🚗</span> {capacityCars} Cars, {capacityBikes} Bikes</span>}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center">
                     <div>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Point of Contact</p>
                       <p className="font-bold text-gray-900">{pocName}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Contact Phone</p>
                       <p className="font-bold text-gray-900">{pocPhone}</p>
                     </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 shadow-sm">
                <h4 className="text-sm font-black text-gray-900 mb-4">Required Documents</h4>
                <div className="space-y-4">
                  <FloatingInput label="System Alert Phone" type="tel" name="contact_phone" value={contactPhone} onChange={(e: any) => setContactPhone(e.target.value)} required />
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-5 relative hover:border-purple-300 transition-colors">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">{partnerType === 'individual' ? 'ID Proof Document (PDF/JPG)' : 'Business KYC Document (PDF/JPG)'} <span className="text-red-500">*</span></label>
                    <input type="file" ref={kycRef} name="kyc_document" accept=".pdf,image/jpeg,image/png,image/webp" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-wide file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 transition-colors" />
                  </div>
                </div>
              </div>

              <label className="flex items-start space-x-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="w-5 h-5 mt-0.5 text-purple-600 rounded-md border-gray-300 focus:ring-purple-500" />
                <span className="text-sm font-medium text-gray-700">
                  I have read and agree to the{' '}
                  <button type="button" onClick={() => setShowTerms(true)} className="text-purple-600 font-bold hover:underline">Terms of Service</button>{' '}
                  and{' '}
                  <button type="button" onClick={() => setShowPrivacy(true)} className="text-purple-600 font-bold hover:underline">Privacy Policy</button>.
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Floating Action Bar */}
        <div className="mt-8 flex justify-between items-center">
          <button 
            type="button" 
            onClick={prevStep}
            disabled={step === 1 || isSubmitting}
            className={`px-6 py-3 rounded-2xl font-bold text-sm tracking-wide uppercase transition-all duration-300 ${step === 1 ? 'opacity-0 cursor-default' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 active:scale-95'}`}
          >
            Go Back
          </button>
          
          {step < 4 ? (
            <button 
              type="button" 
              onClick={nextStep}
              className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold text-sm tracking-wide uppercase shadow-lg shadow-gray-300 hover:bg-gray-800 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
            >
              Continue
            </button>
          ) : (
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-2xl font-bold text-sm tracking-wide uppercase shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0 active:scale-95 flex items-center"
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

      {/* Modern Modals */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${showTerms ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowTerms(false)}></div>
        <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 relative z-10 max-h-[85vh] overflow-y-auto border border-gray-100 transition-all duration-300 transform ${showTerms ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}`}>
          <h2 className="text-2xl font-black text-gray-900 mb-6">Terms of Service</h2>
          <div className="text-sm font-medium text-gray-600 space-y-4">
            <p>Welcome to StashInn. These Terms of Service govern your use of our platform as a storage partner.</p>
            <div className="p-4 bg-gray-50 rounded-xl space-y-3">
              <p><span className="font-bold text-gray-900">1. Partner Responsibilities:</span> You agree to safely store items entrusted to you by our users.</p>
              <p><span className="font-bold text-gray-900">2. Liability:</span> You are responsible for any damage or loss of items while in your care.</p>
              <p><span className="font-bold text-gray-900">3. Payments:</span> StashInn will remit payouts according to the agreed schedule.</p>
            </div>
          </div>
          <button type="button" onClick={() => setShowTerms(false)} className="mt-8 w-full py-3 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors">I Understand</button>
        </div>
      </div>

      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${showPrivacy ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowPrivacy(false)}></div>
        <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 relative z-10 max-h-[85vh] overflow-y-auto border border-gray-100 transition-all duration-300 transform ${showPrivacy ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}`}>
          <h2 className="text-2xl font-black text-gray-900 mb-6">Privacy Policy</h2>
          <div className="text-sm font-medium text-gray-600 space-y-4">
            <p>Your privacy is important to us. This policy explains how we collect and use your data.</p>
            <div className="p-4 bg-gray-50 rounded-xl space-y-3">
              <p><span className="font-bold text-gray-900">Data Collection:</span> We collect KYC documents, contact details, and location data to verify your business.</p>
              <p><span className="font-bold text-gray-900">Data Usage:</span> Your location details will be visible to users searching for storage.</p>
              <p><span className="font-bold text-gray-900">Data Protection:</span> We use industry-standard encryption to protect your sensitive documents.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Creative Full-Screen Loader */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/90 backdrop-blur-md transition-all duration-300"></div>
          <div className="relative z-10 flex flex-col items-center text-center transition-all duration-500 transform scale-100">
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 bg-purple-100 rounded-full animate-ping opacity-75"></div>
              <div className="relative flex items-center justify-center w-full h-full bg-white border-4 border-purple-500 rounded-full shadow-2xl overflow-hidden">
                <span className="text-5xl animate-bounce drop-shadow-md">🧳</span>
              </div>
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-3">Packing your application...</h2>
            <p className="text-lg font-medium text-gray-500 max-w-sm">
              We are securely stashing your details and setting up your new partner profile.
            </p>
            
            {/* Custom Progress Bar */}
            <div className="w-64 h-2 bg-gray-100 rounded-full mt-8 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 w-full animate-[progress_2s_ease-in-out_infinite]" style={{
                animation: 'progress 2s ease-in-out infinite'
              }}></div>
            </div>
            <style>{`
              @keyframes progress {
                0% { transform: translateX(-100%); }
                50% { transform: translateX(0%); }
                100% { transform: translateX(100%); }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
}



