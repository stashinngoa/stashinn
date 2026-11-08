import { cancelBooking, rupees } from '../../services/bookingLifecycle';
import { bookingRef, JOB_EMAIL_SLUGS } from '../../services/bookingEmails';
import type { JobContext, JobDefinition } from '../types';
import { alertAdmins, BOOKING_FIELDS, bookingVars, locationContacts, notifyUser, parts, partnerUser, urls, type JobBooking } from '../notify';
import { holdForQuietHours } from '../rules';
import { istLabel, MIN } from '../time';

/** When each step of the ladder is due for one pending booking. */
export function partnerResponseSchedule(b: Record<string, any>, s: JobContext["settings"]) {
  const C = new Date(b.created_at).getTime();
  const D = new Date(b.start_time).getTime();
  const reminder1 = C + s.partnerReminder1AfterMin * MIN;
  const reminder2 = Math.min(C + s.partnerReminder2AfterMin * MIN, D - s.partnerReminder2LatestBeforeDropoffMin * MIN);
  return {
    reminder1,
    // Only worth a second reminder if it lands well after the first
    reminder2: reminder2 > reminder1 + 10 * MIN ? reminder2 : null,
    // Booked less than an hour ahead: alert ops almost straight away
    alert: Math.max(D - s.opsAlertBeforeDropoffMin * MIN, C + 5 * MIN),
    // Always give the partner a little time, even for last-minute bookings
    cancel: Math.max(D - s.autoCancelBeforeDropoffMin * MIN, C + s.autoCancelNotBeforeBookedMin * MIN),
  };
}

async function remindPartner(ctx: JobContext, b: JobBooking, second: boolean, deadline: number) {
  const vars = { ...bookingVars(b), deadline: istLabel(new Date(deadline)), dashboard_url: `${urls.partner()}/dashboard/bookings/${b.id}` };
  const user = await partnerUser(ctx.db, b.partner_id);
  const sent = await notifyUser(ctx.db, user, {
    title: second ? 'Booking still waiting for you' : 'Please answer a booking request',
    message: `Booking #${vars.booking_ref} at ${vars.location_name} for ${vars.drop_off} needs your answer. If there's no answer by ${vars.deadline}, it will be cancelled.`,
    category: 'booking',
    actionUrl: `/dashboard/bookings/${b.id}`,
    email: { slug: JOB_EMAIL_SLUGS.partnerReminder, vars },
  });
  // The second reminder also goes to the location's contacts
  if (second) {
    const { ExternalNotificationService } = await import('../../services/notifications');
    const { renderBookingEmail } = await import('../../services/bookingEmails');
    const contacts = (await locationContacts(ctx.db, b.location_id)).filter(c => c.email && c.email !== user?.email);
    const rendered = contacts.length ? await renderBookingEmail(JOB_EMAIL_SLUGS.partnerReminder, vars) : null;
    let n = 0;
    for (const c of contacts) if (rendered && (await ExternalNotificationService.sendEmail(c.email!, rendered.subject, rendered.html)).success) n++;
    sent.contacts = String(n);
  }
  return { detail: sent };
}

async function alertOps(ctx: JobContext, b: JobBooking, cancelAt: number) {
  const { location, partner, customer } = parts(b);
  const contacts = await locationContacts(ctx.db, b.location_id);
  const ref = bookingRef(b.id);
  const minutes = Math.max(0, Math.round((new Date(b.start_time).getTime() - ctx.now.getTime()) / MIN));
  const phoneLine = contacts.length
    ? `Call: ${contacts.map(c => `${c.name} ${c.phone}`).join(', ')}.`
    : 'No location contact on file.';
  const ops = await alertAdmins(ctx.db, ['ops', 'support'], {
    title: `Unconfirmed booking #${ref}: drop-off in ${minutes} min`,
    lines: [
      `${partner?.business_name || 'The partner'} hasn't accepted or declined booking #${ref} at ${location?.name || 'their location'} (drop-off ${istLabel(b.start_time)}, customer ${customer?.full_name || 'unknown'}).`,
      phoneLine,
      `It will be cancelled and refunded automatically at ${istLabel(new Date(cancelAt))} unless the partner accepts.`,
    ],
    actionPath: '/dashboard/bookings',
    email: true,
  });
  const vars = { ...bookingVars(b), deadline: istLabel(new Date(cancelAt)) };
  const cust = await notifyUser(ctx.db, customer, {
    title: 'Your booking isn’t confirmed yet',
    message: `${vars.location_name} hasn't confirmed your booking for ${vars.drop_off} yet. We're contacting them. If it isn't confirmed by ${vars.deadline}, we'll cancel it and refund anything you paid.`,
    category: 'booking',
    actionUrl: '/dashboard',
    email: { slug: JOB_EMAIL_SLUGS.customerDelay, vars },
    urgent: true,
  });
  return { detail: { ...ops, customer: cust.email || cust.inApp } };
}

