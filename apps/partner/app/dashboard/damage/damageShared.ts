import { PARTNER_CLAIM_CATEGORIES } from '@stashinn/lib/constants';

export const CLAIM_WINDOW_DAYS = 7;
export const MAX_CLAIM_PHOTOS = 5;

/** A claim can be filed while items are stored, or within 7 days of pick-up. */
export function isClaimable(b: { status: string; actual_checkout?: string | null; end_time: string }, now = Date.now()) {
  if (b.status === 'checked_in') return true;
  if (b.status !== 'checked_out') return false;
  const out = Date.parse(b.actual_checkout || b.end_time);
  return now - out <= CLAIM_WINDOW_DAYS * 864e5;
}

/**
 * Who filed a report and what it's about (same rules as admin Disputes): "[Category] details",
 * where partner categories are PARTNER_CLAIM_CATEGORIES; anything else in brackets, or photos
 * under customer-<id>/, is a customer complaint. Old partner reports have no category.
 */
export function parseReport(description: string, photos: string[] | null) {
  const m = /^\[([^\]]+)\]\s*([\s\S]*)$/.exec(description || '');
  const tag = m?.[1] ?? null;
  const partnerTag = tag && (PARTNER_CLAIM_CATEGORIES as readonly string[]).includes(tag) ? tag : null;
  const fromCustomer = !partnerTag && (!!tag || (photos || []).some(p => p.includes('/customer-')));
  const body = tag ? m![2]!.trim() : (description || '').trim();
  const amount = /\n\nAmount claimed: (₹[\d,.]+)\s*$/.exec(body);
  return {
    source: (fromCustomer ? 'customer' : 'partner') as 'customer' | 'partner',
    category: tag || (fromCustomer ? 'Customer complaint' : 'Damage / incident claim'),
    details: amount ? body.slice(0, amount.index).trim() : body,
    amountClaimed: amount?.[1] ?? null,
  };
}

export const CLAIM_STATUS: Record<string, { label: string; text: string; cls: string }> = {
  submitted: { label: 'Received', text: 'StashInn hasn’t looked at it yet.', cls: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/60' },
  under_review: { label: 'Under review', text: 'StashInn support is looking into it and may contact you.', cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60' },
  escalated: { label: 'Escalated', text: 'Passed to StashInn’s senior team.', cls: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60' },
  resolved_refund: { label: 'Resolved', text: 'Closed with a refund to the customer.', cls: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' },
  resolved_compensated: { label: 'Approved', text: 'StashInn approved your claim and is paying you.', cls: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' },
  resolved_no_action: { label: 'Closed', text: 'Closed without a refund.', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700' },
};
export const isOpenClaim = (s: string) => s === 'submitted' || s === 'under_review' || s === 'escalated';
