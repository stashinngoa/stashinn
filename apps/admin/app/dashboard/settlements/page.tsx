import Link from 'next/link';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { getAdminContext } from '../../../lib/adminAccess';
import { accessFor } from '../../../lib/permissions';
import QrConfirmations, { type QrItem } from './QrConfirmations';
import { PayoutRow, ProofCard } from './SettlementsClient';
import { loadAdminSettlements } from './settlementsData';

export const dynamic = 'force-dynamic';

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';
const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : '—');
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export default async function AdminSettlementsPage() {
  const { role } = await getAdminContext();
  const access = role ? accessFor(role, '/dashboard/settlements') : null;
  if (!access) return null; // the middleware redirects before this
  const canEdit = access === 'full';

  const db = createServiceClient();
  const [s, { data: dropoff }] = await Promise.all([
    loadAdminSettlements(db),
    db.from('payments')
      .select('*, bookings!inner(id, status, total_amount, partner_amount, partners(business_name), partner_locations(name))')
      .eq('method', 'pay_at_location').eq('status', 'pending').eq('collected_via', 'stashinn_qr').limit(1000),
  ]);

  // Proofs are private: short-lived signed links, in one call
  if (s.batches.length) {
    const { data } = await db.storage.from('settlement_proofs').createSignedUrls(s.batches.map(b => b.path), 3600);
    const map = new Map((data || []).map((d: any) => [d.path, d.signedUrl]));
    s.batches.forEach(b => { b.proofUrl = (map.get(b.path) as string) ?? null; });
  }

  const qrItems: QrItem[] = (dropoff || []).map((p: any) => {
    const b = one(p.bookings) as any;
    return {
      paymentId: p.id, bookingId: b.id,
      partner: (one(b.partners) as any)?.business_name || 'Partner',
      location: (one(b.partner_locations) as any)?.name || '',
      amount: Number(p.collected_amount ?? b.total_amount) || 0,
      share: Number(b.partner_amount) || 0,
      collectedAt: p.collected_at,
      reference: p.qr_reference || '',
    };
  }).sort((a: QrItem, b: QrItem) => String(a.collectedAt).localeCompare(String(b.collectedAt)));

  const sum = (xs: { total: number }[]) => xs.reduce((t, x) => t + x.total, 0);
  const tiles = [
    { label: 'StashInn QR to confirm', value: money(qrItems.reduce((t, q) => t + q.amount, 0)), sub: `${qrItems.length} payment${qrItems.length === 1 ? '' : 's'}`, alert: qrItems.length > 0, href: '#qr' },
    { label: 'Proofs to verify', value: money(sum(s.batches)), sub: `${s.batches.length} transfer${s.batches.length === 1 ? '' : 's'} from partners`, alert: s.batches.length > 0, href: '#proofs' },
    { label: 'Partners owe StashInn', value: money(sum(s.dues)), sub: `${s.dues.length} partner${s.dues.length === 1 ? '' : 's'} with cash dues`, href: '#dues' },
    { label: 'StashInn owes partners', value: money(sum(s.payouts) + s.awardsOwed), sub: `${s.payouts.length} partner payout${s.payouts.length === 1 ? '' : 's'}${s.awardsCount ? ` + ${s.awardsCount} claim${s.awardsCount === 1 ? '' : 's'}` : ''}`, href: '#payouts' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Settlements</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Money between StashInn and partners: confirm QR payments, verify partners’ transfers of StashInn’s share, and record payouts.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(t => (
          <a key={t.label} href={t.href} className={`${card} p-4 md:p-5 hover:border-orange-300 dark:hover:border-orange-700/60`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t.label}</p>
            <p className={`mt-1.5 text-xl md:text-2xl font-black tabular-nums ${t.alert ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>{t.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t.sub}</p>
          </a>
        ))}
      </div>

      <div id="qr" className="scroll-mt-24"><QrConfirmations items={qrItems} canEdit={canEdit} /></div>

      <section id="proofs" className={`${card} overflow-hidden scroll-mt-24`}>
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-extrabold text-gray-900 dark:text-white">Partner transfers to verify <span className="text-gray-400 tabular-nums">({s.batches.length})</span></h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Partners sent StashInn its commission + GST on pay-at-drop-off bookings they collected. Check the money reached StashInn’s account, then approve.</p>
        </div>
        {s.batches.length === 0
          ? <p className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No transfers waiting.</p>
          : <ul className="divide-y divide-gray-100 dark:divide-gray-800">{s.batches.map(b => <ProofCard key={b.path} batch={b} canEdit={canEdit} />)}</ul>}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <section id="dues" className={`${card} overflow-hidden scroll-mt-24`}>
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-extrabold text-gray-900 dark:text-white">Partners owe StashInn</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Completed bookings where the partner collected the money and hasn’t sent StashInn’s share. Partners get a weekly reminder.</p>
          </div>
          {s.dues.length === 0 ? <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Nothing outstanding.</p> : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {s.dues.map(d => (
                <li key={d.partnerId} className="px-5 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/partners/${d.partnerId}`} className="text-sm font-bold text-gray-900 dark:text-white hover:text-orange-700 dark:hover:text-orange-400">{d.name}</Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{d.count} booking{d.count === 1 ? '' : 's'} · oldest picked up {day(d.oldest)}</p>
                  </div>
                  <span className="text-sm font-black tabular-nums text-amber-700 dark:text-amber-400">{money(d.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="payouts" className={`${card} overflow-hidden scroll-mt-24`}>
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-extrabold text-gray-900 dark:text-white">StashInn owes partners</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Partners’ shares of completed online and confirmed QR bookings. Pay by bank transfer, then record it here.</p>
          </div>
          {s.payouts.length === 0 ? <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No payouts due.</p> : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">{s.payouts.map(p => <PayoutRow key={p.partnerId} row={p} canEdit={canEdit} />)}</ul>
          )}
          {s.awardsCount > 0 && (
            <p className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300">
              Plus {money(s.awardsOwed)} for {s.awardsCount} approved partner claim{s.awardsCount === 1 ? '' : 's'}: <Link href="/dashboard/disputes?status=resolved" className="font-bold text-orange-700 dark:text-orange-400 hover:underline">pay from Disputes</Link>.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
