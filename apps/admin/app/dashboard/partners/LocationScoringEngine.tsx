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
      className="w-full mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors disabled:opacity-70"
    >
      {pending ? 'Saving & Applying Rates...' : 'Apply Scoring & Automate Rates'}
    </button>
  );
}

export default function LocationScoringEngine({ location, partner, rules }: { location: any, partner: any, rules: any }) {
  const [padding, setPadding] = useState(location.score_padding || 0);
  const [proximity, setProximity] = useState(location.transit_proximity || 'over_3km');
  
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
    const inclGst = rate * (1 + (rules.gst_rate / 100));
    const commission = rate * (commissionRate / 100);
    const takehome = rate - commission;
    
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm mb-2">
        <p className="font-bold text-gray-900 dark:text-white mb-1 border-b border-gray-200 dark:border-gray-700 pb-1">{label} Space</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <p className="text-gray-500">Excl. GST: <span className="font-bold text-gray-900 dark:text-white">₹{rate.toFixed(2)}/hr</span></p>
          <p className="text-gray-500">Incl. GST: <span className="font-bold text-gray-900 dark:text-white">₹{inclGst.toFixed(2)}/hr</span></p>
          <p className="text-indigo-500 font-medium">Platform Fee: ₹{commission.toFixed(2)}</p>
          <p className="text-green-600 font-medium">Partner Net: ₹{takehome.toFixed(2)}</p>
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
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Generated Target Pricing</h4>
            <p className="text-xs text-gray-500 mb-3">These rates are automatically calculated based on the {finalScore} score and the global configured pricing bounds.</p>
            
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
