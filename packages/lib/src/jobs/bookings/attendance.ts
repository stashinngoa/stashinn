import { cancelBooking } from '../../services/bookingLifecycle';
import { bookingRef, JOB_EMAIL_SLUGS } from '../../services/bookingEmails';
import type { JobContext, JobDefinition } from '../types';
import { alertAdmins, BOOKING_FIELDS, bookingVars, locationContacts, notifyUser, parts, partnerUser, type JobBooking } from '../notify';
import { holdForQuietHours } from '../rules';
import { DAY, HOUR, istLabel, MIN } from '../time';

const supportEmail = () => process.env.EMAIL_REPLY_TO || 'support@stashinn.in';

async function nudge(ctx: JobContext, b: JobBooking) {
  const contact = (await locationContacts(ctx.db, b.location_id))[0] ?? null;
  const vars = bookingVars(b, contact);
  const cust = await notifyUser(ctx.db, parts(b).customer, {
    title: 'Are you still coming?',
    message: `Your drop-off at ${vars.location_name} was booked for ${vars.drop_off}. If you don't drop off by ${vars.pick_up}, the booking becomes a no-show.`,
    category: 'booking',
    actionUrl: '/dashboard',
    email: { slug: JOB_EMAIL_SLUGS.noShowNudge, vars },
  });
  const partner = await notifyUser(ctx.db, await partnerUser(ctx.db, b.partner_id), {
    title: `Booking #${vars.booking_ref}: customer not here yet`,
    message: `The customer for #${vars.booking_ref} (drop-off ${vars.drop_off}) hasn't checked in. We've reminded them. Nothing to do unless they arrive.`,
    category: 'booking',
    actionUrl: `/dashboard/bookings/${b.id}`,
  });
  return { detail: { customer: cust.email || cust.inApp, partner: partner.inApp } };
}

async function markNoShow(ctx: JobContext, b: JobBooking) {
  const r = await cancelBooking(ctx.db, b.id, {
    by: 'system',
    code: 'no_show',
    reason: 'No-show: nothing was dropped off before the booking ended.',
    refund: 'none',
    fromStatuses: ['confirmed'],
  });
  if (!r.ok) {
    if (r.reason === 'changed') return { status: 'skipped' as const, detail: { reason: r.error } };
    throw new Error(r.error);
  }
  const vars = { ...bookingVars(b), support_email: supportEmail() };
  const cust = await notifyUser(ctx.db, parts(b).customer, {
    title: `Booking #${vars.booking_ref} marked as a no-show`,
    message: `Nothing was dropped off for your booking at ${vars.location_name} on ${vars.drop_off}, so it's now a no-show. No-shows aren't refunded. If something went wrong, contact ${vars.support_email} within 48 hours.`,
    category: 'booking',
    actionUrl: '/dashboard',
    email: { slug: JOB_EMAIL_SLUGS.noShow, vars },
  });
  const partner = await notifyUser(ctx.db, await partnerUser(ctx.db, b.partner_id), {
    title: `Booking #${vars.booking_ref} was a no-show`,
    message: `The customer didn't drop off for #${vars.booking_ref}. The booking is closed as a no-show.`,
    category: 'booking',
    actionUrl: '/dashboard/bookings',
  });
  return { detail: { customer: cust.email || cust.inApp, partner: partner.inApp } };
}

