// Server-only helpers shared by the dispute and booking-change actions (import only from
// server actions: it uses the service role).
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { sendSMS } from '@stashinn/lib/services/messaging';
import { ExternalNotificationService } from '@stashinn/lib/services/notifications';
import { emailLayout } from '@stashinn/lib/services/bookingEmails';
import { isPaidOnline, livePayment, refundableAmount, refundOnlinePayment } from '@stashinn/lib/services/bookingLifecycle';
import { disputeRef, isOpen, parseReport } from './disputeShared';

export type Db = ReturnType<typeof createServiceClient>;

export const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const round2 = (n: number) => Math.round(n * 100) / 100;
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Payments and refunds live in the shared booking lifecycle service
export const currentPayment = livePayment;
export const paidOnline = isPaidOnline;
export const refundable = refundableAmount;

/**
 * Refunds part of an online payment through Razorpay and records it on the payment.
 * Returns 'offline' when the booking wasn't paid online (nothing to send back automatically).
 */
export async function refundBooking(db: Db, bookingId: string, amount: number, label: string): Promise<{ kind: 'online'; id: string } | { kind: 'offline' } | { error: string }> {
  const r = await refundOnlinePayment(db, bookingId, amount, label);
  if ('error' in r) return r;
  return r.kind === 'online' ? { kind: 'online', id: r.id } : { kind: 'offline' };
}

/**
 * Loads a dispute that lets an admin change its booking: raised by the customer and still
 * open. Booking changes are only made at the customer's request.
 */
export async function loadCustomerCase(db: Db, disputeId: string) {
  const { data: d } = await db
    .from('damage_reports')
    .select('id, booking_id, status, description, photos, customer_id, partner_id, refund_amount')
    .eq('id', disputeId)
    .maybeSingle();
  if (!d) return { error: 'That dispute no longer exists.' } as const;
  if (parseReport(d.description, d.photos).source !== 'customer') return { error: 'Bookings can only be changed for a concern the customer raised.' } as const;
  if (!isOpen(d.status)) return { error: 'This dispute is closed. Reopen it (Start review) before changing the booking.' } as const;

  const { data: booking } = await db
    .from('bookings')
    .select('id, status, booking_type, location_id, num_bags, vehicle_type, vehicle_make, vehicle_model, vehicle_license_plate, start_time, end_time, total_amount, gst_rate, commission_rate, customer_id, partner_id')
    .eq('id', d.booking_id)
    .maybeSingle();
  if (!booking || booking.customer_id !== d.customer_id) return { error: 'The booking for this dispute wasn’t found.' } as const;
  return { dispute: d, booking } as const;
}

export type Message = { title: string; text: string; label?: string };

/** In-app + email (and optionally SMS) to the customer and the partner of a booking. */
export async function sendToParties(
  db: Db,
  ids: { customerId: string; partnerId: string },
  msgs: { customer?: Message; partner?: Message; note?: string; sms?: boolean; category?: 'booking' | 'payment' | 'damage' | 'system'; partnerPath?: string },
) {
  const [{ data: customer }, { data: partner }] = await Promise.all([
    db.from('users').select('id, full_name, email, phone').eq('id', ids.customerId).maybeSingle(),
    db.from('partners').select('user_id, business_name, users!partners_user_id_fkey(full_name, email)').eq('id', ids.partnerId).maybeSingle(),
  ]);
  const partnerUser = (Array.isArray(partner?.users) ? partner?.users[0] : partner?.users) as any;
  const note = msgs.note?.trim();

  const html = (name: string, m: Message, url: string) => emailLayout(`
    ${m.label ? `<p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#f97316;">${esc(m.label)}</p>` : ''}
    <h1 style="margin:0 0 14px;font-size:20px;color:#111827;">${esc(m.title)}</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Hi ${esc(name)},</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;white-space:pre-line;">${esc(m.text)}</p>
    ${note ? `<div style="margin:16px 0;padding:14px 16px;background:#f9fafb;border-left:3px solid #f97316;border-radius:8px;font-size:14px;line-height:1.6;color:#374151;"><strong>Note from StashInn:</strong> ${esc(note)}</div>` : ''}
    <p style="margin:20px 0 0;"><a href="${url}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:10px;">View details</a></p>`);

  const customerBase = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3000';
  const partnerBase = process.env.NEXT_PUBLIC_PARTNER_URL || 'http://localhost:3001';
  const suffix = note ? `\n\nNote from StashInn: ${note}` : '';
  const jobs: Promise<unknown>[] = [];

  if (customer && msgs.customer) {
    const m = msgs.customer;
    jobs.push(Promise.resolve(db.from('notifications').insert({ user_id: customer.id, title: m.title, message: m.text + suffix, category: msgs.category || 'system', action_url: '/dashboard' })));
    if (customer.email) jobs.push(ExternalNotificationService.sendEmail(customer.email, `${m.title} · StashInn`, html(customer.full_name || 'there', m, `${customerBase}/dashboard`)));
    if (msgs.sms && customer.phone) jobs.push(sendSMS({ to: customer.phone, message: `StashInn: ${m.text}` }));
  }
  if (partner?.user_id && msgs.partner) {
    const m = msgs.partner;
    const path = msgs.partnerPath || '/dashboard/bookings';
    jobs.push(Promise.resolve(db.from('notifications').insert({ user_id: partner.user_id, title: m.title, message: m.text + suffix, category: msgs.category || 'booking', action_url: path })));
    if (partnerUser?.email) jobs.push(ExternalNotificationService.sendEmail(partnerUser.email, `${m.title} · StashInn`, html(partnerUser.full_name || partner.business_name || 'there', m, `${partnerBase}${path}`)));
  }
  await Promise.allSettled(jobs);
}

export async function audit(db: Db, adminId: string | null | undefined, action: string, entityType: string, entityId: string, oldValues: object, newValues: object) {
  await db.from('audit_logs').insert({ user_id: adminId ?? null, action, entity_type: entityType, entity_id: entityId, old_values: oldValues, new_values: newValues });
}

export { disputeRef };
