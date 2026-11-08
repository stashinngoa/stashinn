import { bookingRef, emailLayout } from '../services/bookingEmails';
import { ExternalNotificationService } from '../services/notifications';
import { platformDue } from '../services/bookingAvailability';
import { REFUND_RETRY_JOB, rupees } from '../services/bookingLifecycle';
import type { JobContext, JobDefinition } from './types';
import { MAX_ATTEMPTS } from './ledger';
import { emailTable, escapeHtml, urls } from './notify';
import { DAY, HOUR, istDateKey, istLabel } from './time';

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

type Section = { title: string; count: number; note?: string; rows?: string[][]; head?: string[]; path: string };

async function gather(ctx: JobContext): Promise<Section[]> {
  const { db, now, settings: s } = ctx;
  const iso = (ms: number) => new Date(ms).toISOString();
  const t = now.getTime();

  const [pending, autoCancelled, noShows, overdue, disputes, tickets, applications, infoRequests, cashDues, refundFails, jobErrors, stepFails] = await Promise.all([
    db.from('bookings').select('id, start_time, partner_locations(name)').eq('status', 'pending').gte('start_time', iso(t)).lte('start_time', iso(t + DAY)).order('start_time').limit(50),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('cancellation_code', 'partner_no_response').gte('updated_at', iso(t - DAY)),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('cancellation_code', 'no_show').gte('updated_at', iso(t - DAY)),
    db.from('bookings').select('id, end_time, partner_locations(name), users!bookings_customer_id_fkey(full_name)').eq('status', 'checked_in').lt('end_time', iso(t)).order('end_time').limit(50),
    db.from('damage_reports').select('id, status, created_at').in('status', ['submitted', 'under_review', 'escalated']).limit(500),
    db.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    db.from('partners').select('id, business_name, created_at').eq('status', 'pending').lte('created_at', iso(t - s.applicationPendingAlertHours * HOUR)).order('created_at').limit(50),
    db.from('partners').select('id, info_requested_at, info_responded_at').not('info_requested_at', 'is', null).limit(500),
    db.from('payments').select('*, bookings!inner(id, status, actual_checkout, commission_amount, gst_amount, partners(business_name))')
      .eq('method', 'pay_at_location').eq('status', 'pending').eq('bookings.status', 'checked_out').lte('bookings.actual_checkout', iso(t - s.cashDueEscalateAfterDays * DAY)).limit(500),
    db.from('job_events').select('id', { count: 'exact', head: true }).eq('job', REFUND_RETRY_JOB).eq('status', 'failed').gte('attempts', MAX_ATTEMPTS),
    db.from('job_runs').select('job, error').eq('status', 'error').gte('started_at', iso(t - DAY)).limit(50),
    db.from('job_events').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('updated_at', iso(t - DAY)),
  ]);

  const disputeRows = disputes.data || [];
  const byStatus = (st: string) => disputeRows.filter((d: any) => d.status === st).length;
  const openInfo = (infoRequests.data || []).filter((p: any) => !p.info_responded_at || new Date(p.info_responded_at) < new Date(p.info_requested_at)).length;
  const duesByPartner = new Map<string, { n: number; total: number }>();
  // StashInn-QR payments at drop-off are StashInn's money, not partner dues
  const partnerDues = (cashDues.data || []).filter((p: any) => p.collected_via !== 'stashinn_qr');
  for (const p of partnerDues) {
    const b = one(p.bookings) as any;
    const name = (one(b?.partners) as any)?.business_name || 'Partner';
    const cur = duesByPartner.get(name) || { n: 0, total: 0 };
    cur.n++; cur.total += platformDue(b);
    duesByPartner.set(name, cur);
  }
  const jobErrorList = jobErrors.data || [];

  return [
    { title: 'Bookings not accepted, drop-off in the next 24 h', count: pending.data?.length || 0, path: '/dashboard/bookings?status=pending',
      head: ['Booking', 'Location', 'Drop-off'], rows: (pending.data || []).slice(0, 10).map((b: any) => [`#${bookingRef(b.id)}`, (one(b.partner_locations) as any)?.name || '', istLabel(b.start_time)]) },
    { title: 'Overdue pick-ups', count: overdue.data?.length || 0, path: '/dashboard/bookings?status=checked_in',
      head: ['Booking', 'Customer', 'Was due'], rows: (overdue.data || []).slice(0, 10).map((b: any) => [`#${bookingRef(b.id)} · ${(one(b.partner_locations) as any)?.name || ''}`, (one(b.users) as any)?.full_name || '', istLabel(b.end_time)]) },
    { title: 'Auto-cancelled in the last 24 h (partner didn’t answer)', count: autoCancelled.count || 0, path: '/dashboard/bookings?status=cancelled' },
    { title: 'No-shows in the last 24 h', count: noShows.count || 0, path: '/dashboard/bookings?status=cancelled' },
    { title: 'Open disputes', count: disputeRows.length, note: `${byStatus('submitted')} new · ${byStatus('under_review')} under review · ${byStatus('escalated')} escalated`, path: '/dashboard/disputes' },
    { title: 'Open partner tickets', count: tickets.count || 0, path: '/dashboard/partners' },
    { title: `Partner applications waiting more than ${s.applicationPendingAlertHours} h`, count: applications.data?.length || 0, path: '/dashboard/partners?status=pending',
      head: ['Partner', 'Applied'], rows: (applications.data || []).slice(0, 10).map((p: any) => [p.business_name || 'Unnamed', istLabel(p.created_at)]) },
    { title: 'Unanswered info requests to partners', count: openInfo, path: '/dashboard/partners' },
    { title: `Cash commission unpaid for more than ${s.cashDueEscalateAfterDays} days`, count: partnerDues.length, path: '/dashboard/settlements',
      head: ['Partner', 'Bookings', 'Owed'], rows: [...duesByPartner.entries()].map(([name, v]) => [name, String(v.n), rupees(Math.round(v.total * 100) / 100)]) },
    { title: 'Refunds that failed 3 times', count: refundFails.count || 0, path: '/dashboard/jobs' },
    { title: 'Scheduled job problems in the last 24 h', count: jobErrorList.length + (stepFails.count || 0), note: `${jobErrorList.length} failed runs · ${stepFails.count || 0} failed steps`, path: '/dashboard/jobs' },
  ];
}

