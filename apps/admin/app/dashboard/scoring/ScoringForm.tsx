'use client';

import { useState } from 'react';
import { updateScoringRules } from './actions';

export default function ScoringForm({ initialRules }: { initialRules: any }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // We will format the initial JSON for nice multiline text areas
  const formatJSON = (obj: any) => JSON.stringify(obj, null, 2);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await updateScoringRules(formData);

    if (res.error) {
      setMessage({ type: 'error', text: res.error });
    } else {
      setMessage({ type: 'success', text: 'Scoring rules updated successfully.' });
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">Weightage Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amenity Weights (JSON)</label>
              <textarea 
                name="amenity_weights" 
                rows={4} 
                defaultValue={formatJSON(initialRules.amenity_weights)} 
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm bg-white dark:bg-gray-900 dark:text-gray-100" 
              />
              <p className="text-xs text-gray-500 mt-1">Keys match the amenity keys in location arrays.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transit Proximity Weights (JSON)</label>
              <textarea 
                name="transit_weights" 
                rows={4} 
                defaultValue={formatJSON(initialRules.transit_weights)} 
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm bg-white dark:bg-gray-900 dark:text-gray-100" 
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">Pricing Bounds (Min/Max Hourly)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Luggage Rates (JSON)</label>
              <textarea 
                name="luggage_rates" 
                rows={4} 
                defaultValue={formatJSON(initialRules.luggage_rates)} 
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm bg-white dark:bg-gray-900 dark:text-gray-100" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Garage: Bike Rates (JSON)</label>
              <textarea 
                name="garage_bike_rates" 
                rows={4} 
                defaultValue={formatJSON(initialRules.garage_bike_rates)} 
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm bg-white dark:bg-gray-900 dark:text-gray-100" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Garage: Car Rates (JSON)</label>
              <textarea 
                name="garage_car_rates" 
                rows={4} 
                defaultValue={formatJSON(initialRules.garage_car_rates)} 
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm bg-white dark:bg-gray-900 dark:text-gray-100" 
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">Global Settings</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GST Rate (%)</label>
            <input 
              type="number" 
              step="0.01"
              name="gst_rate" 
              defaultValue={initialRules.gst_rate} 
              className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-gray-900 dark:text-gray-100" 
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-gray-100 dark:border-gray-800">
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="px-8 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:opacity-70 transition-colors"
        >
          {isSubmitting ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </form>
  );
}
