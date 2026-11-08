'use server';

import { requireAccess } from '../../../lib/adminAccess';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function processSettlement(formData: FormData) {
  await requireAccess('/dashboard/settlements'); // role check: see lib/permissions.ts
  const supabase = await createClient();
  const paymentId = formData.get('payment_id') as string;
  const transactionId = formData.get('transaction_id') as string;
  const action = formData.get('action') as string; // 'approve' | 'reject'

  const { data: { user: adminUser } } = await supabase.auth.getUser();

  if (action === 'approve') {
    // 1. Mark payment as 'paid'
    await supabase.from('payments').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', paymentId);
    
    // 2. Mark transaction as completed
    await supabase.from('partner_transactions').update({ transfer_status: 'completed', updated_at: new Date().toISOString() }).eq('id', transactionId);

    // 3. The partner has paid, so the booking's own ledger row is no longer outstanding
    const { data: proofRow } = await supabase.from('partner_transactions').select('booking_id').eq('id', transactionId).maybeSingle();
    if (proofRow?.booking_id) {
      await supabase.from('partner_transactions').update({ transfer_status: 'completed', updated_at: new Date().toISOString() })
        .eq('booking_id', proofRow.booking_id).is('transfer_proof', null).eq('transfer_status', 'pending');
    }
  } else {
    // Reject - revert payment to pending and mark transaction failed
    await supabase.from('payments').update({ status: 'pending', updated_at: new Date().toISOString() }).eq('id', paymentId);
    await supabase.from('partner_transactions').update({ transfer_status: 'failed', updated_at: new Date().toISOString() }).eq('id', transactionId);
  }

  // 3. Notify Partner
  const { data: txn } = await supabase
    .from('partner_transactions')
    .select('partner_id, partners(user_id)')
    .eq('id', transactionId)
    .single();

  if (txn && (txn.partners as any)?.user_id) {
    const pUserId = (txn.partners as any).user_id || (txn.partners as any)[0]?.user_id;
    if (pUserId) {
      await supabase.from('notifications').insert({
        user_id: pUserId,
        title: action === 'approve' ? 'Settlement Approved' : 'Settlement Rejected',
        message: action === 'approve' 
          ? `Your settlement has been approved and completed.`
          : `Your settlement proof was rejected. Please review and re-submit.`,
        category: 'payment'
      });
    }
  }

  // 4. Record Audit Log Entry
  if (adminUser) {
    await supabase.from('audit_logs').insert({
      user_id: adminUser.id,
      action: action === 'approve' ? 'settlement.approved' : 'settlement.rejected',
      entity_type: 'partner_transactions',
      entity_id: transactionId,
      new_values: { paymentId, action }
    });
  }

  revalidatePath('/dashboard/settlements');
}
