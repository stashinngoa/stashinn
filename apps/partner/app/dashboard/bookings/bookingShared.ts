// Shared by the partner booking list, booking page and actions (no server-only imports here).

export const IST = 'Asia/Kolkata';

export const ref = (id: string) => id.split('-')[0]!.toUpperCase();
export const dayKey = (d: Date | string) => new Date(d).toLocaleDateString('en-CA', { timeZone: IST });
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST });
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: IST });
export const fmtDateTime = (iso: string) => `${fmtDay(iso)}, ${fmtTime(iso)}`;
export const inr = (n: number | string | null | undefined) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** "Today, 3:00 pm" / "Tomorrow, 9:30 am" / "Mon, 9 Nov, 3:00 pm" in India time. */
export function whenLabel(iso: string, now = new Date()) {
  const d = dayKey(iso);
  if (d === dayKey(now)) return `Today, ${fmtTime(iso)}`;
  if (d === dayKey(new Date(now.getTime() + 864e5))) return `Tomorrow, ${fmtTime(iso)}`;
  if (d === dayKey(new Date(now.getTime() - 864e5))) return `Yesterday, ${fmtTime(iso)}`;
  return fmtDateTime(iso);
}

/** "2 h 30 min", "3 days 4 h" */
export function durationLabel(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60000));
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (days) return `${days} day${days === 1 ? '' : 's'}${hours ? ` ${hours} h` : ''}`;
  if (hours) return `${hours} h${m ? ` ${m} min` : ''}`;
  return `${m} min`;
}

export const VEHICLE: Record<string, string> = { bike: 'Bike / scooter', car: 'Car', suv: 'SUV' };

/** What is being stored: "3 bags" or "Honda City · MH01AB1234". */
export function itemsLabel(b: { booking_type?: string | null; num_bags?: number | null; vehicle_make?: string | null; vehicle_model?: string | null; vehicle_license_plate?: string | null; vehicle_type?: string | null }) {
  if (b.booking_type === 'garage') {
    const name = [b.vehicle_make, b.vehicle_model].filter(Boolean).join(' ') || VEHICLE[b.vehicle_type || ''] || 'Vehicle';
    return b.vehicle_license_plate ? `${name} · ${b.vehicle_license_plate}` : name;
  }
  const n = Number(b.num_bags) || 1;
  return `${n} bag${n === 1 ? '' : 's'}`;
}

export const PAYMENT_METHOD: Record<string, string> = {
  razorpay: 'Paid online',
  upi: 'UPI at location',
  pay_at_location: 'Pay at drop-off',
};

export type Tone = 'amber' | 'sky' | 'emerald' | 'red' | 'gray' | 'orange' | 'violet';
export const TONE: Record<Tone, string> = {
  amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
  sky: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/60',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
  red: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60',
  gray: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/60',
  violet: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800/60',
};

const CANCELLED: Record<string, string> = {
  no_show: 'No-show',
  partner: 'Declined',
  partner_no_response: 'Auto-cancelled',
  customer: 'Cancelled by customer',
  admin: 'Cancelled by StashInn',
};

/** The status a partner sees, including the states the enum doesn't have (overdue, no-show). */
export function statusOf(b: { status: string; end_time: string; start_time: string; cancellation_code?: string | null }, now = new Date()): { label: string; tone: Tone } {
  switch (b.status) {
    case 'pending': return { label: 'Needs response', tone: 'amber' };
    case 'confirmed':
      return new Date(b.start_time) < now ? { label: 'Not dropped off', tone: 'orange' } : { label: 'Confirmed', tone: 'sky' };
    case 'checked_in':
      return new Date(b.end_time) < now ? { label: 'Pick-up overdue', tone: 'red' } : { label: 'Stored', tone: 'emerald' };
    case 'checked_out': return { label: 'Completed', tone: 'gray' };
    case 'cancelled': return { label: CANCELLED[b.cancellation_code || ''] || 'Cancelled', tone: b.cancellation_code === 'no_show' ? 'orange' : 'gray' };
    case 'disputed': return { label: 'Disputed', tone: 'violet' };
    default: return { label: b.status.replace(/_/g, ' '), tone: 'gray' };
  }
}

export const TABS = [
  { key: 'active', label: 'Active', statuses: ['pending', 'confirmed', 'checked_in'] },
  { key: 'pending', label: 'Needs response', statuses: ['pending'] },
  { key: 'confirmed', label: 'Upcoming', statuses: ['confirmed'] },
  { key: 'checked_in', label: 'Stored', statuses: ['checked_in'] },
  { key: 'checked_out', label: 'Completed', statuses: ['checked_out'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled', 'disputed'] },
  { key: 'all', label: 'All', statuses: [] as string[] },
] as const;
export type TabKey = (typeof TABS)[number]['key'];
export const tabFor = (key?: string | null) => TABS.find(t => t.key === key) ?? TABS[0];

export const DECLINE_REASONS = [
  { value: 'full', label: 'No space for these times' },
  { value: 'closed', label: 'We’re closed at drop-off or pick-up' },
  { value: 'items', label: 'We can’t store these items' },
  { value: 'other', label: 'Something else' },
] as const;
