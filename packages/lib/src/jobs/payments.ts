import { REFUND_RETRY_JOB, refundOnlinePayment, rupees } from '../services/bookingLifecycle';
import { bookingRef } from '../services/bookingEmails';
import type { JobDefinition } from './types';
import { MAX_ATTEMPTS } from './ledger';
import { alertAdmins, notifyUser } from './notify';

/**
 * Retries refunds Razorpay refused when a booking was cancelled (they're queued by
 * cancelBooking in services/bookingLifecycle.ts). After the last attempt finance is alerted.
 */
export const refundRetryJob: JobDefinition = {
  name: REFUND_RETRY_JOB,
  title: 'Refund retry',
  area: 'Payments',
  description: 'Retries refunds Razorpay refused at cancellation (up to 3 attempts), then alerts finance.',
  cadence: 'tick',
  defaultEnabled: true,
  async run(ctx) {
    const { data: due, error } = await ctx.db.from('job_events')
      .select('id, entity_id, step, attempts, detail, last_error')
      .eq('job', REFUND_RETRY_JOB).eq('dry_run', false).eq('status', 'failed')
      .like('step', 'refund:%')
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);

    for (const row of due || []) {
      if (ctx.outOfTime()) break;
      const bookingId = row.entity_id as string;
      const amount = Number(row.detail?.amount) || 0;
      const label = String(row.detail?.label || 'cancellation');
      const ref = bookingRef(bookingId);

      if (row.attempts >= MAX_ATTEMPTS) {
        // Out of retries: tell finance once
        await ctx.ledger.once('booking', bookingId, `${row.step}:alert`, `Alert finance: refund for #${ref} failed ${MAX_ATTEMPTS} times`, async () => ({
          detail: await alertAdmins(ctx.db, ['finance'], {
            title: `Refund failed: #${ref}`,
            lines: [`Refunding ${rupees(amount)} for booking #${ref} failed ${MAX_ATTEMPTS} times (${row.last_error || 'unknown error'}).`, 'Please refund it from the Razorpay dashboard and note it on the payment.'],
            actionPath: '/dashboard/bookings',
            category: 'payment',
            email: true,
          }),
        }));
        continue;
      }

      await ctx.ledger.once('booking', bookingId, row.step, `Retry the ${rupees(amount)} refund for #${ref}`, async () => {
        const r = await refundOnlinePayment(ctx.db, bookingId, amount, `${label} (retry)`);
        if ('error' in r) throw new Error(r.error);
        if (r.kind === 'online') {
          const { data: booking } = await ctx.db.from('bookings').select('customer_id, users!bookings_customer_id_fkey(id, email)').eq('id', bookingId).maybeSingle();
          const customer = Array.isArray(booking?.users) ? booking?.users[0] : booking?.users;
          await notifyUser(ctx.db, customer || null, {
            title: 'Refund on its way',
            message: `We've refunded ${rupees(r.amount)} for booking #${ref}. It usually shows within 5–7 business days.`,
            category: 'payment',
            actionUrl: '/dashboard',
          });
        }
        return { detail: { amount, label, refund: r.kind === 'online' ? r.id : 'nothing left to refund' } };
      });
    }
  },
};
