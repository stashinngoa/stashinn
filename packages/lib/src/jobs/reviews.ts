import { bookingRef, JOB_EMAIL_SLUGS } from '../services/bookingEmails';
import type { JobDefinition } from './types';
import { notifyUser, urls } from './notify';
import { DAY, HOUR } from './time';
import { holdForQuietHours } from './rules';

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export const reviewRequestJob: JobDefinition = {
  name: 'booking.review_request',
  title: 'Review requests',
  area: 'Bookings',
  description: 'Asks the customer to rate the location 2 hours after pick-up, with one reminder 3 days later. Stops once they review.',
  cadence: { everyMinutes: 30 },
  defaultEnabled: true,
  async run(ctx) {
    const s = ctx.settings;
    const now = ctx.now.getTime();
    // A reminder window of 2 days after it's due; older bookings are left alone
    const oldest = new Date(now - (s.reviewReminderAfterDays + 2) * DAY).toISOString();
    const { data, error } = await ctx.db.from('bookings')
      .select('id, actual_checkout, partner_locations(name), users!bookings_customer_id_fkey(id, full_name, email)')
      .eq('status', 'checked_out')
      .gte('actual_checkout', oldest)
      .lte('actual_checkout', new Date(now - s.reviewRequestAfterHours * HOUR).toISOString())
      .limit(300);
    if (error) throw new Error(error.message);
    if (!data?.length) return;

    const { data: reviewed } = await ctx.db.from('reviews').select('booking_id').in('booking_id', data.map((b: any) => b.id));
    const done = new Set((reviewed || []).map((r: any) => r.booking_id));

    for (const b of data) {
      if (ctx.outOfTime()) break;
      if (done.has(b.id) || !b.actual_checkout) continue;
      if (holdForQuietHours(ctx, now + 12 * HOUR)) return; // all of these can wait until morning
      const out = new Date(b.actual_checkout).getTime();
      const customer = one(b.users) as any;
      const location = (one(b.partner_locations) as any)?.name || 'your StashInn location';
      const send = (reminder: boolean) => async () => ({
        detail: await notifyUser(ctx.db, customer, {
          title: reminder ? `Still time to rate ${location}` : `How was ${location}?`,
          message: `Tell other travellers how your stay at ${location} went. It takes a few seconds.`,
          category: 'booking',
          actionUrl: `/dashboard/review/${b.id}`,
          email: { slug: JOB_EMAIL_SLUGS.reviewRequest, vars: { customer_name: (customer?.full_name || '').split(' ')[0] || 'there', booking_ref: bookingRef(b.id), location_name: location, review_url: `${urls.customer()}/dashboard/review/${b.id}` } },
        }),
      });

      if (now >= out + s.reviewReminderAfterDays * DAY) {
        await ctx.ledger.once('booking', b.id, 'reminder', `Remind the customer of #${bookingRef(b.id)} to review`, send(true));
      } else if (now <= out + 2 * DAY) {
        await ctx.ledger.once('booking', b.id, 'request', `Ask the customer of #${bookingRef(b.id)} for a review`, send(false));
      }
    }
  },
};
