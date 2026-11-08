'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function InlineLoginForm({ loginAction }: { loginAction: (formData: FormData) => Promise<void> }) {
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const errorMsg = searchParams?.get('error');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const next = searchParams?.get('next');
    if (next) formData.set('next', next);
    startTransition(() => {
      loginAction(formData);
    });
  };

  const inputClass =
    'w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-colors';

  return (
    <div
      id="login-section"
      className="relative w-full max-w-md xl:max-w-lg overflow-hidden rounded-3xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200 dark:border-gray-800 shadow-2xl shadow-orange-900/10 p-7 sm:p-9"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-600 to-amber-500" aria-hidden="true" />

      <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Partner sign in</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your locations, bookings and earnings.</p>

      {errorMsg && (
        <div role="alert" className="mt-5 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-sm font-medium text-red-700 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Email address</span>
          <input name="email" type="email" required autoComplete="email" placeholder="you@business.com" className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Password</span>
          <span className="relative block">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={`${inputClass} pr-16`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </span>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-500 text-white font-bold shadow-lg shadow-orange-500/25 transition-colors disabled:opacity-70 active:scale-[0.99]"
        >
          {isPending && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true" />}
          {isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 text-center text-sm text-gray-500 dark:text-gray-400">
        New to StashInn?{' '}
        <Link href="/register" className="font-bold text-orange-600 dark:text-orange-400 hover:underline">Become a partner</Link>
      </p>
    </div>
  );
}
