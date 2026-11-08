'use client';

import { useState, useEffect } from 'react';
import { updateLocationScoreAndRates } from './actions';
import { useFormStatus } from 'react-dom';
import { scoreAmenities, type Amenity } from '@stashinn/lib/services/amenities';
import { priceIncGst, splitAmount } from '@stashinn/lib/services/bookingAvailability';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full mt-4 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-70"
    >
      {pending ? 'Saving & applying rates…' : 'Apply score & update rates'}
    </button>
  );
}

export default function LocationScoringEngine({ location, partner, rules, amenities, onResult }: {
  location: any, partner: any, rules: any, amenities?: Amenity[],
  onResult?: (ok: boolean, text: string) => void; // shows the outcome; falls back to alert()
}) {
  const [padding, setPadding] = useState(location.score_padding || 0);
  const [proximity, setProximity] = useState(location.transit_proximity || 'over_3km');
  const [includeGst, setIncludeGst] = useState(true);
  const gstOff = partner?.gst_applicable === false; // an admin set GST as not applying to this partner
  
  const [autoScore, setAutoScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [breakdown, setBreakdown] = useState<any>({});
  
  // Calculate Score on the fly
  useEffect(() => {
    const { total: amScore, earned: amLog } = scoreAmenities(location, rules.amenity_weights, amenities);

    const proxScore = rules.transit_weights[proximity] || 0;
    
    // Mock Rating Score for now (Max 30) - In a real app we'd query average reviews
    const ratingScore = 15; // Default for new locations
    
    const totalAuto = Math.min(100, amScore + proxScore + ratingScore);
    const totalFinal = Math.max(0, Math.min(100, totalAuto + padding));
    
    setAutoScore(totalAuto);
    setFinalScore(totalFinal);
    setBreakdown({ amScore, proxScore, ratingScore, amLog });
    
  }, [location, rules, amenities, proximity, padding]);
  
  // Calculate Rates
  const calcRate = (min: number, max: number, score: number) => {
    return min + ((max - min) * (score / 100));
  };
  
  const commissionRate = location.commission_rate ?? partner.commission_rate ?? 15.00;
  
  let ratesPreview: any = null;
  if (location.location_type === 'luggage') {
    const rate = calcRate(rules.luggage_rates.min_hr, rules.luggage_rates.max_hr, finalScore);
    ratesPreview = { luggage: rate };
  } else {
    const bikeRate = calcRate(rules.garage_bike_rates.min_hr, rules.garage_bike_rates.max_hr, finalScore);
    const carRate = calcRate(rules.garage_car_rates.min_hr, rules.garage_car_rates.max_hr, finalScore);
    ratesPreview = { bike: bikeRate, car: carRate };
  }

  const renderRateRow = (label: string, rate: number) => {
    const activeGstRate = includeGst && !gstOff ? rules.gst_rate : 0;

    // 1. Initial calculation
    const rawInclGst = rate * (1 + (activeGstRate / 100));

    // 2. Final Customer Price (Rounded Up)
    const finalPrice = priceIncGst(rate, activeGstRate);

    // 3. Reverse calculation from Final Price
    const { gst: finalGst, commission, partner: takehome } = splitAmount(finalPrice, activeGstRate, commissionRate);
    const share = (n: number) => `${Math.max(0, Math.min(100, (n / finalPrice) * 100))}%`;

    return (
      <div key={label} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Target ₹{rate.toFixed(2)} · ₹{rawInclGst.toFixed(2)} with {activeGstRate}% GST</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-orange-600 dark:text-orange-400 tabular-nums">₹{finalPrice}<span className="text-xs font-bold text-gray-500 dark:text-gray-400">/hr</span></p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Customer pays</p>
          </div>
        </div>
        {/* Where each rupee goes */}
        <div className="mt-3 flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
          <div className="bg-emerald-500" style={{ width: share(takehome) }} title="Partner" />
          <div className="bg-orange-500" style={{ width: share(commission) }} title="StashInn" />
          <div className="bg-gray-400 dark:bg-gray-600" style={{ width: share(finalGst) }} title="GST" />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div><p className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-emerald-500" />Partner</p><p className="font-bold text-gray-900 dark:text-white tabular-nums">₹{takehome.toFixed(2)}</p></div>
          <div><p className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-orange-500" />StashInn {commissionRate}%</p><p className="font-bold text-gray-900 dark:text-white tabular-nums">₹{commission.toFixed(2)}</p></div>
          <div><p className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600" />GST</p><p className="font-bold text-gray-900 dark:text-white tabular-nums">₹{finalGst.toFixed(2)}</p></div>
        </div>
      </div>
    );
  };

  const field = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500';
  const report = (ok: boolean, text: string) => (onResult ? onResult(ok, text) : alert(text));

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50/60 dark:bg-gray-950/40 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Location score & rates</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Rates scale between the configured min and max with the score.</p>
        </div>
        <div className="relative h-14 w-14 shrink-0" aria-label={`Final score ${finalScore} out of 100`}>
          <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5" className="stroke-gray-200 dark:stroke-gray-800" />
            <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5" strokeLinecap="round" className="stroke-orange-500" strokeDasharray={`${(finalScore / 100) * 97.4} 97.4`} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-gray-900 dark:text-white tabular-nums">{finalScore}</span>
        </div>
      </div>

      <form className="p-4" action={async (formData) => {
        const payload = {
          auto_score: autoScore,
          score_padding: padding,
          final_score: finalScore,
          transit_proximity: proximity,
          calculated_rates: ratesPreview,
          location_type: location.location_type
        };
        formData.append('payload', JSON.stringify(payload));
        const res = await updateLocationScoreAndRates(location.id, formData);
        if (res?.error) report(false, res.error);
        else report(true, 'Score saved and rates updated');
      }}>
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-5">
          <div className="space-y-4">
            <label className="block">
              <span className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Distance to transit</span>
              <select value={proximity} onChange={e => setProximity(e.target.value)} className={field}>
                <option value="under_1km">Under 1 km (high)</option>
                <option value="1_to_3km">1–3 km (medium)</option>
                <option value="over_3km">Over 3 km (low)</option>
              </select>
            </label>

            <label className="block">
              <span className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Manual adjustment</span>
              <input type="number" value={padding} onChange={e => setPadding(parseInt(e.target.value) || 0)} className={field} />
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">Add or subtract points to nudge the rate.</span>
            </label>

            <div className="rounded-xl bg-gray-50 dark:bg-gray-950/50 border border-gray-200 dark:border-gray-800 p-3 space-y-1.5 text-sm">
              {[['Amenities', breakdown.amScore], ['Location', breakdown.proxScore], ['Reputation', breakdown.ratingScore]].map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{k}</span><span className="font-semibold text-gray-900 dark:text-white tabular-nums">+{v ?? 0}</span></div>
              ))}
              {Object.keys(breakdown.amLog || {}).length > 0 && (
                <ul className="pl-2 space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {Object.entries(breakdown.amLog as Record<string, number>).map(([key, points]) => (
                    <li key={key} className="flex justify-between">
                      <span>{amenities?.find(a => a.key === key)?.label ?? key}</span>
                      <span className="tabular-nums">{points ? `+${points}` : 'no points set'}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-between pt-1.5 border-t border-gray-200 dark:border-gray-800"><span className="font-bold text-gray-900 dark:text-white">Auto score</span><span className="font-bold text-gray-900 dark:text-white tabular-nums">{autoScore}</span></div>
              <div className="flex justify-between text-orange-600 dark:text-orange-400"><span>Adjustment</span><span className="tabular-nums">{padding >= 0 ? `+${padding}` : padding}</span></div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Generated pricing</p>
              {gstOff ? (
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">No GST for this partner</span>
              ) : (
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Preview with GST</span>
                <span className="relative">
                  <input type="checkbox" className="sr-only peer" checked={includeGst} onChange={() => setIncludeGst(!includeGst)} />
                  <span className="block w-9 h-5 rounded-full bg-gray-300 dark:bg-gray-700 peer-checked:bg-orange-500 transition-colors" />
                  <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                </span>
              </label>
              )}
            </div>

            {ratesPreview?.luggage && renderRateRow('Luggage', ratesPreview.luggage)}
            {ratesPreview?.bike && renderRateRow('Bike', ratesPreview.bike)}
            {ratesPreview?.car && renderRateRow('Car & SUV', ratesPreview.car)}

            <SubmitBtn />
          </div>
        </div>
      </form>
    </div>
  );
}