async function autoCancel(ctx: JobContext, b: JobBooking) {
  const r = await cancelBooking(ctx.db, b.id, {
    by: 'system',
    code: 'partner_no_response',
    reason: 'Cancelled automatically: the partner didn’t confirm in time.',
    refund: 'full',
    fromStatuses: ['pending'],
  });
  if (!r.ok) {
    if (r.reason === 'changed') return { status: 'skipped' as const, detail: { reason: r.error } };
    throw new Error(r.error);
  }

  const { customer, location } = parts(b);
  const ref = bookingRef(b.id);
  const refundLine = r.refunded > 0
    ? `We've refunded ${rupees(r.refunded)} to your original payment method. It usually shows within 5–7 business days.`
    : r.refundQueued > 0
      ? `Your refund of ${rupees(r.refundQueued)} is being processed and should reach you within 5–7 business days.`
      : 'You haven’t been charged for this booking.';
  const vars = { ...bookingVars(b), refund_line: refundLine };

  const cust = await notifyUser(ctx.db, customer, {
    title: 'Booking cancelled: the location didn’t confirm',
    message: `${vars.location_name} didn't confirm your booking #${ref} in time, so we've cancelled it. ${refundLine}`,
    category: r.refunded || r.refundQueued ? 'payment' : 'booking',
    actionUrl: '/search',
    email: { slug: JOB_EMAIL_SLUGS.customerAutoCancelled, vars },
    urgent: true,
  });
  const partner = await notifyUser(ctx.db, await partnerUser(ctx.db, b.partner_id), {
    title: `Booking #${ref} cancelled: no response`,
    message: `Booking #${ref} at ${location?.name || 'your location'} wasn't answered in time, so StashInn cancelled it and refunded the customer.`,
    category: 'booking',
    actionUrl: '/dashboard/bookings',
    email: { slug: JOB_EMAIL_SLUGS.partnerAutoCancelled, vars: { ...vars, dashboard_url: `${urls.partner()}/dashboard/bookings` } },
    urgent: true,
  });
  await alertAdmins(ctx.db, ['ops', 'support'], {
    title: `Booking #${ref} auto-cancelled`,
    lines: [`${location?.name || 'The location'} didn't confirm in time. ${r.refunded ? `${rupees(r.refunded)} refunded.` : r.refundQueued ? `Refund of ${rupees(r.refundQueued)} queued for retry.` : 'Nothing to refund.'}`],
    actionPath: '/dashboard/bookings',
  });
  return { detail: { refunded: r.refunded, refundQueued: r.refundQueued, customer: cust.email || cust.inApp, partner: partner.email || partner.inApp } };
}

export const partnerResponseJob: JobDefinition = {
  name: 'booking.partner_response',
  title: 'Partner response',
  area: 'Bookings',
  description: 'Chases a partner who hasn’t accepted or declined: reminders, then an ops alert and a note to the customer, then an automatic cancellation with a full refund.',
  cadence: 'tick',
  defaultEnabled: true,
  async run(ctx) {
    const s = ctx.settings;
    const { data, error } = await ctx.db.from('bookings').select(BOOKING_FIELDS)
      .eq('status', 'pending')
      .lte('created_at', new Date(ctx.now.getTime() - 5 * MIN).toISOString())
      .order('start_time', { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);

    let cancels = 0;
    let capped = 0;
    const now = ctx.now.getTime();
    for (const b of (data || []) as JobBooking[]) {
      if (ctx.outOfTime()) break;
      const at = partnerResponseSchedule(b, s);
      const ref = bookingRef(b.id);

      if (now >= at.cancel) {
        if (cancels >= s.maxAutoCancelsPerRun) { capped++; continue; }
        const r = await ctx.ledger.once('booking', b.id, 'cancel', `Cancel #${ref} with a full refund; tell customer, partner and ops`, () => autoCancel(ctx, b));
        if (r === 'ran' || r === 'dry') cancels++;
      } else if (now >= at.alert) {
        await ctx.ledger.once('booking', b.id, 'alert', `Alert ops about #${ref} and tell the customer`, () => alertOps(ctx, b, at.cancel));
      } else if (at.reminder2 && now >= at.reminder2) {
        if (!holdForQuietHours(ctx, at.alert)) await ctx.ledger.once('booking', b.id, 'reminder-2', `Second reminder to the partner and location contacts for #${ref}`, () => remindPartner(ctx, b, true, at.cancel));
      } else if (now >= at.reminder1) {
        if (!holdForQuietHours(ctx, at.alert)) await ctx.ledger.once('booking', b.id, 'reminder-1', `Remind the partner about #${ref}`, () => remindPartner(ctx, b, false, at.cancel));
      }
    }

    // Safety brake: far more cancellations than usual points at a bug or an outage
    if (capped > 0) {
      ctx.count('capped', capped);
      if (ctx.dryRun) return; // only counted: nothing was going to be cancelled anyway
      await ctx.db.from('job_state').upsert({ name: this.name, enabled: false, last_error: `Paused: more than ${s.maxAutoCancelsPerRun} auto-cancellations in one run.`, updated_at: new Date().toISOString() }, { onConflict: 'name' });
      await alertAdmins(ctx.db, [], {
        title: 'Partner-response job paused itself',
        lines: [`One run wanted to cancel more than ${s.maxAutoCancelsPerRun} bookings, so the job switched itself off. ${capped} booking(s) were left alone.`, 'Check the bookings, then switch the job back on in Scheduled Jobs.'],
        actionPath: '/dashboard/jobs',
        category: 'system',
        email: true,
      });
    }
  },
};
