import { bookingRef, JOB_EMAIL_SLUGS } from '../services/bookingEmails';
import type { JobDefinition } from './types';
import { alertAdmins, emailTable, notifyUser, urls } from './notify';
import { DAY, HOUR, istAt, istClock, istDateKey, istLabel, istParts, istWeekKey, MIN } from './time';

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const dateOnly = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export const infoRequestJob: JobDefinition = {
  name: 'partners.info_request',
  title: 'Info-request chaser',
  area: 'Partners',
  description: 'Reminds a partner who hasn’t answered an admin’s request for details after 3 days, and alerts ops after 7.',
  cadence: { dailyAt: '10:00' },
  defaultEnabled: true,
  async run(ctx) {
    const s = ctx.settings;
    const { data, error } = await ctx.db.from('partners')
      .select('id, business_name, user_id, info_request, info_requested_at, info_responded_at, users!partners_user_id_fkey(email)')
      .not('info_requested_at', 'is', null)
      .limit(500);
    if (error) throw new Error(error.message);

    for (const p of data || []) {
      if (ctx.outOfTime()) break;
      // Still open: never answered, or answered before the latest request
      if (p.info_responded_at && new Date(p.info_responded_at) >= new Date(p.info_requested_at)) continue;
      const age = ctx.now.getTime() - new Date(p.info_requested_at).getTime();
      const key = p.info_requested_at as string;
      const request = (p.info_request || 'Please review the items flagged in your dashboard.').trim();

      if (age >= s.infoRequestReminderDays * DAY) {
        await ctx.ledger.once('partner', p.id, `reminder:${key}`, `Remind ${p.business_name} about the info request of ${dateOnly(key)}`, async () => ({
          detail: await notifyUser(ctx.db, { id: p.user_id, email: (one(p.users) as any)?.email }, {
            title: 'StashInn still needs some details',
            message: `On ${dateOnly(key)} we asked you to update some details: ${request}`,
            category: 'system',
            actionUrl: '/dashboard',
            email: { slug: JOB_EMAIL_SLUGS.partnerInfoRequest, vars: { partner_name: p.business_name || 'there', request, requested_on: dateOnly(key), dashboard_url: `${urls.partner()}/dashboard` } },
            urgent: true,
          }),
        }));
      }
      if (age >= s.infoRequestOpsAlertDays * DAY) {
        await ctx.ledger.once('partner', p.id, `ops:${key}`, `Alert ops: ${p.business_name} hasn't answered for ${s.infoRequestOpsAlertDays} days`, async () => ({
          detail: await alertAdmins(ctx.db, ['ops'], {
            title: `No answer from ${p.business_name}`,
            lines: [`The info request of ${dateOnly(key)} is still open after ${s.infoRequestOpsAlertDays} days: “${request}”.`, 'Consider calling them, or pausing the listing.'],
            actionPath: `/dashboard/partners/${p.id}`,
            category: 'system',
          }),
        }));
      }
    }
  },
};

export const pauseEndingJob: JobDefinition = {
  name: 'partners.pause_ending',
  title: 'Pause ending',
  area: 'Partners',
  description: 'Tells a partner a day ahead that a paused location starts taking bookings again.',
  cadence: { everyMinutes: 60 },
  defaultEnabled: true,
  async run(ctx) {
    const s = ctx.settings;
    const now = ctx.now.getTime();
    const { data, error } = await ctx.db.from('location_pauses')
      .select('id, starts_at, ends_at, partner_id, partner_locations(name), partners(business_name, user_id, users!partners_user_id_fkey(email))')
      .is('cancelled_at', null)
      .lte('starts_at', ctx.now.toISOString())
      .gt('ends_at', ctx.now.toISOString())
      .lte('ends_at', new Date(now + s.pauseEndingNoticeHours * HOUR).toISOString())
      .limit(200);
    if (error) throw new Error(error.message);

    for (const p of data || []) {
      if (ctx.outOfTime()) break;
      // A short pause doesn't need a "reopening soon" note
      if (new Date(p.ends_at).getTime() - new Date(p.starts_at).getTime() <= s.pauseEndingNoticeHours * HOUR) continue;
      const partner = one(p.partners) as any;
      const location = (one(p.partner_locations) as any)?.name || 'Your location';
      await ctx.ledger.once('pause', p.id, 'ending', `Tell ${partner?.business_name || 'the partner'} that ${location} reopens ${istLabel(p.ends_at)}`, async () => ({
        detail: await notifyUser(ctx.db, partner ? { id: partner.user_id, email: (one(partner.users) as any)?.email } : null, {
          title: `${location} reopens soon`,
          message: `${location} starts taking bookings again on ${istLabel(p.ends_at)}. Extend the pause if you need longer.`,
          category: 'system',
          actionUrl: '/dashboard/locations',
          email: { slug: JOB_EMAIL_SLUGS.partnerPauseEnding, vars: { partner_name: partner?.business_name || 'there', location_name: location, reopens: istLabel(p.ends_at), dashboard_url: `${urls.partner()}/dashboard/locations` } },
        }),
      }));
    }
  },
};