export const noShowJob: JobDefinition = {
  name: 'booking.no_show',
  title: 'No-shows',
  area: 'Bookings',
  description: 'Nudges a confirmed customer who hasn’t dropped off, then closes the booking as a no-show (no refund) once its time is over.',
  cadence: 'tick',
  defaultEnabled: true,
  async run(ctx) {
    const s = ctx.settings;
    const now = ctx.now.getTime();
    const { data, error } = await ctx.db.from('bookings').select(BOOKING_FIELDS)
      .eq('status', 'confirmed')
      .is('actual_checkin', null)
      .lte('start_time', new Date(now - Math.min(s.noShowNudgeAfterMin, 60) * MIN).toISOString())
      .order('start_time', { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);

    for (const b of (data || []) as JobBooking[]) {
      if (ctx.outOfTime()) break;
      const D = new Date(b.start_time).getTime();
      const E = new Date(b.end_time).getTime();
      const ref = bookingRef(b.id);
      if (now >= E) {
        await ctx.ledger.once('booking', b.id, 'no-show', `Close #${ref} as a no-show (no refund)`, () => markNoShow(ctx, b));
      } else if (now >= D + s.noShowNudgeAfterMin * MIN) {
        if (holdForQuietHours(ctx, E)) continue;
        await ctx.ledger.once('booking', b.id, 'nudge', `Ask the customer of #${ref} if they're still coming`, () => nudge(ctx, b));
      }
    }
  },
};

export const overduePickupJob: JobDefinition = {
  name: 'booking.overdue_pickup',
  title: 'Overdue pick-ups',
  area: 'Bookings',
  description: 'Tells customer and partner when items are collected late, alerts ops after a day, and again when items look abandoned.',
  cadence: 'tick',
  defaultEnabled: true,
  async run(ctx) {
    const s = ctx.settings;
    const now = ctx.now.getTime();
    const { data, error } = await ctx.db.from('bookings').select(BOOKING_FIELDS)
      .eq('status', 'checked_in')
      .lte('end_time', new Date(now - s.overdueNotifyAfterMin * MIN).toISOString())
      .order('end_time', { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);

    for (const b of (data || []) as JobBooking[]) {
      if (ctx.outOfTime()) break;
      const E = new Date(b.end_time).getTime();
      const ref = bookingRef(b.id);
      const { location, customer, partner } = parts(b);
      const lateBy = (h: number) => (h >= 48 ? `${Math.floor(h / 24)} days` : `${Math.round(h)} hours`);

      if (!holdForQuietHours(ctx, now + 12 * HOUR)) {
        await ctx.ledger.once('booking', b.id, 'late', `Tell the customer and partner #${ref} is overdue`, async () => {
          const contact = (await locationContacts(ctx.db, b.location_id))[0] ?? null;
          const vars = bookingVars(b, contact);
          const cust = await notifyUser(ctx.db, customer, {
            title: 'Your pick-up time has passed',
            message: `Your booking at ${vars.location_name} ended at ${vars.pick_up}. Please collect your items soon; extra time may be charged at the location's hourly price.`,
            category: 'booking',
            actionUrl: '/dashboard',
            email: { slug: JOB_EMAIL_SLUGS.pickupOverdue, vars },
            urgent: true,
          });
          const p = await notifyUser(ctx.db, await partnerUser(ctx.db, b.partner_id), {
            title: `Booking #${ref} not collected yet`,
            message: `The items for #${ref} were due for pick-up at ${vars.pick_up}. We've reminded the customer. You may charge extra hours at your hourly price.`,
            category: 'booking',
            actionUrl: `/dashboard/bookings/${b.id}`,
          });
          return { detail: { customer: cust.email || cust.inApp, partner: p.inApp } };
        });
      }

      const alertOps = (step: string, hours: number, extra: string) =>
        ctx.ledger.once('booking', b.id, step, `Alert ops: #${ref} uncollected for ${lateBy(hours)}`, async () => ({
          detail: await alertAdmins(ctx.db, ['ops', 'support'], {
            title: `Items not collected: #${ref}`,
            lines: [
              `${customer?.full_name || 'The customer'} (${customer?.email || 'no email'}${customer?.phone ? `, ${customer.phone}` : ''}) hasn't collected booking #${ref} at ${location?.name || 'the location'} (${partner?.business_name || 'partner'}).`,
              `Pick-up was due ${istLabel(b.end_time)}. ${extra}`,
            ],
            actionPath: '/dashboard/bookings',
            email: true,
          }),
        }));
      if (now >= E + s.overdueOpsAlertAfterHours * HOUR) await alertOps('ops-alert', s.overdueOpsAlertAfterHours, 'Please contact the customer.');
      if (now >= E + s.overdueUncollectedAfterDays * DAY) await alertOps('uncollected', s.overdueUncollectedAfterDays * 24, 'The items may be abandoned: start the uncollected-items process with the partner.');
    }
  },
};
