'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { verifyCheckInOTP, verifyCheckOutOTP } from './actions';
import CollectionChoice, { type Collect } from './CollectionChoice';
import type { CollectedVia } from '@stashinn/lib/services/dropoffPayment';

/** Code entry for drop-off (confirmed) and pick-up (checked in). */
export default function OTPTerminal({ bookingId, mode, garage, collect, overdue, codeLength = 6 }: {
  bookingId: string;
  /** Digits in this booking's code (6 now; bookings accepted earlier may have 4) */
  codeLength?: number;
  mode: 'checkin' | 'checkout';
  garage?: boolean;
  /** Pay at drop-off: what to collect, what the partner would owe, and their share */
  collect?: Collect | null;
  overdue?: boolean;
}) {
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [via, setVia] = useState<CollectedVia | ''>('');
  const [qrRef, setQrRef] = useState('');
  const needsVia = mode === 'checkin' && !!collect;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== codeLength || (needsVia && !via)) return;
    setMsg(null);
    const fd = new FormData();
    fd.set('booking_id', bookingId);
    fd.set('otp', otp);
    if (needsVia) { fd.set('collected_via', via); fd.set('qr_reference', qrRef); }
    start(async () => {
      try {
        const r = mode === 'checkin' ? await verifyCheckInOTP(fd) : await verifyCheckOutOTP(fd);
        if (r.success) { setOtp(''); setMsg({ ok: true, text: r.message }); router.refresh(); }
        else setMsg({ ok: false, text: r.error || 'Something went wrong.' });
      } catch {
        setMsg({ ok: false, text: 'Something went wrong. Please try again.' });
      }
    });
  };

  const checkin = mode === 'checkin';
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-extrabold text-gray-900 dark:text-white">{checkin ? 'Check in at drop-off' : 'Check out at pick-up'}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {checkin
            ? garage ? 'Take photos of the vehicle and enter the customer’s check-in code.' : `Count the bags, then enter the customer’s ${codeLength}-digit check-in code.`
            : `Ask for the customer’s ${codeLength}-digit pick-up code before handing anything back.`}
        </p>
      </div>

      {checkin && collect && garage && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-3.5 py-2.5 text-sm text-amber-900 dark:text-amber-200">
          <span className="font-bold">Collect {collect.total}</span> at drop-off. You’ll record how it was paid on the next screen.
        </div>
      )}
      {checkin && collect && !garage && !msg?.ok && (
        <CollectionChoice collect={collect} value={via} onChange={setVia} reference={qrRef} onReference={setQrRef} />
      )}
      {!checkin && overdue && (
        <div className="rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 px-3.5 py-2.5 text-sm text-red-800 dark:text-red-300">
          Pick-up is overdue. You can still check out here when the customer arrives.
        </div>
      )}

      {checkin && garage ? (
        <Link href={`/dashboard/bookings/${bookingId}/check-in`}
          className="flex items-center justify-center w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm transition-colors">
          Start vehicle check-in
        </Link>
      ) : msg?.ok ? (
        <p role="status" className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 px-3.5 py-2.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300">{msg.text}</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="sr-only">{checkin ? 'Check-in code' : 'Pick-up code'}</span>
            <input
              inputMode="numeric" autoComplete="one-time-code" maxLength={codeLength} value={otp}
              onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, codeLength)); setMsg(null); }}
              placeholder="0000" aria-invalid={msg ? !msg.ok : undefined}
              className={`w-full rounded-xl border bg-white dark:bg-gray-950 px-4 py-3.5 text-center font-mono text-3xl tracking-[0.5em] text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-orange-500/20 ${
                msg && !msg.ok ? 'border-red-400 focus:border-red-400' : 'border-gray-300 dark:border-gray-700 focus:border-orange-400'}`}
            />
          </label>
          {msg && !msg.ok && <p role="alert" className="text-sm font-semibold text-red-600 dark:text-red-400">{msg.text}</p>}
          <button type="submit" disabled={otp.length !== codeLength || pending || (needsVia && !via)}
            className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm disabled:opacity-50 transition-colors">
            {pending ? 'Checking…' : checkin ? 'Confirm drop-off' : 'Confirm pick-up'}
          </button>
        </form>
      )}
    </div>
  );
}