export const reliabilityJob: JobDefinition = {
  name: 'partners.reliability',
  title: 'Partner reliability',
  area: 'Partners',
  description: 'Every Monday, flags partners with repeated auto-cancellations or slow replies in the last 30 days, for ops to follow up.',
  cadence: { weeklyOn: 1, at: '08:00' },
  defaultEnabled: true,
  async run(ctx) {
    const s = ctx.settings;
    const since = new Date(ctx.now.getTime() - 30 * DAY).toISOString();
    const { data, error } = await ctx.db.from('bookings')
      .select('partner_id, status, cancellation_code, created_at, confirmed_at')
      .gte('created_at', since)
      .limit(10000);
    if (error) throw new Error(error.message);

    const stats = new Map<string, { bookings: number; autoCancels: number; slow: number; declines: number }>();
    for (const b of data || []) {
      const st = stats.get(b.partner_id) || { bookings: 0, autoCancels: 0, slow: 0, declines: 0 };
      st.bookings++;
      if (b.cancellation_code === 'partner_no_response') st.autoCancels++;
      if (b.cancellation_code === 'partner') st.declines++;
      if (b.confirmed_at && new Date(b.confirmed_at).getTime() - new Date(b.created_at).getTime() > s.reliabilitySlowReplyMin * MIN) st.slow++;
      stats.set(b.partner_id, st);
    }
    const flagged = [...stats.entries()].filter(([, v]) => v.autoCancels >= s.reliabilityAutoCancels || v.slow >= s.reliabilitySlowReplies);
    ctx.count('flagged', flagged.length);
    if (!flagged.length) return;

    const { data: partners } = await ctx.db.from('partners').select('id, business_name').in('id', flagged.map(([id]) => id));
    const name = (id: string) => (partners || []).find((p: any) => p.id === id)?.business_name || id.slice(0, 8);
    const week = istWeekKey(ctx.now);
    await ctx.ledger.once('report', week, 'flagged', `Tell ops about ${flagged.length} partner(s) with reliability problems`, async () => ({
      detail: await alertAdmins(ctx.db, ['ops'], {
        title: `${flagged.length} partner${flagged.length === 1 ? '' : 's'} to follow up (${week})`,
        lines: [
          `In the last 30 days: ${flagged.map(([id, v]) => `${name(id)}: ${v.autoCancels} auto-cancelled, ${v.slow} slow replies, ${v.declines} declined, of ${v.bookings} bookings`).join('; ')}.`,
          'Consider a call, a warning, or pausing their listing.',
        ],
        actionPath: '/dashboard/partners',
        category: 'system',
        email: true,
      }),
    }));
  },
};

export const dayPlanJob: JobDefinition = {
  name: 'partners.day_plan',
  title: 'Partner day plan',
  area: 'Partners',
  description: 'At 07:30, emails partners who opted in a list of today’s drop-offs and pick-ups.',
  cadence: { dailyAt: '07:30' },
  defaultEnabled: true,
  async run(ctx) {
    const { data: prefs, error } = await ctx.db.from('notification_preferences').select('user_id').eq('daily_plan', true);
    if (error) throw new Error(error.message);
    if (!prefs?.length) return;
    const { data: partners } = await ctx.db.from('partners')
      .select('id, business_name, user_id, users!partners_user_id_fkey(email)')
      .in('user_id', prefs.map((p: any) => p.user_id))
      .eq('status', 'approved');

    const p = istParts(ctx.now);
    const dayStart = istAt(p.year, p.month, p.day, '00:00');
    const dayEnd = new Date(dayStart.getTime() + DAY);
    const key = istDateKey(ctx.now);

    for (const partner of partners || []) {
      if (ctx.outOfTime()) break;
      const { data: bookings } = await ctx.db.from('bookings')
        .select('id, status, start_time, end_time, booking_type, num_bags, vehicle_license_plate, partner_locations(name), users!bookings_customer_id_fkey(full_name)')
        .eq('partner_id', partner.id)
        .in('status', ['pending', 'confirmed', 'checked_in'])
        .or(`and(start_time.gte.${dayStart.toISOString()},start_time.lt.${dayEnd.toISOString()}),and(end_time.gte.${dayStart.toISOString()},end_time.lt.${dayEnd.toISOString()})`)
        .order('start_time', { ascending: true });
      if (!bookings?.length) continue;

      const rows: { at: number; row: string[] }[] = [];
      let drops = 0, picks = 0;
      for (const b of bookings) {
        const what = b.booking_type === 'garage' ? `Vehicle ${b.vehicle_license_plate || ''}`.trim() : `${b.num_bags} bag${b.num_bags === 1 ? '' : 's'}`;
        const who = `${(one(b.users) as any)?.full_name || 'Customer'} · ${what} · #${bookingRef(b.id)}`;
        const place = (one(b.partner_locations) as any)?.name || '';
        const status = b.status === 'pending' ? 'not accepted yet' : '';
        const start = new Date(b.start_time), end = new Date(b.end_time);
        if (start >= dayStart && start < dayEnd && b.status !== 'checked_in') { drops++; rows.push({ at: start.getTime(), row: [istClock(start), `Drop-off: ${who}`, [place, status].filter(Boolean).join(' · ')] }); }
        if (end >= dayStart && end < dayEnd) { picks++; rows.push({ at: end.getTime(), row: [istClock(end), `Pick-up: ${who}`, place] }); }
      }
      if (!rows.length) continue;
      rows.sort((a, b) => a.at - b.at);
      const summary = [drops && `${drops} drop-off${drops === 1 ? '' : 's'}`, picks && `${picks} pick-up${picks === 1 ? '' : 's'}`].filter(Boolean).join(', ');

      await ctx.ledger.once('partner', partner.id, `day-plan:${key}`, `Email ${partner.business_name} today's plan (${summary})`, async () => {
        const { emailAddress } = await import('./notify');
        const to = (one(partner.users) as any)?.email;
        if (!to) return { status: 'skipped', detail: { reason: 'no email' } };
        const sent = await emailAddress(to, JOB_EMAIL_SLUGS.partnerDayPlan, {
          partner_name: partner.business_name || 'there',
          date: dateOnly(ctx.now),
          summary,
          plan_html: emailTable(rows.map(r => r.row), ['Time', 'What', 'Where']),
          dashboard_url: `${urls.partner()}/dashboard/bookings`,
        });
        return { detail: { email: sent } };
      });
    }
  },
};
