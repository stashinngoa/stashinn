// Review wording and quick tags, shared by the review page, its form and the server action.

export const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'] as const;

export const GOOD_TAGS = ['Easy to find', 'Friendly staff', 'Quick drop-off', 'Quick pick-up', 'Felt secure', 'Clean space', 'Good value', 'Flexible with timing'] as const;
export const BAD_TAGS = ['Hard to find', 'Long wait', 'Unhelpful staff', 'Didn’t feel secure', 'Not clean', 'Closed when I arrived', 'Items not handled with care', 'Too expensive'] as const;
export const ALL_TAGS: readonly string[] = [...GOOD_TAGS, ...BAD_TAGS];
export const MAX_TAGS = 5;
export const MAX_COMMENT = 1000;

/** Which tags fit a rating: praise for 4–5 stars, problems for 1–2, both for 3. */
export const tagsFor = (rating: number) =>
  rating >= 4 ? { title: 'What stood out?', tags: GOOD_TAGS as readonly string[] }
  : rating === 3 ? { title: 'What went well, and what didn’t?', tags: [...GOOD_TAGS.slice(0, 4), ...BAD_TAGS.slice(0, 4)] as readonly string[] }
  : rating > 0 ? { title: 'What went wrong?', tags: BAD_TAGS as readonly string[] }
  : null;

export const isGoodTag = (t: string) => (GOOD_TAGS as readonly string[]).includes(t);
