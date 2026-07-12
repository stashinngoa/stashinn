'use client';

import { useTransition } from 'react';
import { updateSystemConfig } from './actions';

export default function ConfigForm({ initialConfig }: { initialConfig: Record<string, any> }) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      updateSystemConfig(formData);
    });
  };

  const fields = [
    { key: 'support_email', label: 'Support Email', type: 'email' },
    { key: 'default_commission_rate', label: 'Default Commission (%)', type: 'number', step: '0.01' },
    { key: 'booking_min_hours', label: 'Min Booking (Hours)', type: 'number' },
    { key: 'booking_max_days', label: 'Max Booking (Days)', type: 'number' },
    { key: 'cancellation_window_hours', label: 'Free Cancellation Window (Hours)', type: 'number' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-400 mb-1">{field.label}</label>
          <input
            type={field.type}
            name={field.key}
            step={field.step}
            defaultValue={String(initialConfig[field.key] ?? '').replace(/['"]/g, '')}
            className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-md text-sm text-gray-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
        </div>
      ))}

      <div className="pt-4 border-t border-gray-800">
        <button
          type="submit"
          disabled={isPending}
          className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-bold rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-900 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </form>
  );
}
