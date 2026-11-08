'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { submitReview } from './actions';
import { MAX_COMMENT, MAX_TAGS, RATING_WORDS, isGoodTag, tagsFor } from './reviewShared';

const STAR = 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z';

export default function ReviewForm({ bookingId, placeName }: { bookingId: string; placeName: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const shown = hover || rating;
  const group = tagsFor(rating);
  const lowNeedsDetail = rating > 0 && rating <= 2 && !comment.trim() && !tags.length;

  const pick = (n: number) => {
    setRating(n);
    setError('');
    // Keep only tags that still fit the new rating
    const allowed = tagsFor(n)?.tags || [];
    setTags(t => t.filter(x => allowed.includes(x)));
  };
  const toggle = (t: string) => setTags(cur => (cur.includes(t) ? cur.filter(x => x !== t) : cur.length >= MAX_TAGS ? cur : [...cur, t]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return setError('Choose a star rating first.');
    if (lowNeedsDetail) return setError('Pick what went wrong or add a comment, so the location can fix it.');
    const fd = new FormData();
    fd.set('booking_id', bookingId);
    fd.set('rating', String(rating));
    fd.set('comment', comment);
    tags.forEach(t => fd.append('tags', t));
    setError('');
    start(async () => {
      try {
        const r = await submitReview(fd);
        if (r.ok) router.refresh(); // the page then shows the thank-you with the review
        else setError(r.error);
      } catch {
        setError('Something went wrong. Please try again.');
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-7">
      <fieldset>
        <legend className="block w-full text-center text-base font-extrabold text-gray-900 dark:text-white">How was {placeName}?</legend>
        <div role="radiogroup" aria-label="Rating" className="mt-3 flex justify-center gap-1 sm:gap-2" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n === 1 ? '' : 's'}: ${RATING_WORDS[n]}`}
              tabIndex={rating ? (rating === n ? 0 : -1) : n === 1 ? 0 : -1}
              onClick={() => pick(n)}
              onMouseEnter={() => setHover(n)}
              onKeyDown={e => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); pick(Math.min(5, (rating || 0) + 1)); }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); pick(Math.max(1, (rating || 2) - 1)); }
              }}
              className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-orange-500 ${n <= shown ? 'text-amber-400' : 'text-gray-300 dark:text-gray-700'}`}
            >
              <svg className="h-10 w-10 sm:h-11 sm:w-11" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d={STAR} /></svg>
            </button>
          ))}
        </div>
        <p className="mt-1 h-6 text-center text-sm font-bold text-gray-700 dark:text-gray-300" aria-live="polite">{shown ? RATING_WORDS[shown] : 'Tap a star to rate'}</p>
      </fieldset>

      {group && (
        <fieldset>
          <legend className="text-sm font-bold text-gray-900 dark:text-white">{group.title} <span className="font-normal text-gray-500 dark:text-gray-400">(up to {MAX_TAGS})</span></legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {group.tags.map(t => {
              const on = tags.includes(t);
              const good = isGoodTag(t);
              return (
                <button key={t} type="button" aria-pressed={on} onClick={() => toggle(t)} disabled={!on && tags.length >= MAX_TAGS}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors disabled:opacity-40 ${on
                    ? good ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' : 'border-red-300 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                  {on ? '✓ ' : ''}{t}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div>
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
          <label htmlFor="rv-comment" className="text-sm font-bold text-gray-900 dark:text-white">
            Anything to add? <span className="font-normal text-gray-500 dark:text-gray-400">{rating > 0 && rating <= 2 ? '(helps the location fix it)' : '(optional)'}</span>
          </label>
          <span className="text-xs tabular-nums text-gray-400">{comment.length}/{MAX_COMMENT}</span>
        </div>
        <textarea id="rv-comment" rows={4} maxLength={MAX_COMMENT} value={comment} onChange={e => setComment(e.target.value)}
          placeholder={rating && rating <= 2 ? 'What happened, and what should they do differently?' : 'What did you like, and what could be better?'}
          className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">The location and StashInn see your rating, tags and comment with your first name. Don’t include phone numbers or payment details.</p>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 px-3.5 py-2.5 text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>}

      <button type="submit" disabled={pending || !rating} className="w-full rounded-xl bg-orange-600 hover:bg-orange-500 py-3.5 text-base font-bold text-white shadow-sm disabled:opacity-50">
        {pending ? 'Sending…' : rating ? `Submit ${rating}-star review` : 'Choose a rating'}
      </button>
    </form>
  );
}
