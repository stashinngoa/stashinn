'use client';

import { useState, useTransition, useEffect } from 'react';
import { submitCustomerDispute } from './actions';
import { useSearchParams } from 'next/navigation';

export default function ReportForm({ eligibleBookings }: { eligibleBookings: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [defaultBooking, setDefaultBooking] = useState<string>('');

  useEffect(() => {
    const bId = searchParams?.get('booking_id');
    if (bId) setDefaultBooking(bId);
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        await submitCustomerDispute(formData);
        (e.target as HTMLFormElement).reset();
      } catch (err: any) {
        setError(err.message || 'Failed to submit report');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Select Booking</label>
        <select
          name="booking_id"
          required
          defaultValue={defaultBooking}
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
        >
          <option value="">-- Choose a booking --</option>
          {eligibleBookings.map((b) => (
            <option key={b.id} value={b.id}>
              {new Date(b.start_time).toLocaleDateString()} - {b.partner_locations?.name} (Ref: #{b.id.split('-')[0].toUpperCase()})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Issue Description</label>
        <textarea
          name="description"
          required
          rows={4}
          placeholder="Please describe the issue in detail (e.g., damaged luggage, overcharging, missing items)..."
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
        ></textarea>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Evidence Photos (Optional)</label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Upload photos clearly showing the damage or issue.</p>
        <input
          type="file"
          name="photos"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 dark:file:bg-purple-900/20 file:text-purple-700 dark:file:text-purple-400 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/40 transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isPending ? 'Submitting...' : 'Submit Dispute'}
      </button>
    </form>
  );
}
