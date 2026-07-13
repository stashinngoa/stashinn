'use client';

import { useState } from 'react';
import { updateNotificationPreferences } from './actions';

export default function ProfileForm({ initialPrefs }: { initialPrefs: any }) {
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess(false);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateNotificationPreferences(formData);

    setIsSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const Toggle = ({ name, label, description, defaultChecked }: any) => (
    <div className="flex items-center justify-between py-4">
      <div>
        <span className="block text-sm font-bold text-gray-900">{label}</span>
        <span className="block text-xs text-gray-500 mt-0.5">{description}</span>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
      </label>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
      
      <Toggle 
        name="in_app" 
        label="In-App Notifications" 
        description="Receive alerts within the StashInn portal via the notification bell." 
        defaultChecked={initialPrefs.in_app} 
      />
      
      <Toggle 
        name="email" 
        label="Email Notifications" 
        description="Receive daily booking summaries and payout receipts via email." 
        defaultChecked={initialPrefs.email} 
      />
      
      <Toggle 
        name="sms" 
        label="SMS Alerts" 
        description="Get text messages for new booking requests." 
        defaultChecked={initialPrefs.sms} 
      />
      
      <Toggle 
        name="whatsapp" 
        label="WhatsApp Messages" 
        description="Receive immediate alerts and customer details directly on WhatsApp." 
        defaultChecked={initialPrefs.whatsapp} 
      />
      
      <Toggle 
        name="push" 
        label="Push Notifications" 
        description="Get native mobile/browser push notifications for incoming requests." 
        defaultChecked={initialPrefs.push} 
      />

      <div className="pt-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {success && (
            <span className="text-sm font-bold text-green-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Preferences Saved
            </span>
          )}
          {error && (
            <span className="text-sm font-bold text-red-600">{error}</span>
          )}
        </div>

        <button 
          type="submit" 
          disabled={isSaving}
          className="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </form>
  );
}
