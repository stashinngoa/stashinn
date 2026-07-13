'use client';

import { useState, useTransition } from 'react';
import { submitDamageReport } from './actions';

export default function ReportForm({ eligibleBookings }: { eligibleBookings: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        await submitDamageReport(formData);
        // Reset form
        (e.target as HTMLFormElement).reset();
      } catch (err: any) {
        setError(err.message || 'Failed to submit report');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-900/30 text-red-400 p-3 rounded text-sm border border-red-800/50">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Select Booking</label>
        <select
          name="booking_id"
          required
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">-- Choose a recent booking --</option>
          {eligibleBookings.map((b) => (
            <option key={b.id} value={b.id}>
              {new Date(b.actual_checkout || b.end_time).toLocaleDateString()} - {b.users?.full_name} ({b.id.split('-')[0]})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Description of Incident</label>
        <textarea
          name="description"
          required
          rows={4}
          placeholder="Please describe what happened in detail..."
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Photo Evidence (Optional)</label>
        <input
          type="file"
          name="photos"
          multiple
          accept="image/*"
          className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
        />
        <p className="text-xs text-gray-500 mt-2">You can upload multiple images at once.</p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 px-4 border border-transparent text-sm font-bold rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Uploading & Submitting...' : 'Submit Claim'}
      </button>
    </form>
  );
}
