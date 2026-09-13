'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BookingSidebar({ 
  location, 
  initialSearch,
  isGarage,
  vehicleType,
  label
}: { 
  location: any, 
  initialSearch: any,
  isGarage: boolean,
  vehicleType: string,
  label: string
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
  const [quantity, setQuantity] = useState(parseInt(initialSearch.bags || '1'));

  const [totalPrice, setTotalPrice] = useState(0);
  const [pricingBreakdown, setPricingBreakdown] = useState({ diffHours: 0, baseTotal: 0, gstTotal: 0, finalTotal: 0, pricePerHourIncGst: 0 });

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  let maxCapacity = location.capacity || 20;
  if (isGarage && location.vehicle_pricing) {
    const vp = Array.isArray(location.vehicle_pricing) ? location.vehicle_pricing[0] : location.vehicle_pricing;
    if (vp) {
      if (vehicleType === 'bike') maxCapacity = vp.bike_capacity || 10;
      if (vehicleType === 'sedan') maxCapacity = vp.sedan_capacity || 10;
      if (vehicleType === 'suv') maxCapacity = vp.suv_capacity || 10;
    }
  }

  // Calculate pricing
  useEffect(() => {
    let basePriceHr = location.price_per_hour;
    if (isGarage && location.vehicle_pricing) {
      const vp = Array.isArray(location.vehicle_pricing) ? location.vehicle_pricing[0] : location.vehicle_pricing;
      if (vp) {
        if (vehicleType === 'bike') basePriceHr = vp.bike_rate_hr || location.price_per_hour;
        if (vehicleType === 'sedan') basePriceHr = vp.sedan_rate_hr || location.price_per_hour;
        if (vehicleType === 'suv') basePriceHr = vp.suv_rate_hr || location.price_per_hour;
      }
    }

    const pricePerHourIncGst = Math.ceil((basePriceHr || 0) * 1.18);

    const inDateObj = new Date(`${inDate}T${inTime}`);
    const outDateObj = new Date(`${outDate}T${outTime}`);
    
    if (outDateObj > inDateObj && quantity > 0) {
      const diffMs = outDateObj.getTime() - inDateObj.getTime();
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      
      const finalTotal = pricePerHourIncGst * diffHours * quantity;
      
      // Reverse calculate base and GST from the final rounded total
      const baseTotal = finalTotal / 1.18;
      const gstTotal = finalTotal - baseTotal;
      
      setTotalPrice(finalTotal);
      setPricingBreakdown({ diffHours, baseTotal, gstTotal, finalTotal, pricePerHourIncGst });
    } else {
      setTotalPrice(0);
      setPricingBreakdown({ diffHours: 0, baseTotal: 0, gstTotal: 0, finalTotal: 0, pricePerHourIncGst });
    }
  }, [inDate, inTime, outDate, outTime, quantity, location, isGarage, vehicleType]);

  const handleInChange = (type: 'date' | 'time', value: string) => {
    let newDate = inDate;
    let newTime = inTime;
    if (type === 'date') newDate = value;
    if (type === 'time') newTime = value;

    setInDate(newDate);
    setInTime(newTime);

    const dropOff = new Date(`${newDate}T${newTime}`);
    if (!isNaN(dropOff.getTime())) {
      dropOff.setHours(dropOff.getHours() + 1);
      const yyyy = dropOff.getFullYear();
      const mm = String(dropOff.getMonth() + 1).padStart(2, '0');
      const dd = String(dropOff.getDate()).padStart(2, '0');
      const hh = String(dropOff.getHours()).padStart(2, '0');
      
      setOutDate(`${yyyy}-${mm}-${dd}`);
      setOutTime(`${hh}:00`);
    }
  };

  const handleBook = () => {
    const params = new URLSearchParams({
      location_id: location.id,
      in: `${inDate}T${inTime}`,
      out: `${outDate}T${outTime}`,
      bags: quantity.toString(),
      price: totalPrice.toString()
    });
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 sticky top-24">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <span className="text-3xl font-black text-gray-900">₹{pricingBreakdown.pricePerHourIncGst || 0}</span>
          <span className="text-gray-500 font-medium"> / hr</span>
        </div>
        <div className="bg-red-50 text-red-600 font-black text-[10px] px-2 py-1 rounded border border-red-200 transform rotate-[-5deg] uppercase tracking-wider shadow-sm mt-1 inline-block">
          No Platform Fee
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {/* Drop off */}
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col gap-2">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Drop off</label>
          <div className="flex gap-2">
            <input 
              type="date" 
              value={inDate}
              onChange={e => handleInChange('date', e.target.value)}
              min={minDate}
              className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-medium outline-none"
            />
            <select 
              value={inTime}
              onChange={e => handleInChange('time', e.target.value)}
              className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-medium outline-none"
            >
              {hours.map(h => <option key={h} value={h} disabled={inDate === minDate && h < `${currentHour}:00`}>{h}</option>)}
            </select>
          </div>
        </div>

        {/* Pick up */}
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col gap-2">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Pick up</label>
          <div className="flex gap-2">
            <input 
              type="date" 
              value={outDate}
              onChange={e => setOutDate(e.target.value)}
              min={inDate || minDate}
              className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-medium outline-none"
            />
            <select 
              value={outTime}
              onChange={e => setOutTime(e.target.value)}
              className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-medium outline-none"
            >
              {hours.map(h => <option key={h} value={h} disabled={outDate === inDate && h <= inTime}>{h}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">{isGarage ? label + (quantity > 1 ? 's' : '') : (quantity > 1 ? 'Bags' : 'Bag')}</label>
            <span className="text-xs font-bold text-gray-400">Max: {maxCapacity}</span>
          </div>
          
          <div className="flex gap-4 items-center">
            <input 
              type="range"
              min={1}
              max={maxCapacity}
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className="flex-1 accent-orange-500 cursor-pointer"
            />
            <input 
              type="number"
              min={1}
              max={maxCapacity}
              value={quantity}
              onChange={e => {
                let v = parseInt(e.target.value);
                if (isNaN(v)) return;
                if (v > maxCapacity) v = maxCapacity;
                if (v < 1) v = 1;
                setQuantity(v);
              }}
              onBlur={e => {
                if (!e.target.value || isNaN(parseInt(e.target.value))) {
                  setQuantity(1);
                }
              }}
              className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold outline-none text-center"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 mb-6">
        <div className="flex justify-between text-gray-600 mb-2">
          <span>{quantity} × {label} × {pricingBreakdown.diffHours} hrs</span>
          <span>₹{pricingBreakdown.baseTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600 mb-2">
          <span>GST (18%)</span>
          <span>₹{pricingBreakdown.gstTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100 mt-2">
          <span>Total</span>
          <span>₹{pricingBreakdown.finalTotal.toFixed(2)}</span>
        </div>
      </div>

      <button 
        onClick={handleBook}
        disabled={totalPrice === 0}
        className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
      >
        Book Now
      </button>
      
      <p className="text-center text-xs text-gray-500 mt-4">You won't be charged yet.</p>
    </div>
  );
}
