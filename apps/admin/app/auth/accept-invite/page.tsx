'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@stashinn/lib/supabase/client';

type State =
  | { step: 'verifying' }
  | { step: 'set-password'; email: string; name: string }
  | { step: 'saving'; email: string; name: string }
  | { step: 'error'; message: string };

const MIN_PASSWORD = 8;

/**
 * Landing page for staff invite emails (see inviteUserByEmail in dashboard/staff/actions.ts).
 * Supabase puts the session tokens in the URL hash, which the server never sees, so the
 * session is established here in the browser before the invitee chooses a password.
 */
export default function AcceptInvitePage() {
  const [state, setState] = useState<State>({ step: 'verifying' });
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const query = new URLSearchParams(window.location.search);

      // Remove tokens from the address bar (and browser history) straight away
      window.history.replaceState(null, '', window.location.pathname);

      const linkError = hash.get('error_description') || query.get('error_description');
      if (linkError) {
        setState({
          step: 'error',
          message: /expired|invalid/i.test(linkError)
            ? 'This invite link has expired or was already used. Ask a superadmin to send a new invite.'
            : linkError.replace(/\+/g, ' '),
        });
        return;
      }

      const supabase = createClient();
      let failure: string | null = null;

      if (hash.get('access_token') && hash.get('refresh_token')) {
        // Default Supabase invite / password-setup links (implicit flow)
        const { error } = await supabase.auth.setSession({
          access_token: hash.get('access_token')!,
          refresh_token: hash.get('refresh_token')!,
        });
        failure = error?.message ?? null;
      } else if (query.get('token_hash')) {
        // Custom email template using {{ .TokenHash }}
        const type = query.get('type') === 'recovery' ? 'recovery' : 'invite';
        const { error } = await supabase.auth.verifyOtp({ token_hash: query.get('token_hash')!, type });
        failure = error?.message ?? null;
      } else if (query.get('code')) {
        const { error } = await supabase.auth.exchangeCodeForSession(query.get('code')!);
        failure = error?.message ?? null;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (failure || !user) {
        setState({ step: 'error', message: failure || 'This invite link is missing or invalid. Open the link from your invite email again.' });
        return;
      }

      setState({
        step: 'set-password',
        email: user.email ?? '',
        name: (user.user_metadata?.full_name as string) || '',
      });
    })();
  }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state.step !== 'set-password') return;
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get('password') || '');
    const confirm = String(fd.get('confirm') || '');
    const fullName = String(fd.get('full_name') || '').trim();

    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setError('The two passwords don’t match.');
    setError(null);
    setState({ ...state, step: 'saving' });

    const supabase = createClient();
    // onboarded marks the invite as accepted (see isInvitePending in dashboard/staff/actions.ts)
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { onboarded: true, ...(fullName ? { full_name: fullName } : {}) },
    });
    if (updateError) {
      setError(updateError.message);
      setState({ ...state, step: 'set-password' });
      return;
    }
    if (fullName) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('users').update({ full_name: fullName }).eq('id', user.id);
    }
    window.location.href = '/dashboard';
  };

  const inputClass =
    'w-full px-3.5 py-2.5 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-black py-12 px-4">
      <div className="max-w-md w-full bg-white dark:bg-black p-8 sm:p-10 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex justify-center items-center gap-3 mb-6">
          <img src="/StashInn_Light_no_text.png" alt="" className="h-12 w-auto dark:hidden" />
          <img src="/StashInn_Dark_no_text.png" alt="" className="h-12 w-auto hidden dark:block" />
          <span className="text-2xl font-black tracking-tighter">
            <span className="text-gray-900 dark:text-white">Stash</span><span className="text-orange-500">Inn</span>
          </span>
        </div>

        {state.step === 'verifying' && (
          <div className="flex flex-col items-center gap-3 py-6 text-sm text-gray-500 dark:text-gray-400">
            <span className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" aria-hidden="true" />
            Checking your invite…
          </div>
        )}

        {state.step === 'error' && (
          <div className="text-center">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Invite link not valid</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{state.message}</p>
            <a href="/login" className="inline-block mt-6 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              Go to sign in
            </a>
          </div>
        )}

        {(state.step === 'set-password' || state.step === 'saving') && (
          <form onSubmit={submit} className="space-y-4">
            <div className="text-center mb-2">
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Welcome to the StashInn team</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Set a password for <span className="font-semibold text-gray-700 dark:text-gray-300">{state.email}</span> to finish setting up your admin account.
              </p>
            </div>

            {!state.name && (
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Your name</span>
                <input name="full_name" autoComplete="name" placeholder="Full name" className={inputClass} />
              </label>
            )}
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400">New password</span>
              <input name="password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" autoFocus placeholder={`At least ${MIN_PASSWORD} characters`} className={inputClass} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Confirm password</span>
              <input name="confirm" type="password" required autoComplete="new-password" className={inputClass} />
            </label>

            {error && <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={state.step === 'saving'}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-500 text-white text-sm font-bold shadow-sm disabled:opacity-60"
            >
              {state.step === 'saving' && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />}
              Set password &amp; continue
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
