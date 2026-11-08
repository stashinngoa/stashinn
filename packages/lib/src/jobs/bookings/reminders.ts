import { bookingRef, JOB_EMAIL_SLUGS } from '../../services/bookingEmails';
import type { JobContext, JobDefinition } from '../types';
import { BOOKING_FIELDS, bookingVars, locationContacts, notifyUser, parts, type JobBooking } from '../notify';
import { holdForQuietHours, tooLate } from '../rules';
import { HOUR, MIN } from '../time';

async function sendDropoffReminder(ctx: JobContext, b: JobBooking) {
  const contact = (await locationContacts(ctx.db, b.location_id))[0] ?? null;
  const vars = bookingVars(b, contact);
  const { customer } = parts(b);
  return {
    detail: await notifyUser(ctx.db, customer, {
      title: `Drop-off ${vars.drop_off}`,
      message: `Reminder: drop off at ${vars.location_name}, ${vars.address}. Your check-in code is ${vars.checkin_otp}.`,
      category: 'booking',
      actionUrl: '/dashboard',
      email: { slug: JOB_EMAIL_SLUGS.dropoffReminder, vars },
    }),
  };
}

export const dropoffReminderJob: JobDefinition = {
  name: 'booking.dropoff_reminder',
  title: 'Drop-off reminder',
  area: 'Bookings',
  description: 'Sends the customer the address, contact and check-in code before drop-off (and a day ahead for bookings made well in advance).',
  cadence: 'tick',
  defaultEnabled: true,
  async run(ctx) {
    const s = ctx.settings;
    const now = ctx.now.getTime();
    const { data, error } = await ctx.db.from('bookings').select(BOOKING_FIELDS)
      .eq('status', 'confirmed')
      .gt('start_time', ctx.now.toISOString())
      .lte('start_time', new Date(now + (s.dropoffEarlyReminderBeforeHours * HOUR) + HOUR).toISOString())
      .limit(200);
    if (error) throw new Error(error.message);

    for (const b of (data || []) as JobBooking[]) {
      if (ctx.outOfTime()) break;
      const D = new Date(b.start_time).getTime();
      const C = new Date(b.created_at).getTime();
      const ref = bookingRef(b.id);
      const main = D - s.dropoffReminderBeforeMin * MIN;
      const early = D - s.dropoffEarlyReminderBeforeHours * HOUR;

      if (now >= main) {
        // Booked after the reminder time: the confirmation email already said it all
        if (C > main - 30 * MIN || tooLate(ctx, main) || holdForQuietHours(ctx, D)) continue;
        await ctx.ledger.once('booking', b.id, 'dropoff', `Drop-off reminder for #${ref}`, () => sendDropoffReminder(ctx, b));
      } else if (now >= early) {
        if (C > D - s.dropoffEarlyReminderIfBookedAheadHours * HOUR || tooLate(ctx, early) || holdForQuietHours(ctx, main)) continue;
        await ctx.ledger.once('booking', b.id, 'dropoff-early', `Day-ahead drop-off reminder for #${ref}`, () => sendDropoffReminder(ctx, b));
      }
    }
  },
};

export const pickupReminderJob: JobDefinition = {
  name: 'booking.pickup_reminder',
  title: 'Pick-up reminder',
  area: 'Bookings',
  description: 'Reminds a checked-in customer when to collect, with their pick-up code.',
  cadence: 'tick',
  defaultEnabled: true,
  async run(ctx) {
    const s = ctx.settings;
    const now = ctx.now.getTime();
    const { data, error } = await ctx.db.from('bookings').select(BOOKING_FIELDS)
      .eq('status', 'checked_in')
      .gt('end_time', ctx.now.toISOString())
      .lte('end_time', new Date(now + s.pickupReminderBeforeMin * MIN).toISOString())
      .limit(200);
    if (error) throw new Error(error.message);

    for (const b of (data || []) as JobBooking[]) {
      if (ctx.outOfTime()) break;
      const E = new Date(b.end_time).getTime();
      const due = E - s.pickupReminderBeforeMin * MIN;
      // Checked in after the reminder time (a short booking): nothing to remind
      if (b.actual_checkin && new Date(b.actual_checkin).getTime() > due) continue;
      if (tooLate(ctx, due) || holdForQuietHours(ctx, E)) continue;
      await ctx.ledger.once('booking', b.id, 'pickup', `Pick-up reminder for #${bookingRef(b.id)}`, async () => {
        const contact = (await locationContacts(ctx.db, b.location_id))[0] ?? null;
        const vars = bookingVars(b, contact);
        return {
          detail: await notifyUser(ctx.db, parts(b).customer, {
            title: `Pick up by ${vars.pick_up}`,
            message: `Your booking at ${vars.location_name} ends at ${vars.pick_up}. Your pick-up code is ${vars.checkout_otp}.`,
            category: 'booking',
            actionUrl: '/dashboard',
            email: { slug: JOB_EMAIL_SLUGS.pickupReminder, vars },
          }),
        };
      });
    }
  },
};
