'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { getAdminContext, requireAccess } from '../../../lib/adminAccess';
import { notifyAdmins } from '@stashinn/lib/services/notifications';
import { DISPUTE_STATUS, MAX_PARTNER_AWARD, decisionFits, disputeRef, isDisputeStatus, parseReport, type DisputeStatus } from './disputeShared';
import { audit, money as rupees, refundBooking, sendToParties, type Db } from './disputeServer';

export type ResolveResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Saves an admin's decision on a dispute. A refund decision on an online payment is sent to
 * Razorpay (only the part not refunded before); cash / UPI-at-location refunds are recorded
 * for the team to pay out by hand. A partner's claim can instead be closed with an award to the
 * partner, which finance then pays by bank transfer (markAwardPaid). Final decisions are sent
 * to whoever is involved: both sides for a customer complaint, only the partner for their claim.
 */
export async function resolveDispute(formData: FormData): Promise<ResolveResult> {
  try {
    await requireAccess('/dashboard/disputes');
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
  const { user: admin } = await getAdminContext();

  const id = String(formData.get('id') || '');
  const status = String(formData.get('status') || '');
  const notes = String(formData.get('admin_notes') || '').trim();
  const notify = formData.get('notify') !== 'off';
  let refund = Math.round((parseFloat(String(formData.get('refund_amount') || '0')) || 0) * 100) / 100;
  let award = Math.round((parseFloat(String(formData.get('partner_award') || '0')) || 0) * 100) / 100;

  if (!id) return { ok: false, error: 'Missing dispute.' };
  if (!isDisputeStatus(status)) return { ok: false, error: 'Choose a valid status.' };
  if (status !== 'resolved_refund') refund = 0;
  if (status !== 'resolved_compensated') award = 0;
  if (award < 0 || award > MAX_PARTNER_AWARD) return { ok: false, error: `The award must be between ₹1 and ₹${MAX_PARTNER_AWARD.toLocaleString('en-IN')}.` };
  if (status === 'resolved_compensated' && award <= 0) return { ok: false, error: 'Enter the amount to pay the partner, or choose “Close, no payment”.' };
  if (refund < 0) return { ok: false, error: 'The refund can’t be negative.' };
  if (status === 'resolved_refund' && refund <= 0) return { ok: false, error: 'Enter the refund amount, or choose “Resolved · no action”.' };
  if ((status.startsWith('resolved') || status === 'escalated') && notes.length < 10) {
    return { ok: false, error: 'Add a short note explaining the decision (at least 10 characters). Both sides will see it.' };
  }

  const db = createServiceClient();
  const { data: current } = await db
    .from('damage_reports')
    .select('*, bookings(total_amount)')
    .eq('id', id)
    .single();
  if (!current) return { ok: false, error: 'That dispute no longer exists.' };
  const source = parseReport(current.description, current.photos).source;
  if (!decisionFits(status, source)) {
    return { ok: false, error: source === 'partner' ? 'This is the partner’s claim: compensate the partner or close it. A customer refund isn’t possible here.' : 'Only a partner’s claim can be closed with a payment to the partner.' };
  }
  if (status === 'resolved_compensated' && !('partner_award' in current)) {
    return { ok: false, error: 'Partner payments need the latest database update (migration 20261110000004). Ask the team to apply it.' };
  }
  const awardPaid = !!current.partner_award_paid_at;
  if (awardPaid && (status !== 'resolved_compensated' || award !== Number(current.partner_award))) {
    return { ok: false, error: `The partner was already paid ${rupees(Number(current.partner_award))} for this claim, so the decision and amount can’t change. Add a note to the case instead.` };
  }

  const bookingTotal = Number((current.bookings as any)?.total_amount) || 0;
  if (refund > bookingTotal) return { ok: false, error: `The refund (${rupees(refund)}) can’t be more than the booking total (${rupees(bookingTotal)}).` };

  // Refund money first, so a failed refund never shows as "refunded"
  const notes2: string[] = [];
  const alreadyRefunded = current.status === 'resolved_refund' ? Number(current.refund_amount) || 0 : 0;
  const toRefund = Math.max(0, Math.round((refund - alreadyRefunded) * 100) / 100);
  if (status === 'resolved_refund' && toRefund > 0) {
    const r = await refundBooking(db, current.booking_id, toRefund, `dispute ${disputeRef(current.booking_id)}`);
    if ('error' in r) return { ok: false, error: `${r.error} Nothing was saved.` };
    notes2.push(r.kind === 'online'
      ? `${rupees(toRefund)} refunded through Razorpay.`
      : `${rupees(toRefund)} recorded. This booking wasn’t paid online, so pay the customer by hand.`);
  }

  const { error } = await db.from('damage_reports').update({
    status,
    admin_notes: notes || null,
    refund_amount: refund,
    ...('partner_award' in current ? { partner_award: award } : {}),
    resolved_at: status.startsWith('resolved') ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) return { ok: false, error: `Couldn’t save: ${error.message}` };

  await audit(db, admin?.id, 'dispute.updated', 'damage_reports', id,
    { status: current.status, refund_amount: current.refund_amount, partner_award: current.partner_award ?? 0 },
    { status, admin_notes: notes, refund_amount: refund, partner_award: award });

  // Finance pays approved awards by hand
  if (status === 'resolved_compensated' && (current.status !== 'resolved_compensated' || Number(current.partner_award) !== award)) {
    await notifyAdmins({
      title: 'Partner claim approved: payment due',
      message: `Pay ${rupees(award)} to the partner for the claim on booking #${disputeRef(current.booking_id)}, then mark it paid in Disputes.`,
      category: 'payment',
      targetRoles: ['finance'],
      action_url: `/dashboard/disputes?id=${id}`,
    }).catch(() => null);
    notes2.push('Finance has been asked to pay the partner.');
  }

  const changed = current.status !== status;
  if (notify && changed && status !== 'submitted') {
    await notifyParties(db, { ...current, source }, status, notes, refund, award);
    notes2.push(source === 'partner' ? 'Partner notified.' : 'Customer and partner notified.');
  }

  revalidatePath('/dashboard/disputes');
  return { ok: true, message: ['Saved.', ...notes2].join(' ') };
}

/** In-app, email and SMS updates for both sides of the dispute. */
async function notifyParties(
  db: Db,
  d: { booking_id: string; customer_id: string; partner_id: string; source: 'customer' | 'partner' },
  status: DisputeStatus,
  notes: string,
  refund: number,
  award = 0,
) {
  const ref = disputeRef(d.booking_id);
  const label = DISPUTE_STATUS[status].label;
  type Final = Exclude<DisputeStatus, 'submitted'>;

  const forCustomer = ({
    under_review: { title: 'We’re looking into your report', text: `Our team is reviewing your report for booking #${ref}. We’ll update you as soon as there’s a decision.` },
    escalated: { title: 'Your report has been escalated', text: `Your report for booking #${ref} has been passed to our senior team. We’ll contact you shortly.` },
    resolved_refund: { title: 'Your dispute is resolved: refund issued', text: `We’ve resolved your report for booking #${ref} with a refund of ${rupees(refund)}. Online refunds usually show within 5–7 working days.` },
    resolved_no_action: { title: 'Your dispute has been resolved', text: `We’ve reviewed your report for booking #${ref} and closed it.` },
  } as Partial<Record<Final, { title: string; text: string }>>)[status as Final];

  const forPartner = ({
    under_review: { title: `Dispute under review · #${ref}`, text: `StashInn support is reviewing the ${d.source === 'customer' ? 'customer’s complaint' : 'claim you filed'} for booking #${ref}. We may contact you for details.` },
    escalated: { title: `Dispute escalated · #${ref}`, text: `The dispute for booking #${ref} has been escalated to our senior team.` },
    resolved_refund: { title: `Dispute resolved · #${ref}`, text: `The dispute for booking #${ref} was resolved with a refund of ${rupees(refund)} to the customer.` },
    resolved_compensated: { title: `Claim approved · #${ref}`, text: `Your claim for booking #${ref} was approved. StashInn will pay you ${rupees(award)} by bank transfer, usually within 5 working days.` },
    resolved_no_action: d.source === 'partner'
      ? { title: `Claim closed · #${ref}`, text: `We reviewed your claim for booking #${ref} and closed it without a payment.` }
      : { title: `Dispute closed · #${ref}`, text: `The dispute for booking #${ref} was closed with no refund.` },
  } as Record<Final, { title: string; text: string }>)[status as Final];

  await sendToParties(db, { customerId: d.customer_id, partnerId: d.partner_id }, {
    // The customer didn't file a partner's claim, so they aren't told about it
    customer: d.source === 'customer' && forCustomer ? { ...forCustomer, label } : undefined,
    partner: forPartner && { ...forPartner, label },
    note: notes,
    sms: status !== 'under_review',
    category: status === 'resolved_refund' || status === 'resolved_compensated' ? 'payment' : 'damage',
    partnerPath: '/dashboard/damage',
  });
}

/** Finance records the bank transfer for an approved partner claim. */
export async function markAwardPaid(formData: FormData): Promise<ResolveResult> {
  try {
    await requireAccess('/dashboard/settlements');
  } catch {
    return { ok: false, error: 'Only finance or a superadmin can record partner payments.' };
  }
  const { user: admin } = await getAdminContext();
  const id = String(formData.get('id') || '');
  const reference = String(formData.get('reference') || '').trim().slice(0, 80);
  if (!id) return { ok: false, error: 'Missing dispute.' };
  if (reference.length < 4) return { ok: false, error: 'Enter the bank or UPI reference of the payment.' };

  const db = createServiceClient();
  const { data: d } = await db.from('damage_reports').select('*').eq('id', id).maybeSingle();
  if (!d) return { ok: false, error: 'That dispute no longer exists.' };
  if (d.status !== 'resolved_compensated' || !(Number(d.partner_award) > 0)) return { ok: false, error: 'This case has no approved payment to the partner.' };
  if (d.partner_award_paid_at) return { ok: false, error: 'This payment is already recorded.' };

  const now = new Date().toISOString();
  const { data: updated, error } = await db.from('damage_reports')
    .update({ partner_award_paid_at: now, partner_award_reference: reference, partner_award_paid_by: admin?.id ?? null, updated_at: now })
    .eq('id', id).is('partner_award_paid_at', null).select('id');
  if (error) return { ok: false, error: `Couldn’t save: ${error.message}` };
  if (!updated?.length) return { ok: false, error: 'This payment was recorded by someone else just now. Refresh to see it.' };

  const amount = Number(d.partner_award);
  await audit(db, admin?.id, 'dispute.partner_award_paid', 'damage_reports', id, { partner_award_paid_at: null }, { partner_award: amount, reference });
  const ref = disputeRef(d.booking_id);
  await sendToParties(db, { customerId: d.customer_id, partnerId: d.partner_id }, {
    partner: { title: `Claim payment sent · #${ref}`, text: `We’ve paid you ${rupees(amount)} for your claim on booking #${ref} (reference ${reference}). It can take a working day to show in your account.`, label: 'Paid' },
    sms: true,
    category: 'payment',
    partnerPath: '/dashboard/damage',
  });

  revalidatePath('/dashboard/disputes');
  return { ok: true, message: `${rupees(amount)} recorded as paid. The partner has been told.` };
}
