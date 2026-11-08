// Admin session expiry policy (enforced in middleware + the dashboard's SessionTimeout).
// Supabase's own session timeouts need a paid plan, so the admin portal enforces these itself.

/** Sign out after this long without any user activity. */
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

/** Show the "still there?" warning this long before the idle sign-out. */
export const IDLE_WARNING_MS = 1 * 60 * 1000;

/** Hard limit on a session, counted from the actual sign-in, regardless of activity. */
export const MAX_SESSION_MS = 12 * 60 * 60 * 1000;

/**
 * Extra slack the server allows on top of IDLE_TIMEOUT_MS. The browser reports activity at
 * most once per ACTIVITY_PING_INTERVAL_MS, so the browser always signs out first and the
 * server check only catches sessions whose page wasn't open (closed laptop, direct requests).
 */
export const SERVER_IDLE_GRACE_MS = 2 * 60 * 1000;

/** How often (at most) the browser reports activity to the server. */
export const ACTIVITY_PING_INTERVAL_MS = 60 * 1000;

/** httpOnly cookie holding the server-side "last activity" timestamp (ms, server clock). */
export const ACTIVITY_COOKIE = 'admin_last_active';

/** localStorage key used to share activity between open admin tabs. */
export const ACTIVITY_STORAGE_KEY = 'admin_last_activity';

export const ACTIVITY_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_SESSION_MS / 1000,
};

export type SignOutReason = 'idle' | 'expired';

/** Cookie value is "<userId>.<timestamp>" so another account's leftover cookie is ignored. */
export const encodeActivity = (userId: string, at = Date.now()) => `${userId}.${at}`;

export const parseActivity = (value: string | undefined, userId: string): number | null => {
  if (!value) return null;
  const dot = value.lastIndexOf('.');
  if (dot < 0 || value.slice(0, dot) !== userId) return null;
  return Number(value.slice(dot + 1)) || null;
};
