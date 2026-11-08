// Pay at drop-off: who received the customer's money (payments.collected_via, set at check-in).
// Migration 20261110000005_pay_at_dropoff_collection.

export type CollectedVia = 'cash' | 'partner_upi' | 'stashinn_qr';

export const COLLECTION_METHODS: { value: CollectedVia; label: string; short: string; hint: string }[] = [
  { value: 'cash', label: 'Cash to you', short: 'Cash to partner', hint: 'You keep the cash and send StashInn its commission + GST after pick-up.' },
  { value: 'partner_upi', label: 'UPI or card to your account', short: 'UPI to partner', hint: 'The money is in your account; send StashInn its commission + GST after pick-up.' },
  { value: 'stashinn_qr', label: 'StashInn QR', short: 'StashInn QR', hint: 'StashInn has the money and pays you your share once the payment is confirmed. Nothing to send.' },
];

export const isCollectedVia = (v: unknown): v is CollectedVia => COLLECTION_METHODS.some(m => m.value === v);
export const collectionLabel = (v?: string | null) => COLLECTION_METHODS.find(m => m.value === v)?.short ?? null;

type Pay = { method?: string | null; status?: string | null; collected_via?: string | null } | null | undefined;

/** Pay at drop-off where the partner holds the money (older bookings with no record count too). */
export const partnerHoldsMoney = (p: Pay) => (p?.method === 'pay_at_location' || p?.method === 'upi') && p?.collected_via !== 'stashinn_qr';

/** StashInn holds the money: paid online, or a confirmed StashInn-QR payment at drop-off. */
export const stashinnHoldsMoney = (p: Pay) =>
  (p?.method === 'razorpay' && (p.status === 'paid' || p.status === 'partially_refunded'))
  || (p?.method === 'pay_at_location' && p.collected_via === 'stashinn_qr' && p.status === 'paid');

/** A StashInn-QR payment the partner recorded that finance hasn't confirmed yet. */
export const qrAwaitingConfirmation = (p: Pay) => p?.method === 'pay_at_location' && p.collected_via === 'stashinn_qr' && p.status === 'pending';
