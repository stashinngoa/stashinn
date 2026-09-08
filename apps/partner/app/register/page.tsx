import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import { logger } from '@stashinn/lib/services/logger';

export default async function Register(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;

  const signup = async (formData: FormData) => {
    'use server';
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('full_name') as string;

    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'partner' } },
    });

    if (error) {
      logger.error('Auth Failure: Partner signup failed', { email, error: error.message });
      return redirect(`/register?error=${encodeURIComponent(error.message)}`);
    }
    return redirect('/dashboard');
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex justify-center items-center">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-orange-300/30 dark:bg-orange-900/20 blur-[120px] rounded-full"></div>
        <div className="absolute top-1/2 w-[600px] h-[600px] bg-amber-400/10 dark:bg-amber-700/10 blur-[150px] rounded-full"></div>
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-orange-400/20 dark:bg-orange-800/20 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-md w-full space-y-8 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-10 rounded-3xl shadow-2xl shadow-orange-900/5 dark:shadow-orange-900/10 border-2 border-orange-100 dark:border-orange-900/50">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-orange-600 rounded-t-3xl"></div>
        
        <div className="flex justify-center mb-4 pt-2">
          <div className="flex items-center gap-2">
            <img src="/StashInn_Light_no_text.png" alt="StashInn" className="h-10 w-auto dark:hidden" />
            <img src="/StashInn_Dark_no_text.png" alt="StashInn" className="h-10 w-auto hidden dark:block" />
            <span className="text-3xl font-black tracking-tighter shrink-0">
              <span className="text-gray-900 dark:text-white">Stash</span><span className="text-orange-500">Inn</span>
            </span>
          </div>
        </div>
        <h2 className="mt-2 text-center text-xl font-bold text-gray-500 dark:text-gray-400">Partner Application</h2>
        
        {searchParams?.error && (
          <div className="bg-red-50/80 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm text-center font-medium backdrop-blur-sm">
            {searchParams.error}
          </div>
        )}

        <div className="mt-8">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">Create your account to start onboarding</p>
          <form action={signup} className="space-y-5" autoComplete="off">
            <div>
              <input name="full_name" type="text" required autoComplete="off" className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-950/50 border border-gray-200 dark:border-gray-800 rounded-xl focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none text-gray-900 dark:text-white transition-all placeholder-gray-400" placeholder="Contact Name (First & Last)" />
            </div>
            <div>
              <input name="email" type="email" required autoComplete="off" className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-950/50 border border-gray-200 dark:border-gray-800 rounded-xl focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none text-gray-900 dark:text-white transition-all placeholder-gray-400" placeholder="Email Address" />
            </div>
            <div>
              <input name="password" type="password" required autoComplete="new-password" className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-950/50 border border-gray-200 dark:border-gray-800 rounded-xl focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none text-gray-900 dark:text-white transition-all placeholder-gray-400" placeholder="Create Password" />
            </div>
            <div className="pt-2">
              <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-[0.98]">
                Start Onboarding Process
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
