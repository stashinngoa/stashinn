'use client';

import { useState, useTransition } from 'react';
import { resolveDispute } from './actions';

export default function DisputeResolutionForm({ dispute }: { dispute: any }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set('id', dispute.id);
    
    startTransition(async () => {
      try {
        await resolveDispute(formData);
      } catch (err: any) {
        setError(err.message || 'Failed to update dispute');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-xs bg-red-900/30 text-red-400 p-2 rounded border border-red-800/50">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Set Status</label>
        <select
          name="status"
          defaultValue={dispute.status}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
        >
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="resolved_refund">Resolved - Issue Refund</option>
          <option value="resolved_no_action">Resolved - No Action</option>
          <option value="escalated">Escalated (Legal/Trust)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Approved Refund / Penalty (₹)</label>
        <input
          type="number"
          name="refund_amount"
          defaultValue={dispute.refund_amount || ''}
          min="0"
          step="0.01"
          placeholder="0.00"
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Admin Notes (Visible to Partner)</label>
        <textarea
          name="admin_notes"
          rows={5}
          defaultValue={dispute.admin_notes || ''}
          placeholder="Reasoning for the decision..."
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 px-4 text-xs font-bold rounded-md text-white bg-red-600 hover:bg-red-700 border border-transparent disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Saving...' : 'Update Record'}
      </button>

      {dispute.resolved_at && (
        <p className="text-[10px] text-gray-600 text-center mt-2">
          Resolved on {new Date(dispute.resolved_at).toLocaleDateString()}
        </p>
      )}
    </form>
  );
}
