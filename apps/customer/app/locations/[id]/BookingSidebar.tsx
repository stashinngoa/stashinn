'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BookingSidebar({ location, initialSearch }: { location: any, initialSearch: any }) {
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
  const [bags, setBags] = useState(parseInt(initialSearch.bags || '1'));

  const [totalPrice, setTotalPrice] = useState(0);

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  useEffect(() => {
    const inDateObj = new Date(`${inDate}T${inTime}`);
    const outDateObj = new Date(`${outDate}T${outTime}`);
    
    if (outDateObj > inDateObj && bags > 0) {
      const diffMs = outDateObj.getTime() - inDateObj.getTime();
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      
      let priceForOneBag = diffHours * location.price_per_hour;
      if (priceForOneBag > location.price_per_day) {
        priceForOneBag = location.price_per_day; 
        
        const days = Math.floor(diffHours / 24);
        const remainderHours = diffHours % 24;
        
        priceForOneBag = (days * location.price_per_day) + 
                         Math.min(remainderHours * location.price_per_hour, location.price_per_day);
      }
      
      setTotalPrice(priceForOneBag * bags);
    } else {
      setTotalPrice(0);
    }
  }, [inDate, inTime, outDate, outTime, bags, location]);

  const handleBook = () => {
    const params = new URLSearchParams({
      location_id: location.id,
      in: `${inDate}T${inTime}`,
      out: `${outDate}T${outTime}`,
      bags: bags.toString(),
      price: totalPrice.toString()
    });
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 sticky top-24">
      <div className="mb-6">
        <span className="text-2xl font-black text-gray-900">₹{location.price_per_day}</span>
        <span className="text-gray-500 font-medium"> / day</span>
      </div>

      <div className="space-y-4 mb-6">
        {/* Drop off */}
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col gap-2">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Drop off</label>
          <div className="flex gap-2">
            <input 
              type="date" 
              value={inDate}
              onChange={e => setInDate(e.target.value)}
              min={minDate}
              className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-medium outline-none"
            />
            <select 
              value={inTime}
              onChange={e => setInTime(e.target.value)}
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
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bags</label>
          <select 
            value={bags}
            onChange={e => setBags(parseInt(e.target.value))}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium outline-none cursor-pointer"
          >
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <option key={n} value={n}>{n} {n === 1 ? 'Bag' : 'Bags'}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 mb-6">
        <div className="flex justify-between text-gray-600 mb-2">
          <span>Storage fee</span>
          <span>₹{totalPrice}</span>
        </div>
        <div className="flex justify-between text-gray-600 mb-2">
          <span>Platform fee (Mock)</span>
          <span>₹0</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100 mt-2">
          <span>Total</span>
          <span>₹{totalPrice}</span>
        </div>
      </div>

      <button 
        onClick={handleBook}
        disabled={totalPrice === 0}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
      >
        Book Now
      </button>
      
      <p className="text-center text-xs text-gray-500 mt-4">You won't be charged yet.</p>
    </div>
  );
}
