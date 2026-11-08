// Admin review moderation: removal reasons and what makes a review need a look.

export const REMOVAL_REASONS = [
  { value: 'personal_info', label: 'Shares personal details', customer: 'shared personal details such as a phone number or address' },
  { value: 'abusive', label: 'Abusive or offensive', customer: 'contained abusive or offensive language' },
  { value: 'off_topic', label: 'Spam or not about the stay', customer: 'wasn’t about your storage experience' },
  { value: 'wrong_place', label: 'About the wrong location or booking', customer: 'seemed to be about a different location or booking' },
  { value: 'customer_request', label: 'Customer asked to remove it', customer: 'you asked us to remove it' },
  { value: 'other', label: 'Something else', customer: 'didn’t meet our review guidelines' },
] as const;

// Matches the customer review form's quick tags (apps/customer/app/dashboard/review/[id]/reviewShared.ts)
export const GOOD_TAGS = new Set(['Easy to find', 'Friendly staff', 'Quick drop-off', 'Quick pick-up', 'Felt secure', 'Clean space', 'Good value', 'Flexible with timing']);
export const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

const PHONE = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/;
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const LINK = /\b(?:https?:\/\/|www\.)\S+|\b\S+\.(?:com|in|net|org|io|co)\b/i;
const ABUSE = /\b(?:fuck|shit|bitch|bastard|idiot|stupid|scam(?:mer)?s?|fraud|chutiya|madarchod|bhenchod|harami|kutta)\b/i;

/** Why a review might need a moderator: contact details, links, strong language, or a very low rating. */
export function flagsFor(r: { rating: number; comment?: string | null }) {
  const c = r.comment || '';
  const out: string[] = [];
  if (PHONE.test(c)) out.push('Phone number');
  if (EMAIL.test(c)) out.push('Email address');
  if (LINK.test(c.replace(new RegExp(EMAIL.source, 'gi'), ''))) out.push('Link');
  if (ABUSE.test(c)) out.push('Strong language');
  if (r.rating === 1) out.push('1 star');
  return out;
}
