'use client';

import { useState, useTransition } from 'react';
import { submitSettlementProof } from './actions';

export default function UploadProofForm({ paymentId, partnerId }: { paymentId: string, partnerId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set('payment_id', paymentId);
    formData.set('partner_id', partnerId);

    startTransition(async () => {
      try {
        await submitSettlementProof(formData);
      } catch (err: any) {
        setError(err.message || 'Upload failed');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <input
          type="file"
          name="proof"
          required
          accept="image/*,.pdf"
          className="w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 cursor-pointer"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Uploading...' : 'Submit Proof'}
      </button>
      {error && <p className="text-xs text-red-600 absolute mt-12">{error}</p>}
    </form>
  );
}
