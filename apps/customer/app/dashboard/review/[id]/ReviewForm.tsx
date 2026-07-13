'use client';

import { useState } from 'react';
import { submitReview } from './actions';

export default function ReviewForm({ booking }: { booking: any }) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.append('rating', rating.toString());
    formData.append('booking_id', booking.id);

    try {
      const res = await submitReview(formData);
      if (res?.error) setError(res.error);
    } catch (err) {
      // Redirect throws an error in next.js, which is expected behavior
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-semibold">{error}</div>}
      
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-4 text-center">How was your experience?</label>
        <div className="flex justify-center space-x-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                star <= (hover || rating) ? 'bg-yellow-100 text-yellow-500' : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
              }`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Leave a Comment (Optional)</label>
        <textarea 
          name="comment"
          rows={4}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:bg-white transition-colors"
          placeholder="What did you like or dislike about this location?"
        ></textarea>
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-colors disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
