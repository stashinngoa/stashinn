'use client';

import { useState, useEffect } from 'react';
import { updateLocationScoreAndRates } from './actions';
import { useFormStatus } from 'react-dom';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-gray-900 dark:text-white font-bold rounded-lg transition-colors disabled:opacity-70"
    >
      {pending ? 'Saving & Applying Rates...' : 'Apply Scoring & Automate Rates'}
    </button>
  );
}

export default function LocationScoringEngine({ location, partner, rules }: { location: any, partner: any, rules: any }) {
  const [padding, setPadding] = useState(location.score_padding || 0);
  const [proximity, setProximity] = useState(location.transit_proximity || 'over_3km');
  const [includeGst, setIncludeGst] = useState(true);
  
  const [autoScore, setAutoScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [breakdown, setBreakdown] = useState<any>({});
  
  // Calculate Score on the fly
  useEffect(() => {
    let amScore = 0;
    const amLog: any = {};
    if (location.amenities && Array.isArray(location.amenities)) {
      location.amenities.forEach((am: string) => {
        if (rules.amenity_weights[am]) {
          amScore += rules.amenity_weights[am];
          amLog[am] = rules.amenity_weights[am];
        }
      });
    }
    
    // Some hardcoded amenities based on columns
    if (location.has_cctv && rules.amenity_weights['cctv'] && !amLog['cctv']) {
      amScore += rules.amenity_weights['cctv'];
      amLog['cctv'] = rules.amenity_weights['cctv'];
    }
    if (location.has_security_guard && rules.amenity_weights['security_guard']) {
      amScore += rules.amenity_weights['security_guard'];
      amLog['security_guard'] = rules.amenity_weights['security_guard'];
    }
    
    const proxScore = rules.transit_weights[proximity] || 0;
    
    // Mock Rating Score for now (Max 30) - In a real app we'd query average reviews
    const ratingScore = 15; // Default for new locations
    
    const totalAuto = Math.min(100, amScore + proxScore + ratingScore);
    const totalFinal = Math.max(0, Math.min(100, totalAuto + padding));
    
    setAutoScore(totalAuto);
    setFinalScore(totalFinal);
    setBreakdown({ amScore, proxScore, ratingScore, amLog });
    
  }, [location, rules, proximity, padding]);
  
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
    const activeGstRate = includeGst ? rules.gst_rate : 0;
    
    // 1. Initial calculation
    const rawInclGst = rate * (1 + (activeGstRate / 100));
    
    // 2. Final Customer Price (Rounded Up)
    const finalPrice = Math.ceil(rawInclGst);
    
    // 3. Reverse calculation from Final Price
    const trueBase = finalPrice / (1 + (activeGstRate / 100));
    const finalGst = finalPrice - trueBase;
    
    // 4. Final Splits based on the true base
    const commission = trueBase * (commissionRate / 100);
    const takehome = trueBase - commission;
    
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm mb-2">
        <p className="font-bold text-gray-900 dark:text-white mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">{label} Space</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-gray-500 mb-1">Target Base Rate</p>
            <p className="font-bold text-gray-900 dark:text-white">₹{rate.toFixed(2)}/hr</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Raw w/ {activeGstRate}% GST</p>
            <p className="font-bold text-gray-900 dark:text-white">₹{rawInclGst.toFixed(2)}/hr</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded border border-orange-100 dark:border-orange-800 -mt-1">
            <p className="text-orange-600 dark:text-orange-400 font-bold mb-1">Rounded Final Price</p>
            <p className="font-black text-orange-700 dark:text-orange-300 text-sm">₹{finalPrice.toFixed(2)}/hr</p>
          </div>
          
          <div className="sm:col-span-3 mt-1 pt-2 border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-2">
            <div>
              <p className="text-gray-500 mb-1">True Base (Reverse)</p>
              <p className="font-bold text-gray-700 dark:text-gray-300">₹{trueBase.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Platform Fee ({(commissionRate).toFixed(1)}%)</p>
              <p className="font-bold text-indigo-600 dark:text-indigo-400">₹{commission.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Partner Net ({(100 - commissionRate).toFixed(1)}%)</p>
              <p className="font-bold text-green-600 dark:text-green-400">₹{takehome.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-black text-gray-900 dark:text-white">Scoring Engine</h3>
        <div className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-bold">
          Final Score: {finalScore}/100
        </div>
      </div>
      
      <form action={async (formData) => {
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
        if (res?.error) alert(res.error);
        else alert('Scoring and rates updated successfully!');
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transit Proximity</label>
              <select 
                value={proximity} 
                onChange={e => setProximity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm outline-none"
              >
                <option value="under_1km">Under 1km to Transit (High)</option>
                <option value="1_to_3km">1-3km to Transit (Medium)</option>
                <option value="over_3km">Over 3km (Low)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Score Padding (Buffer)</label>
              <input 
                type="number" 
                value={padding}
                onChange={e => setPadding(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Add or subtract points manually to adjust the rate.</p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3 rounded-lg">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Score Breakdown</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Amenities</span> <span className="font-medium text-gray-900 dark:text-white">+{breakdown.amScore}</span></div>
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Location</span> <span className="font-medium text-gray-900 dark:text-white">+{breakdown.proxScore}</span></div>
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Reputation</span> <span className="font-medium text-gray-900 dark:text-white">+{breakdown.ratingScore}</span></div>
                <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700 font-bold"><span className="text-gray-900 dark:text-white">Auto Score</span> <span>{autoScore}</span></div>
                <div className="flex justify-between text-indigo-600"><span className="">Padding</span> <span>{padding >= 0 ? `+${padding}` : padding}</span></div>
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Generated Target Pricing</h4>
                <p className="text-xs text-gray-500 mb-3">These rates are automatically calculated based on the {finalScore} score and the global configured pricing bounds.</p>
              </div>
              
              <label className="flex items-center cursor-pointer shrink-0">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={includeGst} onChange={() => setIncludeGst(!includeGst)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${includeGst ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${includeGst ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <div className="ml-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                  Include GST
                </div>
              </label>
            </div>
            
            {ratesPreview?.luggage && renderRateRow('Luggage', ratesPreview.luggage)}
            {ratesPreview?.bike && renderRateRow('Garage: Bike', ratesPreview.bike)}
            {ratesPreview?.car && renderRateRow('Garage: Car', ratesPreview.car)}
            
            <SubmitBtn />
          </div>
        </div>
      </form>
    </div>
  );
}
