'use client';

import { useState } from 'react';
import { updateSystemConfig } from '../actions';
import { useFormStatus } from 'react-dom';

function SubmitButton({ defaultText, loadingText }: { defaultText: string, loadingText: string }) {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending} 
      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-gray-900 dark:text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending ? loadingText : defaultText}
    </button>
  );
}

export default function ClientLegalSettings({ 
  partnerTerms, 
  customerTerms, 
  partnerPrivacy, 
  customerPrivacy 
}: { 
  partnerTerms: string, 
  customerTerms: string, 
  partnerPrivacy: string, 
  customerPrivacy: string 
}) {
  const [activeTab, setActiveTab] = useState('partner_terms');

  const tabs = [
    { id: 'partner_terms', label: 'Partner T&C', name: 'partner_terms_and_conditions', defaultValue: partnerTerms },
    { id: 'customer_terms', label: 'Customer T&C', name: 'customer_terms_and_conditions', defaultValue: customerTerms },
    { id: 'partner_privacy', label: 'Partner Privacy', name: 'partner_privacy_policy', defaultValue: partnerPrivacy },
    { id: 'customer_privacy', label: 'Customer Privacy', name: 'customer_privacy_policy', defaultValue: customerPrivacy },
  ];

  const activeTabObj = tabs.find(t => t.id === activeTab)!;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
      <div className="border-b border-gray-200 dark:border-gray-800 flex flex-wrap gap-6 px-6 pt-4">
        {tabs.map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-700 dark:text-gray-300'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        <form 
          action={async (formData) => {
            try {
              await updateSystemConfig(formData);
              alert('Settings saved successfully!');
            } catch (err: any) {
              alert('Error saving settings: ' + err.message);
            }
          }}
          className="space-y-4"
        >
          <div>
            <p className="text-sm text-gray-500 mb-4">Edit the plain text {activeTabObj.label}.</p>
            {/* Render a hidden input so only the active tab's data is updated on submit if others are untouched? No, better to render all textareas but only show the active one, so they all get submitted. */}
            {tabs.map((tab) => (
              <div key={tab.id} className={activeTab === tab.id ? 'block' : 'hidden'}>
                <textarea 
                  name={tab.name} 
                  defaultValue={tab.defaultValue} 
                  rows={20}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none font-mono"
                ></textarea>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800 mt-4">
            <SubmitButton defaultText="Save Changes" loadingText="Saving..." />
          </div>
        </form>
      </div>
    </div>
  );
}
