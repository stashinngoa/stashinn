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

    if (error) return redirect(`/login?error=${encodeURIComponent(error.message)}`);
    return redirect(nextUrl || '/dashboard');
  };

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

    if (error) return redirect(`/login?error=${encodeURIComponent(error.message)}`);
    return redirect('/dashboard');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border-t-4 border-purple-600">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Partner Login</h2>
        </div>
        
        {searchParams?.error && (
          <div className="bg-red-50 text-red-500 p-3 rounded text-sm text-center">
            {searchParams.error}
          </div>
        )}

        <form className="mt-8 space-y-6" action={login}>
          <input type="hidden" name="next" value={searchParams.next || ''} />
          <div className="rounded-md shadow-sm -space-y-px">
            <input name="email" type="email" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" placeholder="Partner Email" />
            <input name="password" type="password" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" placeholder="Password" />
          </div>
          <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
            Sign In
          </button>
        </form>

        <div className="mt-6 border-t border-gray-200 pt-6">
          <p className="text-center text-sm text-gray-600 mb-4">New Partner?</p>
          <form action={signup} className="space-y-2">
            <input name="full_name" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded focus:border-purple-500 focus:ring-purple-500 text-sm" placeholder="Full Name" />
            <input name="email" type="email" required className="w-full px-3 py-2 border border-gray-300 rounded focus:border-purple-500 focus:ring-purple-500 text-sm" placeholder="Email address" />
            <input name="password" type="password" required className="w-full px-3 py-2 border border-gray-300 rounded focus:border-purple-500 focus:ring-purple-500 text-sm" placeholder="Create Password" />
            <button type="submit" className="w-full py-2 px-4 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50">
              Apply as Partner
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
