'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { endSession } from '../app/dashboard/sessionActions';
import {
  ACTIVITY_PING_INTERVAL_MS,
  ACTIVITY_STORAGE_KEY,
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
  MAX_SESSION_MS,
  type SignOutReason,
} from '../lib/sessionPolicy';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const;

const readShared = () => {
  try { return Number(localStorage.getItem(ACTIVITY_STORAGE_KEY)) || 0; } catch { return 0; }
};
const writeShared = (t: number) => {
  try { localStorage.setItem(ACTIVITY_STORAGE_KEY, String(t)); } catch { /* storage blocked */ }
};

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Signs the admin out after IDLE_TIMEOUT_MS of inactivity (shared across tabs) or when the
 * hard session limit is reached, with a countdown warning first. The server enforces the same
 * limits in middleware for sessions whose page isn't open.
 */
export default function SessionTimeout({ sessionEndsAt }: { sessionEndsAt: number }) {
  const lastActivity = useRef(0);
  const lastPing = useRef(0);
  const ending = useRef(false);
  const [warning, setWarning] = useState<{ reason: SignOutReason; remaining: number } | null>(null);
  const warningRef = useRef(warning);
  warningRef.current = warning;

  const ping = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastPing.current < ACTIVITY_PING_INTERVAL_MS) return;
    lastPing.current = now;
    fetch('/api/session/ping', { method: 'POST', credentials: 'same-origin' })
      .then(res => { if (res.redirected || res.status === 401) window.location.href = '/login?reason=idle'; })
      .catch(() => { /* offline: the next activity will retry */ });
  }, []);

  const markActive = useCallback((force = false) => {
    const now = Date.now();
    lastActivity.current = now;
    // Throttle storage writes; other tabs pick this up on their next tick
    if (force || now - readShared() > 5000) writeShared(now);
    ping(force);
  }, [ping]);

  const signOut = useCallback(async (reason: SignOutReason) => {
    if (ending.current) return;
    ending.current = true;
    try { await endSession(reason); } catch { /* still leave the page */ }
    window.location.href = `/login?reason=${reason}&next=${encodeURIComponent(window.location.pathname)}`;
  }, []);

  useEffect(() => {
    // Loading a dashboard page counts as activity (the server already checked the session)
    markActive(true);

    const onActivity = () => {
      // Once the warning is up, only the explicit button keeps the session alive
      if (warningRef.current) return;
      markActive();
    };
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }));

    const tick = () => {
      if (ending.current) return;
      const now = Date.now();
      const last = Math.max(lastActivity.current, readShared());
      lastActivity.current = last;
      const idleLeft = IDLE_TIMEOUT_MS - (now - last);
      const hardLeft = sessionEndsAt - now;

      if (hardLeft <= 0) return void signOut('expired');
      if (idleLeft <= 0) return void signOut('idle');

      if (hardLeft <= IDLE_WARNING_MS && hardLeft <= idleLeft) setWarning({ reason: 'expired', remaining: hardLeft });
      else if (idleLeft <= IDLE_WARNING_MS) setWarning({ reason: 'idle', remaining: idleLeft });
      else if (warningRef.current) setWarning(null); // activity in another tab
    };

    const interval = window.setInterval(tick, 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, onActivity));
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [markActive, signOut, sessionEndsAt]);

  if (!warning) return null;

  const isIdle = warning.reason === 'idle';
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 dark:bg-black/70 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="session-timeout-title">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 id="session-timeout-title" className="mt-4 text-lg font-extrabold text-gray-900 dark:text-white">
          {isIdle ? 'Are you still there?' : 'Your session is ending'}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isIdle
            ? 'For security, you’ll be signed out due to inactivity in'
            : `Admin sessions last ${MAX_SESSION_MS / 3600000} hours. You’ll need to sign in again in`}
        </p>
        <p className="mt-3 text-4xl font-black tabular-nums text-orange-600 dark:text-orange-400" aria-live="polite">{mmss(warning.remaining)}</p>
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => signOut(warning.reason)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Sign out now
          </button>
          {isIdle && (
            <button
              type="button"
              autoFocus
              onClick={() => { setWarning(null); markActive(true); }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-500 text-white text-sm font-bold shadow-sm transition-colors"
            >
              Stay signed in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