export const opsDigestJob: JobDefinition = {
  name: 'ops.daily_digest',
  title: 'Daily ops digest',
  area: 'Ops',
  description: 'At 09:00, one email to the admin team listing what needs attention: unaccepted bookings, overdue pick-ups, disputes, applications, unpaid cash commission, failed refunds and job problems.',
  cadence: { dailyAt: '09:00' },
  defaultEnabled: true,
  async run(ctx) {
    const sections = await gather(ctx);
    const needs = sections.filter(x => x.count > 0);
    ctx.count('itemsNeedingAttention', needs.reduce((n, x) => n + x.count, 0));
    const day = istDateKey(ctx.now);

    await ctx.ledger.once('digest', day, 'send', `Send the ops digest for ${day} (${needs.length} section(s) need attention)`, async () => {
      const admin = urls.admin();
      const html = emailLayout(
        `<h2 style="margin:0 0 6px;font-size:22px;color:#111827;">Ops digest · ${escapeHtml(day)}</h2>` +
        `<p style="margin:0 0 18px;font-size:14px;color:#6b7280;">${needs.length ? `${needs.length} thing${needs.length === 1 ? '' : 's'} need attention today.` : 'All clear: nothing needs attention.'}</p>` +
        sections.map(x =>
          `<h3 style="margin:18px 0 6px;font-size:15px;color:#111827;">${escapeHtml(x.title)} <span style="display:inline-block;margin-left:6px;padding:1px 9px;border-radius:999px;font-size:12px;background:${x.count ? '#fff7ed' : '#f3f4f6'};color:${x.count ? '#c2410c' : '#6b7280'};">${x.count}</span></h3>` +
          (x.note ? `<p style="margin:0 0 6px;font-size:13px;color:#6b7280;">${escapeHtml(x.note)}</p>` : '') +
          (x.count && x.rows?.length ? emailTable(x.rows, x.head) : '') +
          (x.count ? `<p style="margin:0 0 6px;font-size:13px;"><a href="${admin}${x.path}" style="color:#ea580c;font-weight:700;">Open →</a></p>` : ''),
        ).join(''),
      );

      const { data: admins } = await ctx.db.from('users').select('id, email').eq('role', 'admin');
      let emailed = 0;
      for (const a of admins || []) {
        if (a.email && (await ExternalNotificationService.sendEmail(a.email, `StashInn ops digest · ${day}${needs.length ? ` · ${needs.length} to check` : ' · all clear'}`, html)).success) emailed++;
      }
      if (admins?.length) {
        await ctx.db.from('notifications').insert(admins.map((a: any) => ({
          user_id: a.id,
          title: `Ops digest · ${day}`,
          message: needs.length ? needs.map(x => `${x.count} ${x.title.toLowerCase()}`).join(' · ') : 'All clear: nothing needs attention.',
          category: 'system',
          action_url: '/dashboard',
        })));
      }
      return { detail: { admins: admins?.length || 0, emailed, sections: Object.fromEntries(sections.map(x => [x.title, x.count])) } };
    });
  },
};
