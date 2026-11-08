'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { statusOf } from '../bookingStatus';
import { DISPUTE_STATUS, disputeRef, disputeStatusOf, isOpen } from './disputeShared';
import ResolutionPanel, { AwardPanel } from './ResolutionPanel';
import BookingChangePanel from './BookingChangePanel';
import EvidenceLightbox from './EvidenceLightbox';

export type DisputeCase = {
  id: string;
  bookingId: string;
  status: string;
  source: 'customer' | 'partner';
  category: string;
  details: string;
  photos: string[];
  adminNotes: string;
  refundAmount: number;
  /** Partner claims: amount StashInn owes the partner, and when / how it was paid */
  award: number;
  awardPaidAt: string | null;
  awardReference: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { name: string; email: string; phone: string };
  partner: { id: string; name: string; contact: string; email: string; phone: string };
  booking: {
    status: string; type: string; bags: number | null; vehicle: string; make: string; model: string; plate: string; checkInPhotos: string[];
    start: string; end: string; checkedIn: string | null; checkedOut: string | null; total: number; cancellation: string;
    location: { name: string; address: string } | null;
  } | null;
  payment: { amount: number; status: string; method: string; refunded: number } | null;
  history: { at: string; by: string; action: string; status: string; note: string; refund: number }[];
};

const TABS = [
  { key: 'open', label: 'Open', match: (s: string) => isOpen(s) },
  { key: 'submitted', label: 'New', match: (s: string) => s === 'submitted' },
  { key: 'under_review', label: 'Under review', match: (s: string) => s === 'under_review' },
  { key: 'escalated', label: 'Escalated', match: (s: string) => s === 'escalated' },
  { key: 'resolved', label: 'Resolved', match: (s: string) => s.startsWith('resolved') },
  { key: 'all', label: 'All', match: () => true },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';
const eyebrow = 'text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400';

const fmt = (iso: string | null, withTime = true) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}), timeZone: 'Asia/Kolkata' }) : '—';
const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return mins < 1 ? 'just now' : `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days < 30 ? `${days}d ago` : fmt(iso, false);
};
const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const METHOD: Record<string, string> = { razorpay: 'Online (Razorpay)', upi: 'UPI at location', pay_at_location: 'Cash / UPI at location' };

const SourceBadge = ({ source }: { source: DisputeCase['source'] }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${source === 'customer'
    ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700/50'
    : 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700/50'}`}>
    {source === 'customer' ? 'Customer' : 'Partner'}
  </span>
);

const StatusBadge = ({ status }: { status: string }) => {
  const s = disputeStatusOf(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
    </span>
  );
};

