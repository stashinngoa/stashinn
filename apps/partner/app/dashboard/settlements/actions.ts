'use server';

import { platformDue } from '@stashinn/lib/services/bookingAvailability';
import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { notifyAdmins } from '@stashinn/lib/services/notifications';

export async function submitSettlementProof(formData: FormData) {
  const supabase = await createClient();
  const paymentId = formData.get('payment_id') as string;
  const file = formData.get('proof') as File;

  const txnId = formData.get('transaction_id') as string;
  const amountStr = formData.get('amount') as string;

  if (!file || file.size === 0) {
    throw new Error('Please upload a screenshot or receipt.');
  }
  
  if (!txnId || txnId.length < 8) {
    throw new Error('Please enter a valid Transaction/Reference ID (min 8 chars).');
  }
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  if (!alphanumericRegex.test(txnId)) {
    throw new Error('Transaction/Reference ID must be alphanumeric (no spaces or special characters).');
  }
  const declaredAmount = parseFloat(amountStr);
  if (isNaN(declaredAmount) || declaredAmount <= 0) {
    throw new Error('Please enter a valid amount.');
  }

  // Only this partner's own pay-at-location payment can be settled
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please sign in again.');
  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user.id).single();
  const { data: payment } = await supabase
    .from('payments')
    .select('id, booking_id, method, status, bookings!inner(partner_id, commission_amount, gst_amount)')
    .eq('id', paymentId)
    .maybeSingle();
  const booking = payment?.bookings as any;
  if (!partner || !payment || booking?.partner_id !== partner.id || payment.method !== 'pay_at_location') {
    throw new Error('This payment could not be found.');
  }
  if (payment.status !== 'pending') throw new Error('A proof has already been submitted for this payment.');

  // Cash bookings: the partner hands over StashInn's commission and the GST they collected
  const amountDue = platformDue(booking);
  const roundedDeclared = Math.round(declaredAmount * 100) / 100;
  if (roundedDeclared !== amountDue) {
    throw new Error(`Amount mismatch. You declared ₹${roundedDeclared}, but the amount due (commission + GST) is ₹${amountDue}.`);
  }

  // Partners can't write payments or the ledger directly; ownership was checked above
  const service = createServiceClient();
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const filePath = `${partner.id}/${paymentId}-${Date.now()}.${fileExt}`;
  const { error: uploadError } = await service.storage.from('settlement_proofs').upload(filePath, file, { contentType: file.type });
  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // 1. Log the proof in partner_transactions
  const { error: proofError } = await service.from('partner_transactions').insert({
    partner_id: partner.id,
    booking_id: payment.booking_id,
    amount: 0,
    commission: Number(booking.commission_amount) || 0,
    transfer_status: 'pending',
    transfer_proof: filePath,
    notes: `Txn ID: ${txnId}. Paid ₹${amountDue} (commission + GST).`,
  });
  if (proofError) throw new Error(proofError.message);

  // 2. Update the payment status to pending_validation
  const { error: updateError } = await service
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
