// Shared booking status labels and colours (dashboard + bookings ledger)

export const BOOKING_STATUSES = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'disputed'] as const;

export const STATUS: Record<string, { label: string; badge: string; dot: string; bar: string }> = {
  pending: { label: 'Pending', badge: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/50', dot: 'bg-amber-500', bar: 'bg-amber-400' },
  confirmed: { label: 'Confirmed', badge: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-700/50', dot: 'bg-sky-500', bar: 'bg-sky-500' },
  checked_in: { label: 'Checked in', badge: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/50', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  checked_out: { label: 'Completed', badge: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700', dot: 'bg-gray-400', bar: 'bg-gray-400 dark:bg-gray-500' },
  cancelled: { label: 'Cancelled', badge: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700/50', dot: 'bg-red-500', bar: 'bg-red-500' },
  disputed: { label: 'Disputed', badge: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-700/50', dot: 'bg-orange-600', bar: 'bg-orange-600' },
};
export const statusOf = (s: string) =>
  STATUS[s] ?? { label: s.replace(/_/g, ' '), badge: STATUS.checked_out!.badge, dot: 'bg-gray-400', bar: 'bg-gray-300' };

