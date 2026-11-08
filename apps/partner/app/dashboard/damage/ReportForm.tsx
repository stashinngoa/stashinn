'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { PARTNER_CLAIM_CATEGORIES } from '@stashinn/lib/constants';
import { submitDamageReport } from './actions';
import { MAX_CLAIM_PHOTOS } from './damageShared';
import { shrinkImage } from '../../../lib/shrinkImage';

const input = 'w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20';
const label = 'block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1';

export type Eligible = { id: string; label: string; detail: string };

const HINTS: Record<string, string> = {
  'Damage to our property': 'What was damaged, how, and roughly what it costs to repair or replace.',
  'Unpaid or extra charges': 'What wasn’t paid (for example an overstay or cash not collected) and how much.',
  'Items left behind': 'What was left, where it is now, and how you’ve tried to reach the customer.',
  'Prohibited or unsafe items': 'What you found and what you did with it. If anyone is at risk, call 112 first.',
  'Customer behaviour': 'What happened and when. Include any staff who saw it.',
  'Something else': 'Tell us what happened.',
};

export default function ReportForm({ eligible, preselect }: { eligible: Eligible[]; preselect?: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [category, setCategory] = useState<string>('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [length, setLength] = useState(0);

  useEffect(() => {
    const urls = photos.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [photos]);

  const [preparing, setPreparing] = useState(false);
  const addPhotos = async (list: FileList | null) => {
    setMsg(null);
    const raw = Array.from(list || []);
    setPreparing(true);
    const picked = await Promise.all(raw.map(shrinkImage));
    setPreparing(false);
    const big = picked.find(f => f.size > 5 * 1024 * 1024);
    if (big) return setMsg({ ok: false, text: `${big.name} is larger than 5 MB.` });
    if (photos.length + picked.length > MAX_CLAIM_PHOTOS) setMsg({ ok: false, text: `Only ${MAX_CLAIM_PHOTOS} photos can be attached.` });
    setPhotos(p => [...p, ...picked].slice(0, MAX_CLAIM_PHOTOS));
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete('photos');
    photos.forEach(p => fd.append('photos', p));
    setMsg(null);
    start(async () => {
      try {
        const r = await submitDamageReport(fd);
        if (r.ok) {
          formRef.current?.reset();
          setPhotos([]); setCategory(''); setLength(0);
          setMsg({ ok: true, text: r.message });
          router.refresh();
        } else setMsg({ ok: false, text: r.error });
      } catch {
        setMsg({ ok: false, text: 'Something went wrong. Please try again.' });
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="claim-booking" className={label}>Booking</label>
        <select id="claim-booking" name="booking_id" required defaultValue={preselect && eligible.some(e => e.id === preselect) ? preselect : ''} className={input}>
          <option value="" disabled>Choose a booking</option>
          {eligible.map(b => <option key={b.id} value={b.id}>{b.label} · {b.detail}</option>)}
        </select>
      </div>

      <fieldset>
        <legend className={label}>What happened?</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {PARTNER_CLAIM_CATEGORIES.map(c => (
            <label key={c} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer transition-colors ${
              category === c ? 'border-orange-400 bg-orange-50/60 dark:bg-orange-950/30 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'}`}>
              <input type="radio" name="category" value={c} required checked={category === c} onChange={() => setCategory(c)} className="accent-orange-600" />
              {c}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="claim-desc" className={label}>Details</label>
        <textarea id="claim-desc" name="description" required minLength={20} maxLength={3000} rows={5} onChange={e => setLength(e.target.value.trim().length)}
          placeholder={HINTS[category] || 'What happened, when, and who was involved.'} className={input} />
        <p className={`mt-1 text-[11px] ${length && length < 20 ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>{length < 20 ? `At least 20 characters (${length}/20)` : 'Include dates, times and names where you can.'}</p>
      </div>

      <div>
        <label htmlFor="claim-amount" className={label}>Amount you’re claiming <span className="font-normal text-gray-400">(optional)</span></label>
        <div className="relative max-w-[12rem]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
          <input id="claim-amount" name="amount" inputMode="decimal" placeholder="0" className={`${input} pl-7 tabular-nums`} />
        </div>
      </div>

      <div>
        <span className={label}>Photos <span className="font-normal text-gray-400">(up to {MAX_CLAIM_PHOTOS}, strongly recommended)</span></span>
        <div className="grid grid-cols-5 gap-2">
          {previews.map((src, i) => (
            <div key={src} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              <button type="button" onClick={() => setPhotos(p => p.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white text-xs font-bold leading-none hover:bg-black/80">×</button>
            </div>
          ))}
          {photos.length < MAX_CLAIM_PHOTOS && (
            <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-[11px] font-bold text-gray-500 dark:text-gray-400 cursor-pointer hover:border-orange-400 hover:text-orange-700 dark:hover:text-orange-400">
              <span className="text-lg leading-none">+</span>{preparing ? '…' : 'Add'}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={e => { addPhotos(e.target.files); e.target.value = ''; }} />
            </label>
          )}
        </div>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">JPG, PNG or WebP, up to 5 MB each.</p>
      </div>

      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${msg.ok
          ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
          : 'border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'}`}>{msg.text}</p>
      )}
      <button type="submit" disabled={pending || preparing} className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm disabled:opacity-50">
        {pending ? (photos.length ? 'Uploading and submitting…' : 'Submitting…') : 'Submit claim'}
      </button>
    </form>
  );
}
