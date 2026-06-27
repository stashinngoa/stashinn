'use client';

import { verifyCheckInOTP, verifyCheckOutOTP, acceptBooking, declineBooking } from './actions';
import { useState } from 'react';

export default function OTPTerminal({ booking }: { booking: any }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVerify = async () => {
    setIsSubmitting(true);
    setError('');
    const formData = new FormData();
    formData.append('booking_id', booking.id);
    formData.append('otp', otp);

    let res;
    if (booking.status === 'confirmed') {
      res = await verifyCheckInOTP(formData);
    } else if (booking.status === 'checked_in') {
      res = await verifyCheckOutOTP(formData);
    }

    if (res?.error) {
      setError(res.error);
    } else {
      setOtp('');
    }
    setIsSubmitting(false);
  };

  if (booking.status === 'pending') {
    return (
      <div className="bg-white p-8 rounded-2xl text-center border border-yellow-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400"></div>
        <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">Incoming Booking Request</h3>
        <p className="text-gray-500 text-sm mb-6">Customer is waiting for you to confirm availability. Please accept if you have enough space for {booking.num_bags} bags.</p>
        
        <div className="flex gap-3">
          <form action={acceptBooking} className="flex-1">
            <input type="hidden" name="booking_id" value={booking.id} />
            <button type="submit" className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors">
              Accept
            </button>
          </form>
          <form action={declineBooking} className="flex-1">
            <input type="hidden" name="booking_id" value={booking.id} />
            <button type="submit" className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors">
              Decline
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (booking.status === 'checked_out') {
    return (
      <div className="bg-green-50 p-8 rounded-2xl text-center border border-green-200">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-green-900 mb-1">Transaction Complete</h3>
        <p className="text-green-700">The customer has successfully picked up their bags.</p>
      </div>
    );
  }

  if (booking.status === 'cancelled') {
    return (
      <div className="bg-red-50 p-8 rounded-2xl text-center border border-red-200">
        <h3 className="text-xl font-bold text-red-900 mb-1">Booking Cancelled</h3>
        <p className="text-red-700">This booking was cancelled and is no longer active.</p>
      </div>
    );
  }

  const isCheckin = booking.status === 'confirmed';

  return (
    <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
      
      <h3 className="text-xl font-bold text-white mb-2">
        {isCheckin ? 'Check-In Terminal' : 'Check-Out Terminal'}
      </h3>
      <p className="text-gray-400 text-sm mb-6">
        {isCheckin ? "Collect the cash and ask the customer for their 4-digit Drop-off OTP to log the bags." : "Ask the customer for their 4-digit Pick-up OTP to return the bags."}
      </p>

      {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm mb-4 border border-red-500/20">{error}</div>}

      <div className="flex gap-4">
        <input 
          type="text" 
          maxLength={4}
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
          placeholder="0000"
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-6 py-4 text-3xl font-mono text-white tracking-[0.3em] text-center focus:border-purple-500 outline-none transition-colors"
        />
      </div>
      <button 
        onClick={handleVerify}
        disabled={otp.length !== 4 || isSubmitting}
        className="w-full mt-4 py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-500 transition-colors disabled:opacity-50"
      >
        {isSubmitting ? 'Verifying...' : (isCheckin ? 'Verify Drop-off' : 'Verify Pick-up')}
      </button>
    </div>
  );
}
