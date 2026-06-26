import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';

export default async function Login(props: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  const login = async (formData: FormData) => {
    'use server';
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const nextUrl = formData.get('next') as string;
    
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return redirect('/login?error=Invalid admin credentials');
    return redirect(nextUrl || '/dashboard');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-gray-800 p-10 rounded-xl shadow-2xl border border-gray-700">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">StashInn Admin</h2>
          <p className="mt-2 text-center text-sm text-gray-400">System Operations Login</p>
        </div>
        
        {searchParams?.error && (
          <div className="bg-red-900/50 text-red-400 p-3 rounded text-sm text-center border border-red-800">
            {searchParams.error}
          </div>
        )}

        <form className="mt-8 space-y-6" action={login}>
          <input type="hidden" name="next" value={searchParams.next || ''} />
          <div className="rounded-md shadow-sm -space-y-px">
            <input name="email" type="email" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 placeholder-gray-400 text-white rounded-t-md focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm" placeholder="Admin ID" />
            <input name="password" type="password" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 placeholder-gray-400 text-white rounded-b-md focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm" placeholder="Passcode" />
          </div>
          <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
            Secure Login
          </button>
        </form>
      </div>
    </div>
  );
}
