'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { getAdminContext, requireAccess } from '../../../lib/adminAccess';
import { payableRows } from './settlementsData';

export type SettleResult = { ok: true; message: string } | { ok: false; error: string };

const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function guard() {
  try {
    await requireAccess('/dashboard/settlements');
  } catch (e: any) {
    return { error: e.message as string };
  }
  const { user } = await getAdminContext();
  return { db: createServiceClient(), adminId: user?.id ?? null };
}

async function tellPartner(db: any, partnerId: string, title: string, message: string) {
  const { data: p } = await db.from('partners').select('user_id').eq('id', partnerId).maybeSingle();
  if (p?.user_id) await db.from('notifications').insert({ user_id: p.user_id, title, message, category: 'payment', action_url: '/dashboard/settlements' });
}

/**
 * Approves or rejects one proof upload (it can cover several bookings). Approving settles each
 * booking: payment -> paid, proof row and the booking's own ledger row -> completed. Rejecting
 * puts the bookings back as owed (payment -> pending, proof row -> failed).
 */
export async function processProofBatch(formData: FormData): Promise<SettleResult> {
  const g = await guard();
  if ('error' in g) return { ok: false, error: g.error! };
  const { db, adminId } = g;
  const path = String(formData.get('path') || '');
  const decision = String(formData.get('decision') || '');
  const reason = String(formData.get('reason') || '').trim().slice(0, 300);
  if (!path || !['approve', 'reject'].includes(decision)) return { ok: false, error: 'Missing proof or decision.' };
  if (decision === 'reject' && reason.length < 5) return { ok: false, error: 'Say briefly why, so the partner can fix it.' };

  const { data: rows } = await db.from('partner_transactions').select('id, partner_id, booking_id').eq('transfer_proof', path).eq('transfer_status', 'pending');
  if (!rows?.length) return { ok: false, error: 'This proof was already handled. Refresh the page.' };
  const bookingIds = rows.map((r: any) => r.booking_id);
  const now = new Date().toISOString();

  if (decision === 'approve') {
    await db.from('payments').update({ status: 'paid', updated_at: now }).in('booking_id', bookingIds).eq('method', 'pay_at_location').eq('status', 'pending_validation');
    await db.from('partner_transactions').update({ transfer_status: 'completed', updated_at: now }).eq('transfer_proof', path).eq('transfer_status', 'pending');
    await db.from('partner_transactions').update({ transfer_status: 'completed', updated_at: now }).in('booking_id', bookingIds).is('transfer_proof', null).eq('transfer_status', 'pending');
  } else {
    await db.from('payments').update({ status: 'pending', updated_at: now }).in('booking_id', bookingIds).eq('method', 'pay_at_location').eq('status', 'pending_validation');
    await db.from('partner_transactions').update({ transfer_status: 'failed', updated_at: now }).eq('transfer_proof', path).eq('transfer_status', 'pending');
  }

  await db.from('audit_logs').insert({
    user_id: adminId, action: decision === 'approve' ? 'settlement.approved' : 'settlement.rejected', entity_type: 'partner_transactions',
    entity_id: rows[0]!.id, new_values: { proof: path, bookings: bookingIds, reason: reason || null },
  });
  const n = bookingIds.length;
  await tellPartner(db, rows[0]!.partner_id,
    decision === 'approve' ? 'Settlement verified' : 'Settlement proof rejected',
    decision === 'approve'
      ? `StashInn verified your payment for ${n} booking${n === 1 ? '' : 's'}. They’re now settled.`
      : `We couldn’t verify your payment for ${n} booking${n === 1 ? '' : 's'}: ${reason} They’re back under “To pay StashInn”; please check and send the proof again.`);

  revalidatePath('/dashboard/settlements');
  return { ok: true, message: decision === 'approve' ? `Approved. ${n} booking${n === 1 ? ' is' : 's are'} settled and the partner was told.` : 'Rejected. The partner was told why.' };
}

/** Records that StashInn paid a partner everything it currently owes them for completed bookings. */
export async function recordPayout(formData: FormData): Promise<SettleResult> {
  const g = await guard();
  if ('error' in g) return { ok: false, error: g.error! };
  const { db, adminId } = g;
  const partnerId = String(formData.get('partner_id') || '');
  const reference = String(formData.get('reference') || '').replace(/\s/g, '').toUpperCase().slice(0, 40);
  const expected = Math.round((parseFloat(String(formData.get('amount') || '')) || 0) * 100) / 100;
  if (!UUID.test(partnerId)) return { ok: false, error: 'Partner not found.' };
  if (reference.length < 4) return { ok: false, error: 'Enter the bank or UPI reference of the payout.' };

  const rows = await payableRows(db, partnerId);
  const total = Math.round(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0) * 100) / 100;
  if (!rows.length) return { ok: false, error: 'Nothing is owed to this partner any more. Refresh the page.' };
  if (total !== expected) return { ok: false, error: `The amount owed changed to ${money(total)}. Refresh the page and check before recording.` };

  const now = new Date().toISOString();
  const { error } = await db.from('partner_transactions')
    .update({ transfer_status: 'completed', notes: `Paid out, ref ${reference}`, updated_at: now })
    .in('id', rows.map(r => r.id)).eq('transfer_status', 'pending');
  if (error) return { ok: false, error: `Couldn’t save: ${error.message}` };

  await db.from('audit_logs').insert({
    user_id: adminId, action: 'settlement.payout_recorded', entity_type: 'partners', entity_id: partnerId,
    new_values: { reference, total, rows: rows.length },
  });
  await tellPartner(db, partnerId, 'Payout sent', `StashInn paid you ${money(total)} for ${rows.length} booking${rows.length === 1 ? '' : 's'} (reference ${reference}). It can take a working day to show in your account.`);

  revalidatePath('/dashboard/settlements');
  return { ok: true, message: `${money(total)} recorded as paid out. The partner was told.` };
}
