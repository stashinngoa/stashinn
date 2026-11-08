import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { getAdminContext } from '../../../../lib/adminAccess';
import { accessFor } from '../../../../lib/permissions';
import { statusOf } from '../../bookingStatus';
import BlockButton from '../BlockButton';

export const dynamic = 'force-dynamic';

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';
const eyebrow = 'text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400';
const th = 'px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap';
const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmt = (iso: string | null | undefined, time = true) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', ...(time ? { hour: 'numeric', minute: '2-digit' } : {}), timeZone: 'Asia/Kolkata' }) : '—';
const ref = (id: string) => `#${id.split('-')[0]!.toUpperCase()}`;

const CANCEL_LABEL: Record<string, string> = {
  customer: 'Cancelled by customer', partner: 'Declined by partner', admin: 'Cancelled by StashInn',
  partner_no_response: 'Auto-cancelled: partner didn’t answer', no_show: 'No-show',
};
const DISPUTE_LABEL: Record<string, { label: string; cls: string }> = {
  submitted: { label: 'New', cls: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-700/50' },
  under_review: { label: 'Under review', cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/50' },
  escalated: { label: 'Escalated', cls: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700/50' },
  resolved_refund: { label: 'Refunded', cls: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/50' },
  resolved_compensated: { label: 'Partner paid', cls: 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-700/50' },
  resolved_no_action: { label: 'Closed', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700' },
};
const AUDIT_LABEL: Record<string, string> = {
  'customer.blocked': 'Blocked', 'customer.unblocked': 'Unblocked', 'notification_preferences.updated': 'Changed notification settings',
};

export default async function CustomerDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { role } = await getAdminContext();
  const access = role ? accessFor(role, '/dashboard/customers') : null;
  if (!access) return null; // the middleware redirects before this

  const db = createServiceClient();
  const { data: customer } = await db.from('users').select('id, full_name, email, phone, role, is_blocked, created_at').eq('id', id).maybeSingle();
  if (!customer || customer.role !== 'customer') notFound();

  const [{ data: authData }, { data: bookings }, { data: disputes }, { data: reviews }, { data: prefs }, { data: audit }] = await Promise.all([
    db.auth.admin.getUserById(id),
    db.from('bookings')
      .select('id, status, booking_type, num_bags, vehicle_type, vehicle_license_plate, start_time, end_time, actual_checkin, actual_checkout, total_amount, cancellation_code, cancellation_reason, created_at, partner_locations(name, city), payments(method, status, amount, refund_amount, created_at)')
      .eq('customer_id', id)
      .order('start_time', { ascending: false }),
    db.from('damage_reports').select('id, booking_id, status, description, refund_amount, admin_notes, created_at').eq('customer_id', id).order('created_at', { ascending: false }),
    db.from('reviews').select('id, booking_id, rating, comment, created_at, partner_locations(name)').eq('customer_id', id).order('created_at', { ascending: false }),
    db.from('notification_preferences').select('in_app, email, whatsapp, sms').eq('user_id', id).maybeSingle(),
    db.from('audit_logs').select('id, action, new_values, created_at, users(full_name, email)').eq('entity_id', id).order('created_at', { ascending: false }).limit(20),
  ]);
  const authUser = authData?.user;

  const list = bookings || [];
  const isUpcoming = (s: string) => ['pending', 'confirmed', 'checked_in'].includes(s);
  const completed = list.filter((b: any) => b.status === 'checked_out');
  const upcoming = list.filter((b: any) => isUpcoming(b.status));
  const cancelled = list.filter((b: any) => b.status === 'cancelled');
  const noShows = cancelled.filter((b: any) => b.cancellation_code === 'no_show').length;
  const spent = completed.reduce((s, b: any) => s + (Number(b.total_amount) || 0), 0);
  const refunded = list.reduce((s, b: any) => s + ((b.payments as any[]) || []).reduce((t, p) => t + (Number(p.refund_amount) || 0), 0), 0);
  const openDisputes = (disputes || []).filter((d: any) => ['submitted', 'under_review', 'escalated'].includes(d.status)).length;
  const avgRating = reviews?.length ? reviews.reduce((s, r: any) => s + r.rating, 0) / reviews.length : null;

  const stats = [
    { label: 'Bookings', value: String(list.length), sub: `${completed.length} completed · ${upcoming.length} upcoming` },
    { label: 'Spent', value: rupees(Math.round(spent * 100) / 100), sub: 'On completed bookings' },
    { label: 'Cancelled', value: String(cancelled.length), sub: noShows ? `${noShows} no-show${noShows === 1 ? '' : 's'}` : 'No no-shows' },
    { label: 'Refunded', value: rupees(Math.round(refunded * 100) / 100), sub: 'Back to the customer' },
    { label: 'Disputes', value: String(disputes?.length || 0), sub: openDisputes ? `${openDisputes} open` : 'None open' },
    { label: 'Reviews', value: String(reviews?.length || 0), sub: avgRating ? `${avgRating.toFixed(1)} ★ average` : 'None yet' },
  ];
  const name = customer.full_name || customer.email || 'Customer';
  const providers: string[] = (authUser?.app_metadata?.providers as string[]) || (authUser?.app_metadata?.provider ? [authUser.app_metadata.provider as string] : []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Link href="/dashboard/customers" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400">← Customers</Link>

      {/* Header */}
      <section className={`${card} p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-5`}>
        <span className="w-16 h-16 shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-white text-2xl font-black flex items-center justify-center">
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white truncate">{customer.full_name || 'No name'}</h1>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${customer.is_blocked
              ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700/50'
              : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/50'}`}>
              {customer.is_blocked ? 'Blocked' : 'Active'}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <a href={`mailto:${customer.email}`} className="text-orange-700 dark:text-orange-400 hover:underline">{customer.email}</a>
            {customer.phone ? <a href={`tel:${customer.phone}`} className="text-orange-700 dark:text-orange-400 hover:underline">{customer.phone}</a> : <span className="text-gray-400">No phone</span>}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Joined {fmt(customer.created_at, false)} · Last signed in {authUser?.last_sign_in_at ? fmt(authUser.last_sign_in_at) : 'never'}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link href={`/dashboard/bookings?q=${encodeURIComponent(customer.email || '')}`} className="px-4 py-2 text-sm font-bold rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">Open in Bookings</Link>
          {access === 'full' && <BlockButton userId={customer.id} name={name} blocked={customer.is_blocked} upcoming={upcoming.length} size="md" />}
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map(s => (
          <div key={s.label} className={`${card} p-4`}>
            <p className={eyebrow}>{s.label}</p>
            <p className="mt-1 text-xl font-black tabular-nums text-gray-900 dark:text-white">{s.value}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {/* Bookings */}
          <section className={`${card} overflow-hidden`}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white">Bookings</h2>
            </div>
            {list.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No bookings yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-950/60">
                    <tr><th className={th}>Booking</th><th className={th}>Location</th><th className={th}>When</th><th className={th}>Storing</th><th className={`${th} text-right`}>Total</th><th className={th}>Payment</th><th className={th}>Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {list.map((b: any) => {
                      const st = statusOf(b.status);
                      const loc = one(b.partner_locations) as any;
                      const pay = [...((b.payments as any[]) || [])].sort((x, y) => (x.created_at < y.created_at ? 1 : -1))[0];
                      const refundedHere = Number(pay?.refund_amount) || 0;
                      return (
                        <tr key={b.id} className="align-top">
                          <td className="px-4 py-3 font-mono text-xs font-bold text-gray-900 dark:text-white whitespace-nowrap">{ref(b.id)}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{loc?.name || '—'}{loc?.city && <span className="block text-xs text-gray-500 dark:text-gray-400">{loc.city}</span>}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{fmt(b.start_time)}<span className="block text-xs text-gray-500 dark:text-gray-400">to {fmt(b.end_time)}</span></td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{b.booking_type === 'garage' ? (b.vehicle_license_plate || 'Vehicle') : `${b.num_bags} bag${b.num_bags === 1 ? '' : 's'}`}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-right font-semibold tabular-nums text-gray-900 dark:text-white">{rupees(Number(b.total_amount) || 0)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                            {pay ? <>{pay.method === 'razorpay' ? 'Online' : 'At location'} · <span className="capitalize">{String(pay.status).replace(/_/g, ' ')}</span></> : '—'}
                            {refundedHere > 0 && <span className="block text-emerald-700 dark:text-emerald-400">{rupees(refundedHere)} refunded</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${st.badge}`}>{st.label}</span>
                            {b.status === 'cancelled' && b.cancellation_code && <span className="block mt-1 text-[11px] text-gray-500 dark:text-gray-400">{CANCEL_LABEL[b.cancellation_code] || b.cancellation_code}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Disputes */}
          <section className={`${card} overflow-hidden`}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white">Disputes</h2>
            </div>
            {!disputes?.length ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No disputes.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {disputes.map((d: any) => {
                  const m = /^\[([^\]]+)\]\s*([\s\S]*)$/.exec(d.description || '');
                  const s = DISPUTE_LABEL[d.status] || DISPUTE_LABEL.submitted!;
                  return (
                    <li key={d.id}>
                      <Link href={`/dashboard/disputes?id=${d.id}&status=all`} className="block px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">{ref(d.booking_id)}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${s.cls}`}>{s.label}</span>
                          {Number(d.refund_amount) > 0 && <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{rupees(Number(d.refund_amount))} refunded</span>}
                          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{fmt(d.created_at, false)}</span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{m?.[1] || 'Partner claim'}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{m?.[2] || d.description}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Reviews */}
          <section className={`${card} overflow-hidden`}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white">Reviews written</h2>
            </div>
            {!reviews?.length ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No reviews yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {reviews.map((r: any) => (
                  <li key={r.id} className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500 tracking-tight" aria-label={`${r.rating} out of 5`}>{'★'.repeat(r.rating)}<span className="text-gray-300 dark:text-gray-700">{'★'.repeat(5 - r.rating)}</span></span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{(one(r.partner_locations) as any)?.name || 'Location'}</span>
                      <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{fmt(r.created_at, false)}</span>
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Side */}
        <div className="space-y-6">
          <section className={`${card} p-5`}>
            <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">Account</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-gray-500 dark:text-gray-400">Signs in with</dt><dd className="text-right text-gray-900 dark:text-white">{providers.length ? providers.map(p => (p === 'email' ? 'Email code' : p === 'phone' ? 'Phone code' : p)).join(', ') : 'Email code'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500 dark:text-gray-400">Email verified</dt><dd className="text-gray-900 dark:text-white">{authUser?.email_confirmed_at ? 'Yes' : 'No'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500 dark:text-gray-400">Last sign-in</dt><dd className="text-right text-gray-900 dark:text-white">{fmt(authUser?.last_sign_in_at)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500 dark:text-gray-400">Customer ID</dt><dd className="font-mono text-xs text-gray-600 dark:text-gray-400 truncate">{customer.id}</dd></div>
            </dl>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">Notifications</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {([['in_app', 'In-app'], ['email', 'Email'], ['whatsapp', 'WhatsApp'], ['sms', 'SMS']] as const).map(([k, label]) => {
                const on = prefs ? !!(prefs as any)[k] : k === 'in_app' || k === 'email';
                return <span key={k} className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${on ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/50' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 line-through'}`}>{label}</span>;
              })}
            </div>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">Staff activity</h2>
            {!audit?.length ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">No staff actions on this account.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {audit.map((a: any) => {
                  const by = one(a.users) as any;
                  return (
                    <li key={a.id} className="text-xs">
                      <p className="font-semibold text-gray-900 dark:text-white">{AUDIT_LABEL[a.action] || a.action.replace(/[._]/g, ' ')}</p>
                      <p className="text-gray-500 dark:text-gray-400">{by?.full_name || by?.email || 'System'} · {fmt(a.created_at)}</p>
                      {a.new_values?.reason && <p className="mt-0.5 text-gray-700 dark:text-gray-300">“{a.new_values.reason}”</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
