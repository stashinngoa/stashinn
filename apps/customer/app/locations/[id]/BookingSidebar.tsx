'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { bookingLengthError, type BookingRules } from '@stashinn/lib/services/bookingRules';
import { hourlyRate, overlappingPause, quote, vehicleCapacity, type PauseWindow } from '@stashinn/lib/services/bookingAvailability';

export default function BookingSidebar({ 
  location, 
  initialSearch,
  isGarage,
  vehicleType,
  label,
  rules,
  pauses = [],
  gstPercent
}: { 
  location: any, 
  initialSearch: any,
  isGarage: boolean,
  vehicleType: string,
  label: string,
  rules: BookingRules,
  pauses?: PauseWindow[],
  gstPercent: number
}) {
  const router = useRouter();
  
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const currentHour = String(today.getHours()).padStart(2, '0');
  const minDate = `${yyyy}-${mm}-${dd}`;

  // Parse initialSearch or default
  const getInitial = (iso?: string, fallbackDate?: string, fallbackTime?: string) => {
    if (iso && iso.includes('T')) {
      const [d, t] = iso.split('T');
      return { d: d || fallbackDate || minDate, t: t ? t.substring(0, 5) : (fallbackTime || '10:00') };
    }
    return { d: fallbackDate || minDate, t: fallbackTime || '10:00' };
  };

  const initialIn = getInitial(initialSearch.in, minDate, `${currentHour}:00`);
  const initialOut = getInitial(initialSearch.out, minDate, `${String(today.getHours() + 2).padStart(2, '0')}:00`);
  
  const [inDate, setInDate] = useState(initialIn.d);
  const [inTime, setInTime] = useState(initialIn.t);
  const [outDate, setOutDate] = useState(initialOut.d);
  const [outTime, setOutTime] = useState(initialOut.t);
  const [quantity, setQuantity] = useState(isGarage ? 1 : parseInt(initialSearch.bags || '1'));

  const [totalPrice, setTotalPrice] = useState(0);
  const [pricingBreakdown, setPricingBreakdown] = useState({ diffHours: 0, baseTotal: 0, gstTotal: 0, finalTotal: 0, pricePerHourIncGst: 0 });

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  const maxCapacity = isGarage ? 1 : (location.max_bags || 20);

  // Calculate pricing (same rules the server uses at checkout)
  useEffect(() => {
    const rate = hourlyRate(location, isGarage ? 'garage' : 'luggage', vehicleType);
    const q = quote(rate, new Date(`${inDate}T${inTime}`), new Date(`${outDate}T${outTime}`), isGarage ? 1 : quantity, gstPercent);
    setTotalPrice(q.total);
    setPricingBreakdown({ diffHours: q.hours, baseTotal: q.base, gstTotal: q.gst, finalTotal: q.total, pricePerHourIncGst: q.pricePerHourIncGst });
  }, [inDate, inTime, outDate, outTime, quantity, location, isGarage, vehicleType, gstPercent]);

  const noVehicleSpace = isGarage && vehicleCapacity(location, vehicleType) === 0;
  const hasRate = hourlyRate(location, isGarage ? 'garage' : 'luggage', vehicleType) > 0;
  const pause = overlappingPause(pauses, new Date(`${inDate}T${inTime}`), new Date(`${outDate}T${outTime}`));

  const handleInChange = (type: 'date' | 'time', value: string) => {
    let newDate = inDate;
    let newTime = inTime;
    if (type === 'date') newDate = value;
    if (type === 'time') newTime = value;

    setInDate(newDate);
    setInTime(newTime);

    const dropOff = new Date(`${newDate}T${newTime}`);
    if (!isNaN(dropOff.getTime())) {
      dropOff.setHours(dropOff.getHours() + Math.ceil(rules.minHours));
      const yyyy = dropOff.getFullYear();
      const mm = String(dropOff.getMonth() + 1).padStart(2, '0');
      const dd = String(dropOff.getDate()).padStart(2, '0');
      const hh = String(dropOff.getHours()).padStart(2, '0');
      
      setOutDate(`${yyyy}-${mm}-${dd}`);
      setOutTime(`${hh}:00`);
    }
  };

  // Booking length limits from Admin → Configuration
  const lengthError = bookingLengthError(new Date(`${inDate}T${inTime}`), new Date(`${outDate}T${outTime}`), rules);

  const handleBook = () => {
    if (lengthError || pause || noVehicleSpace || !hasRate) return;
    const params = new URLSearchParams({
      location_id: location.id,
      in: `${inDate}T${inTime}`,
      out: `${outDate}T${outTime}`,
      bags: quantity.toString(),
    });
    if (isGarage) params.set('vehicleType', vehicleType);
    router.push(`/checkout?${params.toString()}`);
  };

  const fmtHour = (h: string) => {
    const n = parseInt(h);
    return `${((n + 11) % 12) + 1}:00 ${n < 12 ? 'AM' : 'PM'}`;
  };
  const blocked = totalPrice === 0 || !!lengthError || !!pause || noVehicleSpace || !hasRate;
  const field = 'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 [color-scheme:light] dark:[color-scheme:dark]';
  const notice = 'mb-3 rounded-xl border px-3 py-2 text-sm font-medium';
  const danger = `${notice} border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300`;

  return (
    <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-xl shadow-gray-900/5 dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <p>
          <span className="text-3xl font-black text-gray-900 dark:text-white">₹{pricingBreakdown.pricePerHourIncGst || 0}</span>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400"> / hour{isGarage ? '' : ' per bag'}</span>
        </p>
        <span className="mt-1.5 shrink-0 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">No booking fee</span>
      </div>

      <div className="mt-5 space-y-3">
        <fieldset>
          <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Drop-off</legend>
          <div className="flex gap-2">
            <input type="date" aria-label="Drop-off date" value={inDate} onChange={e => handleInChange('date', e.target.value)} min={minDate} className={`${field} flex-1 min-w-0`} />
            <select aria-label="Drop-off time" value={inTime} onChange={e => handleInChange('time', e.target.value)} className={`${field} w-[7.5rem]`}>
              {hours.map(h => <option key={h} value={h} disabled={inDate === minDate && h < `${currentHour}:00`}>{fmtHour(h)}</option>)}
            </select>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Pick-up</legend>
          <div className="flex gap-2">
            <input type="date" aria-label="Pick-up date" value={outDate} onChange={e => setOutDate(e.target.value)} min={inDate || minDate} className={`${field} flex-1 min-w-0`} />
            <select aria-label="Pick-up time" value={outTime} onChange={e => setOutTime(e.target.value)} className={`${field} w-[7.5rem]`}>
              {hours.map(h => <option key={h} value={h} disabled={outDate === inDate && h <= inTime}>{fmtHour(h)}</option>)}
            </select>
          </div>
        </fieldset>

        {isGarage ? (
          <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 px-3.5 py-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Vehicle</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">1 × {label}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 px-3.5 py-2.5">
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Bags</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">Up to {maxCapacity}</span>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Fewer bags" disabled={quantity <= 1} onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold hover:border-orange-400 hover:text-orange-600 disabled:opacity-30 disabled:pointer-events-none">−</button>
              <span className="w-6 text-center text-base font-bold text-gray-900 dark:text-white tabular-nums" aria-live="polite">{quantity}</span>
              <button type="button" aria-label="More bags" disabled={quantity >= maxCapacity} onClick={() => setQuantity(q => Math.min(maxCapacity, q + 1))} className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold hover:border-orange-400 hover:text-orange-600 disabled:opacity-30 disabled:pointer-events-none">+</button>
            </div>
          </div>
        )}
      </div>

      <dl className="mt-5 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-4 text-sm">
        <div className="flex justify-between gap-3 text-gray-600 dark:text-gray-400">
          <dt>₹{pricingBreakdown.pricePerHourIncGst} × {isGarage ? '' : `${quantity} bag${quantity === 1 ? '' : 's'} × `}{pricingBreakdown.diffHours} hour{pricingBreakdown.diffHours === 1 ? '' : 's'}</dt>
          <dd className="tabular-nums">₹{pricingBreakdown.finalTotal.toFixed(2)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-gray-100 dark:border-gray-800 pt-3 text-base font-extrabold text-gray-900 dark:text-white">
          <dt>Total</dt>
          <dd className="tabular-nums">₹{pricingBreakdown.finalTotal.toFixed(2)}</dd>
        </div>
      </dl>

      <div className="mt-4">
        {pause && (
          <p className={`${notice} border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300`}>
            This location isn&apos;t taking bookings from {new Date(pause.starts_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} to {new Date(pause.ends_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}. Please pick other times.
          </p>
        )}
        {!hasRate && <p className={danger}>This location isn&apos;t taking bookings right now.</p>}
        {noVehicleSpace && <p className={danger}>This location has no space for this vehicle type.</p>}
        {lengthError && totalPrice > 0 && <p className={danger}>{lengthError}</p>}

        <button
          onClick={handleBook}
          disabled={blocked}
          className="w-full rounded-xl bg-orange-600 py-3.5 text-base font-bold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
        >
          Book now
        </button>
        <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
          You won&apos;t be charged yet. Bookings from {rules.minHours} hour{rules.minHours === 1 ? '' : 's'} up to {rules.maxDays} day{rules.maxDays === 1 ? '' : 's'}.
        </p>
      </div>
    </div>
  );
}
