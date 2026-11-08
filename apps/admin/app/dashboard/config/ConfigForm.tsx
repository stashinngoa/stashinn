'use client';

import { useActionState } from 'react';
import { updateSystemConfig, type ConfigResult } from './actions';

type Field = { key: string; label: string; hint: string; type: 'number' | 'email'; unit?: string; min?: number };

const SECTIONS: { title: string; description: string; fields: Field[] }[] = [
  {
    title: 'Booking rules',
    description: 'Applied when customers book and cancel.',
    fields: [
      { key: 'booking_min_hours', label: 'Minimum booking', unit: 'hours', type: 'number', min: 1, hint: 'Shorter bookings are extended to this length at checkout.' },
      { key: 'booking_max_days', label: 'Maximum booking', unit: 'days', type: 'number', min: 1, hint: 'Customers can’t book longer than this.' },
      { key: 'cancellation_window_hours', label: 'Free cancellation window', unit: 'hours', type: 'number', min: 0, hint: 'Cancelling at least this long before drop-off gets a full refund. Also shown on the public Cancellation policy page.' },
    ],
  },
  {
    title: 'Contact',
    description: 'Platform contact details.',
    fields: [
      { key: 'support_email', label: 'Support email', type: 'email', hint: 'Stored for reference; not shown to customers anywhere yet.' },
    ],
  },
];

export default function ConfigForm({ initialConfig, canEdit }: { initialConfig: Record<string, unknown>; canEdit: boolean }) {
  const [result, formAction, pending] = useActionState<ConfigResult | null, FormData>(updateSystemConfig, null);

  return (
    <form action={formAction} className="space-y-6">
      {SECTIONS.map(section => (
        <fieldset key={section.title} disabled={!canEdit} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <legend className="text-sm font-bold text-gray-900 dark:text-white">{section.title}</legend>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{section.description}</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {section.fields.map(f => (
              <label key={f.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 px-5 py-4">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-gray-800 dark:text-gray-200">{f.label}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{f.hint}</span>
                </span>
                <span className="relative sm:w-56 shrink-0">
                  <input
                    type={f.type}
                    name={f.key}
                    min={f.min}
                    step={f.type === 'number' ? 1 : undefined}
                    required
                    defaultValue={String(initialConfig[f.key] ?? '').replace(/"/g, '')}
                    className={`w-full ${f.unit ? 'pr-16' : 'pr-3'} pl-3 py-2 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white tabular-nums focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-60`}
                  />
                  {f.unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 dark:text-gray-500 pointer-events-none">{f.unit}</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {canEdit && (
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
          {result && (
            <p role="status" className={`text-sm font-medium ${result.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
              {result.ok ? result.message : result.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-500 text-white text-sm font-bold shadow-sm disabled:opacity-60"
          >
            {pending && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />}
            Save settings
          </button>
        </div>
      )}
    </form>
  );
}
