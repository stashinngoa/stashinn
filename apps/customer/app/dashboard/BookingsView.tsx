'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { cancelBooking } from './actions';
import { TABS, type BookingCard, type TabId } from './bookingView';

const PAGE = 6;

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  pending: { label: 'Awaiting confirmation', cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60', dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60', dot: 'bg-emerald-500' },
  checked_in: { label: 'Stored now', cls: 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800/60', dot: 'bg-sky-500' },
  checked_out: { label: 'Completed', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700', dot: 'bg-gray-400' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60', dot: 'bg-red-500' },
};

const PAY_TONE: Record<string, string> = {
  paid: 'text-emerald-700 dark:text-emerald-400',
  due: 'text-amber-700 dark:text-amber-400',
  refund: 'text-sky-700 dark:text-sky-400',
  failed: 'text-red-700 dark:text-red-400',
  muted: 'text-gray-500 dark:text-gray-400',
};

const Icon = ({ d, className = 'w-4 h-4' }: { d: string; className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>
);
const I = {
  pin: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  phone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  help: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  bag: 'M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-9 0h12a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2z',
};

export default function BookingsView({ cards, initialTab, initialSort }: { cards: BookingCard[]; initialTab: TabId; initialSort: 'newest' | 'oldest' }) {
  const [tab, setTab] = useState<TabId>(initialTab);
  const [sort, setSort] = useState(initialSort);
  const [shown, setShown] = useState(PAGE);
  const [cancelling, setCancelling] = useState<BookingCard | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  // Keep the address bar in step without reloading, so refresh and back/forward keep the tab
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (tab === 'all') p.delete('filter'); else p.set('filter', tab);
    if (sort === 'newest') p.delete('sort'); else p.set('sort', sort);
    const q = p.toString();
    window.history.replaceState(null, '', `/dashboard${q ? `?${q}` : ''}`);
  }, [tab, sort]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 6000); return () => clearTimeout(t); }, [toast]);

  const counts = useMemo(
    () => Object.fromEntries(TABS.map(t => [t.id, t.statuses ? cards.filter(c => (t.statuses as readonly string[]).includes(c.status)).length : cards.length])) as Record<TabId, number>,
    [cards],
  );
  const list = useMemo(() => {
    const t = TABS.find(x => x.id === tab)!;
    const filtered = t.statuses ? cards.filter(c => (t.statuses as readonly string[]).includes(c.status)) : cards;
    return [...filtered].sort((a, b) => (sort === 'newest' ? -1 : 1) * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  }, [cards, tab, sort]);

  const next = cards.filter(c => ['pending', 'confirmed', 'checked_in'].includes(c.status)).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">My bookings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {next ? <>Next up: <span className="font-semibold text-gray-700 dark:text-gray-300">{next.name}</span> on {next.dropOff.day}, {next.dropOff.time}</> : 'Your storage and parking bookings.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/search" className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-3.5 py-2 text-sm font-bold text-white">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            New booking
          </Link>
          <label className="relative">
            <span className="sr-only">Sort</span>
            <select value={sort} onChange={e => setSort(e.target.value as 'newest' | 'oldest')} className="appearance-none rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 pl-3 pr-8 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200 outline-none focus:border-orange-400 cursor-pointer">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </label>
        </div>
      </div>

      <div role="tablist" aria-label="Filter bookings" className="mt-5 flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
        {TABS.map(t => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => { setTab(t.id); setShown(PAGE); }}
              className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${on
                ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'}`}
            >
              {t.label}
              <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${on ? 'bg-white/20 dark:bg-gray-900/15' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>{counts[t.id]}</span>
            </button>
          );
        })}
      </div>

      {toast && (
        <div role="status" className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-medium ${toast.ok ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300' : 'border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'}`}>
          {toast.text}
        </div>
      )}

      {/* Two columns of cards on wide screens */}
      <div className="mt-5 grid grid-cols-1 2xl:grid-cols-2 gap-4 items-start">
        {list.length === 0 ? (
          <Empty tab={tab} hasAny={cards.length > 0} />
        ) : (
          list.slice(0, shown).map(c => <Card key={c.id} c={c} onCancel={() => setCancelling(c)} />)
        )}
      </div>

      {list.length > shown && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => setShown(s => s + PAGE)} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-2.5 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:border-orange-300 dark:hover:border-orange-700/60">
            Show more ({list.length - shown} left)
          </button>
        </div>
      )}

      {cancelling && <CancelDialog c={cancelling} onClose={() => setCancelling(null)} onDone={r => { setCancelling(null); setToast(r); }} />}
    </div>
  );
}

