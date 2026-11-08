// Shared helpers for the partner location pages

export const LOCATION_STATUS: Record<string, { label: string; hint: string; cls: string; dot: string }> = {
  approved: { label: 'Live', hint: 'Customers can book this location.', dot: 'bg-emerald-500', cls: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' },
  pending: { label: 'Under review', hint: 'StashInn is reviewing this location.', dot: 'bg-amber-500', cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60' },
  update_required: { label: 'Changes requested', hint: 'Update the details below and save to send it back for review.', dot: 'bg-sky-500', cls: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/60' },
  suspended: { label: 'Suspended', hint: 'Not taking new bookings. Contact support for details.', dot: 'bg-orange-600', cls: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/60' },
  rejected: { label: 'Not approved', hint: 'Fix the issues noted and save to send it back for review.', dot: 'bg-red-500', cls: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60' },
};
export const locationStatus = (s: string | null | undefined) => LOCATION_STATUS[s || 'pending'] ?? LOCATION_STATUS.pending!;

export const vehiclePricing = (loc: any) => (Array.isArray(loc.vehicle_pricing) ? loc.vehicle_pricing[0] : loc.vehicle_pricing) || {};

export const inr = (n: number | string | null | undefined) =>
  n == null || n === '' ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** Hours open per day from operating_hours {open:"08:00", close:"22:00"}; closing after midnight wraps. */
export const hoursOpen = (oh: any): number | null => {
  const toMin = (t?: string) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(t || '');
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const open = toMin(oh?.open), close = toMin(oh?.close);
  if (open == null || close == null) return null;
  return (close > open ? close - open : close + 1440 - open) / 60;
};

export const fmtTime12 = (t?: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || '');
  if (!m) return '—';
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
};

export const capacitySummary = (loc: any) => {
  if (loc.location_type !== 'garage') return `${loc.max_bags} bags`;
  const vp = vehiclePricing(loc);
  return `${vp.bike_capacity ?? 0} bikes · ${vp.sedan_capacity ?? 0} cars · ${vp.suv_capacity ?? 0} SUVs`;
};
