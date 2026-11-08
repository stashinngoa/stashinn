// Partner account status labels and colours, shared by the partners list and detail pages
export const PARTNER_STATUSES = {
  pending: { label: 'Pending review', dot: 'bg-amber-500', badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-700/50' },
  approved: { label: 'Live', dot: 'bg-emerald-500', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/50' },
  suspended: { label: 'Suspended', dot: 'bg-orange-600', badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-700/50' },
  rejected: { label: 'Rejected', dot: 'bg-red-500', badge: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400 border-red-200 dark:border-red-700/50' },
} as const;
export type PartnerStatus = keyof typeof PARTNER_STATUSES;

// Admin review status of a single location (partner_locations.admin_status)
export const LOCATION_STATUSES: Record<string, { label: string; dot: string; badge: string }> = {
  pending: { label: 'Pending review', dot: 'bg-amber-500', badge: PARTNER_STATUSES.pending.badge },
  update_required: { label: 'Info requested', dot: 'bg-sky-500', badge: 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-400 border-sky-200 dark:border-sky-700/50' },
  approved: { label: 'Live', dot: 'bg-emerald-500', badge: PARTNER_STATUSES.approved.badge },
  suspended: { label: 'Suspended', dot: 'bg-orange-600', badge: PARTNER_STATUSES.suspended.badge },
  rejected: { label: 'Rejected', dot: 'bg-red-500', badge: PARTNER_STATUSES.rejected.badge },
};