function Card({ c, onCancel }: { c: BookingCard; onCancel: () => void }) {
  const st = STATUS[c.status] ?? STATUS.checked_out!;
  return (
    <article className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Location and status */}
      <div className="flex gap-4 p-4 sm:p-5">
        <Link href={`/locations/${c.locationId}`} className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
          {c.photo ? <img src={c.photo} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-gray-400"><Icon d={I.bag} className="w-8 h-8" /></span>}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/locations/${c.locationId}`} className="block font-extrabold text-gray-900 dark:text-white leading-snug hover:text-orange-700 dark:hover:text-orange-400 line-clamp-1">{c.name}</Link>
              <p className="text-sm text-gray-500 dark:text-gray-400">{c.area}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${st.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
            </span>
          </div>
          <p className="mt-1.5 text-xs font-mono text-gray-400 dark:text-gray-500">#{c.ref} · {c.items}</p>
        </div>
      </div>

      {/* Times and payment */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 border-t border-gray-100 dark:border-gray-800">
        <div className="p-4 sm:px-5 border-r border-gray-100 dark:border-gray-800">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Drop-off</dt>
          <dd className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{c.dropOff.day}</dd>
          <dd className="text-sm text-gray-600 dark:text-gray-300">{c.dropOff.time}</dd>
        </div>
        <div className="p-4 sm:px-5 sm:border-r border-gray-100 dark:border-gray-800">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Pick-up</dt>
          <dd className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{c.pickUp.day}</dd>
          <dd className="text-sm text-gray-600 dark:text-gray-300">{c.pickUp.time} · {c.hours} hr{c.hours === 1 ? '' : 's'}</dd>
        </div>
        <div className="p-4 sm:px-5 col-span-2 sm:col-span-1 border-t sm:border-t-0 border-gray-100 dark:border-gray-800">
          <dt className={`text-[11px] font-bold uppercase tracking-wider ${PAY_TONE[c.payment.tone]}`}>{c.payment.label}</dt>
          <dd className="mt-1 text-xl font-black text-gray-900 dark:text-white tabular-nums">₹{c.payment.amount.toFixed(2)}</dd>
          {c.payment.note && <dd className="text-xs text-gray-500 dark:text-gray-400">{c.payment.note}</dd>}
        </div>
      </dl>

      <StatusPanel c={c} />

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40 px-4 sm:px-5 py-3">
        <Link href={`/dashboard/disputes?booking_id=${c.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-orange-700 dark:hover:text-orange-400">
          <Icon d={I.help} /> Get help with this booking
        </Link>
        <div className="flex items-center gap-2">
          {c.canReview && (
            <Link href={`/dashboard/review/${c.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 px-3.5 py-2 text-sm font-bold text-white">
              <Icon d={I.star} /> Leave a review
            </Link>
          )}
          {c.reviewed && <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Reviewed ✓</span>}
          {c.canCancel && (
            <button type="button" onClick={onCancel} className="rounded-xl px-3.5 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30">
              Cancel booking
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/** What the customer needs right now: waiting note, check-in / pick-up code with address and contact, or the cancellation reason. */
function StatusPanel({ c }: { c: BookingCard }) {
  if (c.status === 'pending') {
    return (
      <div className="mx-4 sm:mx-5 mb-4 flex gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
        <span className="mt-0.5 text-amber-600 dark:text-amber-400"><Icon d={I.lock} className="w-5 h-5" /></span>
        <p className="text-sm text-amber-900 dark:text-amber-200">
          <span className="font-bold">Waiting for the partner to confirm.</span> The exact address, directions, contact and your check-in code appear here once they do. We&apos;ll email you too.
        </p>
      </div>
    );
  }
  if (c.status === 'cancelled') {
    return c.cancellationReason ? (
      <p className="mx-4 sm:mx-5 mb-4 rounded-2xl bg-gray-50 dark:bg-gray-950/50 px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{c.cancellationReason}</p>
    ) : null;
  }
  const showCode = c.code && (c.status === 'confirmed' || c.status === 'checked_in');
  return (
    <div className="mx-4 sm:mx-5 mb-4 grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)] gap-4 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
      {showCode && (
        <div className="rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 px-5 py-3 text-center sm:min-w-[11rem]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-orange-800 dark:text-orange-300">{c.status === 'confirmed' ? 'Check-in code' : 'Pick-up code'}</p>
          <p className="mt-1 font-mono text-3xl font-black tracking-[0.25em] text-gray-900 dark:text-white">{c.code}</p>
          <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">{c.status === 'confirmed' ? 'Give this to the partner at drop-off' : 'Give this to collect your items'}</p>
        </div>
      )}
      <div className={`space-y-3 min-w-0 ${showCode ? '' : 'sm:col-span-2'}`}>
        {c.address && (
          <div className="flex gap-2.5">
            <span className="mt-0.5 text-gray-400"><Icon d={I.pin} /></span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{c.address}</p>
              {c.directions && c.status !== 'checked_out' && (
                <a href={c.directions} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex text-sm font-bold text-orange-700 dark:text-orange-400 hover:underline">Get directions →</a>
              )}
            </div>
          </div>
        )}
        {c.contact && c.status !== 'checked_out' && (
          <div className="flex gap-2.5">
            <span className="mt-0.5 text-gray-400"><Icon d={I.phone} /></span>
            <p className="text-sm text-gray-900 dark:text-gray-200">
              {c.contact.name}
              {c.contact.phone && <> · <a href={`tel:${c.contact.phone}`} className="font-bold text-orange-700 dark:text-orange-400 hover:underline">{c.contact.phone}</a></>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CancelDialog({ c, onClose, onDone }: { c: BookingCard; onClose: () => void; onDone: (r: { ok: boolean; text: string }) => void }) {
  const [pending, start] = useTransition();
  const paidOnline = c.payment.tone === 'paid' && c.payment.label === 'Paid online';
  const outcome = paidOnline
    ? (c.freeCancel ? `You'll get a full refund of ₹${c.payment.amount.toFixed(2)} to your original payment method.` : `It's within ${c.cancelWindowHours} hours of drop-off, so this payment isn't refunded.`)
    : 'You haven’t been charged, so there’s nothing to refund.';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !pending) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, pending]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => !pending && onClose()} />
      <div role="dialog" aria-modal="true" aria-labelledby="cancel-title" className="relative w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-2xl">
        <h2 id="cancel-title" className="text-lg font-extrabold text-gray-900 dark:text-white">Cancel this booking?</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{c.name} · {c.dropOff.day}, {c.dropOff.time}</p>
        <p className="mt-4 rounded-2xl bg-gray-50 dark:bg-gray-950/60 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{outcome}</p>
        {paidOnline && c.freeCancel && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Free cancellation until {c.freeCancelUntil}.</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" disabled={pending} onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Keep booking</button>
          <button
            type="button"
            disabled={pending}
            onClick={() => start(async () => {
              const r = await cancelBooking(c.id);
              onDone(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
            })}
            className="rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {pending ? 'Cancelling…' : 'Yes, cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Empty({ tab, hasAny }: { tab: TabId; hasAny: boolean }) {
  const text = !hasAny
    ? { title: 'No bookings yet', body: 'Find a secure spot for your bags or vehicle and it will show up here.' }
    : { active: { title: 'Nothing active right now', body: 'Bookings waiting for confirmation, confirmed or currently stored show up here.' }, past: { title: 'No completed bookings', body: 'Bookings you have picked up show up here.' }, cancelled: { title: 'No cancelled bookings', body: 'Good news: nothing cancelled.' }, all: { title: 'No bookings', body: '' } }[tab];
  return (
    <div className="col-span-full rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 p-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center"><Icon d={I.bag} className="w-7 h-7" /></div>
      <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">{text.title}</h3>
      {text.body && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">{text.body}</p>}
      {!hasAny && <Link href="/search" className="mt-5 inline-flex rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2.5 text-sm font-bold text-white">Find storage</Link>}
    </div>
  );
}
