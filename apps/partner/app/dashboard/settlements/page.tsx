import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { loadLegal } from '@stashinn/lib/services/legal';
import Icon from '../../../components/Icon';
import UploadProofForm from './UploadProofForm';
import DownloadPDFWrapper from './DownloadPDFWrapper';
import { loadSettlements } from './settlementData';
import { itemsLabel } from '../bookings/bookingShared';

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';
const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—');

const BATCH: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Being verified', cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60' },
  processing: { label: 'Being verified', cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60' },
  completed: { label: 'Verified', cls: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' },
  failed: { label: 'Rejected', cls: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60' },
};

export default async function SettlementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const { data: partner } = await supabase.from('partners').select('id, business_name').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');

  const service = createServiceClient();
  const [s, legal] = await Promise.all([loadSettlements(supabase, partner.id, itemsLabel), loadLegal(service)]);
  const upiId = (legal.details.settlement_upi_id || '').trim();
  const bankDetails = (legal.details.settlement_bank_details || '').trim();
  const payoutSchedule = (legal.details.payout_schedule || '').trim();

  // Proofs are private: short-lived signed links
  if (s.batches.length) {
    const { data } = await service.storage.from('settlement_proofs').createSignedUrls(s.batches.map(b => b.proofPath), 3600);
    const map = new Map((data || []).map(d => [d.path, d.signedUrl]));
    s.batches.forEach(b => { b.proofUrl = map.get(b.proofPath) ?? null; });
  }
  const owedToYou = s.onlineOwed + s.awardsOwed;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Settlements</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Money between you and StashInn, in both directions.</p>
      </div>

      {/* The two directions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className={`${card} p-5 ${s.dueTotal > 0 ? 'border-amber-300 dark:border-amber-700/60' : ''}`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">You owe StashInn</p>
            <span className="h-8 w-8 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"><Icon name="arrowOut" className="w-4 h-4" /></span>
          </div>
          <p className={`mt-1 text-3xl font-black tabular-nums ${s.dueTotal > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>{rupees(s.dueTotal)}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {s.due.length ? `Commission + GST on ${s.due.length} completed pay-at-drop-off booking${s.due.length === 1 ? '' : 's'}.` : 'Nothing to pay right now.'}
          </p>
          <ul className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
            {s.verifyingTotal > 0 && <li>{rupees(s.verifyingTotal)} sent and being verified ({s.verifying.length})</li>}
            {s.notYetTotal > 0 && <li>{rupees(s.notYetTotal)} becomes due when {s.notYet.length} stored booking{s.notYet.length === 1 ? ' is' : 's are'} picked up</li>}
            {s.settledCount > 0 && <li>{rupees(s.settledTotal)} already settled ({s.settledCount} booking{s.settledCount === 1 ? '' : 's'})</li>}
          </ul>
        </section>

        <section className={`${card} p-5`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">StashInn owes you</p>
            <span className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"><Icon name="arrowIn" className="w-4 h-4" /></span>
          </div>
          <p className="mt-1 text-3xl font-black tabular-nums text-gray-900 dark:text-white">{rupees(owedToYou)}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {s.onlineCount ? `Your share of ${s.onlineCount} completed online-paid booking${s.onlineCount === 1 ? '' : 's'}` : 'No completed online-paid bookings waiting for payout'}
            {s.awardsCount ? `, plus ${rupees(s.awardsOwed)} for ${s.awardsCount} approved claim${s.awardsCount === 1 ? '' : 's'}` : ''}.
          </p>
          <ul className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
            {s.qrPending.length > 0 && <li>{rupees(s.qrPending.reduce((t, r) => t + r.share, 0))} more once StashInn confirms {s.qrPending.length} StashInn-QR payment{s.qrPending.length === 1 ? '' : 's'}</li>}
            {s.onlineUpcoming > 0 && <li>{rupees(s.onlineUpcoming)} more from upcoming online bookings, once they’re completed</li>}
            <li>{payoutSchedule ? `Paid to your bank ${payoutSchedule}.` : 'Paid to your bank account monthly.'} <Link href="/dashboard/earnings" className="font-bold text-orange-700 dark:text-orange-400 hover:underline">See earnings</Link></li>
          </ul>
        </section>
      </div>

      <details className={`${card} p-5 group`}>
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-sm font-extrabold text-gray-900 dark:text-white">
          How settlements work
          <Icon name="chevron" className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
        </summary>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
          <div>
            <p className="font-bold text-gray-900 dark:text-white">Paid online</p>
            <p className="mt-0.5">The customer pays StashInn when they book. After the booking is completed, StashInn pays you your share (the price minus StashInn’s commission and GST).</p>
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">Pay at drop-off</p>
            <p className="mt-0.5">At check-in you record how the customer paid. If they paid <strong>you</strong> (cash, or UPI to your account), send StashInn its commission and the GST once the booking is completed, then upload the proof here. If they paid on the <strong>StashInn QR</strong>, you owe nothing: StashInn pays you your share once it confirms the payment. Requests, cancellations and no-shows never owe anything.</p>
          </div>
        </div>
      </details>

      <section className={`${card} overflow-hidden`}>
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-extrabold text-gray-900 dark:text-white">To pay StashInn</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Completed pay-at-drop-off bookings. Pay several in one transfer.</p>
        </div>
        {s.due.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <span className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><Icon name="check" className="w-6 h-6" /></span>
            <p className="text-sm font-bold text-gray-900 dark:text-white">You’re all settled</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Completed pay-at-drop-off bookings show up here until you send StashInn’s share.</p>
          </div>
        ) : (
          <UploadProofForm rows={s.due} upiId={upiId} bankDetails={bankDetails} />
        )}
      </section>

      {(s.verifying.length > 0 || s.notYet.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {s.verifying.length > 0 && (
            <section className={`${card} overflow-hidden`}>
              <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
                <h2 className="font-extrabold text-gray-900 dark:text-white">Being verified <span className="text-gray-400 tabular-nums">({s.verifying.length})</span></h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">StashInn checks proofs within about 2 working days.</p>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {s.verifying.map(r => (
                  <li key={r.paymentId} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0"><Link href={`/dashboard/bookings/${r.bookingId}`} className="font-mono text-xs font-bold text-orange-700 dark:text-orange-400 hover:underline">#{r.bookingId.slice(0, 8).toUpperCase()}</Link> <span className="text-gray-500 dark:text-gray-400">· sent {day(r.submittedAt)}</span></span>
                    <span className="font-bold tabular-nums text-gray-900 dark:text-white">{rupees(r.owed)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {s.notYet.length > 0 && (
            <section className={`${card} overflow-hidden`}>
              <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
                <h2 className="font-extrabold text-gray-900 dark:text-white">Due after pick-up <span className="text-gray-400 tabular-nums">({s.notYet.length})</span></h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Items still stored. You collected the price at drop-off.</p>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {s.notYet.map(r => (
                  <li key={r.paymentId} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate"><Link href={`/dashboard/bookings/${r.bookingId}`} className="font-mono text-xs font-bold text-orange-700 dark:text-orange-400 hover:underline">#{r.bookingId.slice(0, 8).toUpperCase()}</Link> <span className="text-gray-500 dark:text-gray-400">· {r.customer}</span></span>
                    <span className="tabular-nums text-gray-700 dark:text-gray-300">{rupees(r.owed)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <section className={`${card} overflow-hidden`}>
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-extrabold text-gray-900 dark:text-white">Payments you’ve sent</h2>
        </div>
        {s.batches.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No settlements sent yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {s.batches.map(b => {
              const st = BATCH[b.status] ?? BATCH.pending!;
              return (
                <li key={b.key} className="px-5 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{rupees(b.total)} <span className="font-normal text-gray-500 dark:text-gray-400">for {b.bookings.length} booking{b.bookings.length === 1 ? '' : 's'}</span></p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sent {day(b.submittedAt)}{b.reference ? <> · ref <span className="font-mono">{b.reference}</span></> : null}</p>
                    {b.status === 'failed' && <p className="text-xs font-semibold text-red-600 dark:text-red-400">StashInn couldn’t verify this. The bookings are back under “To pay StashInn”; check the transfer and send the proof again.</p>}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                  {b.proofUrl && <a href={b.proofUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-orange-700 dark:text-orange-400 hover:underline">View proof</a>}
                  <DownloadPDFWrapper receipt={{ reference: b.reference, submittedAt: b.submittedAt, status: b.status, total: b.total, bookings: b.bookings, partner: partner.business_name }} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
