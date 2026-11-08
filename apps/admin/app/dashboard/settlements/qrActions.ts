'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { requireAccess } from '../../../lib/adminAccess';

export type QrResult = { ok: true; message: string } | { ok: false; error: string };

const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * A partner said the customer paid on the StashInn QR at drop-off. Finance checks the money
 * arrived: "received" makes the partner's share payable to them (payment -> paid); "not received"
 * treats it as collected by the partner, so they owe StashInn's commission + GST instead.
 */
export async function resolveQrPayment(formData: FormData): Promise<QrResult> {
  try {
    await requireAccess('/dashboard/settlements');
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
  const supabase = await createClient();
  const { data: { user: admin } } = await supabase.auth.getUser();
  const paymentId = String(formData.get('payment_id') || '');
  const decision = String(formData.get('decision') || '');
  const reference = String(formData.get('reference') || '').replace(/\s/g, '').toUpperCase().slice(0, 40);
  if (!paymentId || !['received', 'not_received'].includes(decision)) return { ok: false, error: 'Missing payment or decision.' };

  const db = createServiceClient();
  const { data: p } = await db.from('payments')
    .select('*, bookings(id, partner_id, total_amount, partner_amount, commission_amount, gst_amount, partners(user_id))')
    .eq('id', paymentId).maybeSingle();
  if (!p) return { ok: false, error: 'Payment not found.' };
  if (p.method !== 'pay_at_location' || p.collected_via !== 'stashinn_qr' || p.status !== 'pending') {
    return { ok: false, error: 'This payment isn’t waiting for a QR confirmation any more. Refresh the page.' };
  }

  const b = (Array.isArray(p.bookings) ? p.bookings[0] : p.bookings) as any;
  const ref = String(b?.id || '').split('-')[0]!.toUpperCase();
  const now = new Date().toISOString();
  const changes = decision === 'received'
    ? { status: 'paid', qr_confirmed_at: now, qr_confirmed_by: admin?.id ?? null, qr_reference: reference || p.qr_reference || null, updated_at: now }
    : { collected_via: 'cash', updated_at: now };
  const { data: updated, error } = await db.from('payments').update(changes)
    .eq('id', paymentId).eq('status', 'pending').eq('collected_via', 'stashinn_qr').select('id');
  if (error) return { ok: false, error: `Couldn’t save: ${error.message}` };
  if (!updated?.length) return { ok: false, error: 'Someone else just handled this payment. Refresh the page.' };

  await db.from('audit_logs').insert({
    user_id: admin?.id ?? null,
    action: decision === 'received' ? 'payment.qr_confirmed' : 'payment.qr_not_received',
    entity_type: 'payments',
    entity_id: paymentId,
    old_values: { status: p.status, collected_via: p.collected_via },
    new_values: changes,
  });

  const partnerUserId = (Array.isArray(b?.partners) ? b.partners[0] : b?.partners)?.user_id;
  if (partnerUserId) {
    const owe = (Number(b.commission_amount) || 0) + (Number(b.gst_amount) || 0);
    await db.from('notifications').insert({
      user_id: partnerUserId,
      title: decision === 'received' ? `QR payment confirmed · #${ref}` : `QR payment not found · #${ref}`,
      message: decision === 'received'
        ? `StashInn received the customer’s ${money(Number(b.total_amount) || 0)} for booking #${ref}. Your share of ${money(Number(b.partner_amount) || 0)} is paid with your next payout.`
        : `We couldn’t find a StashInn QR payment for booking #${ref}, so it’s treated as paid to you. Please send StashInn’s ${money(owe)} from Settlements, or reply to support@stashinn.in if the customer did pay on the QR.`,
      category: 'payment',
      action_url: '/dashboard/settlements',
    });
  }

  revalidatePath('/dashboard/settlements');
  return { ok: true, message: decision === 'received' ? 'Confirmed. The partner’s share is now payable.' : 'Marked as not received. The partner now owes StashInn’s share.' };
}
