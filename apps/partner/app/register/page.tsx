import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import { logger } from '@stashinn/lib/services/logger';
import ThemeToggle from '../../components/ThemeToggle';

const MIN_PASSWORD = 8;

export default async function Register(props: { searchParams: Promise<{ error?: string; check_email?: string }> }) {
  const searchParams = await props.searchParams;

  const signup = async (formData: FormData) => {
    'use server';
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const fullName = String(formData.get('full_name') || '').trim();

    if (password.length < MIN_PASSWORD) {
      return redirect(`/register?error=${encodeURIComponent(`Use a password of at least ${MIN_PASSWORD} characters.`)}`);
    }

    // If Supabase requires email confirmation, the link brings them back here to finish signing in
    const origin = (await headers()).get('origin') || process.env.NEXT_PUBLIC_PARTNER_URL || 'http://localhost:3001';
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'partner' },
        emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
      },
    });

    if (error) {
      logger.error('Auth Failure: Partner signup failed', { email, error: error.message });
      return redirect(`/register?error=${encodeURIComponent(error.message)}`);
    }
    // No session yet means email confirmation is switched on
    if (!data.session) return redirect('/register?check_email=1');
    return redirect('/onboarding');
  };

  const inputClass =
    'w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-colors';

  return (
    <div className="relative min-h-screen flex flex-col bg-white dark:bg-gray-950 transition-colors overflow-hidden font-inter">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] bg-orange-300/30 dark:bg-orange-900/20 blur-[140px] rounded-full" />
        <div className="absolute -bottom-40 -right-40 w-[520px] h-[520px] bg-amber-300/25 dark:bg-amber-900/20 blur-[140px] rounded-full" />
      </div>

      {/* Top bar: back to home + theme */}
      <header className="relative z-10 w-full px-4 md:px-8 lg:px-12 py-4 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to home
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-12">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200 dark:border-gray-800 shadow-2xl shadow-orange-900/10 p-7 sm:p-9">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-600 to-amber-500" aria-hidden="true" />

          <Link href="/" className="flex items-center justify-center gap-2">
            <img src="/StashInn_Light_no_text.png" alt="" className="h-10 w-auto dark:hidden" />
            <img src="/StashInn_Dark_no_text.png" alt="" className="h-10 w-auto hidden dark:block" />
            <span className="text-2xl font-black tracking-tighter">
              <span className="text-gray-900 dark:text-white">Stash</span><span className="text-orange-500">Inn</span>
            </span>
          </Link>

          {searchParams?.check_email ? (
            <div className="mt-6 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h1 className="mt-4 text-2xl font-extrabold text-gray-900 dark:text-white">Check your inbox</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                We sent you a link to confirm your email. Open it on this device to continue your partner application.
              </p>
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Didn&apos;t get it? Check spam, or <Link href="/register" className="font-semibold text-orange-600 dark:text-orange-400 hover:underline">try again</Link>.</p>
            </div>
          ) : (
            <>
              <h1 className="mt-6 text-2xl font-extrabold text-gray-900 dark:text-white text-center">Become a partner</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">Create your account, then tell us about your space.</p>

              {searchParams?.error && (
                <div role="alert" className="mt-5 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-sm font-medium text-red-700 dark:text-red-400">
                  {searchParams.error}
                </div>
              )}

              <form action={signup} className="mt-6 space-y-4">
                <label className="block">
                  <span className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Your name</span>
                  <input name="full_name" type="text" required autoComplete="name" placeholder="First and last name" className={inputClass} />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Email address</span>
                  <input name="email" type="email" required autoComplete="email" placeholder="you@business.com" className={inputClass} />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Create a password</span>
                  <input name="password" type="password" minLength={MIN_PASSWORD} required autoComplete="new-password" placeholder={`At least ${MIN_PASSWORD} characters`} className={inputClass} />
                </label>
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-500 text-white font-bold shadow-lg shadow-orange-500/25 transition-colors active:scale-[0.99]"
                >
                  Create account &amp; continue
                </button>
              </form>
            </>
          )}

          <p className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 text-center text-sm text-gray-500 dark:text-gray-400">
            Already a partner?{' '}
            <Link href="/#login-section" className="font-bold text-orange-600 dark:text-orange-400 hover:underline">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
