'use client';

import { useState, useTransition } from 'react';
import { updateProfile } from './actions';

const card = 'rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6';
const label = 'block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5';
export const inputCls = (locked = false) =>
  `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition ${locked
    ? 'bg-gray-50 dark:bg-gray-950/60 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
    : 'bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20'}`;

export function Notice({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <p role="status" className={`text-sm font-semibold ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {msg.ok ? '✓ ' : ''}{msg.text}
    </p>
  );
}

export default function ProfileForms({ email, fullName, phone }: { email: string; fullName: string; phone: string }) {
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingProfile, startProfile] = useTransition();

  return (
    <>
      <section className={card}>
        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Personal details</h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Used for your bookings and shared with the partner once a booking is confirmed.</p>
        <form
          className="mt-5 space-y-4"
          onSubmit={e => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setProfileMsg(null);
            startProfile(async () => {
              const r = await updateProfile(fd);
              setProfileMsg('error' in r ? { ok: false, text: r.error } : { ok: true, text: 'Details saved.' });
            });
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pf-name" className={label}>Full name</label>
              <input id="pf-name" name="fullName" defaultValue={fullName} required autoComplete="name" className={inputCls()} />
            </div>
            <div>
              <label htmlFor="pf-phone" className={label}>Mobile</label>
              <input id="pf-phone" name="phone" type="tel" inputMode="numeric" defaultValue={phone} autoComplete="tel" placeholder="e.g. 9876543210" className={inputCls()} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="pf-email" className={label}>Email</label>
              <input id="pf-email" value={email} disabled className={inputCls(true)} />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Your email is your sign-in, so it can&apos;t be changed here. Contact support if you need to change it.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            <Notice msg={profileMsg} />
            <button type="submit" disabled={savingProfile} className="rounded-xl bg-orange-600 hover:bg-orange-500 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {savingProfile ? 'Saving…' : 'Save details'}
            </button>
          </div>
        </form>
      </section>

      <section className={card}>
        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">How you sign in</h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">StashInn doesn&apos;t use passwords. Each time you sign in, we send a one-time code to your email or mobile.</p>
        <ul className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex gap-2"><span className="text-emerald-600 dark:text-emerald-400">✓</span> Email: <span className="font-semibold">{email}</span></li>
          <li className="flex gap-2"><span className={phone ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}>{phone ? '✓' : '–'}</span> Mobile: <span className="font-semibold">{phone || 'add one above to sign in with your phone too'}</span></li>
        </ul>
      </section>
    </>
  );
}
