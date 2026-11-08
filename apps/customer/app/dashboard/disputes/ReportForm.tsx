'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { submitCustomerDispute } from './actions';

const CATEGORIES = ['Damage to my items', 'Missing items', 'Overcharged or payment issue', 'Location closed or refused my booking', 'Staff or service problem', 'Something else'];

const label = 'block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5';
const field = 'w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20';

export default function ReportForm({ eligibleBookings }: { eligibleBookings: { id: string; label: string }[] }) {
  const params = useSearchParams();
  const preset = params?.get('booking_id') || '';
  // Coming from "Get help with this booking" picks that booking
  const [bookingId, setBookingId] = useState(eligibleBookings.some(b => b.id === preset) ? preset : '');
  const [files, setFiles] = useState<File[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={e => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        fd.delete('photos');
        files.forEach(f => fd.append('photos', f));
        setMsg(null);
        start(async () => {
          const r = await submitCustomerDispute(fd);
          if (!r.ok) return setMsg({ ok: false, text: r.error });
          form.reset();
          setBookingId('');
          setFiles([]);
          setMsg({ ok: true, text: 'Thanks. Your report is with our support team and you can follow it below.' });
        });
      }}
    >
      <div>
        <label htmlFor="rf-booking" className={label}>Booking</label>
        <select id="rf-booking" name="booking_id" required value={bookingId} onChange={e => setBookingId(e.target.value)} className={field}>
          <option value="">Choose a booking</option>
          {eligibleBookings.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="rf-cat" className={label}>What went wrong?</label>
        <select id="rf-cat" name="category" required defaultValue="" className={field}>
          <option value="" disabled>Choose one</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="rf-desc" className={label}>Details</label>
        <textarea id="rf-desc" name="description" required minLength={20} rows={5} className={field} placeholder="What happened, when, and what you'd like us to do. For damage, mention which item and its approximate value." />
      </div>

      <div>
        <span className={label}>Photos (optional, up to 5)</span>
        <label className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950/50 px-4 py-5 text-center cursor-pointer hover:border-orange-300 dark:hover:border-orange-700/60">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{files.length ? `${files.length} photo${files.length === 1 ? '' : 's'} selected` : 'Add photos of the damage or issue'}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG or WebP, up to 5 MB each</span>
          <input type="file" name="photos" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={e => setFiles(Array.from(e.target.files || []).slice(0, 5))} />
        </label>
      </div>

      {msg && (
        <p role="status" className={`rounded-xl px-3.5 py-2.5 text-sm font-medium ${msg.ok ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'}`}>
          {msg.text}
        </p>
      )}

      <button type="submit" disabled={pending} className="w-full rounded-xl bg-orange-600 hover:bg-orange-500 py-3 text-sm font-bold text-white disabled:opacity-60">
        {pending ? 'Sending…' : 'Send report'}
      </button>
      <p className="text-xs text-gray-500 dark:text-gray-400">For StashGuard claims, report within 48 hours of pick-up and include photos.</p>
    </form>
  );
}
