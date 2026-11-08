'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import Icon from '../../../components/Icon';
import { TONE, type Tone } from '../bookings/bookingShared';

export type CalBooking = {
  id: string;
  ref: string;
  customer: string;
  items: string;
  garage: boolean;
  quantity: number;
  location: string;
  status: string;
  statusLabel: string;
  tone: Tone;
  inAt: number;
  outAt: number;
  droppedOff: boolean;
  pickedUp: boolean;
  overdue: boolean;
  collect: string | null;
};

export type CalDay = {
  key: string;
  inMonth: boolean;
  dropoffs: string[];
  pickups: string[];
  stored: string[];
  peakBags: number;
  peakVehicles: number;
  pending: number;
  closed: string[];
  allClosed: boolean;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const time = (ms: number) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
const longDay = (key: string) => new Date(`${key}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });

function fill(used: number, cap: number) {
  if (!cap) return { pct: used ? 100 : 0, cls: 'bg-gray-400' };
  const pct = Math.min(100, (used / cap) * 100);
  return { pct, cls: used > cap ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500' };
}

function Meter({ label, used, cap }: { label: string; used: number; cap: number }) {
  const f = fill(used, cap);
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold text-gray-600 dark:text-gray-300">{label}</span>
        <span className="tabular-nums text-gray-500 dark:text-gray-400"><span className="font-bold text-gray-900 dark:text-white">{used}</span>{cap ? ` of ${cap}` : ''} at the busiest time</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><div className={`h-full rounded-full ${f.cls}`} style={{ width: `${f.pct}%` }} /></div>
    </div>
  );
}

function Entry({ b, kind, multiLocation }: { b: CalBooking; kind: 'in' | 'out' | 'stay'; multiLocation: boolean }) {
  const at = kind === 'in' ? b.inAt : b.outAt;
  const done = kind === 'in' ? b.droppedOff : kind === 'out' ? b.pickedUp : false;
  return (
    <li>
      <Link href={`/dashboard/bookings/${b.id}`} className="group flex items-start gap-3 px-4 py-3 hover:bg-orange-50/50 dark:hover:bg-gray-800/40 transition-colors">
        <div className="w-16 shrink-0 pt-0.5 text-right">
          {kind === 'stay'
            ? <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">All day</span>
            : <span className={`text-sm font-bold tabular-nums ${done ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{time(at)}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-orange-700 dark:group-hover:text-orange-400">{b.customer}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {b.items}{multiLocation && b.location ? ` · ${b.location}` : ''} · <span className="font-mono">#{b.ref}</span>
          </p>
          {kind === 'stay' && <p className="text-[11px] text-gray-400 dark:text-gray-500">{b.overdue ? 'Pick-up overdue' : `Picks up ${new Date(b.outAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}, ${time(b.outAt)}`}</p>}
          {kind === 'in' && b.collect && <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Collect {b.collect} at drop-off</p>}
        </div>
        <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${done ? TONE.gray : TONE[b.tone]}`}>
          {done ? (kind === 'in' ? 'Dropped off' : 'Picked up') : b.statusLabel}
        </span>
      </Link>
    </li>
  );
}

export default function CalendarView(props: {
  days: CalDay[];
  bookings: CalBooking[];
  todayKey: string;
  initialDay: string;
  monthLabel: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  isCurrentMonth: boolean;
  bagCapacity: number;
  vehicleCapacity: number;
  multiLocation: boolean;
  truncated: boolean;
}) {
  const { days, bookings, todayKey, monthLabel, bagCapacity, vehicleCapacity, multiLocation } = props;
  const [selected, setSelected] = useState(props.initialDay);
  const [showStored, setShowStored] = useState(false);
  const byId = useMemo(() => new Map(bookings.map(b => [b.id, b])), [bookings]);
  const hasBags = bagCapacity > 0 || bookings.some(b => !b.garage);
  const hasVehicles = vehicleCapacity > 0 || bookings.some(b => b.garage);

  const day = days.find(d => d.key === selected) ?? days.find(d => d.inMonth)!;
  const list = (ids: string[], key: 'inAt' | 'outAt') => ids.map(id => byId.get(id)!).filter(Boolean).sort((a, b) => a[key] - b[key]);
  const dropoffs = list(day.dropoffs, 'inAt');
  const pickups = list(day.pickups, 'outAt');
  const stored = list(day.stored, 'outAt');

  const nav = 'h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-[minmax(0,1fr)] gap-4 lg:gap-5 items-start lg:items-stretch lg:flex-1 lg:min-h-0">
      {/* Month grid: on large screens the rows share the height that's left, so the page doesn't scroll */}
      <section className="lg:col-span-2 lg:min-h-0 flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 md:px-5 py-2.5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">{monthLabel}</h2>
          <div className="flex items-center gap-2">
            {!props.isCurrentMonth && (
              <Link href={props.todayHref} className="px-3 h-9 inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Today</Link>
            )}
            <Link href={props.prevHref} className={nav} aria-label="Previous month"><Icon name="chevron" className="w-4 h-4 rotate-180" /></Link>
            <Link href={props.nextHref} className={nav} aria-label="Next month"><Icon name="chevron" className="w-4 h-4" /></Link>
          </div>
        </div>

        <div className="shrink-0 grid grid-cols-7 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/40">
          {WEEKDAYS.map(w => (
            <div key={w} className="py-1.5 text-center text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 lg:flex-1 lg:min-h-0" style={{ gridTemplateRows: `repeat(${days.length / 7}, minmax(0, 1fr))` }}>
          {days.map((d, i) => {
            const isToday = d.key === todayKey;
            const isSel = d.key === day.key;
            const past = d.key < todayKey;
            const busy = d.dropoffs.length + d.pickups.length > 0;
            const bagFill = fill(d.peakBags, bagCapacity);
            const carFill = fill(d.peakVehicles, vehicleCapacity);
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => { setSelected(d.key); setShowStored(false); }}
                aria-pressed={isSel}
                aria-label={`${longDay(d.key)}: ${d.dropoffs.length} drop-offs, ${d.pickups.length} pick-ups${d.pending ? `, ${d.pending} waiting for your answer` : ''}${d.allClosed ? ', closed' : ''}`}
                className={`relative text-left min-h-[64px] md:min-h-[92px] lg:min-h-0 overflow-hidden p-1.5 md:p-2 lg:p-1.5 lg:pb-3 flex flex-col gap-1 border-gray-100 dark:border-gray-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500
                  ${i % 7 !== 6 ? 'border-r' : ''} ${i < days.length - 7 ? 'border-b' : ''}
                  ${isSel ? 'bg-orange-50 dark:bg-orange-950/30 ring-2 ring-inset ring-orange-500' : d.allClosed ? 'bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(148,163,184,0.12)_6px,rgba(148,163,184,0.12)_12px)]' : d.inMonth ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50' : 'bg-gray-50/60 dark:bg-gray-950/40 hover:bg-gray-100/60 dark:hover:bg-gray-800/40'}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`h-6 w-6 md:h-7 md:w-7 lg:h-6 lg:w-6 shrink-0 flex items-center justify-center rounded-full text-xs md:text-sm lg:text-xs font-bold tabular-nums ${
                    isToday ? 'bg-orange-600 text-white' : !d.inMonth ? 'text-gray-300 dark:text-gray-600' : past ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                    {Number(d.key.slice(8))}
                  </span>
                  {d.pending > 0 && <span className="h-5 min-w-[1.25rem] px-1 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center" title={`${d.pending} waiting for your answer`}>{d.pending}</span>}
                  {d.closed.length > 0 && !d.pending && <span className="hidden md:inline text-[9px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500" title={d.closed.join('\n')}>{d.allClosed ? 'Closed' : 'Part closed'}</span>}
                </div>

                {/* Desktop: counts; phone: dots */}
                <div className={`hidden md:flex flex-wrap gap-1 ${!d.inMonth ? 'opacity-50' : ''}`}>
                  {d.dropoffs.length > 0 && <span title={`${d.dropoffs.length} drop-off${d.dropoffs.length === 1 ? '' : 's'}`} className="inline-flex items-center gap-0.5 rounded-md bg-orange-50 dark:bg-orange-900/30 px-1.5 py-0.5 text-[11px] font-bold leading-none text-orange-700 dark:text-orange-300 tabular-nums"><Icon name="arrowOut" className="w-3 h-3" />{d.dropoffs.length}</span>}
                  {d.pickups.length > 0 && <span title={`${d.pickups.length} pick-up${d.pickups.length === 1 ? '' : 's'}`} className="inline-flex items-center gap-0.5 rounded-md bg-sky-50 dark:bg-sky-900/30 px-1.5 py-0.5 text-[11px] font-bold leading-none text-sky-700 dark:text-sky-300 tabular-nums"><Icon name="arrowIn" className="w-3 h-3" />{d.pickups.length}</span>}
                </div>
                {busy && (
                  <div className="md:hidden flex gap-1 px-0.5">
                    {d.dropoffs.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />}
                    {d.pickups.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />}
                  </div>
                )}

                {/* How full, at the busiest moment of the day */}
                {(d.peakBags > 0 || d.peakVehicles > 0) && (
                  <div className={`mt-auto lg:mt-0 lg:absolute lg:inset-x-1.5 lg:bottom-1 space-y-0.5 ${!d.inMonth ? 'opacity-50' : ''}`} title={[d.peakBags ? `${d.peakBags}${bagCapacity ? ` of ${bagCapacity}` : ''} bags` : '', d.peakVehicles ? `${d.peakVehicles}${vehicleCapacity ? ` of ${vehicleCapacity}` : ''} vehicles` : ''].filter(Boolean).join(' · ')}>
                    {d.peakBags > 0 && <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><div className={`h-full ${bagFill.cls}`} style={{ width: `${bagFill.pct}%` }} /></div>}
                    {d.peakVehicles > 0 && <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><div className={`h-full ${carFill.cls}`} style={{ width: `${carFill.pct}%` }} /></div>}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 md:px-5 py-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500" />Drop-offs</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" />Pick-ups</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3.5 min-w-[0.875rem] px-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">1</span>Needs your answer</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-1 w-5 rounded-full bg-emerald-500" /><span className="h-1 w-3 rounded-full bg-amber-500" /><span className="h-1 w-2 rounded-full bg-red-500" />How full{hasBags && hasVehicles ? ' (bags, then vehicles)' : ''}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-4 rounded border border-gray-200 dark:border-gray-700 bg-[repeating-linear-gradient(135deg,transparent,transparent_2px,rgba(148,163,184,0.35)_2px,rgba(148,163,184,0.35)_4px)]" />Closed</span>
        </div>
        {props.truncated && <p className="shrink-0 px-5 pb-2 text-xs text-amber-700 dark:text-amber-400">This month has a lot of bookings; some may not be shown. Use All bookings to see every one.</p>}
      </section>

      {/* Selected day */}
      <aside className="lg:min-h-0 flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        <div className="shrink-0 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">{day.key === todayKey ? 'Today' : day.key < todayKey ? 'Past day' : 'Coming up'}</p>
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">{longDay(day.key)}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {dropoffs.length} drop-off{dropoffs.length === 1 ? '' : 's'} · {pickups.length} pick-up{pickups.length === 1 ? '' : 's'} · {stored.length} staying
          </p>
        </div>

        {(hasBags || hasVehicles) && (
          <div className="shrink-0 px-4 py-3 space-y-2.5 border-b border-gray-100 dark:border-gray-800">
            {hasBags && <Meter label="Bags" used={day.peakBags} cap={bagCapacity} />}
            {hasVehicles && <Meter label="Vehicles" used={day.peakVehicles} cap={vehicleCapacity} />}
            {((bagCapacity && day.peakBags > bagCapacity) || (vehicleCapacity && day.peakVehicles > vehicleCapacity)) ? (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">More is booked than your listed space. Check you can fit it all, or update capacity in Locations.</p>
            ) : null}
          </div>
        )}

        {day.closed.length > 0 && (
          <div className="shrink-0 mx-4 mt-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/40 px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
            <p className="font-bold text-gray-900 dark:text-white">Bookings paused</p>
            {day.closed.map(c => <p key={c}>{c}</p>)}
          </div>
        )}

        {dropoffs.length + pickups.length + stored.length === 0 ? (
          <div className="px-4 py-12 text-center lg:flex-1 lg:flex lg:flex-col lg:justify-center">
            <span className="mx-auto mb-2 h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center"><Icon name="calendar" className="w-5 h-5" /></span>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Nothing on this day</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">No drop-offs, pick-ups or stored items.</p>
          </div>
        ) : (
          <div className="pb-2 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
            {dropoffs.length > 0 && (
              <>
                <h3 className="flex items-center gap-1.5 px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400"><Icon name="arrowOut" className="w-3.5 h-3.5" />Drop-offs</h3>
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">{dropoffs.map(b => <Entry key={b.id} b={b} kind="in" multiLocation={multiLocation} />)}</ul>
              </>
            )}
            {pickups.length > 0 && (
              <>
                <h3 className="flex items-center gap-1.5 px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400"><Icon name="arrowIn" className="w-3.5 h-3.5" />Pick-ups</h3>
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">{pickups.map(b => <Entry key={b.id} b={b} kind="out" multiLocation={multiLocation} />)}</ul>
              </>
            )}
            {stored.length > 0 && (
              <>
                <button type="button" onClick={() => setShowStored(s => !s)} aria-expanded={showStored}
                  className="w-full flex items-center justify-between px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300">
                  <span className="flex items-center gap-1.5"><Icon name="bag" className="w-3.5 h-3.5" />Staying all day ({stored.length})</span>
                  <Icon name="chevron" className={`w-3.5 h-3.5 transition-transform ${showStored ? 'rotate-90' : ''}`} />
                </button>
                {showStored && <ul className="divide-y divide-gray-100 dark:divide-gray-800">{stored.map(b => <Entry key={b.id} b={b} kind="stay" multiLocation={multiLocation} />)}</ul>}
              </>
            )}
          </div>
        )}
        <div className="shrink-0 mt-auto px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <Link href={`/dashboard/bookings?tab=all&date=${day.key}`} className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline">See this day in Bookings →</Link>
        </div>
      </aside>
    </div>
  );
}
