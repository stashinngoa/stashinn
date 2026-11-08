'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { checkAvailability, parseIndiaTime, splitAmount } from '@stashinn/lib/services/bookingAvailability';
import { bookingLengthError, getBookingRules } from '@stashinn/lib/services/bookingRules';
import { getAdminContext, requireAccess } from '../../../lib/adminAccess';
import { disputeRef } from './disputeShared';
import { audit, currentPayment, loadCustomerCase, money, paidOnline, refundBooking, refundable, round2, sendToParties, type Db } from './disputeServer';

type Fail = { ok: false; error: string };

const when = (d: Date | string) =>
  new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

async function guard(): Promise<Fail | null> {
  try {
    await requireAccess('/dashboard/disputes');
    return null;
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export type ChangePreview = {
  ok: true;
  oldTotal: number;
  newTotal: number;
  /** Today's price for the new details (whether or not it's used). */
  newPrice: number;
  hours: number;
  paidOnline: boolean;
  /** What the customer gets back (online payment, cheaper booking). */
  refund: number;
  /** Set when the change can't be saved with the chosen pricing. */
  blocker: string | null;
};

type Change = {
  db: Db;
  c: Extract<Awaited<ReturnType<typeof loadCustomerCase>>, { booking: unknown }>;
  start: Date;
  end: Date;
  bags: number;
  make: string;
  model: string;
  plate: string;
  reprice: boolean;
};

/** Reads and checks the requested change: rules, availability and the money side. */
async function evaluate(fd: FormData): Promise<Fail | (ChangePreview & { change: Change })> {
  const db = createServiceClient();
  const c = await loadCustomerCase(db, String(fd.get('dispute_id') || ''));
  if ('error' in c) return { ok: false, error: c.error! };
  const b = c.booking;

  const checkedIn = b.status === 'checked_in';
  if (!['pending', 'confirmed', 'checked_in'].includes(b.status)) return { ok: false, error: `A ${b.status.replace(/_/g, ' ')} booking can’t be changed.` };

  // Once the items are in, only the pick-up time can move
  const start = checkedIn ? new Date(b.start_time) : parseIndiaTime(String(fd.get('start') || ''));
  const end = parseIndiaTime(String(fd.get('end') || ''));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { ok: false, error: 'Enter valid drop-off and pick-up times.' };
  if (!checkedIn && start.getTime() < Date.now() - 15 * 60_000) return { ok: false, error: 'The new drop-off time is in the past.' };
  if (end.getTime() < Date.now()) return { ok: false, error: 'The new pick-up time is in the past.' };

  const lengthError = bookingLengthError(start, end, await getBookingRules(db));
  if (lengthError) return { ok: false, error: lengthError };

  const garage = b.booking_type === 'garage';
  const bags = garage ? 1 : Math.floor(Number(fd.get('bags')) || 0);
  if (!garage && (bags < 1 || bags > 50)) return { ok: false, error: 'Enter how many bags (1 or more).' };
  if (!garage && checkedIn && bags !== b.num_bags) return { ok: false, error: 'The number of bags can’t change after check-in.' };
  const make = String(fd.get('vehicle_make') ?? b.vehicle_make ?? '').trim();
  const model = String(fd.get('vehicle_model') ?? b.vehicle_model ?? '').trim();
  const plate = String(fd.get('vehicle_plate') ?? b.vehicle_license_plate ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
  if (garage && !plate) return { ok: false, error: 'Enter the vehicle number plate.' };

  const check = await checkAvailability(db, {
    locationId: b.location_id,
    mode: garage ? 'garage' : 'luggage',
    vehicleType: b.vehicle_type,
    bags,
    start,
    end,
    excludeBookingId: b.id,
  });
  if (!check.ok) return { ok: false, error: check.reason };

  const reprice = fd.get('pricing') === 'reprice';
  const oldTotal = Number(b.total_amount) || 0;
  const newPrice = round2(check.quote.total);
  const newTotal = reprice ? newPrice : oldTotal;

  const payment = await currentPayment(db, b.id);
  const online = paidOnline(payment);
  let refund = 0;
  let blocker: string | null = null;
  if (online && newTotal > oldTotal) {
    blocker = `This booking was paid online (${money(oldTotal)}), and the new price is higher. Keep the original price, or cancel and ask the customer to rebook.`;
  } else if (online && newTotal < oldTotal) {
    refund = Math.min(round2(oldTotal - newTotal), refundable(payment));
  }

  return {
    ok: true, oldTotal, newTotal, hours: check.quote.hours, paidOnline: online, refund, blocker, newPrice,
    change: { db, c, start, end, bags, make, model, plate, reprice },
  };
}

/** Price and availability for a proposed change, without saving anything. */
export async function previewBookingChange(fd: FormData): Promise<ChangePreview | Fail> {
  const denied = await guard();
  if (denied) return denied;
  const r = await evaluate(fd);
  if (!r.ok) return r;
  const { change: _change, ...preview } = r;
  return preview;
}

/**
 * Changes a booking at the customer's request (an open dispute they raised): new times,
 * bag count or vehicle details. The price is kept, or recalculated; a cheaper online-paid
 * booking refunds the difference.
 */
export async function adminUpdateBooking(fd: FormData): Promise<{ ok: true; message: string } | Fail> {
  const denied = await guard();
  if (denied) return denied;
  const note = String(fd.get('note') || '').trim();
  if (note.length < 10) return { ok: false, error: 'Add a short note on what the customer asked for (at least 10 characters). Both sides will see it.' };

  const r = await evaluate(fd);
  if (!r.ok) return r;
  if (r.blocker) return { ok: false, error: r.blocker };
  const { db, c, start, end, bags, make, model, plate } = r.change;
  const b = c.booking;
  const { user: admin } = await getAdminContext();
  const ref = disputeRef(b.id);

  const changes: Record<string, unknown> = {
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    ...(b.booking_type === 'garage'
      ? { vehicle_make: make || null, vehicle_model: model || null, vehicle_license_plate: plate || null }
      : { num_bags: bags }),
  };
  if (r.newTotal !== r.oldTotal) {
    const split = splitAmount(r.newTotal, Number(b.gst_rate) || 0, Number(b.commission_rate) || 0);
    Object.assign(changes, {
      total_amount: r.newTotal, base_amount: split.taxable, gst_amount: split.gst,
      commission_amount: split.commission, partner_amount: split.partner,
    });
  }

  const what: string[] = [];
  if (+start !== +new Date(b.start_time) || +end !== +new Date(b.end_time)) what.push(`times: ${when(start)} → ${when(end)}`);
  if (b.booking_type !== 'garage' && bags !== b.num_bags) what.push(`bags: ${b.num_bags} → ${bags}`);
  if (b.booking_type === 'garage' && (make !== (b.vehicle_make || '') || model !== (b.vehicle_model || '') || plate !== (b.vehicle_license_plate || ''))) {
    what.push(`vehicle: ${[make, model].filter(Boolean).join(' ')} ${plate}`.trim());
  }
  if (r.newTotal !== r.oldTotal) what.push(`price: ${money(r.oldTotal)} → ${money(r.newTotal)}`);
  if (!what.length) return { ok: false, error: 'Nothing has changed.' };

  // Money back first, so a failed refund leaves the booking as it was
  let refundLine = '';
  if (r.refund > 0) {
    const rf = await refundBooking(db, b.id, r.refund, `booking change ${ref}`);
    if ('error' in rf) return { ok: false, error: `${rf.error} The booking wasn’t changed.` };
    refundLine = ` ${money(r.refund)} refunded through Razorpay.`;
  }

  const { data: updated, error } = await db.from('bookings').update(changes).eq('id', b.id).eq('status', b.status).select('id');
  if (error) return { ok: false, error: `Couldn’t save: ${error.message}` };
  if (!updated?.length) return { ok: false, error: 'The booking changed while you were editing it. Refresh and try again.' };

  // Pay-at-location: the amount to collect follows the new price
  if (r.newTotal !== r.oldTotal) {
    await db.from('payments').update({ amount: r.newTotal, updated_at: new Date().toISOString() })
      .eq('booking_id', b.id).eq('status', 'pending').neq('method', 'razorpay');
  }

  await audit(db, admin?.id, 'booking.updated_by_admin', 'bookings', b.id,
    { start_time: b.start_time, end_time: b.end_time, num_bags: b.num_bags, vehicle_license_plate: b.vehicle_license_plate, total_amount: b.total_amount },
    { ...changes, dispute_id: c.dispute.id, note });
  await audit(db, admin?.id, 'dispute.booking_changed', 'damage_reports', c.dispute.id, {}, { status: c.dispute.status, admin_notes: `Booking changed (${what.join('; ')}). ${note}` });

  const summary = what.map(w => `• ${w.charAt(0).toUpperCase()}${w.slice(1)}`).join('\n');
  await sendToParties(db, { customerId: b.customer_id, partnerId: b.partner_id }, {
    customer: { label: 'Booking updated', title: `Your booking #${ref} has been updated`, text: `As you asked, we’ve updated your booking:\n${summary}${refundLine ? `\n\n${money(r.refund)} has been refunded to your original payment method.` : ''}` },
    partner: { label: 'Booking updated', title: `Booking #${ref} was changed by StashInn`, text: `At the customer’s request, StashInn support changed booking #${ref}:\n${summary}` },
    note,
    sms: true,
    category: 'booking',
  });

  revalidatePath('/dashboard/disputes');
  revalidatePath('/dashboard/bookings');
  return { ok: true, message: `Booking updated.${refundLine} Customer and partner notified.` };
}

/**
 * Cancels a booking at the customer's request (an open dispute they raised), with a full,
 * partial or no refund. Optionally closes the dispute with the same note.
 */
export async function adminCancelBooking(fd: FormData): Promise<{ ok: true; message: string } | Fail> {
  const denied = await guard();
  if (denied) return denied;
  const note = String(fd.get('note') || '').trim();
  if (note.length < 10) return { ok: false, error: 'Add a short reason (at least 10 characters). Both sides will see it.' };

  const db = createServiceClient();
  const c = await loadCustomerCase(db, String(fd.get('dispute_id') || ''));
  if ('error' in c) return { ok: false, error: c.error! };
  const b = c.booking;
  if (!['pending', 'confirmed'].includes(b.status)) {
    return { ok: false, error: b.status === 'checked_in' ? 'The items are already checked in. Shorten the booking instead, or check out with the partner first.' : `A ${b.status.replace(/_/g, ' ')} booking can’t be cancelled.` };
  }

  const payment = await currentPayment(db, b.id);
  const online = paidOnline(payment);
  const max = refundable(payment);
  const mode = String(fd.get('refund') || 'full');
  const refund = !online ? 0 : mode === 'none' ? 0 : mode === 'custom' ? round2(Number(fd.get('refund_amount')) || 0) : max;
  if (refund < 0 || refund > max + 0.001) return { ok: false, error: `The refund must be between ₹0 and ${money(max)}.` };

  const { user: admin } = await getAdminContext();
  const ref = disputeRef(b.id);

  let refundLine = '';
  if (refund > 0) {
    const rf = await refundBooking(db, b.id, refund, `cancellation ${ref}`);
    if ('error' in rf) return { ok: false, error: `${rf.error} The booking wasn’t cancelled.` };
    refundLine = ` ${money(refund)} refunded through Razorpay.`;
  }

  const { data: updated, error } = await db.from('bookings').update({
    status: 'cancelled',
    cancelled_by: 'admin',
    cancellation_code: 'admin',
    cancellation_reason: `Cancelled by StashInn support at the customer’s request (dispute #${ref}): ${note}`,
  }).eq('id', b.id).eq('status', b.status).select('id');
  if (error) return { ok: false, error: `Couldn’t cancel: ${error.message}` };
  if (!updated?.length) return { ok: false, error: 'The booking changed while you were editing it. Refresh and try again.' };

  // The booking won't happen, so neither does its payout
  await db.from('partner_transactions').delete().eq('booking_id', b.id).eq('transfer_status', 'pending').is('transfer_proof', null);

  await audit(db, admin?.id, 'booking.cancelled_by_admin', 'bookings', b.id, { status: b.status }, { status: 'cancelled', refund, dispute_id: c.dispute.id, note });

  const close = fd.get('close_dispute') !== 'off';
  if (close) {
    const status = refund > 0 ? 'resolved_refund' : 'resolved_no_action';
    await db.from('damage_reports').update({
      status, admin_notes: note, refund_amount: round2((Number(c.dispute.refund_amount) || 0) + refund),
      resolved_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', c.dispute.id);
    await audit(db, admin?.id, 'dispute.updated', 'damage_reports', c.dispute.id, { status: c.dispute.status }, { status, admin_notes: `Booking cancelled. ${note}`, refund_amount: refund });
  } else {
    await audit(db, admin?.id, 'dispute.booking_changed', 'damage_reports', c.dispute.id, {}, { status: c.dispute.status, admin_notes: `Booking cancelled. ${note}`, refund_amount: refund });
  }

  const outcome = refund > 0
    ? `${money(refund)} has been refunded to your original payment method; it usually shows within 5–7 working days.`
    : online ? 'No refund was issued for this cancellation.' : 'You haven’t been charged for this booking.';
  await sendToParties(db, { customerId: b.customer_id, partnerId: b.partner_id }, {
    customer: { label: 'Booking cancelled', title: `Your booking #${ref} has been cancelled`, text: `As you asked, StashInn support has cancelled your booking for ${when(b.start_time)}. ${outcome}` },
    partner: { label: 'Booking cancelled', title: `Booking #${ref} was cancelled by StashInn`, text: `At the customer’s request, StashInn support cancelled booking #${ref} for ${when(b.start_time)}. The space is free again.` },
    note,
    sms: true,
    category: refund > 0 ? 'payment' : 'booking',
  });

  revalidatePath('/dashboard/disputes');
  revalidatePath('/dashboard/bookings');
  return { ok: true, message: `Booking cancelled.${refundLine}${close ? ' Dispute closed.' : ''} Customer and partner notified.` };
}
