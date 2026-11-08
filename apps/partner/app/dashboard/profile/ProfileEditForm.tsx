'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updateProfile } from './actions';
import { BUSINESS_TYPES } from './profileShared';

const input = 'w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20';
const label = 'block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1';
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export default function ProfileEditForm({ initialData }: { initialData: { business_name: string; business_type: string | null; pan: string | null; gstin: string | null; status: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [type, setType] = useState(initialData.business_type || 'Other');
  const [pan, setPan] = useState(initialData.pan || '');
  const [gstin, setGstin] = useState(initialData.gstin || '');
  const [understood, setUnderstood] = useState(false);
  const individual = type === 'Individual';

  const panOk = PAN.test(pan);
  const gstOk = !gstin || (GSTIN.test(gstin) && gstin.slice(2, 12) === pan);
  const taxChange = pan !== (initialData.pan || '') || (!individual && gstin !== (initialData.gstin || ''));
  const needsConfirm = taxChange && initialData.status === 'approved';

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!panOk) return setMsg({ ok: false, text: 'Enter a valid PAN, like ABCDE1234F.' });
    if (!individual && !gstOk) return setMsg({ ok: false, text: gstin && GSTIN.test(gstin) ? 'The GSTIN doesn’t match the PAN.' : 'Enter a valid 15-character GSTIN, or leave it blank.' });
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    start(async () => {
      try {
        const r = await updateProfile(fd);
        setMsg(r.success ? { ok: true, text: r.message } : { ok: false, text: r.error || 'Something went wrong.' });
        if (r.success) { setUnderstood(false); router.refresh(); }
      } catch {
        setMsg({ ok: false, text: 'Something went wrong. Please try again.' });
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="bp-name" className={label}>{individual ? 'Your full name (as on PAN)' : 'Business name'}</label>
          <input id="bp-name" name="business_name" required minLength={2} maxLength={120} defaultValue={initialData.business_name} className={input} />
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Shown on your invoices and statements. Customers see your location names, not this.</p>
        </div>
        <div>
          <label htmlFor="bp-type" className={label}>Business type</label>
          <select id="bp-type" name="business_type" value={type} onChange={e => setType(e.target.value)} className={input}>
            {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="bp-pan" className={label}>PAN</label>
          <input id="bp-pan" name="pan" required value={pan} maxLength={10} autoComplete="off" spellCheck={false}
            onChange={e => setPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            aria-invalid={pan.length === 10 && !panOk} placeholder="ABCDE1234F" className={`${input} font-mono uppercase tracking-wider`} />
          {pan.length === 10 && !panOk && <p className="mt-1 text-[11px] font-semibold text-red-600 dark:text-red-400">That doesn’t look like a PAN (5 letters, 4 digits, 1 letter).</p>}
        </div>
        {!individual && (
          <div className="sm:col-span-2">
            <label htmlFor="bp-gst" className={label}>GSTIN <span className="font-normal text-gray-400">(if registered)</span></label>
            <input id="bp-gst" name="gstin" value={gstin} maxLength={15} autoComplete="off" spellCheck={false}
              onChange={e => setGstin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              aria-invalid={gstin.length === 15 && !gstOk} placeholder="22ABCDE1234F1Z5" className={`${input} font-mono uppercase tracking-wider`} />
            {gstin.length === 15 && !gstOk && (
              <p className="mt-1 text-[11px] font-semibold text-red-600 dark:text-red-400">{GSTIN.test(gstin) ? 'Characters 3–12 of the GSTIN should be your PAN.' : 'That doesn’t look like a valid GSTIN.'}</p>
            )}
          </div>
        )}
        {individual && initialData.gstin && (
          <p className="sm:col-span-2 text-[11px] text-gray-500 dark:text-gray-400">Your GSTIN ({initialData.gstin}) stays on file. Choose a business type to change it.</p>
        )}
      </div>

      {needsConfirm && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-sm text-amber-900 dark:text-amber-200">
          <p className="font-bold">Changing your PAN or GSTIN puts your account back under review.</p>
          <p className="mt-0.5 text-xs">Your locations stop taking new bookings until StashInn checks the new details, usually within a working day. Existing bookings aren’t affected.</p>
          <label className="mt-2 flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input type="checkbox" checked={understood} onChange={e => setUnderstood(e.target.checked)} className="accent-orange-600" /> I understand
          </label>
        </div>
      )}

      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${msg.ok
          ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
          : 'border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'}`}>{msg.text}</p>
      )}
      <div className="flex justify-end border-t border-gray-100 dark:border-gray-800 pt-4">
        <button type="submit" disabled={pending || (needsConfirm && !understood)} className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm disabled:opacity-50">
          {pending ? 'Saving…' : 'Save business details'}
        </button>
      </div>
    </form>
  );
}
