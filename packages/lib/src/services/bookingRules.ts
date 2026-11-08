import { BOOKING_DEFAULTS } from '../constants';

/** Platform booking rules, editable in Admin → Configuration (system_config table). */
export interface BookingRules {
  /** Shortest allowed booking, in hours. */
  minHours: number;
  /** Longest allowed booking, in days. */
  maxDays: number;
  /** Cancelling at least this many hours before drop-off gets a full refund. */
  cancellationWindowHours: number;
}

export const BOOKING_RULE_KEYS = {
  minHours: 'booking_min_hours',
  maxDays: 'booking_max_days',
  cancellationWindowHours: 'cancellation_window_hours',
} as const;

const toNumber = (value: unknown, fallback: number) => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/"/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/**
 * Reads the booking rules from system_config, falling back to BOOKING_DEFAULTS for any
 * missing or invalid value. system_config is publicly readable, so any client works.
 */
export async function getBookingRules(supabase: { from: (table: string) => any }): Promise<BookingRules> {
  const { data } = await supabase
    .from('system_config')
    .select('key, value')
    .in('key', Object.values(BOOKING_RULE_KEYS));

  const values = Object.fromEntries(((data as { key: string; value: unknown }[]) || []).map(r => [r.key, r.value]));
  return {
    minHours: Math.max(1, toNumber(values[BOOKING_RULE_KEYS.minHours], BOOKING_DEFAULTS.minHours)),
    maxDays: Math.max(1, toNumber(values[BOOKING_RULE_KEYS.maxDays], BOOKING_DEFAULTS.maxDays)),
    cancellationWindowHours: toNumber(values[BOOKING_RULE_KEYS.cancellationWindowHours], BOOKING_DEFAULTS.cancellationWindowHours),
  };
}

/** Returns a customer-facing reason when a booking length breaks the rules, else null. */
export function bookingLengthError(start: Date, end: Date, rules: BookingRules): string | null {
  const hours = (end.getTime() - start.getTime()) / 3_600_000;
  if (!(hours > 0)) return 'Pick-up must be after drop-off.';
  if (hours < rules.minHours) return `Bookings must be at least ${rules.minHours} hour${rules.minHours === 1 ? '' : 's'}.`;
  if (hours > rules.maxDays * 24) return `Bookings can be at most ${rules.maxDays} day${rules.maxDays === 1 ? '' : 's'}.`;
  return null;
}
