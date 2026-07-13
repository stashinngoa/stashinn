'use client';

import { moderateReview } from './actions';

export default function DeleteReviewButton({ reviewId }: { reviewId: string }) {
  const handleClick = () => {
    if (!confirm('Are you sure you want to permanently delete this review?')) return;

    const formData = new FormData();
    formData.set('review_id', reviewId);
    formData.set('action', 'delete');
    moderateReview(formData);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="px-4 py-2 bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white rounded-lg text-sm font-bold border border-red-800/50 hover:border-red-500 transition-colors"
    >
      Remove Review
    </button>
  );
}
