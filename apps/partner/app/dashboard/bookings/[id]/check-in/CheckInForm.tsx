'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { verifyGarageCheckIn } from '../../actions';
import CollectionChoice, { type Collect } from '../../CollectionChoice';
import type { CollectedVia } from '@stashinn/lib/services/dropoffPayment';
import { shrinkImage as shrink } from '../../../../../lib/shrinkImage';

const MAX_PHOTOS = 4;
const MAX_BYTES = 8 * 1024 * 1024;

export default function CheckInForm({ bookingId, existingPhotos, collect }: { bookingId: string; existingPhotos: number; collect?: Collect | null }) {
  const [via, setVia] = useState<CollectedVia | ''>('');
  const [qrRef, setQrRef] = useState('');
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  useEffect(() => {
    const urls = photos.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [photos]);

  const [preparing, setPreparing] = useState(false);
  const addPhotos = async (list: FileList | null) => {
    setError('');
    const picked = Array.from(list || []).slice(0, MAX_PHOTOS - photos.length);
    if ((list?.length || 0) > picked.length) setError(`Only ${MAX_PHOTOS} photos can be added.`);
    setPreparing(true);
    const ready = await Promise.all(picked.map(shrink));
    setPreparing(false);
    const tooBig = ready.find(f => f.size > MAX_BYTES);
    if (tooBig) { setError(`${tooBig.name} is larger than 8 MB.`); return; }
    setPhotos(p => [...p, ...ready].slice(0, MAX_PHOTOS));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const fd = new FormData();
    fd.set('booking_id', bookingId);
    fd.set('otp', otp);
    if (collect) { fd.set('collected_via', via); fd.set('qr_reference', qrRef); }
    photos.forEach(p => fd.append('photos', p));
    start(async () => {
      try {
        const r = await verifyGarageCheckIn(fd);
        if (r.success) router.push(`/dashboard/bookings/${bookingId}`);
        else setError(r.error || 'Something went wrong.');
      } catch {
        setError('Something went wrong. Please try again.');
      }
    });
  };

  const noPhotos = photos.length === 0 && existingPhotos === 0;

  return (
    <form onSubmit={submit} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none p-5 md:p-6 space-y-6">
      <div>
        <p className="text-sm font-bold text-gray-900 dark:text-white">1. Vehicle condition photos</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Photograph each side and any existing scratches or dents, up to {MAX_PHOTOS} photos.
          {existingPhotos > 0 ? ` The customer already added ${existingPhotos}.` : ''} They protect you if there’s a damage claim later.
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {previews.map((src, i) => (
            <div key={src} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`New photo ${i + 1}`} className="h-full w-full object-cover" />
              <button type="button" onClick={() => setPhotos(p => p.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white text-xs font-bold hover:bg-black/80">×</button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 cursor-pointer hover:border-orange-400 hover:text-orange-700 dark:hover:text-orange-400">
              <span className="text-xl leading-none">+</span>{preparing ? 'Preparing…' : 'Add photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" multiple className="sr-only" onChange={e => { addPhotos(e.target.files); e.target.value = ''; }} />
            </label>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
        <label htmlFor="otp" className="text-sm font-bold text-gray-900 dark:text-white">2. Customer’s check-in code</label>
        <input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={otp} placeholder="0000" required
          onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
          className="mt-2 block w-full max-w-[220px] rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-center font-mono text-3xl tracking-[0.5em] text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20" />
      </div>

      {collect && (
        <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">3. Payment</p>
          <CollectionChoice collect={collect} value={via} onChange={setVia} reference={qrRef} onReference={setQrRef} />
        </div>
      )}

      {error && <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 px-3.5 py-2.5 text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>}
      {noPhotos && <p className="text-xs text-amber-700 dark:text-amber-400">No photos yet. You can still check in, but photos are strongly recommended.</p>}

      <button type="submit" disabled={otp.length !== 4 || pending || preparing || (!!collect && !via)}
        className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm disabled:opacity-50 transition-colors">
        {pending ? (photos.length ? 'Uploading and checking in…' : 'Checking in…') : 'Confirm vehicle check-in'}
      </button>
    </form>
  );
}
