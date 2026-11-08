import { vehicleLabel } from '@stashinn/lib/services/bookingAvailability';

/** Booking statuses shown in each tab of My bookings. */
export const TABS = [
  { id: 'all', label: 'All', statuses: null },
  { id: 'active', label: 'Active', statuses: ['pending', 'confirmed', 'checked_in'] },
  { id: 'past', label: 'Completed', statuses: ['checked_out'] },
  { id: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
] as const;
export type TabId = (typeof TABS)[number]['id'];

/** The partner has confirmed: the exact address, contact and codes can be shown. */
const DETAILS_SHOWN = ['confirmed', 'checked_in', 'checked_out'];

const IST = 'Asia/Kolkata';
const day = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: IST });
const time = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST });

export type PaymentView = { label: string; amount: number; tone: 'paid' | 'due' | 'refund' | 'muted' | 'failed'; note?: string };

/**
 * What the customer owes or has paid. Pay-at-drop-off bookings keep a "pending" payment row
 * until the partner settles with StashInn, so the booking status decides the label there.
 */
export function paymentView(booking: any): PaymentView {
  const total = Number(booking.total_amount) || 0;
  const pay = (Array.isArray(booking.payments) ? booking.payments : [booking.payments]).filter(Boolean)[0];
  const refunded = Number(pay?.refund_amount) || 0;
  const online = pay?.method === 'razorpay';

  if (pay?.status === 'refunded' || pay?.status === 'partially_refunded' || refunded > 0) {
    return { label: refunded >= total ? 'Refunded' : 'Partly refunded', amount: refunded || total, tone: 'refund', note: `of ₹${total.toFixed(2)} paid online` };
  }
  if (online) {
    if (pay?.status === 'paid') return { label: 'Paid online', amount: total, tone: 'paid' };
    if (pay?.status === 'failed') return { label: 'Payment failed', amount: total, tone: 'failed' };
    if (booking.status === 'cancelled') return { label: 'Nothing charged', amount: 0, tone: 'muted' };
    return { label: 'Payment pending', amount: total, tone: 'due' };
  }
  // Paid in person at drop-off
  if (booking.status === 'cancelled') return { label: 'Nothing to pay', amount: 0, tone: 'muted', note: 'Cancelled before drop-off' };
  if (booking.status === 'checked_in' || booking.status === 'checked_out') return { label: 'Paid at drop-off', amount: total, tone: 'paid' };
  return { label: 'Due at drop-off', amount: total, tone: 'due', note: 'Pay by UPI or cash when you drop off' };
}

export type BookingCard = ReturnType<typeof bookingCard>;

/** Everything a booking card shows, prepared on the server so hidden details never reach the browser. */
export function bookingCard(b: any, opts: { contact: { name: string; phone: string | null } | null; reviewed: boolean; cancelWindowHours: number }) {
  const loc = b.partner_locations || {};
  const start = new Date(b.start_time);
  const end = new Date(b.end_time);
  const hours = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 3_600_000));
  const confirmed = DETAILS_SHOWN.includes(b.status);
  const freeUntil = new Date(start.getTime() - opts.cancelWindowHours * 3_600_000);
  const isGarage = b.booking_type === 'garage';

  return {
    id: b.id as string,
    ref: String(b.id).split('-')[0]!.toUpperCase(),
    status: b.status as string,
    createdAt: b.created_at as string,
    startAt: b.start_time as string,
    locationId: b.location_id as string,
    name: (loc.name as string) || 'StashInn location',
    area: [loc.city, loc.state].filter(Boolean).join(', '),
    photo: (loc.photos?.[0] as string) || null,
    // Shown only once the partner has confirmed
    address: confirmed ? [loc.address_line1, loc.address_line2, loc.city, loc.state, loc.pincode].filter(Boolean).join(', ') : null,
    directions: confirmed && loc.latitude && loc.longitude ? `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}` : null,
    contact: confirmed ? opts.contact : null,
    code: b.status === 'confirmed' ? (b.checkin_otp as string | null) : b.status === 'checked_in' ? (b.checkout_otp as string | null) : null,
    dropOff: { day: day(start), time: time(start) },
    pickUp: { day: day(end), time: time(end) },
    hours,
    items: isGarage ? `1 × ${vehicleLabel(b.vehicle_type)}${b.vehicle_license_plate ? ` · ${b.vehicle_license_plate}` : ''}` : `${b.num_bags} bag${b.num_bags === 1 ? '' : 's'}`,
    isGarage,
    payment: paymentView(b),
    canCancel: b.status === 'pending' || b.status === 'confirmed',
    freeCancel: Date.now() < freeUntil.getTime(),
    freeCancelUntil: `${day(freeUntil)}, ${time(freeUntil)}`,
    cancelWindowHours: opts.cancelWindowHours,
    cancellationReason: b.status === 'cancelled' ? ((b.cancellation_reason as string) || null) : null,
    canReview: b.status === 'checked_out' && !opts.reviewed,
    reviewed: opts.reviewed,
  };
}
