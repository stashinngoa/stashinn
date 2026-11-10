// Reputation part of a location's score (admin Scoring: amenities + location + reputation = auto score).
//
// Out of 30. A location with no reviews gets 15, the same as before reviews were counted.
// Reviews pull it towards their average, smoothed by REPUTATION_PRIOR_WEIGHT imaginary 3★ reviews
// so one early review can't swing it far:
//   smoothed = (5 × 3 + sum of ratings) / (5 + number of reviews)
//   score    = round((smoothed − 1) / 4 × 30)        1★ → 0, 3★ → 15, 5★ → 30
// The score only sets the price when an admin applies it, so reviews never change prices on their own.

export const REPUTATION_MAX = 30;
export const REPUTATION_DEFAULT = 15;
export const REPUTATION_PRIOR_WEIGHT = 5;
const PRIOR_RATING = 3;

export function reputationScore(ratings: number[]): number {
  const valid = ratings.filter(r => Number.isFinite(r) && r >= 1 && r <= 5);
  if (!valid.length) return REPUTATION_DEFAULT;
  const smoothed = (REPUTATION_PRIOR_WEIGHT * PRIOR_RATING + valid.reduce((s, r) => s + r, 0)) / (REPUTATION_PRIOR_WEIGHT + valid.length);
  return Math.max(0, Math.min(REPUTATION_MAX, Math.round(((smoothed - 1) / 4) * REPUTATION_MAX)));
}

/** Summary shown next to the score: how many reviews and their plain average. */
export function reviewSummary(ratings: number[]) {
  const valid = ratings.filter(r => Number.isFinite(r) && r >= 1 && r <= 5);
  return { count: valid.length, average: valid.length ? valid.reduce((s, r) => s + r, 0) / valid.length : null, score: reputationScore(valid) };
}
