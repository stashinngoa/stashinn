'use server';

import { revalidatePath } from 'next/cache';
import { platformDue } from '@stashinn/lib/services/bookingAvailability';
import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { notifyAdmins } from '@stashinn/lib/services/notifications';

export type ProofResult = { ok: true; message: string } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROOF_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * One transfer to StashInn can cover several completed pay-at-drop-off bookings. The partner
 * picks them, pays the total (commission + GST of each), and uploads one proof. Each booking's
 * payment then waits for finance to approve it in admin Settlements.
 */
export async function submitSettlementProof(formData: FormData): Promise<ProofResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session has expired. Please sign in again.' };
  const { data: partner } = await supabase.from('partners').select('id, business_name').eq('user_id', user.id).maybeSingle();
  if (!partner) return { ok: false, error: 'Partner account not found.' };

  const ids = [...new Set(String(formData.get('payment_ids') || '').split(',').filter(id => UUID.test(id)))];
  const reference = String(formData.get('reference') || '').replace(/\s/g, '').toUpperCase();
  const declared = Math.round((parseFloat(String(formData.get('amount') || '')) || 0) * 100) / 100;
  const file = formData.get('proof');

  if (!ids.length) return { ok: false, error: 'Choose at least one booking you’re paying for.' };
  if (!/^[A-Z0-9]{6,35}$/.test(reference)) return { ok: false, error: 'Enter the UPI or bank reference (UTR): 6 to 35 letters and numbers, no spaces.' };
  if (!file || typeof file === 'string' || file.size === 0) return { ok: false, error: 'Attach a screenshot or receipt of the transfer.' };
  if (!PROOF_TYPES[file.type]) return { ok: false, error: 'The proof must be a JPG, PNG, WebP image or a PDF.' };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: 'The proof is larger than 5 MB.' };

  // Only this partner's own, completed, unsettled pay-at-drop-off bookings
  const { data: payments } = await supabase.from('payments')
    .select('*, bookings!inner(id, partner_id, status, commission_amount, gst_amount)')
    .in('id', ids).eq('bookings.partner_id', partner.id);
  const rows = (payments || []) as any[];
  if (rows.length !== ids.length) return { ok: false, error: 'Some of these bookings weren’t found. Refresh the page and try again.' };
  for (const p of rows) {
    const b = Array.isArray(p.bookings) ? p.bookings[0] : p.bookings;
    if (p.method !== 'pay_at_location') return { ok: false, error: 'Only pay-at-drop-off bookings are settled here.' };
    if (p.collected_via === 'stashinn_qr') return { ok: false, error: 'One of these was paid on the StashInn QR, so nothing is owed for it. Refresh the page.' };
    if (p.status !== 'pending') return { ok: false, error: 'A proof was already sent for one of these bookings. Refresh the page.' };
    if (b?.status !== 'checked_out') return { ok: false, error: 'Only completed bookings can be settled.' };
  }
  const owed = rows.map(p => ({ p, b: Array.isArray(p.bookings) ? p.bookings[0] : p.bookings })).map(x => ({ ...x, due: platformDue(x.b) }));
  const total = Math.round(owed.reduce((s, x) => s + x.due, 0) * 100) / 100;
  if (declared !== total) return { ok: false, error: `The amount for these bookings is ${rupees(total)}, not ${rupees(declared)}. Refresh the page if bookings changed.` };

  const service = createServiceClient();
  const { data: dup } = await service.from('partner_transactions').select('id').eq('partner_id', partner.id).like('notes', `Txn ID: ${reference}.%`).neq('transfer_status', 'failed').limit(1);
  if (dup?.length) return { ok: false, error: 'This reference was already used for another settlement. Check the reference number.' };

  const path = `${partner.id}/settlement-${Date.now()}-${reference.slice(-6)}.${PROOF_TYPES[file.type]}`;
  const { error: uploadError } = await service.storage.from('settlement_proofs').upload(path, file, { contentType: file.type });
  if (uploadError) return { ok: false, error: `Couldn’t upload the proof: ${uploadError.message}` };

  const note = `Txn ID: ${reference}. Paid ${rupees(total)} (commission + GST) for ${owed.length} booking${owed.length === 1 ? '' : 's'}.`;
  const { error: proofError } = await service.from('partner_transactions').insert(owed.map(x => ({
    partner_id: partner.id,
    booking_id: x.p.booking_id,
    amount: 0,
    commission: Number(x.b.commission_amount) || 0,
    transfer_status: 'pending',
    transfer_proof: path,
    notes: `${note} This booking: ${rupees(x.due)}.`,
  })));
  if (proofError) return { ok: false, error: `Couldn’t save the proof: ${proofError.message}` };

  const { error: updateError } = await service.from('payments')
    .update({ status: 'pending_validation', updated_at: new Date().toISOString() })
    .in('id', ids).eq('status', 'pending');
  if (updateError) return { ok: false, error: `Couldn’t update the bookings: ${updateError.message}` };

  await service.from('audit_logs').insert({
    user_id: user.id, action: 'settlement.proof_submitted', entity_type: 'partners', entity_id: partner.id,
    new_values: { reference, total, payments: ids },
  });
  await notifyAdmins({
    title: 'Settlement proof to verify',
    message: `${partner.business_name} sent ${rupees(total)} for ${owed.length} pay-at-drop-off booking${owed.length === 1 ? '' : 's'} (ref ${reference}).`,
    category: 'payment',
    targetRoles: ['finance'],
    action_url: '/dashboard/settlements',
  }).catch(() => null);

  revalidatePath('/dashboard/settlements');
  revalidatePath('/dashboard');
  return { ok: true, message: `Proof sent for ${rupees(total)}. StashInn usually verifies it within 2 working days.` };
}
