'use client';

import { useState, useEffect } from 'react';
import { createRazorpayOrder } from './razorpayActions';
import { createBooking } from './actions';

export default function CheckoutClientForm({ location, resolvedParams, razorpayKey }: { location: any, resolvedParams: any, razorpayKey: string }) {
  const [paymentMethod, setPaymentMethod] = useState('pay_at_location');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

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
    setIsProcessing(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    formData.append('location_id', location.id);
    formData.append('partner_id', location.partners?.id);
    formData.append('check_in', resolvedParams.in);
    formData.append('check_out', resolvedParams.out);
    formData.append('bags', resolvedParams.bags);
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
          name: "Customer",
          email: "customer@stashinn.com"
        },
        theme: {
          color: "#9333EA" // Purple-600
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
          <div className="flex justify-between items-center mb-6">
            <span className="font-bold text-gray-900">Total (inclusive of taxes)</span>
            <span className="text-2xl font-black text-purple-600">₹{totalAmount.toFixed(2)}</span>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Payment Method</h3>
            <div className="space-y-3">
              <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'pay_at_location' ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input 
                  type="radio" 
                  name="payment_method_ui" 
                  value="pay_at_location" 
                  checked={paymentMethod === 'pay_at_location'} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5 text-purple-600 focus:ring-purple-500" 
                />
                <div className="ml-3">
                  <span className="block font-bold text-gray-900">Pay at Location</span>
                  <span className="block text-sm text-gray-500">Pay with Cash or UPI when you drop off your bags.</span>
                </div>
              </label>
              
              <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === 'razorpay' ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input 
                  type="radio" 
                  name="payment_method_ui" 
                  value="razorpay" 
                  checked={paymentMethod === 'razorpay'} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5 text-purple-600 focus:ring-purple-500" 
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
