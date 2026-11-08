import { bookingRef, JOB_EMAIL_SLUGS } from '../services/bookingEmails';
import { platformDue } from '../services/bookingAvailability';
import { razorpayListPayments, razorpayRefundPayment, rupees } from '../services/bookingLifecycle';
import type { JobDefinition } from './types';
import { alertAdmins, emailTable, notifyUser, urls } from './notify';
import { DAY, istWeekKey, MIN, previousIstMonth } from './time';

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const round2 = (n: number) => Math.round(n * 100) / 100;
const monthLabel = (ym: string) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

type Statement = {
  partner_id: string; online_bookings: number; online_share: number; online_paid_out: number;
  cash_bookings: number; cash_due: number; cash_settled: number; cash_outstanding: number; no_shows: number;
};

export const monthlyStatementsJob: JobDefinition = {
  name: 'settlements.monthly_statements',
  title: 'Monthly statements',
  area: 'Payments',
  description: 'On the 1st at 06:00, emails each partner last month’s statement (online earnings, cash commission due and settled) and sends finance a summary. Writes nothing to the ledger of payouts.',
  cadence: { monthlyOn: 1, at: '06:00' },
  defaultEnabled: true,
  async run(ctx) {
    const month = previousIstMonth(ctx.now);
    const { data, error } = await (ctx.db as any).rpc('partner_monthly_statements', { target_month: month });
    if (error) throw new Error(error.message);
    const statements = (data || []) as Statement[];
    ctx.count('partners', statements.length);
    if (!statements.length) return;

    const { data: partners } = await ctx.db.from('partners')
      .select('id, business_name, user_id, users!partners_user_id_fkey(email)')
      .in('id', statements.map(s => s.partner_id));
    const label = monthLabel(month);

    for (const st of statements) {
      if (ctx.outOfTime()) break;
      const partner = (partners || []).find((p: any) => p.id === st.partner_id) as any;
      if (!partner) continue;
      const n = (v: unknown) => Number(v) || 0;
      const toPay = round2(n(st.online_share) - n(st.online_paid_out));
      const rows: string[][] = [];
      if (n(st.online_bookings)) {
        rows.push([`Paid online: ${st.online_bookings} booking(s)`, `Your share ${rupees(n(st.online_share))}`]);
        rows.push(['Already paid to you', rupees(n(st.online_paid_out))]);
        rows.push(['Still to be paid to you', rupees(toPay)]);
      }
      if (n(st.cash_bookings)) {
        rows.push([`Paid at your location: ${st.cash_bookings} booking(s)`, `StashInn's share ${rupees(n(st.cash_due))}`]);
        rows.push(['You have settled', rupees(n(st.cash_settled))]);
        rows.push(['Still to settle with StashInn', rupees(n(st.cash_outstanding))]);
      }
      if (n(st.no_shows)) rows.push([`No-shows (online-paid ones count as earnings)`, String(st.no_shows)]);

      await ctx.ledger.once('partner', partner.id, `statement:${month}`, `Email ${partner.business_name} the ${label} statement`, async () => ({
        detail: await notifyUser(ctx.db, { id: partner.user_id, email: (one(partner.users) as any)?.email }, {
          title: `Your ${label} statement`,
          message: [toPay > 0 && `${rupees(toPay)} to be paid to you`, n(st.cash_outstanding) > 0 && `${rupees(n(st.cash_outstanding))} to settle with StashInn`].filter(Boolean).join(' · ') || 'All settled.',
          category: 'payment',
          actionUrl: '/dashboard/earnings',
          email: {
            slug: JOB_EMAIL_SLUGS.partnerStatement,
            vars: { partner_name: partner.business_name || 'there', month_label: label, statement_html: emailTable(rows), dashboard_url: `${urls.partner()}/dashboard/earnings` },
          },
          urgent: true,
        }),
      }));
    }

    const sum = (k: keyof Statement) => round2(statements.reduce((a, s) => a + (Number(s[k]) || 0), 0));
    await ctx.ledger.once('report', month, 'finance-summary', `Send finance the ${label} summary`, async () => ({
      detail: await alertAdmins(ctx.db, ['finance'], {
        title: `Partner statements sent for ${label}`,
        lines: [
          `${statements.length} partner(s). Online: ${rupees(sum('online_share'))} partner share, ${rupees(round2(sum('online_share') - sum('online_paid_out')))} still to pay out.`,
          `Cash: ${rupees(sum('cash_due'))} StashInn share collected by partners, ${rupees(sum('cash_outstanding'))} not yet settled.`,
        ],
        actionPath: '/dashboard/settlements',
        category: 'payment',
        email: true,
      }),
    }));
  },
};

