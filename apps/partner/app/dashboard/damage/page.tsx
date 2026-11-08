import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import Icon from '../../../components/Icon';
import ReportForm, { type Eligible } from './ReportForm';
import { CLAIM_STATUS, CLAIM_WINDOW_DAYS, isOpenClaim, parseReport } from './damageShared';
import { itemsLabel, ref, whenLabel } from '../bookings/bookingShared';

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function ReportItem({ r, kind }: { r: any; kind: 'claim' | 'complaint' }) {
  const p = parseReport(r.description, r.photos);
  const st = CLAIM_STATUS[r.status] ?? CLAIM_STATUS.submitted!;
  const b = one(r.bookings) as any;
  const customer = b ? one(b.customer) as any : null;
  return (
    <li className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-gray-900 dark:text-white">{p.category}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <Link href={`/dashboard/bookings/${r.booking_id}`} className="font-mono font-semibold text-orange-700 dark:text-orange-400 hover:underline">#{ref(r.booking_id)}</Link>
            {customer?.full_name ? ` · ${customer.full_name}` : ''}{b ? ` · ${itemsLabel(b)}` : ''}{b?.partner_locations?.name ? ` · ${b.partner_locations.name}` : ''}
            {' · '}{kind === 'claim' ? 'filed' : 'raised'} {whenLabel(r.created_at)}
          </p>
        </div>
        <span title={st.text} className={`shrink-0 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${st.cls}`}>{st.label}</span>
      </div>

      <p className="mt-3 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{p.details}</p>
      {p.amountClaimed && <p className="mt-2 text-sm"><span className="text-gray-500 dark:text-gray-400">Amount claimed:</span> <span className="font-bold text-gray-900 dark:text-white tabular-nums">{p.amountClaimed}</span></p>}

      {(r.photos || []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(r.photos as string[]).map((src, i) => (
            <a key={src} href={src} target="_blank" rel="noreferrer" className="block h-16 w-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 hover:ring-2 hover:ring-orange-400">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Evidence ${i + 1}`} className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}

      {kind === 'claim' && r.status === 'resolved_compensated' && Number(r.partner_award) > 0 && (
        <div className={`mt-3 flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${r.partner_award_paid_at ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30' : 'border-sky-200 dark:border-sky-800/60 bg-sky-50 dark:bg-sky-950/30'}`}>
          <Icon name={r.partner_award_paid_at ? 'check' : 'clock'} className={`w-5 h-5 shrink-0 ${r.partner_award_paid_at ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'}`} />
          <div className="min-w-0 text-sm">
            <p className="font-bold text-gray-900 dark:text-white tabular-nums">{inr(Number(r.partner_award))} {r.partner_award_paid_at ? 'paid to you' : 'approved for you'}</p>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {r.partner_award_paid_at
                ? <>Sent {whenLabel(r.partner_award_paid_at)}{r.partner_award_reference ? <> · ref <span className="font-mono">{r.partner_award_reference}</span></> : null}</>
                : 'StashInn will send it by bank transfer, usually within 5 working days.'}
            </p>
          </div>
        </div>
      )}
      {r.admin_notes ? (
        <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 px-3.5 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">StashInn’s reply{r.resolved_at ? ` · ${whenLabel(r.resolved_at)}` : ''}</p>
          <p className="mt-0.5 whitespace-pre-line text-sm text-gray-800 dark:text-gray-200">{r.admin_notes}</p>
          {Number(r.refund_amount) > 0 && <p className="mt-1 text-xs font-semibold text-gray-600 dark:text-gray-300">{inr(Number(r.refund_amount))} refunded to the customer.</p>}
        </div>
      ) : isOpenClaim(r.status) && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{st.text}</p>
      )}
    </li>
  );
}

export default async function DamageReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');

  const since = new Date(Date.now() - CLAIM_WINDOW_DAYS * 864e5).toISOString();
  const bookingFields = 'id, booking_type, num_bags, vehicle_make, vehicle_model, vehicle_license_plate, vehicle_type, customer:users!bookings_customer_id_fkey(full_name), partner_locations(name)';
  const [{ data: reports }, { data: stored }, { data: recent }] = await Promise.all([
    supabase.from('damage_reports')
      // * so the page still loads before the partner-award columns exist
      .select(`*, bookings(${bookingFields})`)
      .eq('partner_id', partner.id).order('created_at', { ascending: false }).limit(200),
    supabase.from('bookings').select(`${bookingFields}, end_time`).eq('partner_id', partner.id).eq('status', 'checked_in').order('end_time'),
    supabase.from('bookings').select(`${bookingFields}, actual_checkout`).eq('partner_id', partner.id).eq('status', 'checked_out').gte('actual_checkout', since).order('actual_checkout', { ascending: false }),
  ]);

  const eligible: Eligible[] = [
    ...(stored || []).map((b: any) => ({ id: b.id, label: `#${ref(b.id)} ${one(b.customer as any)?.full_name || 'Customer'}`, detail: `${itemsLabel(b)} · stored now` })),
    ...(recent || []).map((b: any) => ({ id: b.id, label: `#${ref(b.id)} ${one(b.customer as any)?.full_name || 'Customer'}`, detail: `${itemsLabel(b)} · picked up ${whenLabel(b.actual_checkout)}` })),
  ];

  const all = (reports || []) as any[];
  const claims = all.filter(r => parseReport(r.description, r.photos).source === 'partner');
  const complaints = all.filter(r => parseReport(r.description, r.photos).source === 'customer');
  const openClaims = claims.filter(r => isOpenClaim(r.status)).length;
  const openComplaints = complaints.filter(r => isOpenClaim(r.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Damage &amp; claims</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Report damage, unpaid charges or other problems with a booking, and follow complaints customers raised about you.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {[
          { label: 'Your open claims', value: openClaims, sub: `${claims.length} filed in total` },
          { label: 'Customer complaints', value: openComplaints, sub: openComplaints ? 'open, being reviewed' : 'none open', alert: openComplaints > 0 },
          { label: 'Can be reported', value: eligible.length, sub: `stored now or picked up in ${CLAIM_WINDOW_DAYS} days` },
        ].map(s => (
          <div key={s.label} className={`${card} p-4 min-w-0`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">{s.label}</p>
            <p className={`mt-1 text-2xl font-black tabular-nums ${s.alert ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
        <aside className="xl:col-span-2 space-y-4 xl:sticky xl:top-4">
          <section className={`${card} p-5`}>
            <h2 className="font-extrabold text-gray-900 dark:text-white">File a claim</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-4">For items stored now, or picked up in the last {CLAIM_WINDOW_DAYS} days.</p>
            {eligible.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-5 text-center">
                <p className="text-sm font-bold text-gray-900 dark:text-white">No bookings to report right now</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Claims open when items are checked in and close {CLAIM_WINDOW_DAYS} days after pick-up. For anything older, email support@stashinn.in.</p>
              </div>
            ) : (
              <ReportForm eligible={eligible} preselect={sp.booking} />
            )}
          </section>
          <section className={`${card} p-5 text-sm`}>
            <h2 className="font-extrabold text-gray-900 dark:text-white">Before you file</h2>
            <ul className="mt-2 space-y-1.5 text-gray-600 dark:text-gray-300">
              <li className="flex gap-2"><Icon name="photo" className="w-4 h-4 mt-0.5 shrink-0 text-orange-500" />Take clear photos as soon as you notice the problem.</li>
              <li className="flex gap-2"><Icon name="bag" className="w-4 h-4 mt-0.5 shrink-0 text-orange-500" />Keep damaged or left-behind items safe until we reply.</li>
              <li className="flex gap-2"><Icon name="alert" className="w-4 h-4 mt-0.5 shrink-0 text-orange-500" />If anyone is in danger, call 112 first, then file here.</li>
            </ul>
          </section>
        </aside>

        <div className="xl:col-span-3 space-y-6">
          {complaints.length > 0 && (
            <section className={`${card} overflow-hidden ${openComplaints ? 'border-amber-300 dark:border-amber-700/60' : ''}`}>
              <div className={`px-5 py-3.5 border-b ${openComplaints ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50' : 'border-gray-100 dark:border-gray-800'}`}>
                <h2 className="font-extrabold text-gray-900 dark:text-white">Complaints from customers <span className="text-gray-400 tabular-nums">({complaints.length})</span></h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">StashInn reviews these and may contact you. To share your side, email <a href={`mailto:support@stashinn.in?subject=${encodeURIComponent('Customer complaint')}`} className="font-bold text-orange-700 dark:text-orange-400 hover:underline">support@stashinn.in</a> with the booking number.</p>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">{complaints.map(r => <ReportItem key={r.id} r={r} kind="complaint" />)}</ul>
            </section>
          )}

          <section className={`${card} overflow-hidden`}>
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-extrabold text-gray-900 dark:text-white">Your claims <span className="text-gray-400 tabular-nums">({claims.length})</span></h2>
            </div>
            {claims.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <span className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center"><Icon name="check" className="w-6 h-6" /></span>
                <p className="text-sm font-bold text-gray-900 dark:text-white">No claims filed</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Claims you file show up here with StashInn’s reply.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">{claims.map(r => <ReportItem key={r.id} r={r} kind="claim" />)}</ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
