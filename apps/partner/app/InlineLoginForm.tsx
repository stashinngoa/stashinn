'use client';

import { useTransition } from 'react';
import { useSearchParams } from 'next/navigation';

export default function InlineLoginForm({ loginAction }: { loginAction: (formData: FormData) => Promise<void> }) {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const errorMsg = searchParams?.get('error');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      loginAction(formData);
    });
  };

  return (
    <div 
      className="w-full max-w-sm mx-auto bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-900/5 dark:shadow-orange-900/10 border-2 border-orange-100 dark:border-orange-900/50 p-8 transform transition-transform duration-500 relative overflow-hidden" 
      id="login-section"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-orange-600"></div>
      
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mx-auto mb-4 border border-orange-100 dark:border-orange-800/50">
          <svg className="w-6 h-6 text-orange-600 dark:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Partner Login</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back to StashInn</p>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-red-50/80 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm text-center font-medium backdrop-blur-sm">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
          <input 
            name="email" 
            type="email" 
            required 
            placeholder="partner@example.com"
            className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-950/50 border border-gray-200 dark:border-gray-800 rounded-xl focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none text-gray-900 dark:text-white transition-all placeholder-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Password</label>
          <input 
            name="password" 
            type="password" 
            required 
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-950/50 border border-gray-200 dark:border-gray-800 rounded-xl focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none text-gray-900 dark:text-white transition-all placeholder-gray-400"
          />
        </div>
        
        <div className="pt-2">
          <button 
            type="submit" 
            disabled={isPending}
            className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold rounded-xl transition-all disabled:opacity-70 shadow-lg shadow-orange-600/20 active:scale-[0.98]"
          >
            {isPending ? 'Authenticating...' : 'Sign In'}
          </button>
        </div>
      </form>
    </div>
  );
}