export const cashDuesJob: JobDefinition = {
  name: 'settlements.cash_dues',
  title: 'Cash commission reminders',
  area: 'Payments',
  description: 'Once a week, reminds partners who collected payment at their location and haven’t settled StashInn’s share after 7 days. Longer delays appear in the ops digest.',
  cadence: { dailyAt: '10:00' },
  defaultEnabled: true,
  async run(ctx) {
    const s = ctx.settings;
    const { data, error } = await ctx.db.from('payments')
      // * so this works before payments.collected_via exists; StashInn-QR payments aren't partner dues
      .select('*, bookings!inner(id, partner_id, status, actual_checkout, commission_amount, gst_amount)')
      .eq('method', 'pay_at_location')
      .eq('status', 'pending')
      .eq('bookings.status', 'checked_out')
      .lte('bookings.actual_checkout', new Date(ctx.now.getTime() - s.cashDueReminderAfterDays * DAY).toISOString())
      .limit(1000);
    if (error) throw new Error(error.message);

    const byPartner = new Map<string, any[]>();
    for (const p of data || []) {
      const b = one(p.bookings) as any;
      if (!b || (p as any).collected_via === 'stashinn_qr') continue;
      byPartner.set(b.partner_id, [...(byPartner.get(b.partner_id) || []), b]);
    }
    if (!byPartner.size) return;
    const { data: partners } = await ctx.db.from('partners').select('id, business_name, user_id, users!partners_user_id_fkey(email)').in('id', [...byPartner.keys()]);
    const week = istWeekKey(ctx.now);

    for (const [partnerId, bookings] of byPartner) {
      if (ctx.outOfTime()) break;
      const partner = (partners || []).find((p: any) => p.id === partnerId) as any;
      if (!partner) continue;
      const total = round2(bookings.reduce((a, b) => a + platformDue(b), 0));
      const rows = bookings.map(b => [`#${bookingRef(b.id)}`, new Date(b.actual_checkout).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }), rupees(platformDue(b))]);
      await ctx.ledger.once('partner', partnerId, `cash-dues:${week}`, `Remind ${partner.business_name} to settle ${rupees(total)} for ${bookings.length} cash booking(s)`, async () => ({
        detail: await notifyUser(ctx.db, { id: partner.user_id, email: (one(partner.users) as any)?.email }, {
          title: `${rupees(total)} to settle with StashInn`,
          message: `StashInn's share for ${bookings.length} booking(s) paid at your location is still unsettled. Pay it and upload the proof under Settlements.`,
          category: 'payment',
          actionUrl: '/dashboard/settlements',
          email: {
            slug: JOB_EMAIL_SLUGS.partnerCashDues,
            vars: { partner_name: partner.business_name || 'there', total: total.toFixed(2), count: String(bookings.length), dues_html: emailTable(rows, ['Booking', 'Picked up', 'StashInn share']), dashboard_url: `${urls.partner()}/dashboard/settlements` },
          },
          urgent: true,
        }),
      }));
    }
  },
};

export const orphanPaymentsJob: JobDefinition = {
  name: 'payments.orphan_payments',
  title: 'Payments without a booking',
  area: 'Payments',
  description: 'Every hour, checks Razorpay for captured payments from the last 2 days that never became a booking (checkout failed after paying), refunds them and alerts finance.',
  cadence: { everyMinutes: 60 },
  defaultEnabled: true,
  async run(ctx) {
    const to = new Date(ctx.now.getTime() - ctx.settings.orphanPaymentAfterMin * MIN);
    const from = new Date(ctx.now.getTime() - 2 * DAY);
    const list = await razorpayListPayments(from, to);
    if ('error' in list) {
      // No keys locally is normal; anything else is worth a failed run
      if (/not configured/.test(list.error)) { ctx.count('skippedNoKeys'); return; }
      throw new Error(list.error);
    }
    const captured = list.items.filter((p: any) => p.status === 'captured' && Number(p.amount) > Number(p.amount_refunded || 0));
    ctx.count('captured', captured.length);
    if (!captured.length) return;

    const { data: known } = await ctx.db.from('payments').select('razorpay_payment_id').in('razorpay_payment_id', captured.map((p: any) => p.id));
    const knownIds = new Set((known || []).map((k: any) => k.razorpay_payment_id));
    const orphans = captured.filter((p: any) => !knownIds.has(p.id));
    ctx.count('orphans', orphans.length);

    for (const p of orphans) {
      if (ctx.outOfTime()) break;
      const amount = round2((Number(p.amount) - Number(p.amount_refunded || 0)) / 100);
      await ctx.ledger.once('razorpay_payment', p.id, 'refund', `Refund ${rupees(amount)} for Razorpay payment ${p.id} (no booking was saved)`, async () => {
        const r = await razorpayRefundPayment(p.id, amount, 'StashInn: payment without a booking');
        if ('error' in r) throw new Error(r.error);
        const alert = await alertAdmins(ctx.db, ['finance'], {
          title: `Refunded a payment with no booking: ${rupees(amount)}`,
          lines: [
            `Razorpay payment ${p.id} (${p.email || 'no email'}${p.contact ? `, ${p.contact}` : ''}, order ${p.order_id || '—'}) was captured on ${new Date(p.created_at * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} but no booking was saved, so it has been refunded (refund ${r.id}).`,
            'Check whether the customer needs help rebooking.',
          ],
          actionPath: '/dashboard/bookings',
          category: 'payment',
          email: true,
        });
        return { detail: { amount, refund: r.id, email: p.email || null, ...alert } };
      });
    }
  },
};
