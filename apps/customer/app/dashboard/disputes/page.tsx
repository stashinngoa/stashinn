import Link from 'next/link';
import { Suspense } from 'react';
import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { loadLegal } from '@stashinn/lib/services/legal';
import { PARTNER_CLAIM_CATEGORIES } from '@stashinn/lib/constants';
import ReportForm from './ReportForm';

const STATUS: Record<string, { label: string; cls: string; text: string }> = {
  submitted: { label: 'Received', cls: 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800/60', text: 'Our support team will look into it shortly.' },
  under_review: { label: 'Under review', cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60', text: 'We’re checking the details with the partner.' },
  escalated: { label: 'Escalated', cls: 'bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800/60', text: 'A senior team member is handling this.' },
  resolved_refund: { label: 'Resolved · refund', cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60', text: 'Resolved with a refund to your original payment method.' },
  resolved_no_action: { label: 'Closed', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700', text: 'Closed after review.' },
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export default async function CustomerDisputesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: allReports }, { data: bookings }, legal] = await Promise.all([
    supabase.from('damage_reports').select('id, booking_id, description, photos, status, admin_notes, refund_amount, created_at, bookings(partner_locations(name))').eq('customer_id', user.id).order('created_at', { ascending: false }),
    supabase.from('bookings').select('id, start_time, status, partner_locations(name)').eq('customer_id', user.id).neq('status', 'cancelled').order('start_time', { ascending: false }).limit(50),
    loadLegal(createServiceClient()),
  ]);
  const supportEmail = legal.details.support_email || 'support@stashinn.in';
  // Partners' claims about this customer share the table; only show what the customer filed
  const reports = (allReports || []).filter((r: any) => {
    const tag = /^\[([^\]]+)\]/.exec(r.description || '')?.[1];
    if (tag) return !(PARTNER_CLAIM_CATEGORIES as readonly string[]).includes(tag);
    return (r.photos || []).some((p: string) => p.includes('/customer-'));
  });

  const eligible = (bookings || []).map((b: any) => ({
    id: b.id,
    label: `${b.partner_locations?.name || 'Booking'} · ${new Date(b.start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })} · #${b.id.split('-')[0].toUpperCase()}`,
  }));

  const quick = [
    { href: '/help', title: 'Help Centre', text: 'Answers about booking, drop-off and payments' },
    { href: '/cancellation', title: 'Cancellations & refunds', text: 'When you can cancel for free' },
    { href: '/terms#6-stashguard', title: 'StashGuard', text: 'What’s covered and how to claim' },
    { href: `mailto:${supportEmail}`, title: 'Email support', text: supportEmail },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Help &amp; disputes</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Find answers, or tell us about a problem with a booking.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {quick.map(q => (
          <Link key={q.title} href={q.href} target={q.href.startsWith('/') ? undefined : '_blank'} className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-orange-300 dark:hover:border-orange-700/60 transition-colors">
            <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-400">{q.title} →</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">{q.text}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] gap-6 items-start">
        <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 xl:sticky xl:top-24">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Report a problem</h2>
          <p className="mt-0.5 mb-5 text-sm text-gray-500 dark:text-gray-400">Our support team reviews every report and replies by email.</p>
          {eligible.length === 0 ? (
            <p className="rounded-2xl bg-gray-50 dark:bg-gray-950/50 px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
              You don&apos;t have a booking to report on. For anything else, email <a href={`mailto:${supportEmail}`} className="font-semibold text-orange-700 dark:text-orange-400">{supportEmail}</a>.
            </p>
          ) : (
            <Suspense>
              <ReportForm eligibleBookings={eligible} />
            </Suspense>
          )}
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mb-3">Your reports</h2>
          {!reports?.length ? (
            <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 p-10 text-center text-sm text-gray-500 dark:text-gray-400">
              You haven&apos;t reported any problems. We hope it stays that way.
            </div>
          ) : (
            <ul className="space-y-4">
              {reports.map((r: any) => {
                const st = STATUS[r.status] ?? STATUS.submitted!;
                const m = /^\[(.+?)\]\s*([\s\S]*)$/.exec(r.description || '');
                return (
                  <li key={r.id} className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white">{m?.[1] || 'Issue reported'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {r.bookings?.partner_locations?.name || 'Booking'} · <span className="font-mono">#{String(r.booking_id).split('-')[0]!.toUpperCase()}</span> · Sent {fmtDate(r.created_at)}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{m?.[2] ?? r.description}</p>
                    {r.photos?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.photos.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover hover:opacity-80" />
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-950/50 px-3.5 py-2.5 text-xs text-gray-600 dark:text-gray-400">
                      <p>{r.status === 'resolved_refund' && Number(r.refund_amount) > 0 ? `Resolved with a refund of ₹${Number(r.refund_amount).toLocaleString('en-IN')}.` : st.text}</p>
                      {r.admin_notes && <p className="mt-1.5 text-gray-700 dark:text-gray-300"><span className="font-semibold">Note from StashInn:</span> {r.admin_notes}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
