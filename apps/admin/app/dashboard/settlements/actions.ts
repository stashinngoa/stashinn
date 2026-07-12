'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function processSettlement(formData: FormData) {
  const supabase = await createClient();
  const paymentId = formData.get('payment_id') as string;
  const transactionId = formData.get('transaction_id') as string;
  const action = formData.get('action') as string; // 'approve' | 'reject'

  if (action === 'approve') {
    // 1. Mark payment as 'paid'
    await supabase.from('payments').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', paymentId);
    
    // 2. Mark transaction as completed
    await supabase.from('partner_transactions').update({ transfer_status: 'completed', updated_at: new Date().toISOString() }).eq('id', transactionId);
  } else {
    // Reject - revert payment to pending and mark transaction failed
    await supabase.from('payments').update({ status: 'pending', updated_at: new Date().toISOString() }).eq('id', paymentId);
    await supabase.from('partner_transactions').update({ transfer_status: 'failed', updated_at: new Date().toISOString() }).eq('id', transactionId);
  }

  revalidatePath('/dashboard/settlements');
}
