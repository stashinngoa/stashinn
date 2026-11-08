'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { getSearchSuggestions } from '../actions';

type Mode = 'luggage' | 'garage';
type VehicleType = 'bike' | 'car' | 'suv';

const pad = (n: number) => String(n).padStart(2, '0');
const toDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const TIMES = Array.from({ length: 48 }, (_, i) => `${pad(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`);
const fmtTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${((h! + 11) % 12) + 1}:${pad(m!)} ${h! < 12 ? 'AM' : 'PM'}`;
};
const fmtDay = (d: string) => new Date(`${d}T00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const VEHICLES: { value: VehicleType; label: string }[] = [
  { value: 'bike', label: 'Bike / scooter' },
  { value: 'car', label: 'Car' },
  { value: 'suv', label: 'SUV' },
];

/** Next half hour from now, as the default drop-off. */
function nextSlot() {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d;
}

function initialTimes(inIso?: string, outIso?: string) {
  const parse = (iso?: string) => (iso && !isNaN(new Date(iso).getTime()) ? new Date(iso) : null);
  const start = parse(inIso) ?? nextSlot();
  const end = parse(outIso) && parse(outIso)! > start ? parse(outIso)! : new Date(start.getTime() + 2 * 3_600_000);
  return { inDate: toDate(start), inTime: toTime(start), outDate: toDate(end), outTime: toTime(end) };
}

