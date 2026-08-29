'use client';

import { useState } from 'react';
import { verifyGarageCheckIn } from '../../actions';

export default function CheckInForm({ booking }: { booking: any }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    formData.append('booking_id', booking.id);
    formData.append('customer_id', booking.customer_id); // Needed for path
    
    // We expect 'otp' and 'photos' in formData automatically from the form inputs
    const res = await verifyGarageCheckIn(formData);

    if (res?.error) {
      setError(res.error);
    } else {
      setOtp('');
      // Redirect happens in action
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      {error && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Check-in OTP *</label>
          <input 
            type="text" 
            name="otp"
            maxLength={4}
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="0000"
            required
            className="w-full max-w-[200px] bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-2xl font-mono tracking-[0.3em] text-center focus:border-purple-500 outline-none transition-colors"
          />
          <p className="text-xs text-gray-500 mt-1">Ask the customer for their 4-digit check-in OTP.</p>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">Vehicle Condition Photos</label>
          <input 
            type="file" 
            name="photos" 
            accept="image/*" 
            multiple 
            max="4"
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">Upload up to 4 photos of the vehicle (optional if customer already provided them).</p>
        </div>

        <button 
          type="submit" 
          disabled={otp.length !== 4 || isSubmitting}
          className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Verifying & Uploading...' : 'Verify Check-in'}
        </button>
      </form>
    </div>
  );
}
