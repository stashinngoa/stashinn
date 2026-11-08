'use client';

import { useState, useTransition } from 'react';
import { updateNotificationPreferences } from './actions';
import { Notice } from './ProfileForms';

type Prefs = { in_app: boolean; email: boolean; whatsapp: boolean; sms: boolean };

const CHANNELS: { name: keyof Prefs; label: string; description: string }[] = [
  { name: 'email', label: 'Email', description: 'Booking requests, confirmations with the address and check-in code, and cancellations.' },
  { name: 'in_app', label: 'In the app', description: 'Updates in the notification bell when you’re signed in.' },
  { name: 'sms', label: 'SMS', description: 'Short text alerts for booking updates.' },
  { name: 'whatsapp', label: 'WhatsApp', description: 'Booking updates on WhatsApp.' },
];

/** Notification channel switches (the "Notifications" card on Profile & settings). */
export default function ProfileForm({ initialPrefs }: { initialPrefs: Prefs }) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, start] = useTransition();
  const dirty = CHANNELS.some(c => prefs[c.name] !== initialPrefs[c.name]);

  return (
    <form
      className="mt-4"
      onSubmit={e => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setMsg(null);
        start(async () => {
          const r = await updateNotificationPreferences(fd);
          setMsg('error' in r ? { ok: false, text: r.error } : { ok: true, text: 'Preferences saved.' });
        });
      }}
    >
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {CHANNELS.map(c => (
          <li key={c.name}>
            <label className="flex items-center justify-between gap-4 py-3.5 cursor-pointer">
              <span>
                <span className="block text-sm font-bold text-gray-900 dark:text-white">{c.label}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.description}</span>
              </span>
              <span className="relative inline-flex shrink-0">
                <input
                  type="checkbox"
                  name={c.name}
                  checked={prefs[c.name]}
                  onChange={e => setPrefs(p => ({ ...p, [c.name]: e.target.checked }))}
                  className="peer sr-only"
                />
                <span className="w-11 h-6 rounded-full bg-gray-200 dark:bg-gray-700 peer-checked:bg-orange-600 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500/50" />
                <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
        <Notice msg={msg} />
        <button type="submit" disabled={saving || !dirty} className="rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </div>
    </form>
  );
}
