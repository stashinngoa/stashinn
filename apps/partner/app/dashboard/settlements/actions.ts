'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { notifyAdmins } from '@stashinn/lib/services/notifications';

export async function submitSettlementProof(formData: FormData) {
  const supabase = await createClient();
  const paymentId = formData.get('payment_id') as string;
  const file = formData.get('proof') as File;
  const partnerId = formData.get('partner_id') as string;

  const txnId = formData.get('transaction_id') as string;
  const amountStr = formData.get('amount') as string;

  if (!file || file.size === 0) {
    throw new Error('Please upload a screenshot or receipt.');
  }
  
  if (!txnId || txnId.length < 8) {
    throw new Error('Please enter a valid Transaction/Reference ID (min 8 chars).');
  }
  const declaredAmount = parseFloat(amountStr);
  if (isNaN(declaredAmount) || declaredAmount <= 0) {
    throw new Error('Please enter a valid amount.');
  }

  // Upload the file to settlement_proofs bucket
  const fileExt = file.name.split('.').pop();
  const fileName = `${paymentId}-${Date.now()}.${fileExt}`;
  const filePath = `${partnerId}/${fileName}`;

  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('settlement_proofs')
    .upload(filePath, file);

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase
    .storage
    .from('settlement_proofs')
    .getPublicUrl(filePath);

  // Since we don't have a direct field for transfer proof on `payments`, 
  // we can use webhook_payload or create a partner_transaction.
  // Actually, partner_transactions has a `transfer_proof` column!
  // Let's create a transaction record to link this proof if it doesn't exist,
  // OR just update the payment status to 'pending_validation' and store the URL in a generic JSON column if possible.
  // Let's just create a `partner_transaction` to hold the proof, and update payment status.

  const { data: payment } = await supabase
    .from('payments')
    .select('booking_id, amount, bookings(commission_amount)')
    .eq('id', paymentId)
    .single();

  if (payment) {
    const expectedCommission = (payment.bookings as any)?.commission_amount || 0;
    
    // Add rounding rules (PS05)
    const roundedDeclared = Math.round(declaredAmount * 100) / 100;
    const roundedExpected = Math.round(expectedCommission * 100) / 100;

    if (roundedDeclared !== roundedExpected) {
      throw new Error(`Amount mismatch. You declared ₹${roundedDeclared}, but the required commission is ₹${roundedExpected}.`);
    }

    // 1. Log the proof in partner_transactions
    await supabase.from('partner_transactions').insert({
      partner_id: partnerId,
      booking_id: payment.booking_id,
      amount: 0, 
      commission: roundedExpected,
      transfer_status: 'pending',
      transfer_proof: publicUrl,
      notes: `Txn ID: ${txnId}`
    });
  }

  // 2. Update the payment status to pending_validation
  const { error: updateError } = await supabase
    .from('payments')
    .update({ 
      status: 'pending_validation',
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await notifyAdmins({
    title: 'Settlement Proof Uploaded',
    message: `A partner has uploaded a settlement proof for payment ID ${paymentId}.`,
    category: 'payment',
    targetRoles: ['finance'],
    action_url: '/dashboard/settlements'
  });

  revalidatePath('/dashboard/settlements');
}
