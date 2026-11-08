import { bookingRef } from '../services/bookingEmails';
import type { JobDefinition } from './types';
import { alertAdmins } from './notify';
import { HOUR, istLabel, workingMinutesBetween } from './time';

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const topic = (description: string) => /^\[([^\]]+)\]/.exec(description || '')?.[1] || 'Damage / incident claim';

export const disputeResponseJob: JobDefinition = {
  name: 'disputes.response_time',
  title: 'Dispute response times',
  area: 'Disputes',
  description: 'Alerts support when a new dispute is untouched for 4 working hours, escalates to superadmin at 24 hours, and reminds support about disputes under review with no update for 72 hours.',
  cadence: { everyMinutes: 30 },
  defaultEnabled: true,
  async run(ctx) {
    const s = ctx.settings;
    const { data, error } = await ctx.db.from('damage_reports')
      .select('id, booking_id, status, description, created_at, updated_at, users!damage_reports_customer_id_fkey(full_name), partners(business_name)')
      .in('status', ['submitted', 'under_review'])
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);

    for (const d of data || []) {
      if (ctx.outOfTime()) break;
      const ref = bookingRef(d.booking_id);
      const who = `${(one(d.users) as any)?.full_name || 'Customer'} vs ${(one(d.partners) as any)?.business_name || 'partner'}`;
      const created = new Date(d.created_at);
      const path = `/dashboard/disputes?id=${d.id}`;

      if (d.status === 'submitted') {
        const workingMin = workingMinutesBetween(created, ctx.now, s.workingHoursStart, s.workingHoursEnd);
        if (workingMin >= s.disputeNewAlertWorkingHours * 60) {
          await ctx.ledger.once('dispute', d.id, 'new-alert', `Alert support: dispute on #${ref} untouched for ${s.disputeNewAlertWorkingHours} working hours`, async () => ({
            detail: await alertAdmins(ctx.db, ['support'], {
              title: `Dispute waiting: #${ref}`,
              lines: [`${topic(d.description)} (${who}), filed ${istLabel(created)}, hasn't been picked up yet.`, 'Open it and choose “Start review”.'],
              actionPath: path,
              category: 'damage',
              email: true,
            }),
          }));
        }
        if (ctx.now.getTime() - created.getTime() >= s.disputeEscalateAfterHours * HOUR) {
          await ctx.ledger.once('dispute', d.id, 'escalate', `Escalate to superadmin: dispute on #${ref} untouched for ${s.disputeEscalateAfterHours} h`, async () => ({
            detail: await alertAdmins(ctx.db, [], {
              title: `Dispute untouched for ${s.disputeEscalateAfterHours} hours: #${ref}`,
              lines: [`${topic(d.description)} (${who}) was filed ${istLabel(created)} and nobody has started reviewing it.`],
              actionPath: path,
              category: 'damage',
              email: true,
            }),
          }));
        }
      } else {
        const idleSince = new Date(d.updated_at);
        if (ctx.now.getTime() - idleSince.getTime() >= s.disputeIdleAfterHours * HOUR) {
          // Keyed on the last update, so each new quiet spell gets its own reminder
          await ctx.ledger.once('dispute', d.id, `idle:${d.updated_at}`, `Remind support: dispute on #${ref} under review with no update since ${istLabel(idleSince)}`, async () => ({
            detail: await alertAdmins(ctx.db, ['support'], {
              title: `Dispute needs an update: #${ref}`,
              lines: [`${topic(d.description)} (${who}) has been under review with no change since ${istLabel(idleSince)}.`, 'Decide it, or add a note so both sides know where it stands.'],
              actionPath: path,
              category: 'damage',
            }),
          }));
        }
      }
    }
  },
};

export const ticketResponseJob: JobDefinition = {
  name: 'support.ticket_response',
  title: 'Support ticket response',
  area: 'Disputes',
  description: 'Alerts support when a partner’s support ticket has been open for 24 hours.',
  cadence: { everyMinutes: 60 },
  defaultEnabled: true,
  async run(ctx) {
    const cutoff = new Date(ctx.now.getTime() - ctx.settings.ticketOpenAlertHours * HOUR).toISOString();
    const { data, error } = await ctx.db.from('support_tickets')
      .select('id, subject, created_at, partners(business_name)')
      .eq('status', 'open')
      .lte('created_at', cutoff)
      .limit(100);
    if (error) throw new Error(error.message);
    for (const t of data || []) {
      if (ctx.outOfTime()) break;
      await ctx.ledger.once('support_ticket', t.id, 'open-alert', `Alert support: ticket “${t.subject}” open for ${ctx.settings.ticketOpenAlertHours} h`, async () => ({
        detail: await alertAdmins(ctx.db, ['support'], {
          title: 'Partner ticket waiting',
          lines: [`${(one(t.partners) as any)?.business_name || 'A partner'} opened “${t.subject}” on ${istLabel(t.created_at)} and it's still open.`],
          actionPath: '/dashboard/partners',
          category: 'system',
        }),
      }));
    }
  },
};
