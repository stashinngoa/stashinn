'use client';

import { useState, useEffect } from 'react';
import { createRazorpayOrder } from './razorpayActions';
import { createBooking, ensureCustomer } from './actions';

export default function CheckoutClientForm({ location, resolvedParams, razorpayKey, userProfile }: { location: any, resolvedParams: any, razorpayKey: string, userProfile?: any }) {
  const [paymentMethod, setPaymentMethod] = useState('pay_at_location');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState(userProfile?.full_name || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [mobile, setMobile] = useState(userProfile?.phone || '');

  const totalAmount = parseFloat(resolvedParams.price || '0');

  // Load Razorpay SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Capture form data synchronously before any awaits
    const formData = new FormData(e.currentTarget);
    
    setIsProcessing(true);
    setError('');

    let finalCustomerId = userProfile?.id;
    // Ensure customer account is created BEFORE razorpay or booking
    if (!userProfile) {
      const accRes = await ensureCustomer(fullName, email, mobile);
      if (accRes.error) {
        setError(accRes.error);
        setIsProcessing(false);
        return;
      }
      finalCustomerId = accRes.customerId;
    }

    formData.append('customer_id', finalCustomerId || '');
    formData.append('full_name', fullName);
    formData.append('email', email);
    formData.append('mobile', mobile);

    formData.append('location_id', location?.id || '');
    formData.append('partner_id', location?.partner_id || location?.partners?.id || '');
    formData.append('check_in', resolvedParams?.in || '');
    formData.append('check_out', resolvedParams?.out || '');
    formData.append('mode', resolvedParams.mode || 'luggage');
    
    // Add contact details
    formData.append('full_name', fullName);
    formData.append('email', email);
    formData.append('mobile', mobile);

    if (resolvedParams.mode === 'garage') {
      formData.append('vehicleType', resolvedParams.vehicleType || 'sedan');
    } else {
      formData.append('bags', resolvedParams.bags || '1');
    }

    formData.append('total_amount', resolvedParams.price);
    formData.append('payment_method', paymentMethod);

    if (paymentMethod === 'pay_at_location') {
      // Proceed directly
      await createBooking(formData);
      return;
    }

    if (paymentMethod === 'razorpay') {
      // 1. Create Server Order
      const res = await createRazorpayOrder(totalAmount);
      if (res.error || !res.orderId) {
        setError(res.error || 'Failed to initialize payment gateway.');
        setIsProcessing(false);
        return;
      }

      // 2. Open Modal
      const options = {
        key: razorpayKey, 
        amount: res.amount,
        currency: "INR",
        name: "StashInn",
        description: `Storage at ${location.name}`,
        order_id: res.orderId,
        handler: async function (response: any) {
          // 3. Success Callback: Append Razorpay IDs and submit booking
          formData.append('razorpay_order_id', response.razorpay_order_id);
          formData.append('razorpay_payment_id', response.razorpay_payment_id);
          formData.append('razorpay_signature', response.razorpay_signature);
          
          await createBooking(formData);
        },
        prefill: {
          name: fullName || "Customer",
          email: email || "customer@stashinn.com",
          contact: mobile || ""
        },
        theme: {
          color: "#E8722A" // brand-orange
        },
        modal: {
          ondismiss: function() {
            setError('Payment was cancelled. You have not been charged.');
            setIsProcessing(false);
          }
        }
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any) {
        setError(`Payment Failed: ${response.error.description}`);
        setIsProcessing(false);
      });
      rzp1.open();
    }
  };

  return (
    <div className="p-6 bg-gray-50 border-t border-gray-100">
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-semibold border border-red-200">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="pt-4 border-t border-gray-100">

          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Contact Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name *</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  readOnly={!!userProfile}
                  required 
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-brand-orange outline-none ${userProfile ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-300'}`} 
                  placeholder="e.g. Rahul Sharma" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email *</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    readOnly={!!userProfile}
                    required 
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-brand-orange outline-none ${userProfile ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-300'}`} 
                    placeholder="e.g. rahul@example.com" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Mobile *</label>
                  <input 
                    type="tel" 
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    readOnly={!!userProfile}
                    required 
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-brand-orange outline-none ${userProfile ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-300'}`} 
                    placeholder="e.g. 9876543210" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6 pt-6 border-t border-gray-100">
            <span className="font-bold text-gray-900">Total (inclusive of taxes)</span>
            <span className="text-2xl font-black text-brand-orange">₹{totalAmount.toFixed(2)}</span>
          </div>

          {resolvedParams.mode === 'garage' && (
            <div className="mb-8 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Vehicle Details</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Make *</label>
                  <input type="text" name="vehicle_make" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-orange outline-none" placeholder="e.g. Honda" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Model *</label>
                  <input type="text" name="model" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-orange outline-none" placeholder="e.g. City" />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">License Plate *</label>
                <input type="text" name="plate" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-orange outline-none" placeholder="e.g. MH12 AB 1234" />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Condition Photos (Up to 4) *</label>
                <input type="file" name="check_in_photos" accept="image/*" multiple required className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-brand-orange hover:file:bg-orange-100 outline-none" />
                <p className="text-xs text-gray-400 mt-1">Please take photos of all 4 sides of your vehicle before dropping it off.</p>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Payment Method</h3>
            <div className="space-y-3">
              <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'pay_at_location' ? 'border-brand-orange bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input 
                  type="radio" 
                  name="payment_method_ui" 
                  value="pay_at_location" 
                  checked={paymentMethod === 'pay_at_location'} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5 text-brand-orange focus:ring-brand-orange" 
                />
                <div className="ml-3">
                  <span className="block font-bold text-gray-900">Pay at Location</span>
                  <span className="block text-sm text-gray-500">Pay with Cash or UPI when you drop off.</span>
                </div>
              </label>
              
              <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'razorpay' ? 'border-brand-orange bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input 
                  type="radio" 
                  name="payment_method_ui" 
                  value="razorpay" 
                  checked={paymentMethod === 'razorpay'} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5 text-brand-orange focus:ring-brand-orange" 
                />
                <div className="ml-3">
                  <span className="block font-bold text-gray-900">Pay Online Now</span>
                  <span className="block text-sm text-gray-500">Credit Card, Debit Card, Netbanking via Razorpay.</span>
                </div>
              </label>
            </div>
          </div>
        </div>
        
        <button 
          type="submit" 
          disabled={isProcessing}
          className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors shadow-lg shadow-gray-200 disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : 'Request Booking'}
        </button>
      </form>
      <p className="text-center text-xs text-gray-500 mt-4">
        By confirming, you agree to the StashInn Terms of Service.
      </p>
    </div>
  );
}
