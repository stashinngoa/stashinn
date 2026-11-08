// Shared dispute labels, colours and helpers (page, workspace and server action)

import { PARTNER_CLAIM_CATEGORIES } from '@stashinn/lib/constants';

export const DISPUTE_STATUSES = ['submitted', 'under_review', 'escalated', 'resolved_refund', 'resolved_compensated', 'resolved_no_action'] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const DISPUTE_STATUS: Record<DisputeStatus, { label: string; short: string; badge: string; dot: string; hint: string }> = {
  submitted: {
    label: 'New', short: 'New',
    badge: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-700/50',
    dot: 'bg-sky-500', hint: 'Not looked at yet',
  },
  under_review: {
    label: 'Under review', short: 'Reviewing',
    badge: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/50',
    dot: 'bg-amber-500', hint: 'Being investigated',
  },
  escalated: {
    label: 'Escalated', short: 'Escalated',
    badge: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700/50',
    dot: 'bg-red-500', hint: 'Sent to senior / legal review',
  },
  resolved_refund: {
    label: 'Resolved · refund', short: 'Refunded',
    badge: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/50',
    dot: 'bg-emerald-500', hint: 'Closed with money back to the customer',
  },
  resolved_compensated: {
    label: 'Resolved · partner paid', short: 'Partner paid',
    badge: 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-700/50',
    dot: 'bg-teal-500', hint: 'Partner’s claim approved; StashInn pays them',
  },
  resolved_no_action: {
    label: 'Resolved · no action', short: 'Closed',
    badge: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
    dot: 'bg-gray-400', hint: 'Closed without a refund',
  },
};

export const isDisputeStatus = (s: string): s is DisputeStatus => (DISPUTE_STATUSES as readonly string[]).includes(s);
export const disputeStatusOf = (s: string) => (isDisputeStatus(s) ? DISPUTE_STATUS[s] : DISPUTE_STATUS.submitted);
export const isOpen = (s: string) => s === 'submitted' || s === 'under_review' || s === 'escalated';

/** Categories the customer can pick when filing (apps/customer/app/dashboard/disputes/ReportForm.tsx). */
export const CUSTOMER_CATEGORIES = [
  'Damage to my items', 'Missing items', 'Overcharged or payment issue',
  'Location closed or refused my booking', 'Staff or service problem', 'Something else',
];

/**
 * Who filed the report and what it's about. Both sides save "[Category] details": customer
 * categories are CUSTOMER_CATEGORIES, partner ones PARTNER_CLAIM_CATEGORIES. Customer photos sit
 * under customer-<id>/. Older partner reports have no category.
 */
export function parseReport(description: string, photos: string[] | null) {
  const m = /^\[([^\]]+)\]\s*([\s\S]*)$/.exec(description || '');
  const tag = m?.[1] ?? '';
  const customerCategory = CUSTOMER_CATEGORIES.includes(tag) ? tag : null;
  const partnerCategory = (PARTNER_CLAIM_CATEGORIES as readonly string[]).includes(tag) ? tag : null;
  const fromCustomer = !!customerCategory || (!partnerCategory && (photos || []).some(p => p.includes('/customer-')));
  return {
    source: (fromCustomer ? 'customer' : 'partner') as 'customer' | 'partner',
    category: customerCategory || partnerCategory || (fromCustomer ? 'Customer complaint' : 'Damage / incident claim'),
    details: customerCategory || partnerCategory ? m![2]!.trim() : (description || '').trim(),
  };
}

export const disputeRef = (bookingId: string) => bookingId.split('-')[0]!.toUpperCase();

/** Which final decisions fit who filed: customers can be refunded, partners compensated. */
export const decisionFits = (status: string, source: 'customer' | 'partner') =>
  !(status === 'resolved_refund' && source === 'partner') && !(status === 'resolved_compensated' && source === 'customer');

/** Largest award an admin can grant on one partner claim, in rupees. */
export const MAX_PARTNER_AWARD = 100000;