export default function SearchHeader({ initialSearch }: { initialSearch: Record<string, string | undefined> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [mode, setMode] = useState<Mode>(initialSearch.mode === 'garage' ? 'garage' : 'luggage');
  const [city, setCity] = useState(initialSearch.q || '');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    initialSearch.lat && initialSearch.lon ? { lat: parseFloat(initialSearch.lat), lon: parseFloat(initialSearch.lon) } : null,
  );
  const [times, setTimes] = useState(() => initialTimes(initialSearch.in, initialSearch.out));
  const [bags, setBags] = useState(Math.max(1, parseInt(initialSearch.bags || '1') || 1));
  const [vehicleType, setVehicleType] = useState<VehicleType>(initialSearch.vehicleType === 'bike' || initialSearch.vehicleType === 'suv' ? initialSearch.vehicleType : 'car');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false); // compact layout (below xl)
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const today = toDate(new Date());

  // Place suggestions while typing (not once a suggestion has been picked)
  useEffect(() => {
    if (coords || city.trim().length < 2) { setSuggestions([]); return; }
    const t = setTimeout(async () => setSuggestions(await getSearchSuggestions(city.trim())), 300);
    return () => clearTimeout(t);
  }, [city, coords]);

  // Close suggestions / the compact panel on an outside click or Escape
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) { setShowSuggestions(false); setPanelOpen(false); } };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setShowSuggestions(false); setPanelOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, []);

  // Moving drop-off past pick-up pushes pick-up to two hours later
  const setDropOff = (date: string, time: string) => {
    setTimes(prev => {
      const start = new Date(`${date}T${time}`);
      const end = new Date(`${prev.outDate}T${prev.outTime}`);
      if (end > start) return { ...prev, inDate: date, inTime: time };
      const next = new Date(start.getTime() + 2 * 3_600_000);
      return { inDate: date, inTime: time, outDate: toDate(next), outTime: toTime(next) };
    });
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const start = new Date(`${times.inDate}T${times.inTime}`);
    const end = new Date(`${times.outDate}T${times.outTime}`);
    if (!(end > start)) return setError('Pick-up must be after drop-off.');
    setError(null);

    // Keep the current filters; change the search itself
    const params = new URLSearchParams(Object.entries(initialSearch).filter(([k, v]) => v && !['q', 'lat', 'lon', 'in', 'out', 'mode', 'bags', 'vehicleType', 'page'].includes(k)) as [string, string][]);
    if (city.trim()) params.set('q', city.trim());
    if (coords) { params.set('lat', String(coords.lat)); params.set('lon', String(coords.lon)); }
    params.set('in', `${times.inDate}T${times.inTime}`);
    params.set('out', `${times.outDate}T${times.outTime}`);
    params.set('mode', mode);
    if (mode === 'luggage') params.set('bags', String(bags));
    else params.set('vehicleType', vehicleType);
    if (mode !== (initialSearch.mode === 'garage' ? 'garage' : 'luggage')) params.delete('amenities'); // amenities differ per mode

    setPanelOpen(false);
    setShowSuggestions(false);
    startTransition(() => router.push(`/search?${params.toString()}`));
  };

  const what = mode === 'luggage' ? `${bags} bag${bags === 1 ? '' : 's'}` : VEHICLES.find(v => v.value === vehicleType)!.label;

  // ---- shared field pieces
  const whereField = (compact: boolean) => (
    <div className="relative">
      <input
        type="text"
        value={city}
        onChange={e => { setCity(e.target.value); setCoords(null); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        placeholder="Area, beach or landmark"
        aria-label="Where"
        autoComplete="off"
        className={compact
          ? 'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white placeholder:font-normal placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20'
          : 'w-full bg-transparent p-0 text-sm font-semibold text-gray-900 dark:text-white placeholder:font-normal placeholder:text-gray-400 outline-none border-0 focus:ring-0'}
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul role="listbox" className={`absolute z-[60] mt-3 ${compact ? 'inset-x-0' : '-left-5 w-[340px]'} overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-1.5 shadow-2xl`}>
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => { setCity(s.name); setCoords({ lat: s.lat, lon: s.lon }); setShowSuggestions(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-orange-50 dark:hover:bg-gray-800"
              >
                <span className="w-9 h-9 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">{s.name}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{s.display_name}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const dateTime = (which: 'in' | 'out', compact: boolean) => {
    const date = which === 'in' ? times.inDate : times.outDate;
    const time = which === 'in' ? times.inTime : times.outTime;
    const setDate = (v: string) => (which === 'in' ? setDropOff(v, times.inTime) : setTimes(t => ({ ...t, outDate: v })));
    const setTime = (v: string) => (which === 'in' ? setDropOff(times.inDate, v) : setTimes(t => ({ ...t, outTime: v })));
    const box = compact ? 'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5' : 'p-0 border-0 bg-transparent';
    const times30 = TIMES.includes(time) ? TIMES : [time, ...TIMES].sort();
    if (!compact) {
      // Short text ("Sat, 8 Nov") over an invisible native date input that opens its picker
      return (
        <div className="flex items-center gap-1.5">
          <label className="relative cursor-pointer text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap hover:text-orange-600 dark:hover:text-orange-400">
            {new Date(`${date}T00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            <input
              type="date"
              aria-label={which === 'in' ? 'Drop-off date' : 'Pick-up date'}
              value={date}
              min={which === 'in' ? today : times.inDate}
              onChange={e => e.target.value && setDate(e.target.value)}
              onClick={e => { try { (e.currentTarget as HTMLInputElement).showPicker(); } catch { /* older browsers open it themselves */ } }}
              className="absolute inset-0 opacity-0 cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
            />
          </label>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <select
            aria-label={which === 'in' ? 'Drop-off time' : 'Pick-up time'}
            value={time}
            onChange={e => setTime(e.target.value)}
            className="w-[4.75rem] p-0 border-0 bg-transparent text-sm font-semibold text-gray-900 dark:text-white outline-none cursor-pointer appearance-none focus:ring-0 hover:text-orange-600 dark:hover:text-orange-400"
          >
            {times30.map(t => <option key={t} value={t} className="dark:bg-gray-900">{fmtTime(t)}</option>)}
          </select>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <input
          type="date"
          aria-label={which === 'in' ? 'Drop-off date' : 'Pick-up date'}
          value={date}
          min={which === 'in' ? today : times.inDate}
          onChange={e => e.target.value && setDate(e.target.value)}
          className={`${box} flex-1 text-sm font-semibold text-gray-900 dark:text-white outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark] focus:ring-0`}
        />
        <select
          aria-label={which === 'in' ? 'Drop-off time' : 'Pick-up time'}
          value={time}
          onChange={e => setTime(e.target.value)}
          className={`${box} w-32 text-sm font-semibold text-gray-900 dark:text-white outline-none cursor-pointer focus:ring-0`}
        >
          {times30.map(t => <option key={t} value={t} className="dark:bg-gray-900">{fmtTime(t)}</option>)}
        </select>
      </div>
    );
  };

  const modeSwitch = (size: 'sm' | 'md') => (
    <div role="radiogroup" aria-label="What are you storing?" className={`relative grid grid-cols-2 rounded-full bg-gray-100 dark:bg-gray-800 p-1 ${size === 'md' ? 'w-full' : ''}`}>
      {/* Orange pill that slides under the selected type */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-orange-600 shadow-sm shadow-orange-600/30 transition-transform duration-300 ease-out ${mode === 'garage' ? 'translate-x-full' : ''}`}
      />
      {(['luggage', 'garage'] as Mode[]).map(m => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          title={m === 'luggage' ? 'Luggage' : 'Vehicle'}
          onClick={() => setMode(m)}
          className={`relative ${size === 'md' ? 'py-2' : 'py-1.5'} inline-flex items-center justify-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors duration-300 ${mode === m ? 'text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
        >
          {m === 'luggage' ? <BagIcon /> : <CarIcon />}
          <span className={size === 'sm' ? 'hidden 2xl:inline' : ''}>{m === 'luggage' ? 'Luggage' : 'Vehicle'}</span>
        </button>
      ))}
    </div>
  );

  const whatField = (compact: boolean) =>
    mode === 'luggage' ? (
      <div className="flex items-center gap-2">
        <Stepper label="Fewer bags" small={!compact} disabled={bags <= 1} onClick={() => setBags(b => Math.max(1, b - 1))}>−</Stepper>
        <span className={`${compact ? 'flex-1 text-center' : 'min-w-[3.25rem] text-center whitespace-nowrap'} text-sm font-semibold text-gray-900 dark:text-white`}>{bags} bag{bags === 1 ? '' : 's'}</span>
        <Stepper label="More bags" small={!compact} disabled={bags >= 20} onClick={() => setBags(b => Math.min(20, b + 1))}>+</Stepper>
      </div>
    ) : (
      <select
        aria-label="Vehicle"
        value={vehicleType}
        onChange={e => setVehicleType(e.target.value as VehicleType)}
        className={`${compact ? 'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5' : 'p-0 border-0 bg-transparent w-[130px]'} text-sm font-semibold text-gray-900 dark:text-white outline-none cursor-pointer focus:ring-0`}
      >
        {VEHICLES.map(v => <option key={v.value} value={v.value} className="dark:bg-gray-900">{v.label}</option>)}
      </select>
    );

  const searchButton = (wide: boolean) => (
    <button
      type="submit"
      disabled={isPending}
      aria-label="Search"
      className={`${wide ? 'w-full h-12 rounded-xl gap-2' : 'w-10 h-10 rounded-full'} shrink-0 inline-flex items-center justify-center bg-orange-600 hover:bg-orange-500 text-white font-bold transition-colors disabled:opacity-70`}
    >
      {isPending ? (
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      )}
      {wide && 'Search'}
    </button>
  );

  return (
    <div ref={rootRef} className="relative flex-1 min-w-0 flex justify-center">
      {/* Wide screens: one bar */}
      <form onSubmit={submit} className="hidden xl:flex items-center w-full max-w-[1080px] rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 pl-1.5 pr-1 py-1 shadow-sm hover:shadow-md transition-shadow">
        <div className="shrink-0 pl-1 pr-2">{modeSwitch('sm')}</div>
        <Segment label="Where" className="flex-1 min-w-[150px]">{whereField(false)}</Segment>
        <Segment label="Drop-off" className="shrink-0">{dateTime('in', false)}</Segment>
        <Segment label="Pick-up" className="shrink-0">{dateTime('out', false)}</Segment>
        <Segment label={mode === 'luggage' ? 'Bags' : 'Vehicle'} className="shrink-0" last>{whatField(false)}</Segment>
        {searchButton(false)}
      </form>

      {/* Smaller screens: a summary that opens the full search */}
      <div className="xl:hidden w-full max-w-md relative">
        <button
          type="button"
          onClick={() => setPanelOpen(o => !o)}
          aria-expanded={panelOpen}
          className="w-full flex items-center gap-3 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 pl-4 pr-1.5 py-1.5 shadow-sm text-left"
        >
          <svg className="w-4 h-4 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-gray-900 dark:text-white truncate">{city || 'Where to?'}</span>
            <span className="block text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {fmtDay(times.inDate)}, {fmtTime(times.inTime)} → {times.outDate !== times.inDate ? `${fmtDay(times.outDate)}, ` : ''}{fmtTime(times.outTime)} · {what}
            </span>
          </span>
          <span className="w-9 h-9 shrink-0 rounded-full bg-orange-600 text-white flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          </span>
        </button>

        {panelOpen && (
          <form onSubmit={submit} className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-[60px] sm:top-full sm:mt-3 sm:w-[420px] z-[60] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-2xl space-y-4">
            {modeSwitch('md')}
            <Field label="Where">{whereField(true)}</Field>
            <Field label="Drop-off">{dateTime('in', true)}</Field>
            <Field label="Pick-up">{dateTime('out', true)}</Field>
            <Field label={mode === 'luggage' ? 'Bags' : 'Vehicle'}>{whatField(true)}</Field>
            {error && <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>}
            {searchButton(true)}
          </form>
        )}
      </div>
      {error && !panelOpen && (
        <p role="alert" className="hidden xl:block absolute top-full mt-1 text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function Segment({ label, children, className = '', last = false }: { label: string; children: React.ReactNode; className?: string; last?: boolean }) {
  return (
    <div className={`relative px-5 ${last ? '' : 'after:absolute after:right-0 after:top-2 after:bottom-2 after:w-px after:bg-gray-200 dark:after:bg-gray-700'} ${className}`}>
      <span className="block text-[10px] leading-3 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</span>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</span>
      {children}
    </div>
  );
}

function Stepper({ label, disabled, onClick, children, small = false }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`${small ? 'w-6 h-6 text-sm' : 'w-7 h-7'} shrink-0 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold leading-none hover:border-orange-400 hover:text-orange-600 disabled:opacity-30 disabled:hover:border-gray-300 disabled:hover:text-gray-700`}
    >
      {children}
    </button>
  );
}

const BagIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-9 0h12a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2zm3 13v1m6-1v1" /></svg>
);
const CarIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l1.5-4.5A2 2 0 018.4 7h7.2a2 2 0 011.9 1.5L19 13M5 13h14M5 13a2 2 0 00-2 2v2h18v-2a2 2 0 00-2-2M7 17v2m10-2v2M7.5 15h.01M16.5 15h.01" /></svg>
);
