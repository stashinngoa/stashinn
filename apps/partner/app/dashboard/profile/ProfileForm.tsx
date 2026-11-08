'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updateAccount, updateNotificationPreferences } from './actions';

const input = 'w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20';
const label = 'block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1';

function Message({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <p role={msg.ok ? 'status' : 'alert'} className={`text-xs font-semibold ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{msg.text}</p>;
}

function useSave(fn: (fd: FormData) => Promise<{ success?: true; message?: string; error?: string }>) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    start(async () => {
      try {
        const r = await fn(fd);
        setMsg(r.success ? { ok: true, text: r.message || 'Saved.' } : { ok: false, text: r.error || 'Something went wrong.' });
        if (r.success) router.refresh();
      } catch {
        setMsg({ ok: false, text: 'Something went wrong. Please try again.' });
      }
    });
  };
  return { pending, msg, save };
}

/** The signed-in person's own details (login email is fixed). */
export function AccountForm({ email, fullName, phone }: { email: string; fullName: string; phone: string }) {
  const { pending, msg, save } = useSave(updateAccount);
  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ac-name" className={label}>Your name</label>
          <input id="ac-name" name="full_name" required minLength={2} maxLength={80} defaultValue={fullName} className={input} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="ac-phone" className={label}>Your mobile</label>
          <input id="ac-phone" name="phone" type="tel" inputMode="tel" defaultValue={phone} placeholder="98765 43210" className={input} autoComplete="tel" />
        </div>
        <div className="sm:col-span-2">
          <span className={label}>Sign-in email</span>
          <p className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 break-all">{email}</p>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">To change your sign-in email, contact support@stashinn.in.</p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
        <Message msg={msg} />
        <button type="submit" disabled={pending} className="shrink-0 px-5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

const CHANNELS = [
  { name: 'in_app', label: 'In the partner portal', text: 'The bell at the top of every page.' },
  { name: 'email', label: 'Email', text: 'New requests, reminders, cancellations and payouts.' },
  { name: 'daily_plan', label: 'Morning plan', text: 'At 7:30 am, an email with the day’s drop-offs and pick-ups (only on days with bookings).' },
  { name: 'sms', label: 'SMS', text: 'A text for each new booking request.', needsPhone: true },
  { name: 'whatsapp', label: 'WhatsApp', text: 'New booking requests on WhatsApp.', needsPhone: true },
] as const;

export default function ProfileForm({ initialPrefs, hasPhone }: { initialPrefs: Record<string, any>; hasPhone: boolean }) {
  const { pending, msg, save } = useSave(updateNotificationPreferences);
  return (
    <form onSubmit={save}>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {CHANNELS.map(c => {
          const disabled = 'needsPhone' in c && c.needsPhone && !hasPhone;
          return (
            <li key={c.name}>
              <label className={`flex items-center justify-between gap-4 py-3 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-gray-900 dark:text-white">{c.label}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{disabled ? 'Add your mobile under “Your account” to turn this on.' : c.text}</span>
                </span>
                <span className="relative inline-flex shrink-0">
                  <input type="checkbox" name={c.name} defaultChecked={!!initialPrefs[c.name] && !disabled} disabled={disabled} className="peer sr-only" />
                  <span className="h-6 w-11 rounded-full bg-gray-200 dark:bg-gray-700 transition-colors peer-checked:bg-orange-600 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500/40" />
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
        <Message msg={msg} />
        <button type="submit" disabled={pending} className="shrink-0 px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm disabled:opacity-50">
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