export default function DisputesWorkspace({ cases, canEdit, canPay, initialId, initialStatus, loadError }: {
  cases: DisputeCase[];
  canEdit: boolean;
  canPay: boolean;
  initialId: string | null;
  initialStatus: string | null;
  loadError: string | null;
}) {
  const [tab, setTab] = useState<TabKey>(() => (TABS.some(t => t.key === initialStatus) ? (initialStatus as TabKey) : 'open'));
  const [source, setSource] = useState<'all' | 'customer' | 'partner'>('all');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);

  // Keep the open case and tab in the address bar, without a reload
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set('id', selectedId); else url.searchParams.delete('id');
    if (tab !== 'open') url.searchParams.set('status', tab); else url.searchParams.delete('status');
    window.history.replaceState(null, '', url.toString());
  }, [selectedId, tab]);

  const counts = useMemo(() => {
    const scoped = cases.filter(c => source === 'all' || c.source === source);
    return Object.fromEntries(TABS.map(t => [t.key, scoped.filter(c => t.match(c.status)).length])) as Record<TabKey, number>;
  }, [cases, source]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matchTab = TABS.find(t => t.key === tab)!.match;
    const list = cases.filter(c =>
      matchTab(c.status)
      && (source === 'all' || c.source === source)
      && (!needle || [disputeRef(c.bookingId), c.category, c.details, c.customer.name, c.customer.email, c.customer.phone, c.partner.name, c.partner.email, c.booking?.location?.name || '', c.booking?.plate || '']
        .some(v => v.toLowerCase().includes(needle))));
    // Open cases: oldest first so the queue is worked in order (escalated on top)
    if (tab === 'open') {
      const rank = (s: string) => (s === 'escalated' ? 0 : s === 'submitted' ? 1 : 2);
      return [...list].sort((a, b) => rank(a.status) - rank(b.status) || +new Date(a.createdAt) - +new Date(b.createdAt));
    }
    return list;
  }, [cases, tab, source, q]);

  const shown = cases.find(c => c.id === selectedId) || null;

  const open = cases.filter(c => isOpen(c.status));
  const oldestOpen = open.reduce<string | null>((m, c) => (!m || c.createdAt < m ? c.createdAt : m), null);
  const refunded = cases.filter(c => c.status === 'resolved_refund').reduce((s, c) => s + c.refundAmount, 0);
  const owed = cases.filter(c => c.status === 'resolved_compensated' && !c.awardPaidAt);
  const owedTotal = owed.reduce((s, c) => s + c.award, 0);
  const stats = [
    { label: 'Open cases', value: String(open.length), sub: oldestOpen ? `Oldest filed ${timeAgo(oldestOpen)}` : 'Nothing waiting', tone: open.length ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white', tab: 'open' as TabKey },
    { label: 'New', value: String(cases.filter(c => c.status === 'submitted').length), sub: 'Not picked up yet', tone: 'text-sky-600 dark:text-sky-400', tab: 'submitted' as TabKey },
    { label: 'Escalated', value: String(cases.filter(c => c.status === 'escalated').length), sub: 'Senior / legal review', tone: 'text-red-600 dark:text-red-400', tab: 'escalated' as TabKey },
    owed.length
      ? { label: 'Owed to partners', value: rupees(owedTotal), sub: `${owed.length} approved claim${owed.length === 1 ? '' : 's'} to pay`, tone: 'text-teal-600 dark:text-teal-400', tab: 'resolved' as TabKey }
      : { label: 'Refunded', value: rupees(refunded), sub: `${cases.filter(c => c.status.startsWith('resolved')).length} resolved in total`, tone: 'text-emerald-600 dark:text-emerald-400', tab: 'resolved' as TabKey },
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Disputes &amp; claims</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Complaints from customers and damage claims from partners. Review the evidence, decide, and both sides are told.</p>
        </div>
      </div>

      {loadError && <div className="rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">{loadError}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <button key={s.label} type="button" onClick={() => setTab(s.tab)}
            className={`${card} p-4 text-left hover:border-orange-300 dark:hover:border-orange-700/60 transition-colors ${tab === s.tab ? 'ring-2 ring-orange-500/30 border-orange-300 dark:border-orange-700/60' : ''}`}>
            <p className={eyebrow}>{s.label}</p>
            <p className={`text-2xl font-black tabular-nums mt-1 ${s.tone}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{s.sub}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-6 items-start">
        {/* Queue */}
        <section className={`${card} overflow-hidden ${shown ? 'hidden xl:block' : ''}`}>
          <div className="p-4 space-y-3 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Booking ref, name, email, location, plate…"
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div className="flex rounded-xl bg-gray-100 dark:bg-gray-950 p-1 text-xs font-bold">
              {(['all', 'customer', 'partner'] as const).map(s => (
                <button key={s} type="button" onClick={() => setSource(s)}
                  className={`flex-1 rounded-lg py-1.5 transition-colors ${source === s ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                  {s === 'all' ? 'Everyone' : s === 'customer' ? 'From customers' : 'From partners'}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TABS.map(t => (
                <button key={t.key} type="button" onClick={() => setTab(t.key)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition-colors ${tab === t.key
                    ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/60'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  {t.label}
                  <span className={`tabular-nums ${tab === t.key ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400'}`}>{counts[t.key]}</span>
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-3xl">🕊️</p>
              <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{cases.length === 0 ? 'No disputes yet' : 'Nothing matches'}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{cases.length === 0 ? 'Reports from customers and partners will appear here.' : 'Try another tab, or clear the search.'}</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800 xl:max-h-[calc(100vh-22rem)] xl:overflow-y-auto">
              {visible.map(c => {
                const active = c.id === shown?.id;
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left px-4 py-3.5 transition-colors border-l-[3px] ${active ? 'bg-orange-50/70 dark:bg-orange-950/20 border-orange-500' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">#{disputeRef(c.bookingId)}</span>
                        <SourceBadge source={c.source} />
                        <span className="ml-auto text-[11px] text-gray-400 shrink-0">{timeAgo(c.createdAt)}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-bold text-gray-900 dark:text-white truncate">{c.category}</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{c.details}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <StatusBadge status={c.status} />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{c.customer.name} · {c.booking?.location?.name || c.partner.name}</span>
                        {c.photos.length > 0 && <span className="ml-auto text-[11px] text-gray-400 shrink-0">📷 {c.photos.length}</span>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Case */}
        {shown ? (
          <CaseView key={shown.id} c={shown} canEdit={canEdit} canPay={canPay} onBack={() => setSelectedId(null)} onPhoto={(photos, index) => setLightbox({ photos, index })} />
        ) : (
          <div className={`${card} hidden xl:flex flex-col items-center justify-center py-24 text-center`}>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select a case</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Pick a dispute on the left to see the evidence and decide.</p>
          </div>
        )}
      </div>

      {lightbox && <EvidenceLightbox photos={lightbox.photos} start={lightbox.index} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function CaseView({ c, canEdit, canPay, onBack, onPhoto }: { c: DisputeCase; canEdit: boolean; canPay: boolean; onBack: () => void; onPhoto: (photos: string[], i: number) => void }) {
  const b = c.booking;
  const bs = b ? statusOf(b.status) : null;
  const Person = ({ role, name, sub, email, phone }: { role: string; name: string; sub?: string; email: string; phone: string }) => (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-950/50 p-4 min-w-0">
      <p className={eyebrow}>{role}</p>
      <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white truncate">{name}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{sub}</p>}
      <div className="mt-2 flex flex-col gap-1 text-xs">
        {email && <a href={`mailto:${email}`} className="text-orange-700 dark:text-orange-400 hover:underline truncate">✉ {email}</a>}
        {phone && <a href={`tel:${phone}`} className="text-orange-700 dark:text-orange-400 hover:underline">☎ {phone}</a>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 min-w-0">
      <button type="button" onClick={onBack} className="xl:hidden inline-flex items-center gap-1 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
        ← All cases
      </button>

      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {/* Summary */}
          <section className={`${card} p-5 sm:p-6`}>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={c.status} />
              <SourceBadge source={c.source} />
              <span className="text-xs text-gray-500 dark:text-gray-400">Filed {fmt(c.createdAt)} · {timeAgo(c.createdAt)}</span>
            </div>
            <h2 className="mt-3 text-xl font-extrabold text-gray-900 dark:text-white">{c.category}</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Booking <span className="font-mono font-bold text-gray-800 dark:text-gray-200">#{disputeRef(c.bookingId)}</span>
              {b?.location && <> at {b.location.name}</>}
            </p>

            <div className="mt-5">
              <p className={eyebrow}>{c.source === 'customer' ? 'What the customer said' : 'What the partner reported'}</p>
              <blockquote className="mt-2 rounded-xl border-l-4 border-orange-400 bg-orange-50/50 dark:bg-orange-950/20 px-4 py-3 text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{c.details || '—'}</blockquote>
            </div>

            {c.photos.length > 0 && (
              <div className="mt-5">
                <p className={eyebrow}>Evidence · {c.photos.length} photo{c.photos.length === 1 ? '' : 's'}</p>
                <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {c.photos.map((url, i) => (
                    <button key={url} type="button" onClick={() => onPhoto(c.photos, i)} className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* People */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Person role={c.source === 'customer' ? 'Customer · raised this' : 'Customer'} name={c.customer.name} email={c.customer.email} phone={c.customer.phone} />
            <Person role={c.source === 'partner' ? 'Partner · raised this' : 'Partner'} name={c.partner.name} sub={c.partner.contact && c.partner.contact !== c.partner.name ? `Contact: ${c.partner.contact}` : undefined} email={c.partner.email} phone={c.partner.phone} />
          </section>

          {/* Booking */}
          {b && (
            <section className={`${card} p-5 sm:p-6`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Booking</h3>
                <div className="flex items-center gap-2">
                  {bs && <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${bs.badge}`}>{bs.label}</span>}
                  <Link href={`/dashboard/bookings?q=${encodeURIComponent(c.customer.email)}`} className="text-xs font-bold text-orange-700 dark:text-orange-400 hover:underline">Open in bookings →</Link>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-4 text-sm">
                <div className="col-span-2">
                  <dt className={eyebrow}>Location</dt>
                  <dd className="mt-0.5 font-semibold text-gray-900 dark:text-white">{b.location?.name || '—'}</dd>
                  {b.location?.address && <dd className="text-xs text-gray-500 dark:text-gray-400">{b.location.address}</dd>}
                </div>
                <div>
                  <dt className={eyebrow}>What</dt>
                  <dd className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                    {b.type === 'garage' ? (b.vehicle || 'Vehicle') : `${b.bags || 0} bag${b.bags === 1 ? '' : 's'}`}
                  </dd>
                  {b.plate && <dd className="font-mono text-xs text-gray-500 dark:text-gray-400">{b.plate}</dd>}
                </div>
                <div>
                  <dt className={eyebrow}>Booking total</dt>
                  <dd className="mt-0.5 font-black tabular-nums text-gray-900 dark:text-white">{rupees(b.total)}</dd>
                </div>
                <div>
                  <dt className={eyebrow}>Booked for</dt>
                  <dd className="mt-0.5 text-gray-800 dark:text-gray-200">{fmt(b.start)}</dd>
                  <dd className="text-xs text-gray-500 dark:text-gray-400">to {fmt(b.end)}</dd>
                </div>
                <div>
                  <dt className={eyebrow}>Actual</dt>
                  <dd className="mt-0.5 text-gray-800 dark:text-gray-200">{b.checkedIn ? `In ${fmt(b.checkedIn)}` : 'Not checked in'}</dd>
                  {b.checkedOut && <dd className="text-xs text-gray-500 dark:text-gray-400">Out {fmt(b.checkedOut)}</dd>}
                </div>
                <div className="col-span-2">
                  <dt className={eyebrow}>Payment</dt>
                  {c.payment ? (
                    <>
                      <dd className="mt-0.5 text-gray-800 dark:text-gray-200">{rupees(c.payment.amount)} · {METHOD[c.payment.method] || c.payment.method} · <span className="capitalize">{c.payment.status.replace(/_/g, ' ')}</span></dd>
                      {c.payment.refunded > 0 && <dd className="text-xs text-emerald-700 dark:text-emerald-400">{rupees(c.payment.refunded)} already refunded</dd>}
                    </>
                  ) : <dd className="mt-0.5 text-gray-500 dark:text-gray-400">No payment recorded</dd>}
                </div>
                {b.cancellation && (
                  <div className="col-span-2 lg:col-span-4">
                    <dt className={eyebrow}>Cancellation</dt>
                    <dd className="mt-0.5 text-gray-800 dark:text-gray-200">{b.cancellation}</dd>
                  </div>
                )}
              </dl>

              {b.checkInPhotos.length > 0 && (
                <div className="mt-5">
                  <p className={eyebrow}>Check-in condition photos · compare with the claim</p>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {b.checkInPhotos.map((url, i) => (
                      <button key={url} type="button" onClick={() => onPhoto(b.checkInPhotos, i)} className="shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Check-in ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Decision + history */}
        <div className="space-y-6 2xl:sticky 2xl:top-24">
          <BookingChangePanel key={`b-${c.updatedAt}-${c.booking?.start}-${c.booking?.end}-${c.booking?.status}`} c={c} canEdit={canEdit} />
          <ResolutionPanel key={c.updatedAt} c={c} canEdit={canEdit} />
          {c.status === 'resolved_compensated' && c.award > 0 && <AwardPanel key={`a-${c.updatedAt}`} c={c} canPay={canPay} />}

          <section className={`${card} p-5`}>
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Timeline</h3>
            <ol className="mt-4 space-y-4 border-l-2 border-gray-200 dark:border-gray-800 ml-1.5">
              <li className="relative pl-5">
                <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-sky-500 ring-4 ring-white dark:ring-gray-900" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Filed by the {c.source}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{fmt(c.createdAt)}</p>
              </li>
              {c.history.map((h, i) => (
                <li key={i} className="relative pl-5">
                  <span className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full ring-4 ring-white dark:ring-gray-900 ${h.action === 'dispute.booking_changed' ? 'bg-violet-500' : disputeStatusOf(h.status).dot}`} />
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {h.action === 'dispute.booking_changed' ? 'Booking changed' : h.action === 'dispute.partner_award_paid' ? 'Partner paid' : DISPUTE_STATUS[h.status as keyof typeof DISPUTE_STATUS]?.label || 'Updated'}
                    {h.refund > 0 && <span className="text-emerald-700 dark:text-emerald-400"> · {rupees(h.refund)}</span>}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{h.by} · {fmt(h.at)}</p>
                  {h.note && <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 line-clamp-3">“{h.note}”</p>}
                </li>
              ))}
              {c.history.length === 0 && c.status !== 'submitted' && (
                <li className="relative pl-5">
                  <span className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full ring-4 ring-white dark:ring-gray-900 ${disputeStatusOf(c.status).dot}`} />
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{disputeStatusOf(c.status).label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{fmt(c.resolvedAt || c.updatedAt)}</p>
                </li>
              )}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
