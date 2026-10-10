import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import { logger } from '@stashinn/lib/services/logger';

export default async function Login(props: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  const login = async (formData: FormData) => {
    'use server';
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const nextUrl = formData.get('next') as string;
    
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logger.warn('Auth Failure: Admin login failed', { email, error: error.message });
      return redirect('/login?error=Invalid admin credentials');
    }
    return redirect(nextUrl || '/dashboard');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-black p-10 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex justify-center items-center gap-3 mb-4">
            <img src="/StashInn_Light_no_text.png" alt="StashInn" className="h-14 w-auto dark:hidden" />
            <img src="/StashInn_Dark_no_text.png" alt="StashInn" className="h-14 w-auto hidden dark:block" />
            <span className="text-3xl font-black tracking-tighter">
              <span className="text-gray-900 dark:text-white">Stash</span><span className="text-orange-500">Inn</span>
            </span>
          </div>
          <h2 className="text-center text-xl font-bold text-gray-900 dark:text-gray-200">System Operations Login</h2>
          <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">Admin Portal</p>
        </div>
        
        {searchParams?.error && (
          <div className="bg-red-900/50 text-red-400 p-3 rounded text-sm text-center border border-red-800">
            {searchParams.error}
          </div>
        )}

        <form className="mt-8 space-y-6" action={login}>
          <input type="hidden" name="next" value={searchParams.next || ''} />
          <div className="rounded-md shadow-sm -space-y-px">
            <input name="email" type="email" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-800 bg-white dark:bg-gray-900 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-t-md focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm" placeholder="Admin ID" />
            <input name="password" type="password" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-800 bg-white dark:bg-gray-900 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-b-md focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm" placeholder="Passcode" />
          </div>
          <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
            Secure Login
          </button>
        </form>
      </div>
    </div>
  );
}
