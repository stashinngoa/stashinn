// Reasons a partner can give for pausing bookings at a location (location_pauses.reason)
export const PAUSE_REASONS = [
  { value: 'maintenance', label: 'Maintenance or repairs' },
  { value: 'renovation', label: 'Renovation' },
  { value: 'holiday', label: 'Holiday / closed' },
  { value: 'staff', label: 'Staff unavailable' },
  { value: 'event', label: 'Private event' },
  { value: 'other', label: 'Other' },
] as const;

export const pauseReasonLabel = (value: string) => PAUSE_REASONS.find(r => r.value === value)?.label ?? value;

/** The pause in effect right now, if any. */
export const activePause = <T extends { starts_at: string; ends_at: string }>(pauses: T[] | null | undefined, now = new Date()) =>
  (pauses || []).find(p => new Date(p.starts_at) <= now && new Date(p.ends_at) > now) ?? null;
